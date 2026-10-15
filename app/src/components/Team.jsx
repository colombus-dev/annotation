import { useEffect, useMemo, useState } from 'react'
import {
  CheckIcon,
  CopyIcon,
  KeyRoundIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from 'lucide-react'
import { api } from '../api'
import { useToast } from '../hooks/useToast'
import { roleLabel } from './UserAvatar'
import { ConfirmDialog } from './ui/confirm-dialog'
import { Badge } from './ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

const SORT_ACCESSORS = {
  name: (u) => (u.name || u.username).toLowerCase(),
  username: (u) => u.username.toLowerCase(),
  role: (u) => roleLabel(u.role).toLowerCase(),
  createdAt: (u) => u.created_at,
}


export function Team() {
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loadError, setLoadError] = useState('')
  const toast = useToast()

  const [addOpen, setAddOpen] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const [revealPassword, setRevealPassword] = useState(null)
  const [revealFor, setRevealFor] = useState('')
  const [copied, setCopied] = useState(false)

  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [search, setSearch] = useState('')

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = query
      ? users.filter(
          (u) =>
            (u.name || '').toLowerCase().includes(query) ||
            u.username.toLowerCase().includes(query)
        )
      : users

    const accessor = SORT_ACCESSORS[sortKey]
    const sorted = [...filtered].sort((a, b) => accessor(a).localeCompare(accessor(b)))
    return sortDir === 'asc' ? sorted : sorted.reverse()
  }, [users, search, sortKey, sortDir])

  useEffect(() => {
    api.getCurrentUser().then(setCurrentUser).catch(console.error)
    refresh()
  }, [])

  function refresh() {
    setLoadError('')
    api.getUsers().then(setUsers).catch((err) => setLoadError(err.message))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    try {
      const result = await api.createUser(newUsername.trim(), newName.trim())
      setUsers((u) => [...u, result.user])
      setRevealFor(result.user.name || result.user.username)
      setRevealPassword(result.password)
      setAddOpen(false)
      setNewUsername('')
      setNewName('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleRegeneratePassword(targetUser) {
    try {
      const result = await api.regeneratePassword(targetUser.id)
      setRevealFor(targetUser.name || targetUser.username)
      setRevealPassword(result.password)
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleDelete(userId) {
    try {
      await api.deleteUser(userId)
      setUsers((u) => u.filter((entry) => entry.id !== userId))
    } catch (err) {
      toast.error(err.message)
    }
  }

  function handleCopyPassword() {
    navigator.clipboard.writeText(revealPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Team</h1>
        <div className="mt-3 flex items-center justify-between gap-4">
          <div className="relative w-64">
            <SearchIcon
              size={14}
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search by name or username"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-border bg-card py-1.5 pl-8 pr-3 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            <PlusIcon size={14} />
            Add Annotator
          </button>
        </div>
      </div>

      {loadError ? (
        <p className="text-sm text-destructive">Could not load team members: {loadError}</p>
      ) : (
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead
              className="w-[28%]"
              onSort={() => toggleSort('name')}
              sortDirection={sortKey === 'name' ? sortDir : null}
            >
              Full name
            </TableHead>
            <TableHead
              className="w-[22%]"
              onSort={() => toggleSort('username')}
              sortDirection={sortKey === 'username' ? sortDir : null}
            >
              Username
            </TableHead>
            <TableHead
              className="w-[14%]"
              onSort={() => toggleSort('role')}
              sortDirection={sortKey === 'role' ? sortDir : null}
            >
              Role
            </TableHead>
            <TableHead
              className="w-[14%]"
              onSort={() => toggleSort('createdAt')}
              sortDirection={sortKey === 'createdAt' ? sortDir : null}
            >
              Created
            </TableHead>
            <TableHead className="w-[22%] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleUsers.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No items to display
              </TableCell>
            </TableRow>
          )}
          {visibleUsers.map((u) => {
            const isSelf = u.id === currentUser?.id
            return (
              <TableRow key={u.id}>
                <TableCell>
                  <span className="font-medium">
                    {u.name || u.username}
                    {isSelf && (
                      <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.username}</TableCell>
                <TableCell>
                  <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                    {roleLabel(u.role)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString('fr')}
                </TableCell>
                <TableCell className="text-right">
                  {!isSelf && (
                    <div className="flex items-center justify-end gap-1">
                      {u.role === 'member' && (
                        <ConfirmDialog
                          trigger={<KeyRoundIcon size={14} />}
                          triggerProps={{
                            className:
                              'rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground',
                            title: 'Regenerate password',
                            'aria-label': `Regenerate password for ${u.username}`,
                          }}
                          title="Regenerate password?"
                          description={`This will invalidate "${u.username}"'s current password. They won't be able to sign in until you share the new one with them.`}
                          confirmLabel="Regenerate"
                          variant="primary"
                          onConfirm={() => handleRegeneratePassword(u)}
                        />
                      )}
                      <ConfirmDialog
                        trigger={<TrashIcon size={14} />}
                        triggerProps={{
                          className:
                            'rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground',
                          title: 'Delete user',
                          'aria-label': `Delete ${u.username}`,
                        }}
                        title="Delete user?"
                        description={`This will permanently delete "${u.username}" and all of their sources, annotations, and activity logs. This cannot be undone.`}
                        onConfirm={() => handleDelete(u.id)}
                      />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Annotator</DialogTitle>
            <DialogDescription>
              A password will be auto-generated and shown once.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-3 pt-2">
            <input
              type="text"
              placeholder="Full name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              autoFocus
              className="rounded-md border border-border bg-card px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              required
              className="rounded-md border border-border bg-card px-3 py-2 text-sm"
            />
            <DialogFooter>
              <button
                type="submit"
                disabled={creating || !newUsername.trim() || !newName.trim()}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={revealPassword !== null}
        onOpenChange={(open) => {
          if (!open) setRevealPassword(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password for {revealFor}</DialogTitle>
            <DialogDescription>
              Share this with them now, it won't be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2">
            <span className="flex-1 select-all font-mono text-sm">
              {revealPassword}
            </span>
            <button
              type="button"
              onClick={handleCopyPassword}
              aria-label="Copy password"
              className="rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground"
            >
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
