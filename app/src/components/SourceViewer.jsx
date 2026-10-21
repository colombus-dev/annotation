import { useState, useEffect, useRef, useMemo } from 'react'
import { DownloadIcon } from 'lucide-react'
import Editor from '@monaco-editor/react'
import useSeriesColors, {
  ANNOTATION_HIGHLIGHT_ALPHA,
  SERIES_COLOR_PALETTE,
} from '../hooks/useSeriesColors'
import { useTheme } from '../hooks/useTheme'
import './SourceViewer.css'

export function SourceViewer({ source, activeKey, keyValues, onSelectionChange, onApply }) {
  const [theme] = useTheme()
  const editorRef = useRef(null)
  const decorationsRef = useRef([])
  const styleRef = useRef(null)
  const actionsRef = useRef([])
  const coloredValues = useSeriesColors(keyValues)
  const colorIndexByValue = useMemo(
    () => Object.fromEntries(coloredValues.map((v) => [v.name, v.colorIndex])),
    [coloredValues]
  )

  const sourceRef = useRef(source)
  const activeKeyRef = useRef(activeKey)
  const keyValuesRef = useRef(keyValues)
  const onApplyRef = useRef(onApply)
  const colorIndexByValueRef = useRef(colorIndexByValue)
  useEffect(() => {
    sourceRef.current = source
    activeKeyRef.current = activeKey
    keyValuesRef.current = keyValues
    onApplyRef.current = onApply
    colorIndexByValueRef.current = colorIndexByValue
  }, [source, activeKey, keyValues, onApply, colorIndexByValue])

  function handleDownloadJson() {
    if (!source) return
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(source, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)

    let newFilename = source.filename || 'source.json'
    if (newFilename.includes('.')) {
      newFilename = newFilename.split('.').slice(0, -1).join('.') + '_annotated.json'
    } else {
      newFilename += '_annotated.json'
    }

    downloadAnchorNode.setAttribute("download", newFilename)
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  function handleEditorMount(editor) {
    editorRef.current = editor

    editor.onDidChangeCursorSelection(() => {
      const selection = editor.getSelection()
      onSelectionChange(selection.startLineNumber - 1, selection.endLineNumber - 1)
      syncEditor()
    })

    syncEditor()
  }

  function getUniformAnnotation(source, activeKey, startLine, endLine) {
    let value
    for (let i = startLine; i <= endLine; i++) {
      const lineValue = source.lines[i]?.annotations?.[activeKey] ?? null
      if (value === undefined) {
        value = lineValue
      } else if (value !== lineValue) {
        return undefined
      }
    }
    return value
  }

  function injectStyles() {
    if (!styleRef.current) {
      styleRef.current = document.createElement('style')
      document.head.appendChild(styleRef.current)
    }
    const rules = SERIES_COLOR_PALETTE.map(
      (color, i) =>
        `.annotation-color-${i} { background: ${color}${ANNOTATION_HIGHLIGHT_ALPHA} !important; }`
    ).join('\n')
    styleRef.current.textContent = rules
  }

  function applyDecorations(editor, source, activeKey) {
    if (!source || !activeKey) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [])
      return
    }

    injectStyles()
    const colorIndexByValue = colorIndexByValueRef.current

    const newDecorations = []
    source.lines.forEach((line) => {
      const value = line.annotations?.[activeKey]
      if (!value || !(value in colorIndexByValue)) return

      newDecorations.push({
        range: {
          startLineNumber: line.line + 1,
          startColumn: 1,
          endLineNumber: line.line + 1,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: `annotation-color-${colorIndexByValue[value]}`,
        },
      })
    })

    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      newDecorations
    )
  }

  function registerAnnotateActions(editor, source, activeKey, keyValues, onApply) {
    actionsRef.current.forEach((action) => action.dispose())
    actionsRef.current = []
    if (!source || !activeKey) return

    const selection = editor.getSelection()
    const startLine = selection ? selection.startLineNumber - 1 : 0
    const endLine = selection ? selection.endLineNumber - 1 : 0
    const currentValue = getUniformAnnotation(source, activeKey, startLine, endLine)

    const groupId = `annotation.${activeKey}`
    const keyLabel = 'Pipeline Step'
    const tick = (checked) => (checked ? '✓ ' : '   ')

    actionsRef.current = [
      editor.addAction({
        id: `annotation.${activeKey}.unset`,
        label: `${tick(currentValue === null)}${keyLabel}: Not annotated`,
        contextMenuGroupId: groupId,
        contextMenuOrder: 0,
        run: () => onApply(null),
      }),
      ...keyValues.map((v, i) =>
        editor.addAction({
          id: `annotation.${activeKey}.${v.name}`,
          label: `${tick(currentValue === v.name)}${keyLabel}: ${v.name}`,
          contextMenuGroupId: groupId,
          contextMenuOrder: i + 1,
          run: () => onApply(v.name),
        })
      ),
    ]
  }

  function syncEditor() {
    const editor = editorRef.current
    if (!editor) return

    const source = sourceRef.current
    const activeKey = activeKeyRef.current
    const keyValues = keyValuesRef.current
    const onApply = onApplyRef.current

    applyDecorations(editor, source, activeKey)
    registerAnnotateActions(editor, source, activeKey, keyValues, onApply)
  }

  useEffect(() => {
    syncEditor()
  }, [source, activeKey, keyValues])

  useEffect(() => {
    return () => {
      if (styleRef.current) {
        styleRef.current.remove()
      }
      actionsRef.current.forEach((action) => action.dispose())
    }
  }, [])

  if (!source) {
    return (
      <div className="source-viewer-empty">
        <p>Select a source to view</p>
      </div>
    )
  }

  const code = source.lines.map((l) => l.content).join('\n')

  return (
    <div className="source-viewer">
      <div className="source-header">
        <span className="source-filename">{source.filename}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="source-line-count">{source.lines.length} lines</span>
          <button
            className="download-btn"
            onClick={handleDownloadJson}
            title="Export to JSON"
            aria-label="Export to JSON"
          >
            <DownloadIcon size={14} />
          </button>
        </div>
      </div>
      <div className="editor-container">
        <Editor
          height="100%"
          language="python"
          value={code}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          onMount={handleEditorMount}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            fontSize: 13,
            glyphMargin: false,
            folding: false,
          }}
        />
      </div>
    </div>
  )
}
