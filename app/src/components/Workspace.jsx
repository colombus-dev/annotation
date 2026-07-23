import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { FileUpload } from './FileUpload'
import { SourceViewer } from './SourceViewer'
import { AnnotationPanel } from './AnnotationPanel'

export function Workspace({ authRequired, onLogout }) {
  const { sourceId } = useParams()
  const navigate = useNavigate()

  const [sources, setSources] = useState([])
  const [selectedSource, setSelectedSource] = useState(null)
  const [selection, setSelection] = useState({ start: 0, end: 0 })
  const [activeKey, setActiveKey] = useState('')
  const [keyValues, setKeyValues] = useState([])
  const [refreshCounter, setRefreshCounter] = useState(0)

  const refresh = () => setRefreshCounter((c) => c + 1)

  useEffect(() => {
    api.getSources().then(setSources).catch(console.error)
  }, [refreshCounter])

  useEffect(() => {
    setSelection({ start: 0, end: 0 })

    if (!sourceId) {
      setSelectedSource(null)
      return
    }

    let cancelled = false
    api
      .getSource(sourceId)
      .then((data) => {
        if (!cancelled) setSelectedSource(data)
      })
      .catch((err) => {
        console.error(err)
        if (!cancelled) navigate('/', { replace: true })
      })
    return () => {
      cancelled = true
    }
  }, [sourceId])

  function handleSelectSource(id) {
    navigate(`/source/${id}`)
  }

  function handleUploadSuccess(result) {
    refresh()
    navigate(`/source/${result.id}`)
  }

  async function handleDeleteSource(e, id) {
    e.stopPropagation()
    if (!window.confirm('Delete this source?')) return

    await api.deleteSource(id)
    if (selectedSource?.id === id) {
      navigate('/', { replace: true })
    }
    refresh()
  }

  async function handleAnnotated() {
    if (!selectedSource) return
    const updated = await api.getSource(selectedSource.id)
    setSelectedSource(updated)
    refresh()
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Annotation</h1>
        <FileUpload onUploadSuccess={handleUploadSuccess} />
        {authRequired && (
          <button className="logout-btn" onClick={onLogout}>Logout</button>
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
                <li key={s.id} className="source-item">
                  <button
                    className={selectedSource?.id === s.id ? 'active' : ''}
                    onClick={() => handleSelectSource(s.id)}
                  >
                    {s.filename}
                  </button>
                  <button
                    className="delete-source-btn"
                    title="Delete source"
                    aria-label={`Delete ${s.filename}`}
                    onClick={(e) => handleDeleteSource(e, s.id)}
                  >
                    &times;
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
