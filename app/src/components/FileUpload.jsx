import { useState } from 'react'
import { api } from '../api'
import './FileUpload.css'

export function FileUpload({ onUploadSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['.py', '.ipynb']
    const ext = '.' + file.name.split('.').pop()
    if (!validTypes.includes(ext)) {
      setError('Only .py and .ipynb files are supported')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await api.uploadSource(file)
      onUploadSuccess(result)
      e.target.value = ''
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="file-upload">
      <h2>Upload Source</h2>
      <div className="upload-input">
        <input
          type="file"
          accept=".py,.ipynb"
          onChange={handleFileSelect}
          disabled={loading}
          id="file-input"
        />
        <label htmlFor="file-input" className="upload-button">
          {loading ? 'Uploading...' : 'Choose File'}
        </label>
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  )
}
