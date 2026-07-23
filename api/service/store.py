import typing

import fastapi
import redis.asyncio

PREFIX = "annotate"

MAX_STREAM_LENGTH = 1000


def annotation_definitions_key() -> str:
    return f"{PREFIX}:annotation:definitions"


def source_key(user_id: str, source_id: str) -> str:
    return f"{PREFIX}:user:{user_id}:sources:{source_id}"


def source_key_pattern(user_id: str) -> str:
    return f"{PREFIX}:user:{user_id}:sources:*"


def user_logs_key(user_id: str) -> str:
    return f"{PREFIX}:user:{user_id}:logs"


class Store:
    def __init__(self, client: redis.asyncio.Redis):
        self._client = client

    @classmethod
    def connect(cls, url: str) -> "Store":
        client = redis.asyncio.Redis.from_url(
            url,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            health_check_interval=30,
            retry_on_timeout=True,
        )
        return cls(client)

    async def close(self) -> None:
        await self._client.aclose()

    async def ping(self) -> bool:
        return await self._client.ping()

    async def exists(self, key: str) -> bool:
        return bool(await self._client.exists(key))

    async def get_document(self, key: str) -> dict | None:
        document = await self._client.json().get(key)
        return typing.cast("dict | None", document)

    async def get_documents(self, keys: list[str]) -> list[dict | None]:
        pipeline = self._client.pipeline(transaction=False)
        for key in keys:
            pipeline.json().get(key)
        return await pipeline.execute()

    async def find_documents(self, pattern: str) -> list[dict]:
        keys = await self.scan_keys(pattern)
        if not keys:
            return []
        documents = await self.get_documents(keys)
        return [document for document in documents if document is not None]

    async def set_document(self, key: str, value: dict) -> None:
        await self._client.json().set(key, "$", value)

    async def delete_document(self, key: str) -> None:
        await self._client.json().delete(key)

    async def scan_keys(self, match: str) -> list[str]:
        return [key async for key in self._client.scan_iter(match=match)]

    async def get_array_length(self, key: str, path: str) -> int:
        lengths = await self._client.json().arrlen(key, path)
        if not isinstance(lengths, list) or not lengths:
            raise ValueError(f"Could not read array length at '{path}' for key '{key}'")
        length = lengths[0]
        if length is None:
            raise ValueError(f"Could not read array length at '{path}' for key '{key}'")
        return length

    async def set_document_paths(
        self, key: str, path_values: dict[str, typing.Any]
    ) -> None:
        pipeline = self._client.pipeline(transaction=True)
        for path, value in path_values.items():
            pipeline.json().set(key, path, value)
        await pipeline.execute()

    async def delete_document_paths(self, key: str, paths: list[str]) -> None:
        pipeline = self._client.pipeline(transaction=True)
        for path in paths:
            pipeline.json().delete(key, path)
        await pipeline.execute()

    async def append_to_stream(self, key: str, fields: dict[str, str]) -> None:
        await self._client.xadd(
            key,
            typing.cast("dict[typing.Any, typing.Any]", fields),
            maxlen=MAX_STREAM_LENGTH,
        )

    async def read_stream(self, key: str) -> list[tuple[str, dict[str, str]]]:
        entries = await self._client.xrange(key)
        return typing.cast("list[tuple[str, dict[str, str]]]", entries or [])


def get(request: fastapi.Request) -> Store:
    return request.app.state.store


StoreDep = typing.Annotated[Store, fastapi.Depends(get)]
