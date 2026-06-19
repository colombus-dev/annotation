import typing

import fastapi

NOTEBOOKS = "notebooks"
STEPS = "steps"


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
