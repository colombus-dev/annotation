import enum

import fastapi
import pydantic

import api.service.memory_cache
import api.service.notebook_parser

router = fastapi.APIRouter(prefix="/api/steps", tags=["steps"])


class CreationMode(str, enum.Enum):
    MANUAL = "manual"
    AUTOMATIC = "automatic"


class StepRecord(pydantic.BaseModel):
    name: str
    creation_mode: CreationMode


class StepCreate(pydantic.BaseModel):
    name: str


@router.get("", status_code=200)
def get_steps(cache: api.service.memory_cache.CacheDep) -> list[StepRecord]:
    scope_steps = cache.scope(api.service.memory_cache.STEPS)
    return list(scope_steps.values())


@router.post("", status_code=201)
def post_step(body: StepCreate, cache: api.service.memory_cache.CacheDep) -> StepRecord:
    scope_steps = cache.scope(api.service.memory_cache.STEPS)
    if body.name in scope_steps:
        raise fastapi.HTTPException(status_code=400, detail="Step already exists")
    step = StepRecord(name=body.name, creation_mode=CreationMode.MANUAL)
    scope_steps[step.name] = step
    return step


def initialize(cache: api.service.memory_cache.MemoryCache):
    scope_steps = cache.scope(api.service.memory_cache.STEPS)
    for default_step in api.service.notebook_parser.Step:
        if default_step.value in scope_steps:
            raise Exception(f"Step {default_step.name} already exists")
        step = StepRecord(
            name=default_step.value,
            creation_mode=CreationMode.AUTOMATIC,
        )
        scope_steps[step.name] = step
