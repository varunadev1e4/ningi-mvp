import React, { useEffect, useRef } from 'react'
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

  useTabSync()

  useEffect(() => { init() }, [])

  // On visibility restore: refresh auth token, rewake realtime,
  // and broadcast a custom event so ChatPage/DMPage can re-fetch.
  // Using visibilitychange (not window.focus) avoids the dropdown-click race condition.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      supabase.auth.refreshSession().catch(() => {})
      try { supabase.realtime.connect() } catch {}
      window.dispatchEvent(new CustomEvent('ningi:reconnect'))
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // Personal DM notification channel
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
