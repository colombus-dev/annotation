import fastapi
import pydantic

import api.service.activity_log
import api.service.annotation_definitions
import api.service.auth
import api.service.store

router = fastapi.APIRouter(prefix="/api/users", tags=["users"])

USER_LIST_ADAPTER: pydantic.TypeAdapter[list[api.service.auth.User]] = (
    pydantic.TypeAdapter(list[api.service.auth.User])
)


class UserOut(pydantic.BaseModel):
    id: int
    role: api.service.auth.Role
    username: str
    name: str


def _to_public(user: api.service.auth.User) -> UserOut:
    return UserOut(id=user.id, role=user.role, username=user.username, name=user.name)


@router.get("/me", status_code=200)
async def get_me(user: api.service.auth.UserDep) -> UserOut:
    return _to_public(user)


@router.get("", status_code=200)
async def list_users(
    store: api.service.store.StoreDep, admin: api.service.auth.AdminDep
) -> list[UserOut]:
    documents = await store.find_documents(api.service.store.user_key_pattern())
    users = USER_LIST_ADAPTER.validate_python(documents)
    return [_to_public(user) for user in users]


class CreateMemberRequest(pydantic.BaseModel):
    username: str
    name: str


class CreatedMember(pydantic.BaseModel):
    user: UserOut
    password: str


@router.post("", status_code=201)
async def create_member(
    body: CreateMemberRequest,
    store: api.service.store.StoreDep,
    admin: api.service.auth.AdminDep,
) -> CreatedMember:
    username = body.username.strip()
    if not username:
        raise fastapi.HTTPException(status_code=422, detail="Username is required")

    name = body.name.strip()
    if not name:
        raise fastapi.HTTPException(status_code=422, detail="Full name is required")

    if await api.service.auth.get_user_by_username(store, username) is not None:
        raise fastapi.HTTPException(
            status_code=400, detail=f"Username '{username}' is already taken"
        )

    password = api.service.auth.generate_password()
    user_id = await store.increment(api.service.store.user_id_counter_key())
    user = api.service.auth.User(
        id=user_id,
        role="member",
        username=username,
        name=name,
        password_hash=api.service.auth.hash_password(password),
    )
    await store.set_document(
        api.service.store.user_key(str(user.id)), user.model_dump()
    )
    await store.set_value(
        api.service.store.user_username_index_key(username), str(user.id)
    )
    await api.service.annotation_definitions.create_keys(store, str(user.id))

    await api.service.activity_log.record(
        store, admin.id, "user_created", target_user_id=user.id, username=username
    )

    return CreatedMember(user=_to_public(user), password=password)


async def _get_target_member(
    store: api.service.store.Store, admin: api.service.auth.User, user_id: int
) -> api.service.auth.User:
    if user_id == admin.id:
        raise fastapi.HTTPException(
            status_code=400, detail="You cannot perform this action on your own account"
        )
    user = await api.service.auth.get_user_by_id(store, user_id)
    if user is None:
        raise fastapi.HTTPException(status_code=404, detail="User not found")
    return user


class RegeneratedPassword(pydantic.BaseModel):
    password: str


@router.post("/{user_id}/regenerate-password", status_code=200)
async def regenerate_password(
    user_id: int,
    store: api.service.store.StoreDep,
    admin: api.service.auth.AdminDep,
) -> RegeneratedPassword:
    user = await _get_target_member(store, admin, user_id)
    if user.password_hash is None:
        raise fastapi.HTTPException(
            status_code=400, detail="This user does not use password login"
        )

    password = api.service.auth.generate_password()
    user = user.model_copy(
        update={"password_hash": api.service.auth.hash_password(password)}
    )
    await store.set_document(
        api.service.store.user_key(str(user.id)), user.model_dump()
    )

    await api.service.activity_log.record(
        store, admin.id, "user_password_regenerated", target_user_id=user.id
    )

    return RegeneratedPassword(password=password)


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    store: api.service.store.StoreDep,
    admin: api.service.auth.AdminDep,
) -> None:
    user = await _get_target_member(store, admin, user_id)

    source_keys = await store.scan_keys(
        api.service.store.source_key_pattern(str(user.id))
    )
    for key in source_keys:
        await store.delete_document(key)

    await store.delete_document(
        api.service.store.annotation_definitions_key(str(user.id))
    )
    await store.delete_value(api.service.store.user_logs_key(str(user.id)))
    await store.delete_value(api.service.store.user_username_index_key(user.username))
    await store.delete_value(api.service.store.user_key(str(user.id)))

    await api.service.activity_log.record(
        store, admin.id, "user_deleted", target_user_id=user.id, username=user.username
    )


@router.get("/{user_id}/logs", status_code=200)
async def get_user_logs(
    user_id: int,
    store: api.service.store.StoreDep,
    admin: api.service.auth.AdminDep,
) -> list[api.service.activity_log.LogEntry]:
    return await api.service.activity_log.list_entries(store, user_id)
