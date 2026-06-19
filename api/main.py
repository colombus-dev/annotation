import contextlib

import fastapi

import api.routers.annotation
import api.routers.notebook
import api.routers.step
import api.service.memory_cache
import api.settings

settings = api.settings.get()


@contextlib.asynccontextmanager
async def lifespan(application: fastapi.FastAPI):
    cache = api.service.memory_cache.MemoryCache()
    application.state.cache = cache
    api.routers.step.initialize(cache)
    yield


def create_app() -> fastapi.FastAPI:
    application = fastapi.FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
    )
    application.include_router(api.routers.notebook.router)
    application.include_router(api.routers.annotation.router)
    application.include_router(api.routers.step.router)
    return application


app = create_app()


@app.get("/api/ping")
def get_ping():
    return "pong"
