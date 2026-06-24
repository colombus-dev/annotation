import datetime

import fastapi
import google.auth.transport.requests
import google.oauth2.id_token
import jose.jwt
import pydantic

import api.service.auth
import api.settings

router = fastapi.APIRouter(prefix="/api/auth", tags=["auth"])
settings = api.settings.get()


class AuthConfig(pydantic.BaseModel):
    google_client_id: str


@router.get("/config")
def get_auth_config() -> AuthConfig:
    return AuthConfig(google_client_id=settings.google_client_id)


class GoogleAuthRequest(pydantic.BaseModel):
    credential: str


@router.post("/google")
def auth_google(body: GoogleAuthRequest):
    try:
        info = google.oauth2.id_token.verify_oauth2_token(
            body.credential,
            google.auth.transport.requests.Request(),
            settings.google_client_id,
        )
    except ValueError:
        raise fastapi.HTTPException(status_code=401, detail="Google auth failed")

    user = api.service.auth.get_user_by_email(info["email"])
    if not user:
        raise fastapi.HTTPException(status_code=401, detail="Email not allowed")

    exp = datetime.datetime.now(datetime.UTC) + datetime.timedelta(
        hours=settings.jwt_expire_hours
    )
    token = jose.jwt.encode(
        {
            "sub": str(user.id),
            "email": user.email,
            "name": info.get("name", ""),
            "exp": exp,
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    return {"jwt_token": token, "exp": int(exp.timestamp() * 1000)}
