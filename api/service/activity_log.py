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
    session_id: str,
    action: str,
    **details: typing.Any,
):
    scope = cache.scope(
        api.service.memory_cache.session_scope(
            api.service.memory_cache.LOGS, session_id
        )
    )
    entry = LogEntry(
        timestamp=datetime.datetime.now(datetime.UTC).isoformat(),
        action=action,
        details=details,
    )
    scope[str(len(scope))] = entry
