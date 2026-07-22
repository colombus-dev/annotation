import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { api, isAuthenticated, clearToken } from './api'
import { Login } from './components/Login'
import { Workspace } from './components/Workspace'
import './App.css'

function App() {
  const [authRequired, setAuthRequired] = useState(null)
  const [authed, setAuthed] = useState(isAuthenticated())

  useEffect(() => {
    api.getAuthConfig().then((config) => {
      setAuthRequired(config.auth_required)
      if (!config.auth_required) setAuthed(true)
    })
  }, [])

  if (authRequired === null) return null

  if (authRequired && !authed) {
    return <Login onLogin={() => setAuthed(true)} />
  }

  function handleLogout() {
    clearToken()
    setAuthed(false)
  }

  const workspace = <Workspace authRequired={authRequired} onLogout={handleLogout} />

  return (
    <Routes>
      <Route path="/source/:sourceId" element={workspace} />
      <Route path="/" element={workspace} />
    </Routes>
  )
}

export default App
