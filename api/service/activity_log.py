import datetime
import typing
import uuid

import pydantic

import api.service.memory_cache


class LogEntry(pydantic.BaseModel):
    id: str
    timestamp: str
    action: str
    details: dict[str, typing.Any]


def record(
    cache: api.service.memory_cache.MemoryCache, action: str, **details: typing.Any
):
    scope = cache.scope(api.service.memory_cache.LOGS)
    entry = LogEntry(
        id=str(uuid.uuid4()),
        timestamp=datetime.datetime.now(datetime.UTC).isoformat(),
        action=action,
        details=details,
    )
    scope[entry.id] = entry
