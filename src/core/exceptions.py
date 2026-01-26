from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Перехватывает ошибки валидации Pydantic и возвращает понятные сообщения на русском языке.
    """
    errors = exc.errors()
    custom_errors = []

    for error in errors:
        # Проверяем ошибки URL
        if error["type"] == "url_scheme":
            custom_errors.append({
                "loc": error["loc"],
                "msg": "Пожалуйста, введите корректную ссылку, начинающуюся с http:// или https://",
                "type": error["type"]
            })
        else:
            custom_errors.append(error)

    return JSONResponse(
        status_code=422,
        content={"detail": custom_errors},
    )
