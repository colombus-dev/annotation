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


async def get(store: api.service.store.Store) -> dict:
    definitions = await store.get_document(
        api.service.store.annotation_definitions_key()
    )
    if definitions is None:
        return {}
    return definitions


def _create_key(definitions: dict, enum_cls: type[enum.Enum]) -> None:
    key = enum_cls.__name__
    key = key[0].lower() + key[1:]
    key = "".join(f"-{c.lower()}" if c.isupper() else c for c in key)
    definitions[key] = {}
    for member in enum_cls:
        record = ValueRecord(name=member.value, creation_mode=CreationMode.AUTOMATIC)
        definitions[key][record.name] = record.model_dump()


async def create_keys(store: api.service.store.Store) -> None:
    definitions_key = api.service.store.annotation_definitions_key()
    if await store.exists(definitions_key):
        return
    definitions: dict = {}
    _create_key(definitions, api.service.source_parser.Step)
    _create_key(definitions, api.service.source_parser.AlgorithmFamily)
    await store.set_document(definitions_key, definitions)
