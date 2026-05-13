import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'
import { moderate } from '../lib/moderation'
import Header from '../components/Header'
import UrlDropdown from '../components/UrlDropdown'
import MessageBubble from '../components/MessageBubble'
import MessageInput from '../components/MessageInput'
import ReplyBar from '../components/ReplyBar'

export default function ChatPage() {
  const { user, profile } = useAuthStore()
  const { currentUrl, tabs } = useAppStore()

  const [messages, setMessages]     = useState([])
  const [reactions, setReactions]   = useState({})
  const [replyingTo, setReplyingTo] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [retryKey, setRetryKey]     = useState(0)  // only for the manual Retry button
  const [modError, setModError]       = useState(null)

  const bottomRef  = useRef(null)
  const channelRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Re-fetch when app comes back from idle (visibilitychange → App.jsx → this event)
  useEffect(() => {
    const handler = () => setRetryKey((k) => k + 1)
    window.addEventListener('ningi:reconnect', handler)
    return () => window.removeEventListener('ningi:reconnect', handler)
  }, [])

  useEffect(() => {
    if (!currentUrl) {
      setMessages([])
      setReactions([])
      setLoading(false)
      return
    }

    // Tear down previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    setLoading(true)
    setError(null)
    setReplyingTo(null)

    let cancelled = false
    let firstSubscription = true

    // ── Fetch messages + reactions ─────────────────────────────
    const fetchAll = async () => {
      const { data: msgs, error: msgErr } = await supabase
        .from('messages')
        .select('*')
        .eq('room_url', currentUrl)
        .order('created_at', { ascending: true })
        .limit(150)

      if (cancelled || !mountedRef.current) return

      if (msgErr) {
        setError('Failed to load messages. Tap retry.')
        setLoading(false)
        return
      }

      const msgList = msgs || []
      setMessages(msgList)
      setLoading(false)

      if (msgList.length === 0) return

      const { data: rxns } = await supabase
        .from('reactions')
        .select('*')
        .in('message_id', msgList.map((m) => m.id))

      if (cancelled || !mountedRef.current) return
      if (rxns) {
        const map = {}
        for (const r of rxns) {
          if (!map[r.message_id]) map[r.message_id] = {}
          map[r.message_id][r.id] = r
        }
        setReactions(map)
      }
    }

    fetchAll()

    // ── Realtime channel ───────────────────────────────────────
    const channel = supabase
      .channel(`room:${currentUrl}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        if (!mountedRef.current) return
        setMessages((prev) => prev.find((m) => m.id === payload.id) ? prev : [...prev, payload])
      })
      .on('broadcast', { event: 'delete_message' }, ({ payload }) => {
        if (!mountedRef.current) return
        setMessages((prev) => prev.map((m) => m.id === payload.id ? { ...m, is_deleted: true } : m))
      })
      .on('broadcast', { event: 'reaction_update' }, ({ payload }) => {
        if (!mountedRef.current) return
        setReactions((prev) => ({ ...prev, [payload.message_id]: payload.reactions }))
      })
      .subscribe((status) => {
        if (!mountedRef.current) return

        if (status === 'SUBSCRIBED') {
          setError(null)
          if (!firstSubscription) {
            // Channel reconnected after a drop — re-fetch to catch up
            fetchAll()
          }
          firstSubscription = false
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('Connection lost. Tap retry.')
        }
      })

    channelRef.current = channel

    return () => {
      cancelled = true
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [currentUrl, retryKey])   // retryKey is ONLY for the manual Retry button

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Actions ────────────────────────────────────────────────
  const sendMessage = async (content) => {
    if (!content.trim() || !currentUrl || !user || !profile) return

    setModError(null)
    const blocked = moderate(content)
    if (blocked) { setModError(blocked); return }

    const { data, error: e } = await supabase
      .from('messages')
      .insert({
        room_url: currentUrl,
        user_id: user.id,
        username: profile.username,
        content: content.trim(),
        ...(replyingTo && {
          reply_to_id:       replyingTo.id,
          reply_to_username: replyingTo.username,
          reply_to_content:  replyingTo.content
        })
      })
      .select()
      .single()

    if (e) { console.error(e); return }
    setMessages((prev) => prev.find((m) => m.id === data.id) ? prev : [...prev, data])
    setReplyingTo(null)
    channelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: data })
  }

  const handleDelete = async (msgId) => {
    await supabase.from('messages').update({ is_deleted: true }).eq('id', msgId)
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, is_deleted: true } : m))
    channelRef.current?.send({ type: 'broadcast', event: 'delete_message', payload: { id: msgId } })
  }

  const handleReact = async (msgId, emoji) => {
    if (!user || !profile) return
    const msgReactions = reactions[msgId] || {}
    const existing = Object.values(msgReactions).find((r) => r.user_id === user.id && r.emoji === emoji)
    const updated = { ...msgReactions }
    if (existing) {
      await supabase.from('reactions').delete().eq('id', existing.id)
      delete updated[existing.id]
    } else {
      const { data } = await supabase
        .from('reactions')
        .insert({ message_id: msgId, user_id: user.id, username: profile.username, emoji })
        .select().single()
      if (data) updated[data.id] = data
    }
    setReactions((prev) => ({ ...prev, [msgId]: updated }))
    channelRef.current?.send({ type: 'broadcast', event: 'reaction_update', payload: { message_id: msgId, reactions: updated } })
  }

  const hasRoom = Boolean(currentUrl)

  return (
    <>
      <Header />
      <UrlDropdown />

      {currentUrl && (
        <div className="room-label">
          <div className="room-indicator" />
          <span className="room-label-text">{currentUrl}</span>
        </div>
      )}

      {error && (
        <div className="error-banner">
          <span>⚠ {error}</span>
          <button className="error-retry-btn" onClick={() => setRetryKey((k) => k + 1)}>
            Retry
          </button>
        </div>
      )}

      <div className="message-list">
        {!hasRoom && tabs.length === 0 && (
          <div className="no-room-state">
            <div style={{ fontSize: 36 }}>🎓</div>
            <span style={{ color: 'var(--text-soft)', fontWeight: 800, fontSize: 15 }}>
              No IGNOU tabs open
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.7 }}>
              Ningi is live on IGNOU pages.
              <br />Open an IGNOU page to start chatting.
            </span>
            <button
              className="open-ignou-btn"
              onClick={() => chrome.tabs.create({ url: 'https://www.ignou.ac.in' })}
            >
              Open ignou.ac.in ↗
            </button>
            <div className="coming-soon-note">
              🌐 Coming soon to more websites
            </div>
          </div>
        )}

        {!hasRoom && tabs.length > 0 && (
          <div className="no-room-state">
            <div style={{ fontSize: 36 }}>☝️</div>
            <span style={{ color: 'var(--text-soft)', fontWeight: 800, fontSize: 15 }}>
              Pick a room
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.7 }}>
              Select an IGNOU page from the dropdown above
            </span>
          </div>
        )}

        {hasRoom && loading && (
          <div className="loading-state">
            <span className="loading-dot" />
            <span>Loading messages…</span>
          </div>
        )}

        {hasRoom && !loading && messages.length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <span style={{ color: 'var(--text-soft)', fontWeight: 700 }}>No messages yet</span>
            <span className="empty-sub">Be the first to say something!</span>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            reactions={reactions[msg.id] || {}}
            onReply={setReplyingTo}
            onDelete={handleDelete}
            onReact={handleReact}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {modError && (
        <div className="mod-error-banner">
          <span>🚫 {modError}</span>
          <button onClick={() => setModError(null)}>✕</button>
        </div>
      )}
      <ReplyBar replyingTo={replyingTo} onCancel={() => setReplyingTo(null)} />
      <MessageInput onSend={sendMessage} disabled={!hasRoom || !!error} />
    </>
  )
}