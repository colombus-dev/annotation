import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { api, isAuthenticated, clearToken } from './api'
import { Login } from './components/Login'
import { Layout } from './components/Layout'
import { Team } from './components/Team'
import { Workspace } from './components/Workspace'
import { ROUTES } from './routes'
import './App.css'

function App() {
  const [authRequired, setAuthRequired] = useState(null)
  const [authed, setAuthed] = useState(isAuthenticated())
  const [user, setUser] = useState(null)

  useEffect(() => {
    api.getAuthConfig().then((config) => {
      setAuthRequired(config.auth_required)
      if (!config.auth_required) setAuthed(true)
    })
  }, [])

  useEffect(() => {
    if (!authed) {
      setUser(null)
      return
    }
    api.getCurrentUser().then(setUser).catch(console.error)
  }, [authed])

  if (authRequired === null) return null

  function handleLogout() {
    clearToken()
    setAuthed(false)
  }

  const isAdmin = user?.role === 'admin'

  return (
    <Routes>
      <Route
        path={ROUTES.LOGIN}
        element={
          authed ? (
            <Navigate to={ROUTES.HOME} replace />
          ) : (
            <Login onLogin={() => setAuthed(true)} />
          )
        }
      />
      <Route
        element={
          authed ? (
            <Layout user={user} authRequired={authRequired} onLogout={handleLogout} />
          ) : (
            <Navigate to={ROUTES.LOGIN} replace />
          )
        }
      >
        <Route path={ROUTES.SOURCE} element={<Workspace />} />
        <Route path={ROUTES.HOME} element={<Workspace />} />
        <Route
          path={ROUTES.TEAM}
          element={isAdmin ? <Team /> : <Navigate to={ROUTES.HOME} replace />}
        />
        <Route
          path={ROUTES.ACTIVITY}
          element={isAdmin ? null : <Navigate to={ROUTES.HOME} replace />}
        />
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Route>
    </Routes>
  )
}

export default App
