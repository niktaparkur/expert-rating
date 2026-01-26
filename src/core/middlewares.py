from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from loguru import logger


async def integrity_error_handler(request: Request, exc: IntegrityError):
    logger.warning(f"IntegrityError caught: {str(exc)}")
    return JSONResponse(
        status_code=400,
        content={
            "detail": "Объект с такими данными уже существует или нарушает целостность"
        },
    )
