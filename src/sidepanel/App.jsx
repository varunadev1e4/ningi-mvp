import React, { useEffect, useRef, useState } from 'react'
import { useAuthStore } from './stores/authStore'
import { useAppStore } from './stores/appStore'
import { supabase } from './lib/supabase'
import { useTabSync } from './lib/useTabSync'
import AuthPage from './pages/AuthPage'
import ChatPage from './pages/ChatPage'
import DMPage from './pages/DMPage'
import InboxPage from './pages/InboxPage'
import FeedbackPage from './pages/FeedbackPage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  const { user, loading, init } = useAuthStore()
  const { view, setCurrentUserId, addUnreadDM } = useAppStore()
  const notifChannelRef = useRef(null)
  const reloadTimerRef  = useRef(null)
  const [reconnecting, setReconnecting] = useState(false)

  useTabSync()
  useEffect(() => { init() }, [])

  // ── Global reconnect handler ─────────────────────────────────
  // Lives here so it works regardless of which page is currently open.
  // On visibility restore:
  //   1. Wake Supabase socket
  //   2. Show reconnecting overlay
  //   3. Start 3s timer — reload if no page signals healthy in time
  // Any page dispatches 'ningi:healthy' when its data/channel is ready,
  // which cancels the timer and hides the overlay.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      supabase.auth.refreshSession().catch(() => {})
      try { supabase.realtime.connect() } catch {}
      window.dispatchEvent(new CustomEvent('ningi:reconnect'))

      setReconnecting(true)
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current)
      reloadTimerRef.current = setTimeout(() => window.location.reload(), 1000)
    }

    const onHealthy = () => {
      if (reloadTimerRef.current) { clearTimeout(reloadTimerRef.current); reloadTimerRef.current = null }
      setReconnecting(false)
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('ningi:healthy', onHealthy)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('ningi:healthy', onHealthy)
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current)
    }
  }, [])

  // ── Personal DM inbox channel ────────────────────────────────
  useEffect(() => {
    if (!user) {
      if (notifChannelRef.current) {
        supabase.removeChannel(notifChannelRef.current)
        notifChannelRef.current = null
      }
      return
    }
    setCurrentUserId(user.id)
    const channel = supabase
      .channel(`inbox:${user.id}`)
      .on('broadcast', { event: 'incoming_dm' }, ({ payload }) => {
        addUnreadDM(payload.convId, payload.senderUsername, payload.content)
      })
      .subscribe()
    notifChannelRef.current = channel
    return () => {
      if (notifChannelRef.current) {
        supabase.removeChannel(notifChannelRef.current)
        notifChannelRef.current = null
      }
    }
  }, [user?.id])

  if (loading) {
    return (
      <div className="app-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, background: 'var(--primary)', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 900, color: '#fff'
          }}>N</div>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>loading…</span>
        </div>
      </div>
    )
  }

  if (!user) return <AuthPage />

  // ── Reconnecting overlay (shown over everything) ─────────────
  if (reconnecting) {
    return (
      <div className="app-shell">
        <div className="reconnecting-screen">
          <div className="reconnecting-spinner" />
          <span className="reconnecting-text">Reconnecting…</span>
          <span className="reconnecting-sub">Back in a moment</span>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {view === 'chat'     && <ChatPage />}
      {view === 'dm'       && <DMPage />}
      {view === 'inbox'    && <InboxPage />}
      {view === 'feedback' && <FeedbackPage />}
      {view === 'profile'  && <ProfilePage />}
    </div>
  )
}