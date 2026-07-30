import { useState, useEffect } from 'react'
import { Reorder } from 'framer-motion'
import { GripVertical, TrashIcon } from 'lucide-react'
import { api } from '../api'
import { PALETTE, buildColorMap } from '../colors'
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

  function handleApplyAnnotation() {
    if (!source || !activeKey || !selectedValue) return
    setLoading(true)
    setError(null)

    api.annotateSource(
      source.id,
      selection.start,
      selection.end,
      activeKey,
      selectedValue
    )
      .then(() => {
        onAnnotated()
      })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  function handleClearAnnotation() {
    if (!source || !activeKey) return
    setLoading(true)
    setError(null)

    api.annotateSource(
      source.id,
      selection.start,
      selection.end,
      activeKey,
      null
    )
      .then(() => {
        onAnnotated()
      })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
      })
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

  function handleReorderFinish(newValues) {
    onValuesChange(newValues)

    api.reorderKeyValues(activeKey, newValues.map(v => v.name))
      .catch((err) => {
        setError(err.message)
        api.getKeyValues(activeKey).then(onValuesChange).catch(console.error)
      })
  }

  if (!source) return null

  const colorMap = buildColorMap(keyValues)

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
        <Reorder.Group axis="y" values={keyValues} onReorder={handleReorderFinish} style={{ display: 'flex', flexDirection: 'column', gap: '4px', listStyleType: 'none', padding: 0 }}>
          {keyValues.map((v) => (
            <Reorder.Item key={v.name} value={v} className="legend-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: '#121212', border: '1px solid #333', padding: '8px 12px', borderRadius: '8px' }} whileDrag={{ scale: 1.02, cursor: 'grabbing', background: '#1a1a1a' }}>

              {/* Left side: Color and Text */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <span
                  className="legend-color"
                  style={{ background: PALETTE[colorMap[v.name]] || '#6b728040' }}
                />
                <span className="legend-name" style={{ fontWeight: 500 }}>{v.name}</span>
              </div>

              {/* Right side: Actions and Grip */}
              <div className="legend-actions" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {v.creation_mode === 'manual' ? (
                  <button
                    className="delete-value-btn"
                    title="Delete value"
                    aria-label={`Delete ${v.name}`}
                    onClick={(e) => { e.stopPropagation(); handleDeleteValue(v.name); }}
                    style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: 0, display: 'flex' }}
                  >
                    <TrashIcon size={16} />
                  </button>
                ) : (
                  <div style={{ width: '16px' }} />
                )}

                <div style={{ cursor: 'grab', color: '#a1a1aa', display: 'flex' }}>
                  <GripVertical size={16} />
                </div>
              </div>

            </Reorder.Item>
          ))}
        </Reorder.Group>
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
