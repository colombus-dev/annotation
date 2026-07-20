import pathlib
import uuid

import fastapi
import pydantic

import api.service.activity_log
import api.service.annotation_definitions
import api.service.auth
import api.service.source_parser
import api.service.store

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


async def validate_annotation_value(
    annotation: Annotation, store: api.service.store.Store
):
    if annotation.value is None:
        return
    definitions = await api.service.annotation_definitions.get(store)
    if annotation.key not in definitions:
        raise fastapi.HTTPException(
            status_code=422,
            detail=f"Unknown annotation key: '{annotation.key}', expected: {list(definitions.keys())}",
        )
    if annotation.value not in definitions[annotation.key]:
        raise fastapi.HTTPException(
            status_code=422,
            detail=f"Unknown value '{annotation.value}' for key '{annotation.key}', expected: {list(definitions[annotation.key].keys())}",
        )


@router.post("", status_code=201)
async def post_source(
    file: fastapi.UploadFile,
    store: api.service.store.StoreDep,
    user: api.service.auth.UserDep,
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
    user_id = str(user.id)
    source = {
        "id": source_id,
        "filename": file.filename,
        "lines": lines,
    }

    await store.set_document(api.service.store.source_key(user_id, source_id), source)

    await api.service.activity_log.record(
        store, user.id, "source_uploaded", source_id=source_id, filename=file.filename
    )

    return source


@router.get("", status_code=200)
async def get_sources(
    store: api.service.store.StoreDep,
    user: api.service.auth.UserDep,
):
    user_id = str(user.id)
    return await store.find_documents(api.service.store.source_key_pattern(user_id))


@router.get("/{source_id}", status_code=200)
async def get_source(
    source_id: str,
    store: api.service.store.StoreDep,
    user: api.service.auth.UserDep,
):
    source = await store.get_document(
        api.service.store.source_key(str(user.id), source_id)
    )
    if source is None:
        raise fastapi.HTTPException(status_code=404, detail="Source not found")
    return source


@router.put("/{source_id}/annotation", status_code=200)
async def put_source_annotation(
    source_id: str,
    body: AnnotationRequest,
    store: api.service.store.StoreDep,
    user: api.service.auth.UserDep,
):
    user_id = str(user.id)
    key = api.service.store.source_key(user_id, source_id)

    if not await store.exists(key):
        raise fastapi.HTTPException(status_code=404, detail="Source not found")

    await validate_annotation_value(body.annotation, store)

    line_count = await store.get_array_length(key, "$.lines")
    if body.end >= line_count:
        raise fastapi.HTTPException(
            status_code=422,
            detail=f"end={body.end} is out of range, source has {line_count} lines (0-{line_count - 1})",
        )

    paths = [
        f"$.lines[{i}].annotations.{body.annotation.key}"
        for i in range(body.start, body.end + 1)
    ]
    if body.annotation.value is None:
        await store.delete_document_paths(key, paths)
    else:
        await store.set_document_paths(
            key, {path: body.annotation.value for path in paths}
        )

    await api.service.activity_log.record(
        store,
        user.id,
        "annotation_updated",
        source_id=source_id,
        start=body.start,
        end=body.end,
        annotation=body.annotation.model_dump(),
    )

    return await store.get_document(key)
