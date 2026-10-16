import datetime
import typing
import uuid as uuid_lib

import api.service.activity_log
import api.service.store


def _wrap(name: str, attributes: dict[str, typing.Any]) -> dict[str, typing.Any]:
    return {"name": name, "attributes": attributes}


def _julian_day_number(date: datetime.date) -> int:
    return date.toordinal() + 1721425


def _pharo_duration(seconds: int, nanos: int = 0) -> dict[str, typing.Any]:
    return _wrap("Duration", {"seconds": seconds, "nanos": nanos})


def _pharo_date_and_time(value: datetime.datetime) -> dict[str, typing.Any]:
    utc_value = value.astimezone(datetime.UTC)
    offset = value.utcoffset() or datetime.timedelta()
    return _wrap(
        "DateAndTime",
        {
            "julianDayNumber": _julian_day_number(utc_value.date()),
            "seconds": utc_value.hour * 3600 + utc_value.minute * 60 + utc_value.second,
            "nanos": utc_value.microsecond * 1000,
            "offset": _pharo_duration(int(offset.total_seconds())),
        },
    )


def _pharo_uuid(value: uuid_lib.UUID) -> dict[str, typing.Any]:
    return _wrap("UUID", {"uuidData": list(value.bytes)})


def _record_name(action: str) -> str:
    return "".join(word.capitalize() for word in action.split("_")) + "Record"


def to_event(entry: api.service.activity_log.LogEntry) -> dict[str, typing.Any]:
    source_id = entry.details.get("source_id")
    attributes: dict[str, typing.Any] = {
        "dateTime": _pharo_date_and_time(
            datetime.datetime.fromisoformat(entry.timestamp)
        ),
        "windowId": _pharo_uuid(uuid_lib.UUID(source_id)) if source_id else None,
        "uuid": _pharo_uuid(uuid_lib.uuid5(uuid_lib.NAMESPACE_OID, entry.id)),
    }
    attributes.update(entry.details)
    return _wrap(_record_name(entry.action), attributes)


async def list_events(
    store: api.service.store.Store, user_id: int
) -> list[dict[str, typing.Any]]:
    entries = await api.service.activity_log.list_entries(store, user_id)
    return [to_event(entry) for entry in entries]
