import { useEffect, useRef, useState } from 'react'

const EVENT_TYPES = [
  'pipeline:start',
  'agent:start',
  'agent:done',
  'agent:error',
  'log',
  'patch',
  'audit',
  'pipeline:done',
  'pipeline:error',
]

export function useSSE(url, onMessage, enabled = true) {
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef(null)
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    if (!enabled || !url || typeof EventSource === 'undefined') {
      setConnected(false)
      return undefined
    }

    let retryTimer
    let disposed = false

    const emit = (type, event) => {
      try {
        onMessageRef.current({ type, data: JSON.parse(event.data) })
      } catch {
        onMessageRef.current({ type, data: event.data })
      }
    }

    const connect = () => {
      if (disposed) return

      eventSourceRef.current?.close()
      const source = new EventSource(url)
      eventSourceRef.current = source

      source.onopen = () => setConnected(true)
      source.onmessage = (event) => emit('message', event)
      source.onerror = () => {
        setConnected(false)
        source.close()
        if (!disposed) retryTimer = window.setTimeout(connect, 3000)
      }

      EVENT_TYPES.forEach((eventType) => {
        source.addEventListener(eventType, (event) => emit(eventType, event))
      })
    }

    connect()

    return () => {
      disposed = true
      window.clearTimeout(retryTimer)
      eventSourceRef.current?.close()
      eventSourceRef.current = null
      setConnected(false)
    }
  }, [enabled, url])

  return connected
}
