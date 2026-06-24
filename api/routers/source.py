import pathlib
import uuid

import fastapi
import pydantic

import api.service.activity_log
import api.service.memory_cache
import api.service.source_parser

router = fastapi.routing.APIRouter(prefix="/api/source", tags=["source"])


class Annotation(pydantic.BaseModel):
    key: str
    value: str | None = None


class AnnotationRequest(pydantic.BaseModel):
    start: int = pydantic.Field(ge=0)
    end: int = pydantic.Field(ge=0)
    annotation: Annotation

    @pydantic.model_validator(mode="after")
    def validate_range(self) -> "AnnotationRequest":
        if self.end < self.start:
            raise ValueError(f"end ({self.end}) must be >= start ({self.start})")
        return self


def validate_annotation_value(
    annotation: Annotation, cache: api.service.memory_cache.MemoryCache
):
    if annotation.value is None:
        return
    scope = cache.scope(api.service.memory_cache.ANNOTATION_KEYS)
    if annotation.key not in scope:
        raise fastapi.HTTPException(
            status_code=422,
            detail=f"Unknown annotation key: '{annotation.key}', expected: {list(scope.keys())}",
        )
    if annotation.value not in scope[annotation.key]:
        raise fastapi.HTTPException(
            status_code=422,
            detail=f"Unknown value '{annotation.value}' for key '{annotation.key}', expected: {list(scope[annotation.key].keys())}",
        )


@router.post("", status_code=201)
async def post_source(
    file: fastapi.UploadFile,
    cache: api.service.memory_cache.CacheDep,
):
    suffix = pathlib.PurePath(file.filename or "").suffix
    parser = api.service.source_parser.PARSERS.get(suffix)
    if parser is None:
        raise fastapi.HTTPException(
            status_code=422,
            detail=f"Unsupported file type: '{suffix}', expected: {list(api.service.source_parser.PARSERS.keys())}",
        )

    content = await file.read()
    lines = parser(content)

    source_id = str(uuid.uuid4())
    scope = cache.scope(api.service.memory_cache.SOURCES)
    scope[source_id] = {
        "id": source_id,
        "filename": file.filename,
        "lines": lines,
    }

    api.service.activity_log.record(
        cache,
        "source_uploaded",
        source_id=source_id,
        filename=file.filename,
    )

    return scope[source_id]


@router.get("", status_code=200)
def get_sources(cache: api.service.memory_cache.CacheDep):
    return list(cache.scope(api.service.memory_cache.SOURCES).values())


@router.get("/{source_id}", status_code=200)
def get_source(
    source_id: str,
    cache: api.service.memory_cache.CacheDep,
):
    scope = cache.scope(api.service.memory_cache.SOURCES)
    if source_id not in scope:
        raise fastapi.HTTPException(status_code=404, detail="Source not found")
    return scope[source_id]


@router.put("/{source_id}/annotation", status_code=200)
def put_source_annotation(
    source_id: str,
    body: AnnotationRequest,
    cache: api.service.memory_cache.CacheDep,
):
    scope = cache.scope(api.service.memory_cache.SOURCES)
    if source_id not in scope:
        raise fastapi.HTTPException(status_code=404, detail="Source not found")

    validate_annotation_value(body.annotation, cache)

    lines = scope[source_id]["lines"]

    if body.end >= len(lines):
        raise fastapi.HTTPException(
            status_code=422,
            detail=f"end={body.end} is out of range, source has {len(lines)} lines (0-{len(lines) - 1})",
        )

    for i in range(body.start, body.end + 1):
        if body.annotation.value is None:
            lines[i]["annotations"].pop(body.annotation.key)
        else:
            lines[i]["annotations"][body.annotation.key] = body.annotation.value

    api.service.activity_log.record(
        cache,
        "annotation_updated",
        source_id=source_id,
        start=body.start,
        end=body.end,
        annotation=body.annotation.model_dump(),
    )

    return scope[source_id]
