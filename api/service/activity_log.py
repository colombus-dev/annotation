import datetime
import typing

import pydantic

import api.service.memory_cache


class LogEntry(pydantic.BaseModel):
    timestamp: str
    action: str
    details: dict[str, typing.Any]


def record(
    cache: api.service.memory_cache.MemoryCache,
    user_id: int,
    action: str,
    **details: typing.Any,
):
    scope = cache.scope(
        api.service.memory_cache.user_scope(api.service.memory_cache.LOGS, str(user_id))
    )
    entry = LogEntry(
        timestamp=datetime.datetime.now(datetime.UTC).isoformat(),
        action=action,
        details=details,
    )
    scope[str(len(scope))] = entry
