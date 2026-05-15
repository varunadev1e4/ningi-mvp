import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'
import { moderate } from '../lib/moderation'
import UserAvatar from '../components/UserAvatar'
import MessageBubble from '../components/MessageBubble'
import MessageInput from '../components/MessageInput'
import ReplyBar from '../components/ReplyBar'
import ReportModal from '../components/ReportModal'

function convId(a, b) { return [a, b].sort().join(':') }

export default function DMPage() {
  const { user, profile } = useAuthStore()
  const { dmUser, closeDM, clearUnread } = useAppStore()

  const [messages, setMessages]     = useState([])
  const [replyingTo, setReplyingTo] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [retryKey, setRetryKey]     = useState(0)
  const [modError, setModError]       = useState(null)
  const [reportMsg, setReportMsg]     = useState(null)

  const bottomRef  = useRef(null)
  const channelRef = useRef(null)
  const mountedRef = useRef(true)
  const cid = user && dmUser ? convId(user.id, dmUser.id) : null

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])


  useEffect(() => {
    if (!cid) return
    clearUnread(cid)

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    setLoading(true)
    setError(null)
    setReplyingTo(null)

    let cancelled = false
    let firstSubscription = true
    let initialLoaded = false

    const fetchMessages = async ({ silent = false } = {}) => {
      if (!initialLoaded) setLoading(true)

      let data = null
      let lastErr = null
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 2000))
        if (cancelled || !mountedRef.current) return
        try {
          const result = await Promise.race([
            supabase.from('direct_messages').select('*')
              .eq('conversation_id', cid)
              .order('created_at', { ascending: true })
              .limit(150),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000))
          ])
          if (result.error) throw result.error
          data = result.data
          lastErr = null
          break
        } catch (e) {
          lastErr = e
        }
      }

      if (cancelled || !mountedRef.current) return
      if (lastErr) { if (silent) { window.location.reload(); return } setError('Could not load messages. Tap retry.'); setLoading(false); return }
      setMessages(data || [])
      setLoading(false)
        initialLoaded = true
    }

    fetchMessages()

    const channel = supabase
      .channel(`dm:${cid}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'new_dm' }, ({ payload }) => {
        if (!mountedRef.current) return
        setMessages((prev) => prev.find((m) => m.id === payload.id) ? prev : [...prev, payload])
      })
      .on('broadcast', { event: 'delete_dm' }, ({ payload }) => {
        if (!mountedRef.current) return
        setMessages((prev) => prev.map((m) => m.id === payload.id ? { ...m, is_deleted: true } : m))
      })
      .subscribe((status) => {
        if (!mountedRef.current) return
        if (status === 'SUBSCRIBED') {
          setError(null)
          if (!firstSubscription) fetchMessages()
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
  }, [cid, retryKey])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendDM = async (content) => {
    if (!content.trim() || !user || !profile || !dmUser || !cid) return

    setModError(null)
    const blocked = moderate(content)
    if (blocked) { setModError(blocked); return }

    const { data, error: err } = await supabase
      .from('direct_messages')
      .insert({
        conversation_id: cid,
        sender_id:       user.id,
        receiver_id:     dmUser.id,
        sender_username: profile.username,
        content:         content.trim(),
        ...(replyingTo && {
          reply_to_id:       replyingTo.id,
          reply_to_username: replyingTo.sender_username || replyingTo.username,
          reply_to_content:  replyingTo.content
        })
      })
      .select().single()

    if (err) { console.error(err); return }

    setMessages((prev) => prev.find((m) => m.id === data.id) ? prev : [...prev, data])
    setReplyingTo(null)
    channelRef.current?.send({ type: 'broadcast', event: 'new_dm', payload: data })

    // Notify recipient's inbox
    const rch = supabase.channel(`inbox:${dmUser.id}`)
    rch.subscribe((s) => {
      if (s === 'SUBSCRIBED') {
        rch.send({
          type: 'broadcast', event: 'incoming_dm',
          payload: { convId: cid, senderUsername: profile.username, content: content.trim() }
        }).then(() => supabase.removeChannel(rch))
      }
    })
  }

  const handleDelete = async (msgId) => {
    await supabase.from('direct_messages').update({ is_deleted: true }).eq('id', msgId)
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, is_deleted: true } : m))
    channelRef.current?.send({ type: 'broadcast', event: 'delete_dm', payload: { id: msgId } })
  }

  return (
    <>
      <div className="dm-header">
        <button className="back-btn" onClick={closeDM}>←</button>
        <UserAvatar username={dmUser?.username || '?'} size={30} />
        <div className="dm-user-info">
          <div className="dm-user-name">{dmUser?.username}</div>
          <div className="dm-user-label">Direct Message</div>
        </div>
        <button className="btn-icon" style={{ fontSize: 13 }}
          onClick={() => setRetryKey((k) => k + 1)} title="Refresh">↺</button>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠ {error}</span>
          <button className="error-retry-btn" onClick={() => setRetryKey((k) => k + 1)}>Retry</button>
        </div>
      )}

      <div className="message-list">
        {loading && <div className="loading-state"><span className="loading-dot" /><span>Loading…</span></div>}
        {!loading && messages.length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-icon">✉️</div>
            <span style={{ color: 'var(--text-soft)', fontWeight: 700 }}>Start a conversation</span>
            <span className="empty-sub">Say hi to {dmUser?.username}!</span>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={{ ...msg, user_id: msg.sender_id, username: msg.sender_username }}
            reactions={{}}
            onReply={setReplyingTo}
            onDelete={handleDelete}
            onReport={setReportMsg}
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
      <MessageInput onSend={sendDM} disabled={!!error} placeholder={`Message ${dmUser?.username}…`} />
      <ReportModal
        open={Boolean(reportMsg)}
        onClose={() => setReportMsg(null)}
        type="message"
        targetId={reportMsg?.id}
        targetName={reportMsg?.username || reportMsg?.sender_username}
        messageSnippet={reportMsg?.content?.slice(0, 120)}
      />
    </>
  )
}