import fastapi
import pydantic

import api.service.memory_cache
import api.service.notebook_parser

router = fastapi.routing.APIRouter(
    prefix="/api/notebook/{notebook_id}/annotation", tags=["annotation"]
)


class AnnotationRequest(pydantic.BaseModel):
    start: int = pydantic.Field(ge=0)
    end: int = pydantic.Field(ge=0)
    step: api.service.notebook_parser.Step

    @pydantic.model_validator(mode="after")
    def validate_range(self) -> "AnnotationRequest":
        if self.end < self.start:
            raise ValueError(f"end ({self.end}) must be >= start ({self.start})")
        return self


@router.put("", status_code=200)
def put_notebook_annotation(
    notebook_id: str,
    body: AnnotationRequest,
    cache: api.service.memory_cache.CacheDep,
):
    scope_notebooks = cache.scope(api.service.memory_cache.NOTEBOOKS)
    if notebook_id not in scope_notebooks:
        raise fastapi.HTTPException(status_code=404, detail="Notebook not found")

    lines = scope_notebooks[notebook_id]["lines"]

    if body.end >= len(lines):
        raise fastapi.HTTPException(
            status_code=422,
            detail=f"end={body.end} is out of range, notebook has {len(lines)} lines (0–{len(lines) - 1})",
        )

    for i in range(body.start, body.end + 1):
        lines[i]["step"] = body.step

    return scope_notebooks[notebook_id]
