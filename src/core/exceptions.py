from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Перехватывает ошибки валидации Pydantic и возвращает понятные сообщения на русском языке.
    """
    errors = exc.errors()
    custom_errors = []

    for error in errors:
        # Проверяем ошибки URL
        if error["type"] == "url_scheme":
            custom_errors.append(
                {
                    "loc": error["loc"],
                    "msg": "Пожалуйста, введите корректную ссылку, начинающуюся с http:// или https://",
                    "type": error["type"],
                }
            )
        else:
            custom_errors.append(error)

    return JSONResponse(
        status_code=422,
        content={"detail": custom_errors},
    )


class IdempotentException(Exception):
    def __init__(self, content: dict, status_code: int = 200):
        self.content = content
        self.status_code = status_code


async def idempotent_exception_handler(request: Request, exc: IdempotentException):
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.content,
        headers={"X-Idempotency-Cached": "true"},
    )
