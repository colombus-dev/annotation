import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDownIcon, DownloadIcon } from 'lucide-react'
import { api } from '../api'
import { useToast } from '../hooks/useToast'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

const SORT_ACCESSORS = {
  time: (entry) => entry.timestamp,
  action: (entry) => entry.action,
}

function humanizeAction(action) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDetails(action, details) {
  switch (action) {
    case 'source_uploaded':
      return details.source_id
    case 'source_deleted':
    case 'source_viewed':
      return details.source_id
    case 'annotation_updated':
      return `lines ${details.start + 1}-${details.end + 1} -> ${details.annotation?.key}: ${details.annotation?.value ?? '(cleared)'}`
    case 'key_value_created':
    case 'key_value_deleted':
      return `${details.key}: ${details.value}`
    case 'key_values_reordered':
      return `${details.key}: ${details.values?.join(', ')}`
    case 'user_created':
    case 'user_deleted':
    case 'user_password_regenerated':
      return details.username
    case 'user_logged_in':
      return ''
    default:
      return JSON.stringify(details)
  }
}

export function Activity() {
  const [searchParams] = useSearchParams()
  const toast = useToast()

  const [users, setUsers] = useState([])
  const [usersError, setUsersError] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')

  const [logs, setLogs] = useState([])
  const [logsError, setLogsError] = useState('')

  const [exportMenuOpen, setExportMenuOpen] = useState(false)

  const [sortKey, setSortKey] = useState('time')
  const [sortDir, setSortDir] = useState('desc')

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  useEffect(() => {
    api
      .getUsers()
      .then((result) => {
        setUsers(result)
        const requested = searchParams.get('user')
        const match = requested && result.some((u) => String(u.id) === requested)
        if (match) {
          setSelectedUserId(requested)
        } else if (result.length > 0) {
          setSelectedUserId(String(result[0].id))
        }
      })
      .catch((err) => setUsersError(err.message))
  }, [])

  useEffect(() => {
    if (!selectedUserId) return
    setLogsError('')
    api
      .getUserLogs(selectedUserId)
      .then(setLogs)
      .catch((err) => setLogsError(err.message))
  }, [selectedUserId])

  async function handleExport(format) {
    setExportMenuOpen(false)
    try {
      const data =
        format === 'debuggingspy'
          ? await api.getUserLogsDebuggingSpy(selectedUserId)
          : logs
      const user = users.find((u) => String(u.id) === selectedUserId)
      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(JSON.stringify(data, null, 2))
      const anchor = document.createElement('a')
      anchor.setAttribute('href', dataStr)
      anchor.setAttribute(
        'download',
        `activity-${user?.username || selectedUserId}-${format}.json`
      )
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const sortedLogs = useMemo(() => {
    const accessor = SORT_ACCESSORS[sortKey]
    const sorted = [...logs].sort((a, b) => accessor(a).localeCompare(accessor(b)))
    return sortDir === 'asc' ? sorted : sorted.reverse()
  }, [logs, sortKey, sortDir])

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Activity History</h1>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="activity-user" className="text-sm text-muted-foreground">
              View logs for
            </label>
            <select
              id="activity-user"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-sm"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.username}
                </option>
              ))}
            </select>
          </div>

          <Popover open={exportMenuOpen} onOpenChange={setExportMenuOpen}>
            <PopoverTrigger
              disabled={!selectedUserId}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
            >
              <DownloadIcon size={14} />
              Export
              <ChevronDownIcon size={14} />
            </PopoverTrigger>
            <PopoverContent align="end">
              <button
                type="button"
                onClick={() => handleExport('raw')}
                className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                Standard format
              </button>
              <button
                type="button"
                onClick={() => handleExport('debuggingspy')}
                className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                Debugging spy format
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {usersError ? (
        <p className="text-sm text-destructive">Could not load team members: {usersError}</p>
      ) : logsError ? (
        <p className="text-sm text-destructive">Could not load activity: {logsError}</p>
      ) : (
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead
                className="w-[18%]"
                onSort={() => toggleSort('time')}
                sortDirection={sortKey === 'time' ? sortDir : null}
              >
                Time
              </TableHead>
              <TableHead
                className="w-[22%]"
                onSort={() => toggleSort('action')}
                sortDirection={sortKey === 'action' ? sortDir : null}
              >
                Action
              </TableHead>
              <TableHead className="w-[60%]">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No items to display
                </TableCell>
              </TableRow>
            )}
            {sortedLogs.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(entry.timestamp).toLocaleString('fr')}
                </TableCell>
                <TableCell className="font-medium">{humanizeAction(entry.action)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDetails(entry.action, entry.details)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
