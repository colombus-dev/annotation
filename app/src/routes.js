export const ROUTES = {
  LOGIN: '/login',
  HOME: '/',
  SOURCE: '/source/:sourceId',
  TEAM: '/team',
  ACTIVITY: '/activity',
}

export function sourcePath(sourceId) {
  return `/source/${sourceId}`
}

export function activityPath(userId) {
  return `${ROUTES.ACTIVITY}?user=${userId}`
}
