import enum

import fastapi
import pydantic

import api.service.activity_log
import api.service.auth
import api.service.memory_cache
import api.service.source_parser

router = fastapi.APIRouter(prefix="/api/annotation/keys", tags=["annotation-keys"])


class CreationMode(str, enum.Enum):
    MANUAL = "manual"
    AUTOMATIC = "automatic"


class ValueRecord(pydantic.BaseModel):
    name: str
    creation_mode: CreationMode


class ValueCreate(pydantic.BaseModel):
    name: str


@router.get("", status_code=200)
def get_keys(cache: api.service.memory_cache.CacheDep) -> list[str]:
    scope = cache.scope(api.service.memory_cache.ANNOTATION_KEYS)
    return list(scope.keys())


@router.get("/{key}", status_code=200)
def get_key_values(
    key: str, cache: api.service.memory_cache.CacheDep
) -> list[ValueRecord]:
    scope = cache.scope(api.service.memory_cache.ANNOTATION_KEYS)
    if key not in scope:
        raise fastapi.HTTPException(
            status_code=404, detail=f"Unknown annotation key: '{key}'"
        )
    values = list(scope[key].values())
    values = sorted(values, key=lambda v: v.name)
    return values


@router.post("/{key}", status_code=201)
def post_key_value(
    key: str,
    body: ValueCreate,
    cache: api.service.memory_cache.CacheDep,
    user: api.service.auth.UserDep,
) -> ValueRecord:
    scope = cache.scope(api.service.memory_cache.ANNOTATION_KEYS)
    if key not in scope:
        scope[key] = {}
    if len(scope[key]) >= 10:
        raise fastapi.HTTPException(
            status_code=400,
            detail=f"Maximum of 10 values per key reached",
        )
    body.name = body.name.lower().replace(" ", "-")
    if body.name in scope[key]:
        raise fastapi.HTTPException(
            status_code=400,
            detail=f"Value '{body.name}' already exists for key '{key}'",
        )
    record = ValueRecord(name=body.name, creation_mode=CreationMode.MANUAL)
    scope[key][record.name] = record

    api.service.activity_log.record(
        cache,
        user.id,
        "key_value_created",
        key=key,
        value=body.name,
    )

    return record


def _seed_key(scope, enum_cls):
    key = enum_cls.__name__
    key = key[0].lower() + key[1:]
    key = "".join(f"-{c.lower()}" if c.isupper() else c for c in key)
    scope[key] = {}
    for member in enum_cls:
        record = ValueRecord(name=member.value, creation_mode=CreationMode.AUTOMATIC)
        scope[key][record.name] = record


def initialize(cache: api.service.memory_cache.MemoryCache):
    scope = cache.scope(api.service.memory_cache.ANNOTATION_KEYS)
    _seed_key(scope, api.service.source_parser.Step)
    _seed_key(scope, api.service.source_parser.AlgorithmFamily)
