import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TrashIcon } from 'lucide-react'
import { api } from '../api'
import { useToast } from '../hooks/useToast'
import { ROUTES, sourcePath } from '../routes'
import { ConfirmDialog } from './ui/confirm-dialog'
import { FileUpload } from './FileUpload'
import { SourceViewer } from './SourceViewer'
import { AnnotationPanel } from './AnnotationPanel'

export function Workspace() {
  const { sourceId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

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
        if (!cancelled) navigate(ROUTES.HOME, { replace: true })
      })
    return () => {
      cancelled = true
    }
  }, [sourceId])

  function handleSelectSource(id) {
    navigate(sourcePath(id))
  }

  function handleUploadSuccess(results) {
    refresh()
    const uploaded = Array.isArray(results) ? results : [results]
    const last = uploaded[uploaded.length - 1]
    if (last) {
      navigate(sourcePath(last.id))
    }
  }

  async function handleDeleteSource(id) {
    try {
      await api.deleteSource(id)
      if (selectedSource?.id === id) {
        navigate(ROUTES.HOME, { replace: true })
      }
      refresh()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleAnnotated() {
    if (!selectedSource) return
    const updated = await api.getSource(selectedSource.id)
    setSelectedSource(updated)
    refresh()
  }

  return (
    <div className="app-main">
      <aside className="sidebar">
        <FileUpload onUploadSuccess={handleUploadSuccess} />
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
                <ConfirmDialog
                  trigger={<TrashIcon size={14} />}
                  triggerProps={{
                    className: 'delete-source-btn',
                    title: 'Delete source',
                    'aria-label': `Delete ${s.filename}`,
                    onClick: (e) => e.stopPropagation(),
                  }}
                  title="Delete source?"
                  description={`This will permanently delete "${s.filename}" and its annotations. This cannot be undone.`}
                  onConfirm={() => handleDeleteSource(s.id)}
                />
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
  );
}
