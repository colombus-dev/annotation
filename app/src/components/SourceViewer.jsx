import { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { PALETTE, buildColorMap } from '../colors'
import './SourceViewer.css'

export function SourceViewer({ source, activeKey, keyValues, onSelectionChange }) {
  const editorRef = useRef(null)
  const decorationsRef = useRef([])
  const styleRef = useRef(null)

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
    const rules = PALETTE.map(
      (color, i) => `.annotation-color-${i} { background: ${color} !important; }`
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
    const colorMap = buildColorMap(keyValues)

    const newDecorations = []
    source.lines.forEach((line) => {
      const value = line.annotations?.[activeKey]
      if (!value || !(value in colorMap)) return

      newDecorations.push({
        range: {
          startLineNumber: line.line + 1,
          startColumn: 1,
          endLineNumber: line.line + 1,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: `annotation-color-${colorMap[value]}`,
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
        <span className="source-line-count">{source.lines.length} lines</span>
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
