import { useEffect, useRef } from 'react'
import { supabase } from './supabase'

/**
 * Centralized reconnect hook.
 * Fires onReconnect() whenever the panel regains visibility or focus.
 * Also refreshes the Supabase auth session and wakes the realtime socket.
 * Use this in any page that has a live subscription.
 */
export function useReconnect(onReconnect) {
  const cbRef = useRef(onReconnect)
  cbRef.current = onReconnect   // always latest without re-running effect

  useEffect(() => {
    const reconnect = async () => {
      if (document.visibilityState !== 'visible') return
      // 1. Refresh JWT so queries don't fail with expired token
      await supabase.auth.refreshSession().catch(() => {})
      // 2. Kick the WebSocket back awake
      try { supabase.realtime.connect() } catch (_) {}
      // 3. Tell the component to re-fetch + re-subscribe
      cbRef.current?.()
    }

    document.addEventListener('visibilitychange', reconnect)
    window.addEventListener('focus', reconnect)

    return () => {
      document.removeEventListener('visibilitychange', reconnect)
      window.removeEventListener('focus', reconnect)
    }
  }, [])
}
