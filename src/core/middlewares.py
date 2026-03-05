import uuid
from contextvars import ContextVar
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from loguru import logger

request_id_context: ContextVar[str] = ContextVar("request_id", default="system")

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        token = request_id_context.set(request_id)
        
        logger.info(f"Incoming request: {request.method} {request.url.path}")
        
        response = await call_next(request)
        
        response.headers["X-Request-ID"] = request_id
        
        logger.info(f"Request completed with status {response.status_code}")
        
        request_id_context.reset(token)
        return response


async def integrity_error_handler(request: Request, exc: IntegrityError):
    logger.warning(f"IntegrityError caught: {str(exc)}")
    return JSONResponse(
        status_code=400,
        content={
            "detail": "Объект с такими данными уже существует или нарушает целостность"
        },
    )
