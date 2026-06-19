import uuid

import fastapi

import api.service.memory_cache
import api.service.notebook_parser

router = fastapi.routing.APIRouter(prefix="/api/notebook", tags=["notebook"])


@router.post("", status_code=201)
async def post_notebook(
    notebook_file: fastapi.UploadFile,
    cache: api.service.memory_cache.CacheDep,
):
    content = await notebook_file.read()
    lines = api.service.notebook_parser.parse_code_lines(content)

    notebook_id = str(uuid.uuid4())
    scope_notebooks = cache.scope(api.service.memory_cache.NOTEBOOKS)
    scope_notebooks[notebook_id] = {
        "id": notebook_id,
        "filename": notebook_file.filename,
        "lines": lines,
    }

    return scope_notebooks[notebook_id]


@router.get("", status_code=200)
def get_notebooks(cache: api.service.memory_cache.CacheDep):
    return list(cache.scope(api.service.memory_cache.NOTEBOOKS).values())


@router.get("/{notebook_id}", status_code=200)
def get_notebook(
    notebook_id: str,
    cache: api.service.memory_cache.CacheDep,
):
    scope_notebooks = cache.scope(api.service.memory_cache.NOTEBOOKS)
    if notebook_id not in scope_notebooks:
        raise fastapi.HTTPException(status_code=404, detail="Notebook not found")
    return scope_notebooks[notebook_id]
