import datetime
import json
import typing

import pydantic

import api.service.store


class LogEntry(pydantic.BaseModel):
    id: str
    timestamp: str
    action: str
    details: dict[str, typing.Any]


async def record(
    store: api.service.store.Store,
    user_id: int,
    action: str,
    **details: typing.Any,
) -> None:
    await store.append_to_stream(
        api.service.store.user_logs_key(str(user_id)),
        {
            "timestamp": datetime.datetime.now(datetime.UTC).isoformat(),
            "action": action,
            "details": json.dumps(details),
        },
    )


async def list_entries(store: api.service.store.Store, user_id: int) -> list[LogEntry]:
    entries = await store.read_stream(api.service.store.user_logs_key(str(user_id)))
    return [
        LogEntry(
            id=entry_id,
            timestamp=fields["timestamp"],
            action=fields["action"],
            details=json.loads(fields["details"]),
        )
        for entry_id, fields in entries
    ]
