import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  onDone: () => void
}

export function Toast({ message, onDone }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!message) return
    setVisible(true)
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 220) }, 2200)
    return () => clearTimeout(t)
  }, [message, onDone])

  if (!message) return null
  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-neutral-900 text-white text-xs font-semibold rounded-full px-4 py-2.5 whitespace-nowrap shadow-lg transition-all duration-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
    >
      {message}
    </div>
  )
}

// Hook to manage toast state
import { useCallback } from 'react'

export function useToast() {
  const [msg, setMsg] = useState('')
  const show = useCallback((m: string) => setMsg(m), [])
  const clear = useCallback(() => setMsg(''), [])
  return { msg, show, clear }
}
