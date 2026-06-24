import { useState, useEffect } from 'react'
import { api, isAuthenticated, clearToken } from './api'
import { Login } from './components/Login'
import { FileUpload } from './components/FileUpload'
import { SourceViewer } from './components/SourceViewer'
import { AnnotationPanel } from './components/AnnotationPanel'
import { ActivityLog } from './components/ActivityLog'
import './App.css'

function App() {
  const [authRequired, setAuthRequired] = useState(null)
  const [authed, setAuthed] = useState(isAuthenticated())
  const [sources, setSources] = useState([])
  const [selectedSource, setSelectedSource] = useState(null)
  const [selection, setSelection] = useState({ start: 0, end: 0 })
  const [activeKey, setActiveKey] = useState('')
  const [keyValues, setKeyValues] = useState([])
  const [refreshCounter, setRefreshCounter] = useState(0)

  const refresh = () => setRefreshCounter((c) => c + 1)

  useEffect(() => {
    api.getAuthConfig().then((config) => {
      setAuthRequired(config.auth_required)
      if (!config.auth_required) setAuthed(true)
    })
  }, [])

  useEffect(() => {
    if (!authed) return
    api.getSources().then(setSources).catch(console.error)
  }, [refreshCounter, authed])

  if (authRequired === null) return null

  if (authRequired && !authed) {
    return <Login onLogin={() => setAuthed(true)} />
  }

  async function handleSelectSource(sourceId) {
    const data = await api.getSource(sourceId)
    setSelectedSource(data)
    setSelection({ start: 0, end: 0 })
  }

  function handleUploadSuccess(result) {
    refresh()
    setSelectedSource(result)
  }

  async function handleAnnotated() {
    if (!selectedSource) return
    const updated = await api.getSource(selectedSource.id)
    setSelectedSource(updated)
    refresh()
  }

  function handleLogout() {
    clearToken()
    setAuthed(false)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Annotation</h1>
        <FileUpload onUploadSuccess={handleUploadSuccess} />
        {authRequired && (
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        )}
      </header>
      <div className="app-main">
        <aside className="sidebar">
          <h2>Sources</h2>
          {sources.length === 0 ? (
            <p className="empty">No sources uploaded</p>
          ) : (
            <ul>
              {sources.map((s) => (
                <li key={s.id}>
                  <button
                    className={selectedSource?.id === s.id ? 'active' : ''}
                    onClick={() => handleSelectSource(s.id)}
                  >
                    {s.filename}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <main className="editor-area">
          <SourceViewer
            source={selectedSource}
            activeKey={activeKey}
            keyValues={keyValues}
            onSelectionChange={(start, end) => setSelection({ start, end })}
          />
        </main>
        <AnnotationPanel
          source={selectedSource}
          selection={selection}
          activeKey={activeKey}
          onKeyChange={setActiveKey}
          keyValues={keyValues}
          onValuesChange={setKeyValues}
          onAnnotated={handleAnnotated}
        />
      </div>
    </div>
  )
}

export default App
