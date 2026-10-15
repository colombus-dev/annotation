import fastapi
import google.auth.transport.requests
import google.oauth2.id_token
import pydantic

import api.service.activity_log
import api.service.auth
import api.service.store
import api.settings

router = fastapi.APIRouter(prefix="/api/auth", tags=["auth"])
settings = api.settings.get()


class AuthConfig(pydantic.BaseModel):
    auth_required: bool
    google_client_id: str


@router.get("/config")
def get_auth_config() -> AuthConfig:
    return AuthConfig(
        auth_required=settings.is_environment_production(),
        google_client_id=settings.google_client_id,
    )


class GoogleAuthRequest(pydantic.BaseModel):
    credential: str


@router.post("/google")
async def auth_google(body: GoogleAuthRequest, store: api.service.store.StoreDep):
    try:
        info = google.oauth2.id_token.verify_oauth2_token(
            body.credential,
            google.auth.transport.requests.Request(),
            settings.google_client_id,
        )
    except ValueError:
        raise fastapi.HTTPException(status_code=401, detail="Google auth failed")

    email = info["email"]
    if not api.service.auth.is_email_allowed(email):
        raise fastapi.HTTPException(status_code=401, detail="Google auth failed")

    user = await api.service.auth.get_or_create_admin(
        store, email, info.get("name", "")
    )

    await api.service.activity_log.record(store, user.id, "user_logged_in")

    return api.service.auth.issue_token(user)


class LoginRequest(pydantic.BaseModel):
    username: str
    password: str


@router.post("/login")
async def login(body: LoginRequest, store: api.service.store.StoreDep):
    user = await api.service.auth.get_user_by_username(store, body.username)
    if (
        user is None
        or user.password_hash is None
        or not api.service.auth.verify_password(body.password, user.password_hash)
    ):
        raise fastapi.HTTPException(
            status_code=401, detail="Invalid username or password"
        )

    await api.service.activity_log.record(store, user.id, "user_logged_in")

    return api.service.auth.issue_token(user)
