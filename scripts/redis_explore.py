#!/usr/bin/env -S uv run python
import argparse
import asyncio
import json
import typing

import api.service.activity_log
import api.service.annotation_definitions
import api.service.store

ENV_REDIS_URLS = {
    "dev": "redis://localhost:6379/0",
    "prod": "redis://annotate_redis:6379/0",
}


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
    store = api.service.store.Store.connect(ENV_REDIS_URLS[args.env])
    try:
        if args.key is not None:
            return {args.key: await dump_key(store, args.key)}

        if args.scan is not None:
            keys = sorted(await store.scan_keys(args.scan))
            if not args.fetch:
                return keys
            return {key: await dump_key(store, key) for key in keys}

        if args.activity_logs:
            entries = await api.service.activity_log.list_entries(store, args.user_id)
            return [entry.model_dump() for entry in entries]

        if args.annotation_definitions:
            return await api.service.annotation_definitions.get(store)

        if args.sources:
            if args.source_id is not None:
                key = api.service.store.source_key(str(args.user_id), args.source_id)
                return await store.get_document(key)
            pattern = api.service.store.source_key_pattern(str(args.user_id))
            return await store.find_documents(pattern)

        raise AssertionError("no action selected")
    finally:
        await store.close()


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Explore annotation service data stored in Redis."
    )

    parser.add_argument(
        "--env",
        choices=sorted(ENV_REDIS_URLS),
        default="dev",
        help="Environment to connect to (default: dev). Ignored if --redis-url is set.",
    )

    parser.add_argument(
        "--user-id",
        type=int,
        help="User id, required by --activity-logs and --sources.",
    )
    parser.add_argument(
        "--source-id", help="Source id, narrows --sources to a single document."
    )

    action_group = parser.add_mutually_exclusive_group(required=True)
    action_group.add_argument(
        "--activity-logs",
        action="store_true",
        help="Read the user's activity log stream.",
    )
    action_group.add_argument(
        "--sources", action="store_true", help="Read the user's uploaded sources."
    )
    action_group.add_argument(
        "--annotation-definitions",
        action="store_true",
        help="Read the global annotation key/value definitions.",
    )
    action_group.add_argument(
        "--key", help="Read an arbitrary key, type-detected automatically."
    )
    action_group.add_argument(
        "--scan", help="List keys matching a glob pattern, e.g. 'annotate:user:*:logs'."
    )

    parser.add_argument(
        "--fetch",
        action="store_true",
        help="With --scan, also fetch and dump the value of every matched key.",
    )
    parser.add_argument(
        "--indent", type=int, default=2, help="JSON indent width (default: 2)."
    )

    args = parser.parse_args(argv)

    if (args.activity_logs or args.sources) and args.user_id is None:
        parser.error("--user-id is required with --activity-logs / --sources")
    if args.source_id is not None and not args.sources:
        parser.error("--source-id can only be used with --sources")

    return args


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    result = asyncio.run(run(args))
    print(json.dumps(result, indent=args.indent, default=str))


if __name__ == "__main__":
    main()
