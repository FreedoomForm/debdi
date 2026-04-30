'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * usePolling — periodically fetches a JSON endpoint and exposes
 * { data, error, loading, refresh }. Cancels in-flight requests on unmount
 * or when the URL/interval changes. Pauses polling when the document is
 * hidden (saves CPU/battery on POS terminals running 12h shifts).
 *
 * @param url      The endpoint to poll (or null to disable).
 * @param interval Poll interval in ms (default 15000).
 */
export function usePolling<T = unknown>(
  url: string | null,
  interval: number = 15000
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const fetchOnce = useCallback(async () => {
    if (!url) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as T
      setData(json)
      setError(null)
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') return
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    if (!url) return
    fetchOnce()
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchOnce()
    }, interval)
    return () => {
      window.clearInterval(id)
      abortRef.current?.abort()
    }
  }, [url, interval, fetchOnce])

  return { data, error, loading, refresh: fetchOnce }
}

export default usePolling
