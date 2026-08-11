import { useState, useEffect, useRef, useMemo } from 'react'
import { DownloadIcon } from 'lucide-react'
import Editor from '@monaco-editor/react'
import useSeriesColors, { SERIES_COLOR_PALETTE } from '../hooks/useSeriesColors'
import './SourceViewer.css'

export function SourceViewer({ source, activeKey, keyValues, onSelectionChange }) {
  const editorRef = useRef(null)
  const decorationsRef = useRef([])
  const styleRef = useRef(null)
  const coloredValues = useSeriesColors(keyValues)
  const colorIndexByValue = useMemo(
    () => Object.fromEntries(coloredValues.map((v) => [v.name, v.colorIndex])),
    [coloredValues]
  )

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

    editor.onDidChangeCursorSelection((e) => {
      const sel = e.selection
      onSelectionChange(sel.startLineNumber - 1, sel.endLineNumber - 1)
    })

    applyDecorations()
  }

  function injectStyles() {
    if (!styleRef.current) {
      styleRef.current = document.createElement('style')
      document.head.appendChild(styleRef.current)
    }
    const rules = SERIES_COLOR_PALETTE.map(
      (color, i) => `.annotation-color-${i} { background: ${color}40 !important; }`
    ).join('\n')
    styleRef.current.textContent = rules
  }

  function applyDecorations() {
    const editor = editorRef.current
    if (!editor || !source || !activeKey) {
      if (editor) {
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [])
      }
      return
    }

    injectStyles()

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

  useEffect(() => {
    applyDecorations()
  }, [source, activeKey, keyValues])

  useEffect(() => {
    return () => {
      if (styleRef.current) {
        styleRef.current.remove()
      }
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
          theme="vs-dark"
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
