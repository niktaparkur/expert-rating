from typing import Dict, List, Optional

import redis.asyncio as redis
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.dependencies import (
    get_current_admin_user,
    get_current_user,
    get_db,
    get_notifier,
    get_redis,
)
from src.crud import expert_crud
from src.schemas import expert_schemas
from src.services.notifier import Notifier

router = APIRouter(prefix="/experts", tags=["Experts"])


@router.post("/register", status_code=201)
async def register_expert(
    expert_data: expert_schemas.ExpertCreate,
    db: AsyncSession = Depends(get_db),
    notifier: Notifier = Depends(get_notifier),
    cache: redis.Redis = Depends(get_redis),
):
    try:
        vk_id = expert_data.user_data.vk_id
        await expert_crud.create_expert_request(db=db, expert_data=expert_data)
        cache_key = f"user_profile:{vk_id}"
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
    for user, profile, stats_dict, topics in experts_data:
        user_data = expert_schemas.UserAdminRead.model_validate(
            user, from_attributes=True
        )
        user_data.status = profile.status
        user_data.stats = expert_schemas.Stats(**stats_dict)
        user_data.topics = topics
        user_data.show_community_rating = profile.show_community_rating
        user_data.regalia = profile.regalia
        user_data.social_link = str(profile.social_link)
        user_data.tariff_plan = profile.tariff_plan
        response_users.append(user_data)
    return {
        "items": response_users,
        "total_count": total_count,
        "page": page,
        "size": size,
    }


@router.get("/{vk_id}", response_model=expert_schemas.UserAdminRead)
async def get_expert_profile(
    vk_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user),
):
    result = await expert_crud.get_full_user_profile_with_stats(db=db, vk_id=vk_id)
    if not result:
        raise HTTPException(status_code=404, detail="Expert not found")
    user, profile, stats_dict, my_votes_stats_dict = result
    response_data = expert_schemas.UserAdminRead.model_validate(
        user, from_attributes=True
    )
    response_data.stats = expert_schemas.Stats(**stats_dict)
    response_data.my_votes_stats = expert_schemas.MyVotesStats(**my_votes_stats_dict)
    response_data.tariff_plan = profile.tariff_plan if profile else "Начальный"
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
):
    if vk_id == vote_data.voter_vk_id:
        raise HTTPException(status_code=400, detail="Вы не можете голосовать за себя.")

    is_comment_missing = (
        vote_data.vote_type == "trust" and not vote_data.comment_positive
    ) or (vote_data.vote_type == "distrust" and not vote_data.comment_negative)
    if is_comment_missing:
        raise HTTPException(
            status_code=400,
            detail="Комментарий является обязательным для этого действия.",
        )

    try:
        await expert_crud.create_community_vote(
            db=db, expert_vk_id=vk_id, vote_data=vote_data, notifier=notifier
        )
        await cache.delete(f"user_profile:{vk_id}")
        await cache.delete(f"user_profile:{vote_data.voter_vk_id}")
        return {"status": "ok", "message": "Your vote has been processed."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{vk_id}/vote", status_code=200)
async def cancel_vote_for_expert(
    vk_id: int,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    cache: redis.Redis = Depends(get_redis),
):
    voter_vk_id = current_user["vk_id"]
    success = await expert_crud.delete_community_vote(
        db=db, expert_vk_id=vk_id, voter_vk_id=voter_vk_id
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
    response_model=expert_schemas.PaginatedUsersResponse,
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
        user_data = expert_schemas.UserAdminRead.model_validate(
            user, from_attributes=True
        )
        if profile:
            user_data.status = profile.status
            user_data.tariff_plan = profile.tariff_plan
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
