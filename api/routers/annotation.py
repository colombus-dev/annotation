import re

import fastapi
import pydantic

import api.service.activity_log
import api.service.annotation_definitions
import api.service.auth
import api.service.store

router = fastapi.APIRouter(prefix="/api/annotation/keys", tags=["annotation-keys"])

ANNOTATION_KEY_PATTERN = re.compile(r"[a-z0-9-]+")


class ValueCreate(pydantic.BaseModel):
    name: str


@router.get("", status_code=200)
async def get_keys(store: api.service.store.StoreDep) -> list[str]:
    definitions = await api.service.annotation_definitions.get(store)
    return list(definitions.keys())


@router.get("/{key}", status_code=200)
async def get_key_values(
    key: str, store: api.service.store.StoreDep
) -> list[api.service.annotation_definitions.ValueRecord]:
    definitions = await api.service.annotation_definitions.get(store)
    if key not in definitions:
        raise fastapi.HTTPException(
            status_code=404, detail=f"Unknown annotation key: '{key}'"
        )
    values = [
        api.service.annotation_definitions.ValueRecord(**value)
        for value in definitions[key].values()
    ]
    values.sort(key=lambda v: v.name)
    return values


@router.post("/{key}", status_code=201)
async def post_key_value(
    key: str,
    body: ValueCreate,
    store: api.service.store.StoreDep,
    user: api.service.auth.UserDep,
) -> api.service.annotation_definitions.ValueRecord:
    if not ANNOTATION_KEY_PATTERN.fullmatch(key):
        raise fastapi.HTTPException(
            status_code=422,
            detail="Annotation key must be lowercase letters, digits and hyphens",
        )

    definitions = await api.service.annotation_definitions.get(store)
    if key not in definitions:
        definitions[key] = {}
    if len(definitions[key]) >= 10:
        raise fastapi.HTTPException(
            status_code=400,
            detail=f"Maximum of 10 values per key reached",
        )
    body.name = body.name.lower().replace(" ", "-")
    if body.name in definitions[key]:
        raise fastapi.HTTPException(
            status_code=400,
            detail=f"Value '{body.name}' already exists for key '{key}'",
        )
    record = api.service.annotation_definitions.ValueRecord(
        name=body.name,
        creation_mode=api.service.annotation_definitions.CreationMode.MANUAL,
    )
    definitions[key][record.name] = record.model_dump()
    await store.set_document(
        api.service.store.annotation_definitions_key(), definitions
    )

    await api.service.activity_log.record(
        store,
        user.id,
        "key_value_created",
        key=key,
        value=body.name,
    )

    return record


@router.delete("/{key}/{value}", status_code=204)
async def delete_key_value(
    key: str,
    value: str,
    store: api.service.store.StoreDep,
    user: api.service.auth.UserDep,
):
    definitions = await api.service.annotation_definitions.get(store)
    if key not in definitions:
        raise fastapi.HTTPException(
            status_code=404, detail=f"Unknown annotation key: '{key}'"
        )
    if value not in definitions[key]:
        raise fastapi.HTTPException(
            status_code=404, detail=f"Unknown value '{value}' for key '{key}'"
        )

    record = api.service.annotation_definitions.ValueRecord(**definitions[key][value])
    if record.creation_mode != api.service.annotation_definitions.CreationMode.MANUAL:
        raise fastapi.HTTPException(
            status_code=400,
            detail=f"Cannot delete automatically created value '{value}'",
        )

    await store.delete_document_paths(
        api.service.store.annotation_definitions_key(), [f"$.{key}.{value}"]
    )

    await api.service.activity_log.record(
        store,
        user.id,
        "key_value_deleted",
        key=key,
        value=value,
    )
