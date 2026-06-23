import contextlib

import fastapi
import fastapi.middleware.cors

import api.routers.annotation
import api.routers.log
import api.routers.source
import api.service.memory_cache
import api.settings

settings = api.settings.get()


@contextlib.asynccontextmanager
async def lifespan(application: fastapi.FastAPI):
    cache = api.service.memory_cache.MemoryCache()
    application.state.cache = cache
    api.routers.annotation.initialize(cache)
    yield


def create_app() -> fastapi.FastAPI:
    application = fastapi.FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
    )
    application.add_middleware(
        fastapi.middleware.cors.CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(api.routers.source.router)
    application.include_router(api.routers.annotation.router)
    application.include_router(api.routers.log.router)
    return application


app = create_app()


@app.get("/api/ping")
def get_ping():
    return "pong"
