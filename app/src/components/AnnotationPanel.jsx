import { useState, useEffect } from 'react'
import { api } from '../api'
import { PALETTE } from '../colors'
import './AnnotationPanel.css'

export function AnnotationPanel({
  source,
  selection,
  activeKey,
  onKeyChange,
  keyValues,
  onValuesChange,
  onAnnotated,
}) {
  const [keys, setKeys] = useState([])
  const [selectedValue, setSelectedValue] = useState('')
  const [newValue, setNewValue] = useState('')
  const [isAddingValue, setIsAddingValue] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.getAnnotationKeys().then(setKeys).catch(console.error)
  }, [])

  useEffect(() => {
    if (!activeKey) {
      onKeyChange('step')
    }
  }, [activeKey, onKeyChange])

  useEffect(() => {
    if (!activeKey) {
      onValuesChange([])
      return
    }
    api.getKeyValues(activeKey).then(onValuesChange).catch(console.error)
  }, [activeKey])

  useEffect(() => {
    if (keyValues.length > 0 && !selectedValue) {
      setSelectedValue(keyValues[0].name)
    }
  }, [keyValues, selectedValue])

  async function handleAnnotate() {
    if (!source || !activeKey || !selectedValue) return
    setLoading(true)
    setError(null)
    try {
      await api.annotateSource(
        source.id,
        selection.start,
        selection.end,
        activeKey,
        selectedValue === '__CLEAR__' ? '' : selectedValue
      )
      onAnnotated()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddValue(e) {
    e.preventDefault()
    if (!activeKey || !newValue.trim()) return
    setError(null)
    try {
      await api.createKeyValue(activeKey, newValue.trim())
      setNewValue('')
      setIsAddingValue(false)
      const updated = await api.getKeyValues(activeKey)
      onValuesChange(updated)
    } catch (err) {
      setError(err.message)
    }
  }

  if (!source) return null

  return (
    <div className="annotation-panel">
      <h3>Annotate</h3>

      <div className="selection-info">
        <span>Lines {selection.start + 1} – {selection.end + 1}</span>
      </div>

      <div className="field">
        <select
          value={selectedValue}
          onChange={(e) => setSelectedValue(e.target.value)}
          disabled={!activeKey}
        >
          <option value="__CLEAR__">-- Clear --</option>
          {keyValues.map((v) => (
            <option key={v.name} value={v.name}>{v.name}</option>
          ))}
        </select>
      </div>

      <button
        className="annotate-btn"
        onClick={handleAnnotate}
        disabled={!activeKey || !selectedValue || loading}
        style={selectedValue === '__CLEAR__' ? { background: '#ef4444', color: 'white' } : {}}
      >
        {loading ? 'Applying...' : (selectedValue === '__CLEAR__' ? 'Remove' : 'Annotate')}
      </button>

      {error && <div className="panel-error">{error}</div>}

      <div className="legend">
        <h4>Legend</h4>
        {keyValues.map((v, i) => (
          <div key={v.name} className="legend-item">
            <span
              className="legend-color"
              style={{ background: PALETTE[i] || '#6b728040' }}
            />
            <span>{v.name}</span>
          </div>
        ))}
        {isAddingValue ? (
          <div className="add-value" style={{ borderTop: 'none', paddingTop: '8px' }}>
            <form onSubmit={handleAddValue}>
              <input
                type="text"
                placeholder="New value..."
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                autoFocus
              />
              <button type="submit" disabled={!newValue.trim()}>Add</button>
            </form>
          </div>
        ) : (
          <button
            className="annotate-btn"
            style={{ marginTop: '12px', width: '100%', background: '#333' }}
            onClick={() => setIsAddingValue(true)}
            disabled={!activeKey}
          >
            Add Step
          </button>
        )}
      </div>
    </div>
  )
}
