import datetime
import hashlib
import secrets
import typing

import fastapi
import fastapi.security
import jose
import jose.jwt
import pydantic

import api.service.annotation_definitions
import api.service.store
import api.settings

settings = api.settings.get()

jwt_token_header = fastapi.security.APIKeyHeader(
    name=settings.jwt_header_field, auto_error=False
)

Role = typing.Literal["admin", "member"]

_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
_PASSWORD_HASH_ITERATIONS = 200_000


class User(pydantic.BaseModel):
    id: int
    role: Role
    username: str
    name: str = ""
    password_hash: str | None = None


DEV_USER = User(id=0, role="admin", username="dev@localhost", name="Dev")


def generate_password(length: int = 12) -> str:
    return "".join(secrets.choice(_PASSWORD_ALPHABET) for _ in range(length))


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt), _PASSWORD_HASH_ITERATIONS
    ).hex()
    return f"{salt}${digest}"


def verify_password(password: str, password_hash: str) -> bool:
    salt, _, digest = password_hash.partition("$")
    expected = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt), _PASSWORD_HASH_ITERATIONS
    ).hex()
    return secrets.compare_digest(expected, digest)


def is_email_allowed(email: str) -> bool:
    return email in settings.allowed_google_emails_list


def issue_token(user: User) -> dict[str, typing.Any]:
    exp = datetime.datetime.now(datetime.UTC) + datetime.timedelta(
        hours=settings.jwt_expire_hours
    )
    token = jose.jwt.encode(
        {
            "sub": str(user.id),
            "username": user.username,
            "name": user.name,
            "exp": exp,
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    return {"jwt_token": token, "exp": int(exp.timestamp() * 1000)}


async def get_user_by_id(store: api.service.store.Store, user_id: int) -> User | None:
    document = await store.get_document(api.service.store.user_key(str(user_id)))
    if document is None:
        return None
    return User(**document)


async def get_user_by_username(
    store: api.service.store.Store, username: str
) -> User | None:
    user_id = await store.get_value(api.service.store.user_username_index_key(username))
    if user_id is None:
        return None
    return await get_user_by_id(store, int(user_id))


async def get_or_create_admin(
    store: api.service.store.Store, email: str, name: str
) -> User:
    existing_id = await store.get_value(
        api.service.store.user_username_index_key(email)
    )
    if existing_id is not None:
        user = await get_user_by_id(store, int(existing_id))
        if user is not None:
            return user

    user_id = await store.increment(api.service.store.user_id_counter_key())
    user = User(id=user_id, role="admin", username=email, name=name)
    await store.set_document(
        api.service.store.user_key(str(user.id)), user.model_dump()
    )
    await store.set_value(
        api.service.store.user_username_index_key(email), str(user.id)
    )
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


async def require_admin(user: UserDep) -> User:
    if user.role != "admin":
        raise fastapi.HTTPException(status_code=403, detail="Admin access required")
    return user


AdminDep = typing.Annotated[User, fastapi.Depends(require_admin)]
