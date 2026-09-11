#!/usr/bin/env -S uv run python
import argparse
import asyncio
import json
import re
import statistics
import time

import api.service.store
import api.settings

TOKEN_DELIMITER = "\x1f"


def build_annotation_sequence(source: dict) -> list[str]:
    lines = sorted(source["lines"], key=lambda line: line["line"])
    sequence: list[str] = []
    for line in lines:
        for key, value in line["annotations"].items():
            token = f"{key}={value}"
            if sequence and sequence[-1] == token:
                continue
            sequence.append(token)
    return sequence


def _glob_to_regex(term: str) -> str:
    pattern = []
    for char in term:
        if char == "*":
            pattern.append(f"[^{TOKEN_DELIMITER}]*")
        elif char == "?":
            pattern.append(f"[^{TOKEN_DELIMITER}]")
        else:
            pattern.append(char)
    return "".join(pattern)


def _term_to_token_pattern(term: str, default_key: str) -> str:
    full_term = term if "=" in term else f"{default_key}={term}"
    return rf"{TOKEN_DELIMITER}{_glob_to_regex(full_term)}(?={TOKEN_DELIMITER})"


def compile_query(query: str, default_key: str) -> re.Pattern:
    terms = [term.strip() for term in query.split("->")]
    if any(term == "" for term in terms):
        raise ValueError("Query terms cannot be empty; check for a stray '->'")

    token_patterns = [_term_to_token_pattern(term, default_key) for term in terms]
    return re.compile("".join(token_patterns))


def timing_stats(samples_ms: list[float]) -> dict:
    ordered = sorted(samples_ms)
    p95_index = min(len(ordered) - 1, int(len(ordered) * 0.95))
    return {
        "count": len(ordered),
        "min_ms": round(ordered[0], 3),
        "mean_ms": round(statistics.mean(ordered), 3),
        "median_ms": round(statistics.median(ordered), 3),
        "p95_ms": round(ordered[p95_index], 3),
        "max_ms": round(ordered[-1], 3),
    }


async def find_matching_notebooks(
    store: api.service.store.Store, user_id: str, key: str, query: str, repeat: int
) -> dict:
    pattern = compile_query(query, key)

    timings_ms = []
    matches = []
    notebooks_scanned = 0
    for i in range(repeat):
        start = time.perf_counter()
        sources = await store.find_documents(
            api.service.store.source_key_pattern(user_id)
        )
        iteration_matches = [
            source.get("filename")
            for source in sources
            if pattern.search(
                TOKEN_DELIMITER
                + TOKEN_DELIMITER.join(build_annotation_sequence(source))
                + TOKEN_DELIMITER
            )
            is not None
        ]
        timings_ms.append((time.perf_counter() - start) * 1000)
        if i == 0:
            matches = iteration_matches
            notebooks_scanned = len(sources)

    return {
        "approach": "redis client-side filter",
        "matches": matches,
        "notebooks_scanned": notebooks_scanned,
        "timing_ms": timing_stats(timings_ms),
    }


async def run(args: argparse.Namespace) -> dict:
    store = api.service.store.Store.connect(args.redis_url)
    try:
        return await find_matching_notebooks(
            store, str(args.user_id), args.key, args.query, args.repeat
        )
    finally:
        await store.close()


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--redis-url", default=api.settings.get().redis_url)
    parser.add_argument("--user-id", required=True)
    parser.add_argument("--key", default="step")
    parser.add_argument(
        "--query",
        required=True,
        help="DSL query. Use '->' for followed-by, '*'/'?' for wildcards "
        "within a term, and 'key=value' to target a specific annotation "
        "key, e.g. 'step=Data Preparation -> step=Data Acquisition'.",
    )
    parser.add_argument(
        "--repeat",
        type=int,
        default=20,
        help="Number of timed executions (default: 20).",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    result = asyncio.run(run(args))
    print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    main()
