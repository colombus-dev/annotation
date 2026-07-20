import fastapi

import api.service.activity_log
import api.service.auth
import api.service.store

router = fastapi.APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("", status_code=200)
async def get_logs(
    store: api.service.store.StoreDep,
    user: api.service.auth.UserDep,
) -> list[api.service.activity_log.LogEntry]:
    return await api.service.activity_log.list_entries(store, user.id)
