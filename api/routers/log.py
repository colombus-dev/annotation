import fastapi

import api.service.activity_log
import api.service.auth
import api.service.memory_cache

router = fastapi.APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("", status_code=200)
def get_logs(
    cache: api.service.memory_cache.CacheDep,
    user: api.service.auth.UserDep,
) -> list[api.service.activity_log.LogEntry]:
    scope = cache.scope(
        api.service.memory_cache.user_scope(api.service.memory_cache.LOGS, str(user.id))
    )
    return list(scope.values())
