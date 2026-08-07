import enum

import pydantic

import api.service.source_parser
import api.service.store


class CreationMode(str, enum.Enum):
    MANUAL = "manual"
    AUTOMATIC = "automatic"


class ValueRecord(pydantic.BaseModel):
    name: str
    creation_mode: CreationMode
    order: int = 0


async def get(store: api.service.store.Store, user_id: str) -> dict:
    definitions = await store.get_document(
        api.service.store.annotation_definitions_key(user_id)
    )
    if definitions is None:
        return {}
    return definitions


def _create_key(definitions: dict, enum_cls: type[enum.Enum]) -> None:
    key = enum_cls.__name__
    key = key[0].lower() + key[1:]
    key = "".join(f"-{c.lower()}" if c.isupper() else c for c in key)
    definitions[key] = {}
    for i, member in enumerate(enum_cls):
        record = ValueRecord(
            name=member.value, creation_mode=CreationMode.AUTOMATIC, order=i
        )
        definitions[key][record.name] = record.model_dump()


async def create_keys(store: api.service.store.Store, user_id: str) -> None:
    definitions_key = api.service.store.annotation_definitions_key(user_id)
    if await store.exists(definitions_key):
        return
    definitions: dict = {}
    _create_key(definitions, api.service.source_parser.Step)
    _create_key(definitions, api.service.source_parser.AlgorithmFamily)
    await store.set_document(definitions_key, definitions)
