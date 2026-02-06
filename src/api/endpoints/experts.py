from typing import Dict, List, Optional

import redis.asyncio as redis
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.dependencies import (
    get_current_admin_user,
    get_current_user,
    get_validated_vk_id,
    get_db,
    get_notifier,
    get_redis,
    check_idempotency_key,
    save_idempotency_result,
)
from src.crud import expert_crud
from src.schemas import expert_schemas
from src.services.notifier import Notifier
from sqlalchemy.exc import IntegrityError
from redis.exceptions import LockError

router = APIRouter(prefix="/experts", tags=["Experts"])


@router.post("/register", status_code=201)
async def register_expert(
    expert_data: expert_schemas.ExpertCreate,
    db: AsyncSession = Depends(get_db),
    notifier: Notifier = Depends(get_notifier),
    cache: redis.Redis = Depends(get_redis),
    vk_id_from_token: int = Depends(get_validated_vk_id),
):
    try:
        expert_data.user_data.vk_id = vk_id_from_token
        await expert_crud.create_expert_request(db=db, expert_data=expert_data)
        cache_key = f"user_profile:{vk_id_from_token}"
        await cache.delete(cache_key)

        user_info_for_notifier = {
            **expert_data.user_data.model_dump(),
            "regalia": expert_data.profile_data.regalia,
        }
        await notifier.send_new_request_to_admin(user_info_for_notifier)
        return {"status": "ok", "message": "Request sent for moderation"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/top", response_model=expert_schemas.PaginatedUsersResponse)
async def get_top_experts(
    db: AsyncSession = Depends(get_db),
    page: int = 1,
    size: int = 20,
    search: Optional[str] = None,
    region: Optional[str] = None,
    category_id: Optional[int] = None,
):
    experts_data, total_count = await expert_crud.get_top_experts_paginated(
        db=db,
        page=page,
        size=size,
        search_query=search,
        region=region,
        category_id=category_id,
    )

    response_users = []
    # Распаковываем 5 элементов (User, Profile, Stats, Topics, Rank)
    for user, profile, stats_dict, topics, rank in experts_data:
        user_data = expert_schemas.UserPublicRead.model_validate(
            user, from_attributes=True
        )
        user_data.status = profile.status
        user_data.stats = expert_schemas.StatsPublic(**stats_dict)
        user_data.topics = topics
        user_data.show_community_rating = profile.show_community_rating
        user_data.regalia = profile.regalia
        user_data.social_link = str(profile.social_link)

        # Тариф теперь вычисляем (заглушка, позже прикрутим Donut)
        user_data.tariff_plan = "Начальный"

        user_data.rank = rank
        response_users.append(user_data)

    return {
        "items": response_users,
        "total_count": total_count,
        "page": page,
        "size": size,
    }


@router.get("/{vk_id}", response_model=expert_schemas.UserPublicRead)
async def get_expert_profile(
    vk_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user),
):
    result = await expert_crud.get_full_user_profile_with_stats(db=db, vk_id=vk_id)
    if not result:
        raise HTTPException(status_code=404, detail="Expert not found")

    user, profile, stats_dict, my_votes_stats_dict = result

    response_data = expert_schemas.UserPublicRead.model_validate(
        user, from_attributes=True
    )
    response_data.stats = expert_schemas.StatsPublic(**stats_dict)
    response_data.tariff_plan = "Начальный"  # Заглушка

    vote_info = await expert_crud.get_user_vote_for_expert(
        db=db, expert_vk_id=vk_id, voter_vk_id=current_user["vk_id"]
    )
    response_data.current_user_vote_info = vote_info

    if profile:
        response_data.status = profile.status
        response_data.show_community_rating = profile.show_community_rating
        response_data.regalia = profile.regalia
        response_data.social_link = str(profile.social_link)
        response_data.topics = [
            f"{theme.category.name} > {theme.name}" for theme in profile.selected_themes
        ]
    return response_data


@router.post("/{vk_id}/vote", status_code=201)
async def create_vote_for_expert(
    vk_id: int,
    vote_data: expert_schemas.CommunityVoteCreate,
    db: AsyncSession = Depends(get_db),
    cache: redis.Redis = Depends(get_redis),
    notifier: Notifier = Depends(get_notifier),
    voter_id: int = Depends(get_validated_vk_id),
    idempotency_key: Optional[str] = Depends(check_idempotency_key),
):
    if vk_id == voter_id:
        raise HTTPException(status_code=400, detail="Вы не можете голосовать за себя.")

    if not vote_data.comment or len(vote_data.comment.strip()) < 3:
        raise HTTPException(
            status_code=400,
            detail="Комментарий является обязательным для этого действия.",
        )

    lock_key = f"lock:vote:community:{voter_id}:{vk_id}"

    try:
        async with cache.lock(lock_key, timeout=5, blocking_timeout=2):
            try:
                await expert_crud.create_community_vote(
                    db=db,
                    expert_vk_id=vk_id,
                    vote_data=vote_data,
                    voter_vk_id=voter_id,
                    notifier=notifier,
                )
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
            except IntegrityError:
                await db.rollback()
                raise HTTPException(status_code=409, detail="Вы уже проголосовали.")
            except Exception:
                # Catch-all for other DB/code errors to avoid hanging locks if not auto-released (though aioredlock handles it)
                raise
            
            await cache.delete(f"user_profile:{vk_id}")
            await cache.delete(f"user_profile:{voter_id}")

            res = {"status": "ok", "message": "Your vote has been processed."}
            if idempotency_key:
                await save_idempotency_result(idempotency_key, res, cache)
            return res

    except LockError:
        raise HTTPException(status_code=429, detail="Слишком много запросов.")


@router.delete("/{vk_id}/vote", status_code=200)
async def cancel_vote_for_expert(
    vk_id: int,
    revoke_data: expert_schemas.VoteRevoke,
    rating_type: str = "community",
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    cache: redis.Redis = Depends(get_redis),
):
    voter_vk_id = current_user["vk_id"]
    
    # Можно использовать revoke_data.comment для логирования или сохранения причины, 
    # если логика withdraw_rating_vote это поддерживает. 
    # Пока просто передаем его, если потребуется расширение.
    
    success = await expert_crud.withdraw_rating_vote(
        db=db, expert_vk_id=vk_id, voter_vk_id=voter_vk_id, rating_type=rating_type
    )

    if not success:
        raise HTTPException(
            status_code=404, detail="Активный голос для отмены не найден."
        )

    await cache.delete(f"user_profile:{vk_id}")
    await cache.delete(f"user_profile:{voter_vk_id}")

    return {"status": "ok", "message": "Your vote has been cancelled."}


@router.post("/withdraw", status_code=200)
async def withdraw_expert_application(
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    cache: redis.Redis = Depends(get_redis),
):
    vk_id = current_user["vk_id"]
    success = await expert_crud.withdraw_expert_request(db=db, vk_id=vk_id)
    if not success:
        raise HTTPException(
            status_code=404, detail="No pending request found to withdraw."
        )
    cache_key = f"user_profile:{vk_id}"
    await cache.delete(cache_key)
    return {"status": "ok", "message": "Your expert application has been withdrawn."}


@router.get(
    "/admin/pending",
    response_model=List[expert_schemas.ExpertRequestRead],
    dependencies=[Depends(get_current_admin_user)],
)
async def get_pending_experts(db: AsyncSession = Depends(get_db)):
    pending_experts = await expert_crud.get_pending_experts(db=db)
    response = []
    for user, profile in pending_experts:
        data = {
            "vk_id": user.vk_id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "photo_url": str(user.photo_url),
            "regalia": profile.regalia,
            "social_link": str(profile.social_link),
            "performance_link": str(profile.performance_link),
            "region": profile.region,
            "topics": [
                f"{theme.category.name} > {theme.name}"
                for theme in profile.selected_themes
            ],
        }
        response.append(expert_schemas.ExpertRequestRead.model_validate(data))
    return response


@router.get(
    "/admin/all_users",
    response_model=expert_schemas.PaginatedAdminUsersResponse,
    dependencies=[Depends(get_current_admin_user)],
)
async def get_all_users(
    db: AsyncSession = Depends(get_db),
    page: int = 1,
    size: int = 50,
    search: Optional[str] = None,
    user_type: Optional[str] = Query(None, enum=["all", "user", "expert"]),
    sort_by_date: Optional[str] = Query(None, enum=["asc", "desc"]),
):
    users_with_profiles, total_count = await expert_crud.get_all_users_paginated(
        db=db,
        page=page,
        size=size,
        search_query=search,
        user_type_filter=user_type,
        date_sort_order=sort_by_date,
    )
    response_users = []
    for user, profile in users_with_profiles:
        user_data = expert_schemas.UserPrivateRead.model_validate(
            user, from_attributes=True
        )
        if profile:
            user_data.status = profile.status
            user_data.tariff_plan = "Начальный"
        response_users.append(user_data)
    return {
        "items": response_users,
        "total_count": total_count,
        "page": page,
        "size": size,
    }


@router.post(
    "/admin/{vk_id}/approve",
    status_code=200,
    dependencies=[Depends(get_current_admin_user)],
)
async def approve_expert(
    vk_id: int,
    db: AsyncSession = Depends(get_db),
    notifier: Notifier = Depends(get_notifier),
    cache: redis.Redis = Depends(get_redis),
):
    profile = await expert_crud.set_expert_status(db=db, vk_id=vk_id, status="approved")
    if not profile:
        raise HTTPException(status_code=404, detail="Expert profile not found")
    await cache.delete(f"user_profile:{vk_id}")
    await notifier.send_moderation_result(vk_id=vk_id, approved=True)
    return {"status": "ok", "message": "Expert approved"}


@router.post(
    "/admin/{vk_id}/reject",
    status_code=200,
    dependencies=[Depends(get_current_admin_user)],
)
async def reject_expert(
    vk_id: int,
    db: AsyncSession = Depends(get_db),
    notifier: Notifier = Depends(get_notifier),
    cache: redis.Redis = Depends(get_redis),
):
    profile = await expert_crud.set_expert_status(db=db, vk_id=vk_id, status="rejected")
    if not profile:
        raise HTTPException(status_code=404, detail="Expert profile not found")
    await cache.delete(f"user_profile:{vk_id}")
    await notifier.send_moderation_result(
        vk_id=vk_id, approved=False, reason="Несоответствие требованиям"
    )
    return {"status": "ok", "message": "Expert rejected"}


@router.post(
    "/admin/{vk_id}/delete",
    status_code=200,
    dependencies=[Depends(get_current_admin_user)],
)
async def delete_expert_endpoint(
    vk_id: int,
    db: AsyncSession = Depends(get_db),
    cache: redis.Redis = Depends(get_redis),
):
    success = await expert_crud.delete_user_by_vk_id(db=db, vk_id=vk_id, cache=cache)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "ok", "message": "User deleted"}


@router.post("/me/update_profile", status_code=201)
async def request_profile_update(
    update_data: expert_schemas.ExpertProfileUpdate,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    notifier: Notifier = Depends(get_notifier),
):
    if not current_user.get("is_expert"):
        raise HTTPException(
            status_code=403, detail="Только эксперты могут обновлять профиль."
        )

    try:
        await expert_crud.create_profile_update_request(
            db=db, vk_id=current_user["vk_id"], update_data=update_data
        )

        await notifier.send_message(
            settings.ADMIN_ID,
            f"📝 Новая заявка на изменение профиля от ID {current_user['vk_id']}",
        )

        return {
            "status": "ok",
            "message": "Заявка на обновление отправлена модератору.",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/admin/updates",
    response_model=List[expert_schemas.ExpertUpdateRequestRead],
    dependencies=[Depends(get_current_admin_user)],
)
async def get_profile_updates(db: AsyncSession = Depends(get_db)):
    requests = await expert_crud.get_pending_update_requests(db)

    response = []
    for req in requests:
        expert = req.expert
        user = expert.user

        expert_info = {
            "vk_id": user.vk_id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "photo_url": str(user.photo_url),
            "regalia": expert.regalia,
            "social_link": str(expert.social_link),
            "performance_link": str(expert.performance_link),
            "region": expert.region,
            "topics": [f"{t.category.name} > {t.name}" for t in expert.selected_themes],
        }

        response.append(
            {
                "id": req.id,
                "expert_vk_id": req.expert_vk_id,
                "new_data": req.new_data,
                "status": req.status,
                "created_at": req.created_at,
                "expert_info": expert_info,
            }
        )

    return response


@router.post("/admin/updates/{request_id}/{action}")
async def moderate_update_request(
    request_id: int,
    action: str,
    db: AsyncSession = Depends(get_db),
    notifier: Notifier = Depends(get_notifier),
    cache: redis.Redis = Depends(get_redis),
):
    if action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Invalid action")

    result = await expert_crud.process_update_request(db, request_id, action)
    if not result:
        raise HTTPException(status_code=404, detail="Request not found")

    await cache.delete(f"user_profile:{result.expert_vk_id}")

    msg = (
        "✅ Ваш профиль успешно обновлен!"
        if action == "approve"
        else "❌ Изменения профиля отклонены."
    )
    await notifier.send_message(result.expert_vk_id, msg)

    return {"status": "ok"}
