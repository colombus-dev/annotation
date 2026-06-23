import fastapi

import api.service.activity_log
import api.service.memory_cache

router = fastapi.APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("", status_code=200)
def get_logs(
    cache: api.service.memory_cache.CacheDep,
    session_id: api.service.memory_cache.SessionIdDep,
) -> list[api.service.activity_log.LogEntry]:
    scope = cache.scope(
        api.service.memory_cache.session_scope(
            api.service.memory_cache.LOGS, session_id
        )
    )
    return list(scope.values())
