import typing

import fastapi
import fastapi.security
import jose
import pydantic

import api.settings

settings = api.settings.get()

jwt_token_header = fastapi.security.APIKeyHeader(
    name=settings.jwt_header_field, auto_error=False
)


class User(pydantic.BaseModel):
    id: int
    email: str


USERS: dict[str, User] = {
    email: User(id=i, email=email)
    for i, email in enumerate(settings.allowed_google_emails_list, start=1)
}

DEV_USER = User(id=0, email="dev@localhost")


def get_user_by_email(email: str) -> User | None:
    return USERS.get(email)


def get_user_by_id(user_id: int) -> User | None:
    return next((u for u in USERS.values() if u.id == user_id), None)


def check_token(
    token: str | None = fastapi.Security(jwt_token_header),
) -> User:
    if not settings.is_environment_production():
        return DEV_USER

    if not token:
        raise fastapi.HTTPException(status_code=401, detail="Missing token")

    try:
        payload = jose.jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except jose.JWTError:
        raise fastapi.HTTPException(status_code=401, detail="Invalid or expired token")

    user = get_user_by_id(int(payload["sub"]))
    if not user:
        raise fastapi.HTTPException(status_code=401, detail="Unknown user")
    return user


UserDep = typing.Annotated[User, fastapi.Depends(check_token)]
