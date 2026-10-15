import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const ToastContext = createContext(null)
const DURATION_MS = 4000

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id))
    clearTimeout(timers.current[id])
    delete timers.current[id]
  }, [])

  const push = useCallback(
    (message, variant) => {
      setToasts((current) => {
        const existing = current.find(
          (t) => t.message === message && t.variant === variant
        )
        if (existing) {
          clearTimeout(timers.current[existing.id])
          timers.current[existing.id] = setTimeout(
            () => dismiss(existing.id),
            DURATION_MS
          )
          return current
        }
        const id = Math.random().toString(36).slice(2)
        timers.current[id] = setTimeout(() => dismiss(id), DURATION_MS)
        return [...current, { id, message, variant }]
      })
    },
    [dismiss]
  )

  const toast = {
    error: (message) => push(message, 'error'),
    success: (message) => push(message, 'success'),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={cn(
              'flex items-center gap-2 rounded-md border px-3 py-2 text-sm shadow-lg',
              t.variant === 'error'
                ? 'border-destructive/30 bg-[color-mix(in_oklch,var(--destructive)_15%,var(--popover))] text-destructive'
                : 'border-border bg-popover text-popover-foreground'
            )}
          >
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="opacity-70 hover:opacity-100"
            >
              <XIcon size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
