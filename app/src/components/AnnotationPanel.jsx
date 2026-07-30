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

  async function handleApplyAnnotation() {
    if (!source || !activeKey || !selectedValue) return
    setLoading(true)
    setError(null)
    try {
      await api.annotateSource(
        source.id,
        selection.start,
        selection.end,
        activeKey,
        selectedValue
      )
      onAnnotated()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleClearAnnotation() {
    if (!source || !activeKey) return
    setLoading(true)
    setError(null)
    try {
      await api.annotateSource(
        source.id,
        selection.start,
        selection.end,
        activeKey,
        null
      )
      onAnnotated()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteValue(value) {
    if (!activeKey) return
    if (!window.confirm(`Delete value "${value}"?`)) return

    setError(null)
    try {
      await api.deleteKeyValue(activeKey, value)
      const updated = await api.getKeyValues(activeKey)
      onValuesChange(updated)
      if (selectedValue === value) setSelectedValue('')
    } catch (err) {
      setError(err.message)
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

  async function handleMoveUp(index) {
    if (index === 0) return
    const newValues = [...keyValues]
    const temp = newValues[index - 1]
    newValues[index - 1] = newValues[index]
    newValues[index] = temp
    onValuesChange(newValues)
    try {
      await api.reorderKeyValues(activeKey, newValues.map(v => v.name))
    } catch (err) {
      setError(err.message)
      api.getKeyValues(activeKey).then(onValuesChange).catch(console.error)
    }
  }

  async function handleMoveDown(index) {
    if (index === keyValues.length - 1) return
    const newValues = [...keyValues]
    const temp = newValues[index + 1]
    newValues[index + 1] = newValues[index]
    newValues[index] = temp
    onValuesChange(newValues)
    try {
      await api.reorderKeyValues(activeKey, newValues.map(v => v.name))
    } catch (err) {
      setError(err.message)
      api.getKeyValues(activeKey).then(onValuesChange).catch(console.error)
    }
  }

  if (!source) return null

  return (
    <div className="annotation-panel">
      <h3>Annotate</h3>

      <div className="field">
        <label>Selected lines</label>
        <span className="selection-info-value">
          {selection.start === selection.end
            ? `Line ${selection.start + 1}`
            : `Lines ${selection.start + 1}–${selection.end + 1} (${selection.end - selection.start + 1
            } lines)`}
        </span>
      </div>

      <div className="field">
        <label>Value</label>
        <select
          value={selectedValue}
          onChange={(e) => setSelectedValue(e.target.value)}
          disabled={!activeKey}
        >
          {keyValues.length === 0 && <option value="">No options available</option>}
          {keyValues.map((v) => (
            <option key={v.name} value={v.name}>{v.name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
        <button
          className="annotate-btn"
          onClick={handleApplyAnnotation}
          disabled={!activeKey || !selectedValue || loading}
        >
          {loading ? 'Applying…' : 'Apply Annotation'}
        </button>

        <button
          className="annotate-btn"
          onClick={handleClearAnnotation}
          disabled={!activeKey || loading}
          style={{ background: '#ef4444', color: 'white' }}
        >
          Clear Annotation
        </button>
      </div>

      {error && <div className="panel-error">{error}</div>}

      <div className="legend">
        <h4>Legend</h4>
        {keyValues.map((v, i) => (
          <div key={v.name} className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              className="legend-color"
              style={{ background: PALETTE[i] || '#6b728040' }}
            />
            <span className="legend-name" style={{ flex: 1 }}>{v.name}</span>
            <div className="legend-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="reorder-btn"
                disabled={i === 0}
                onClick={() => handleMoveUp(i)}
                title="Move up"
                style={{ cursor: i === 0 ? 'default' : 'pointer', background: 'none', border: 'none', color: '#888', padding: '4px 6px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ▲
              </button>
              <button
                className="reorder-btn"
                disabled={i === keyValues.length - 1}
                onClick={() => handleMoveDown(i)}
                title="Move down"
                style={{ cursor: i === keyValues.length - 1 ? 'default' : 'pointer', background: 'none', border: 'none', color: '#888', padding: '4px 6px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ▼
              </button>
              {v.creation_mode === 'manual' ? (
                <button
                  className="delete-value-btn"
                  title="Delete value"
                  aria-label={`Delete ${v.name}`}
                  onClick={() => handleDeleteValue(v.name)}
                >
                  &times;
                </button>
              ) : (
                <div style={{ width: '16px' }} />
              )}
            </div>
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
            Add Pipeline Step
          </button>
        )}
      </div>
    </div>
  )
}
