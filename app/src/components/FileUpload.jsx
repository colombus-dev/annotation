import { useState } from 'react'
import { api } from '../api'
import './FileUpload.css'

const VALID_TYPES = ['.py', '.ipynb']

export function FileUpload({ onUploadSuccess }) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const invalidFiles = files.filter((file) => {
      const ext = '.' + file.name.split('.').pop()
      return !VALID_TYPES.includes(ext)
    })
    if (invalidFiles.length > 0) {
      setError(
        `Only .py and .ipynb files are supported (rejected: ${invalidFiles
          .map((f) => f.name)
          .join(', ')})`
      )
      return
    }

    setLoading(true)
    setError(null)

    const uploaded = []
    const failed = []

    for (let i = 0; i < files.length; i++) {
      setProgress({ current: i + 1, total: files.length })
      try {
        uploaded.push(await api.uploadSource(files[i]))
      } catch (err) {
        failed.push(`${files[i].name}: ${err.message}`)
      }
    }

    setProgress(null)
    setLoading(false)
    e.target.value = ''

    if (failed.length > 0) {
      setError(failed.join('; '))
    }
    if (uploaded.length > 0) {
      onUploadSuccess(uploaded)
    }
  }

  return (
    <div className="file-upload">
      <h2>Upload</h2>
      <div className="upload-input">
        <input
          type="file"
          accept=".py,.ipynb"
          multiple
          onChange={handleFileSelect}
          disabled={loading}
          id="file-input"
        />
        <label htmlFor="file-input" className="upload-button">
          {loading
            ? `Uploading${progress ? ` ${progress.current}/${progress.total}` : '...'}`
            : 'Choose Files'}
        </label>
        <span className="file-types-hint">
          Supports .py, .ipynb (multiple files allowed)
        </span>
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  )
}
