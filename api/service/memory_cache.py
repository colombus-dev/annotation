import typing

import fastapi

SOURCES = "sources"
ANNOTATION_KEYS = "annotation_keys"
LOGS = "logs"

SessionIdDep = typing.Annotated[str, fastapi.Header(alias="x-session-id")]


def session_scope(base: str, session_id: str) -> str:
    return f"{base}:{session_id}"


class MemoryCache:
    def __init__(self) -> None:
        self._store: dict[str, dict[str, typing.Any]] = {}

    def scope(self, name: str) -> dict[str, typing.Any]:
        if name not in self._store:
            self._store[name] = {}
        return self._store[name]


def get(request: fastapi.Request) -> MemoryCache:
    return request.app.state.cache


CacheDep = typing.Annotated[MemoryCache, fastapi.Depends(get)]
