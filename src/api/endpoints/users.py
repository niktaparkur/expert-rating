from fastapi import APIRouter, Depends, HTTPException
from typing import Dict

from src.core.config import settings
from src.core.dependencies import get_current_user
from src.schemas.expert_schemas import UserAdminRead
from src.schemas.expert_schemas import UserCreate
from src.crud import expert_crud
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.dependencies import get_db

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserAdminRead)
async def read_users_me(current_user: Dict = Depends(get_current_user)):
    return current_user


@router.post("/register", response_model=UserAdminRead)
async def register_new_user(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Регистрирует нового пользователя в системе."""
    try:
        new_user = await expert_crud.create_user(db=db, user_data=user_data)
        response_data = UserAdminRead.model_validate(new_user, from_attributes=True)
        response_data.is_admin = new_user.vk_id == settings.ADMIN_ID
        return response_data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
