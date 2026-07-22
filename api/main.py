import contextlib

import fastapi
import fastapi.middleware.cors
import fastapi.responses

import api.routers.annotation
import api.routers.auth
import api.routers.log
import api.routers.source
import api.service.annotation_definitions
import api.service.store
import api.settings

settings = api.settings.get()


@contextlib.asynccontextmanager
async def lifespan(application: fastapi.FastAPI):
    store = api.service.store.Store.connect(settings.redis_url)
    application.state.store = store
    await api.service.annotation_definitions.create_keys(store)
    yield
    await store.close()


def create_app() -> fastapi.FastAPI:
    application = fastapi.FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        root_path=settings.root_path,
        lifespan=lifespan,
    )
    application.add_middleware(
        fastapi.middleware.cors.CORSMiddleware,
        allow_origins=["http://localhost:5174"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(api.routers.auth.router)
    application.include_router(api.routers.source.router)
    application.include_router(api.routers.annotation.router)
    application.include_router(api.routers.log.router)
    return application


app = create_app()


@app.get("/api/ping")
async def get_ping(store: api.service.store.StoreDep):
    await store.ping()
    return "pong"
