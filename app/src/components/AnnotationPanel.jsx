import { useState, useEffect } from 'react'
import { ReorderList } from '@/components/ui/reorder-list'
import { GripVertical, TrashIcon } from 'lucide-react'
import { api } from '../api'
import useSeriesColors from '../hooks/useSeriesColors'
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
  const coloredValues = useSeriesColors(keyValues)

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

  function handleReorderFinish(newElements) {
    const newValues = newElements.map(el => keyValues.find(v => v.name === el.props['data-name']))
    onValuesChange(newValues)

    api.reorderKeyValues(activeKey, newValues.map(v => v.name))
      .catch((err) => {
        setError(err.message)
        api.getKeyValues(activeKey).then(onValuesChange).catch(console.error)
      })
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

      <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
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

      <div className="legend">
        <h4>Legend</h4>
        <div className="legend-scroll-area">
          <ReorderList
            onReorderFinish={handleReorderFinish}
            className="legend-list"
            itemClassName="legend-item"
            withDragHandle={true}
          >
            {coloredValues.map((v) => (
              <div key={v.name} data-name={v.name} className="flex items-center justify-between gap-2 border border-[#333] bg-[#121212] rounded-lg py-1.5 pl-3 pr-12 w-full">
                {/* Left side: Color and Text */}
                <div className="flex items-center gap-2 flex-1">
                  <span
                    style={{ background: v.color, width: '12px', height: '12px', borderRadius: '2px' }}
                  />
                  <span className="font-medium text-[11px] whitespace-nowrap overflow-hidden text-ellipsis">{v.name}</span>
                </div>

                {/* Right side: Actions */}
                <div className="flex items-center">
                  <button
                    className="text-[#a1a1aa] hover:text-white transition-colors flex"
                    title="Delete value"
                    aria-label={`Delete ${v.name}`}
                    onClick={(e) => { e.stopPropagation(); handleDeleteValue(v.name); }}
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>
            ))}
          </ReorderList>

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
          {error && <div className="panel-error" style={{ marginTop: '12px' }}>{error}</div>}
        </div>
      </div>
    </div>
  )
}
