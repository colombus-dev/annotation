import typing

import fastapi
import fastapi.security
import jose
import pydantic

import api.service.annotation_definitions
import api.service.store
import api.settings

settings = api.settings.get()

jwt_token_header = fastapi.security.APIKeyHeader(
    name=settings.jwt_header_field, auto_error=False
)


class User(pydantic.BaseModel):
    id: int
    email: str


DEV_USER = User(id=0, email="dev@localhost")


def is_email_allowed(email: str) -> bool:
    return email in settings.allowed_google_emails_list


async def get_user_by_id(store: api.service.store.Store, user_id: int) -> User | None:
    document = await store.get_document(api.service.store.user_key(str(user_id)))
    if document is None:
        return None
    return User(**document)


async def get_or_create_user(store: api.service.store.Store, email: str) -> User:
    existing_id = await store.get_value(api.service.store.user_email_index_key(email))
    if existing_id is not None:
        user = await get_user_by_id(store, int(existing_id))
        if user is not None:
            return user

    user_id = await store.increment(api.service.store.user_id_counter_key())
    user = User(id=user_id, email=email)
    await store.set_document(
        api.service.store.user_key(str(user.id)), user.model_dump()
    )
    await store.set_value(api.service.store.user_email_index_key(email), str(user.id))
    await api.service.annotation_definitions.create_keys(store, str(user.id))
    return user


async def check_token(
    store: api.service.store.StoreDep,
    token: str | None = fastapi.Security(jwt_token_header),
) -> User:
    if not settings.is_environment_production():
        await api.service.annotation_definitions.create_keys(store, str(DEV_USER.id))
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

    user = await get_user_by_id(store, int(payload["sub"]))
    if not user:
        raise fastapi.HTTPException(status_code=401, detail="Unknown user")
    return user


UserDep = typing.Annotated[User, fastapi.Depends(check_token)]
