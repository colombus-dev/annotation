#!/usr/bin/env -S uv run python
import argparse
import asyncio
import json
import typing

import api.service.store
import api.settings


async def dump_key(store: api.service.store.Store, key: str) -> object:
    client = store._client
    key_type = typing.cast("str", await client.type(key))

    if key_type == "none":
        return None
    if key_type == "ReJSON-RL":
        return await store.get_document(key)
    if key_type == "stream":
        entries = await store.read_stream(key)
        return [parse_stream_entry(entry_id, fields) for entry_id, fields in entries]
    if key_type == "string":
        value = typing.cast("str | None", await client.get(key))
        if value is None:
            return None
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    if key_type == "hash":
        return await client.hgetall(key)
    if key_type == "list":
        return await client.lrange(key, 0, -1)
    if key_type == "set":
        return sorted(await client.smembers(key))
    if key_type == "zset":
        return await client.zrange(key, 0, -1, withscores=True)

    raise ValueError(f"Unsupported redis type '{key_type}' for key '{key}'")


def parse_stream_entry(entry_id: str, fields: dict[str, str]) -> dict:
    entry = {"id": entry_id, **fields}
    if "details" in entry:
        try:
            entry["details"] = json.loads(entry["details"])
        except (TypeError, json.JSONDecodeError):
            pass
    return entry


async def run(args: argparse.Namespace) -> object:
    store = api.service.store.Store.connect(api.settings.get().redis_url)
    try:
        if args.key is not None:
            return {args.key: await dump_key(store, args.key)}

        keys = sorted(await store.scan_keys(args.scan))
        if not args.fetch:
            return keys
        return {key: await dump_key(store, key) for key in keys}
    finally:
        await store.close()


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    action_group = parser.add_mutually_exclusive_group(required=True)
    action_group.add_argument("--key", help="Read an arbitrary key")
    action_group.add_argument(
        "--scan", help="List keys matching a glob pattern for instance 'annotate:*'"
    )

    parser.add_argument(
        "--fetch",
        action="store_true",
        help="With --scan, also fetch and dump the value of every key.",
    )
    parser.add_argument(
        "--indent", type=int, default=2, help="JSON indent width default=2"
    )

    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    result = asyncio.run(run(args))
    print(json.dumps(result, indent=args.indent, default=str))


if __name__ == "__main__":
    main()
