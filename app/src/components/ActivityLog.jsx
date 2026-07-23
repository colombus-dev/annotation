import { useState, useEffect } from 'react'
import { api } from '../api'
import './ActivityLog.css'

export function ActivityLog({ refreshTrigger }) {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    api.getLogs().then(setLogs).catch(console.error)
  }, [refreshTrigger])

  if (logs.length === 0) {
    return <p className="activity-log-empty">No activity yet</p>
  }

  return (
    <div className="log-list">
      {[...logs].reverse().map((entry, i) => (
        <div key={i} className="log-entry">
          <span className="log-action">{entry.action}</span>
          <span className="log-details">
            {formatDetails(entry.action, entry.details)}
          </span>
          <span className="log-time">
            {new Date(entry.timestamp).toUTCString()}
          </span>
        </div>
      ))}
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
