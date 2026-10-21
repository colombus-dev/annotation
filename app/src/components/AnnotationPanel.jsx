import { useState, useEffect } from 'react'
import { ReorderList } from '@/components/ui/reorder-list'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TrashIcon } from 'lucide-react'
import { api } from '../api'
import { useToast } from '../hooks/useToast'
import useSeriesColors, { ANNOTATION_HIGHLIGHT_ALPHA } from '../hooks/useSeriesColors'
import './AnnotationPanel.css'

export function AnnotationPanel({
  source,
  selection,
  activeKey,
  onKeyChange,
  keyValues,
  onValuesChange,
  onApply,
}) {
  const [newValue, setNewValue] = useState('')
  const [isAddingValue, setIsAddingValue] = useState(false)
  const coloredValues = useSeriesColors(keyValues)
  const toast = useToast()

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
    api
      .getKeyValues(activeKey)
      .then(onValuesChange)
      .catch(() => onValuesChange([]))
  }, [activeKey])

  async function handleDeleteValue(value) {
    if (!activeKey) return

    try {
      await api.deleteKeyValue(activeKey, value)
      const updated = await api.getKeyValues(activeKey)
      onValuesChange(updated)
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleAddValue(e) {
    e.preventDefault()
    if (!activeKey || !newValue.trim()) return
    try {
      await api.createKeyValue(activeKey, newValue.trim())
      setNewValue('')
      setIsAddingValue(false)
      const updated = await api.getKeyValues(activeKey)
      onValuesChange(updated)
    } catch (err) {
      toast.error(err.message)
    }
  }

  function handleReorderFinish(newElements) {
    const newValues = newElements.map(el => keyValues.find(v => v.name === el.props['data-name']))
    onValuesChange(newValues)

    api.reorderKeyValues(activeKey, newValues.map(v => v.name))
      .catch((err) => {
        toast.error(err.message)
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

      <div className="legend">
        <h4>Pipeline Steps</h4>
        <div className="legend-scroll-area">
          <div
            role="button"
            tabIndex={0}
            onClick={() => onApply(null)}
            onKeyDown={(e) => e.key === 'Enter' && onApply(null)}
            className="flex items-center gap-2 rounded-lg border-2 border-dashed border-border bg-transparent py-1.5 px-3 w-full cursor-pointer mb-1 text-foreground transition-colors hover:bg-muted"
          >
            <span className="font-medium text-[11px]">Not annotated</span>
          </div>

          <ReorderList
            onReorderFinish={handleReorderFinish}
            className="legend-list"
            itemClassName="legend-item"
            withDragHandle={true}
          >
            {coloredValues.map((v) => (
              <div
                key={v.name}
                data-name={v.name}
                onClick={() => onApply(v.name)}
                className="flex items-center justify-between gap-2 border border-border rounded-lg py-1.5 pl-3 pr-12 w-full cursor-pointer transition hover:brightness-90"
                style={{ background: `${v.color}${ANNOTATION_HIGHLIGHT_ALPHA}` }}
              >
                {/* Left side: Text */}
                <div className="flex items-center gap-2 flex-1">
                  <span className="font-medium text-[11px] whitespace-nowrap overflow-hidden text-ellipsis text-foreground">{v.name}</span>
                </div>

                {/* Right side: Actions */}
                <div className="flex items-center">
                  <ConfirmDialog
                    trigger={<TrashIcon size={14} />}
                    triggerProps={{
                      className: 'text-muted-foreground hover:text-foreground transition-colors flex',
                      title: 'Delete value',
                      'aria-label': `Delete ${v.name}`,
                      onClick: (e) => e.stopPropagation(),
                    }}
                    title="Delete value?"
                    description={`This will permanently delete "${v.name}" from this annotation key. This cannot be undone.`}
                    onConfirm={() => handleDeleteValue(v.name)}
                  />
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
              className="annotate-btn annotate-btn-secondary"
              style={{ marginTop: '12px', width: '100%' }}
              onClick={() => setIsAddingValue(true)}
              disabled={!activeKey}
            >
              Add Pipeline Step
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
