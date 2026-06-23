import { useState, useEffect } from 'react'
import { api } from '../api'
import './ActivityLog.css'

export function ActivityLog({ refreshTrigger }) {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    api.getLogs().then(setLogs).catch(console.error)
  }, [refreshTrigger])

  if (logs.length === 0) return null

  return (
    <div className="activity-log">
      <h3>Activity Log</h3>
      <div className="log-list">
        {[...logs].reverse().map((entry) => (
          <div key={entry.id} className="log-entry">
            <span className="log-action">{entry.action}</span>
            <span className="log-details">
              {formatDetails(entry.action, entry.details)}
            </span>
            <span className="log-time">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatDetails(action, details) {
  switch (action) {
    case 'source_uploaded':
      return details.filename
    case 'annotation_updated':
      return `lines ${details.start + 1}–${details.end + 1} → ${details.annotation?.key}: ${details.annotation?.value}`
    case 'key_value_created':
      return `${details.key}: ${details.value}`
    default:
      return JSON.stringify(details)
  }
}
