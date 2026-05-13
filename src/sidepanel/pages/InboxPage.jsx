import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'
import UserAvatar from '../components/UserAvatar'

export default function InboxPage() {
  const { user } = useAuthStore()
  const { closeInbox, openDM, unreadDMs, clearUnread } = useAppStore()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchConversations()
  }, [user])

  const fetchConversations = async () => {
    setLoading(true)

    // Get the latest message from each conversation the user is in
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (error) { console.error(error); setLoading(false); return }

    // Group by conversation_id, keep only the latest message per convo
    const seen = new Map()
    for (const msg of (data || [])) {
      if (!seen.has(msg.conversation_id)) {
        seen.set(msg.conversation_id, msg)
      }
    }

    // Build conversation list with the other person's info
    const convs = Array.from(seen.values()).map((msg) => {
      const isMe = msg.sender_id === user.id
      const otherUsername = isMe
        ? msg.conversation_id.split(':').find((id) => id !== user.id) // fallback
        : msg.sender_username
      return {
        convId: msg.conversation_id,
        otherUserId: isMe ? msg.receiver_id : msg.sender_id,
        otherUsername: isMe
          ? null // will resolve below
          : msg.sender_username,
        lastContent: msg.content,
        lastAt: msg.created_at,
        // If I'm the sender, receiver_username isn't stored — resolve it
        _resolveReceiver: isMe,
        _receiverId: msg.receiver_id
      }
    })

    // Resolve receiver usernames (where I was the sender)
    const needResolve = convs.filter((c) => c._resolveReceiver)
    if (needResolve.length > 0) {
      const ids = needResolve.map((c) => c._receiverId)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', ids)
      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p.username]))
      for (const c of convs) {
        if (c._resolveReceiver) {
          c.otherUsername = profileMap[c._receiverId] || 'Unknown'
        }
      }
    }

    setConversations(convs)
    setLoading(false)
  }

  const handleOpenDM = (conv) => {
    clearUnread(conv.convId)
    openDM({ id: conv.otherUserId, username: conv.otherUsername })
  }

  function timeAgo(ts) {
    if (!ts) return ''
    const diff = Date.now() - new Date(ts).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <>
      {/* Header */}
      <div className="dm-header">
        <button className="back-btn" onClick={closeInbox} title="Back">←</button>
        <div className="dm-user-info">
          <div className="dm-user-name">Direct Messages</div>
          <div className="dm-user-label">Your conversations</div>
        </div>
        <button
          className="btn-icon"
          onClick={fetchConversations}
          title="Refresh"
          style={{ fontSize: 12 }}
        >
          ↺
        </button>
      </div>

      {/* Conversation list */}
      <div className="message-list" style={{ padding: 0 }}>
        {loading && (
          <div className="loading-state">
            <span style={{ opacity: 0.5 }}>●</span>
            <span>Loading conversations…</span>
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">✉️</div>
            <span style={{ color: 'var(--text-soft)', fontWeight: 700 }}>No messages yet</span>
            <span className="empty-sub">
              Click someone's name in a chat room to start a DM
            </span>
          </div>
        )}

        {conversations.map((conv) => {
          const unread = unreadDMs[conv.convId]
          return (
            <div
              key={conv.convId}
              className="inbox-row"
              onClick={() => handleOpenDM(conv)}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <UserAvatar username={conv.otherUsername || '?'} size={36} />
                {unread && (
                  <span className="inbox-badge">{unread.count > 9 ? '9+' : unread.count}</span>
                )}
              </div>
              <div className="inbox-info">
                <div className="inbox-name-row">
                  <span className={`inbox-username${unread ? ' unread' : ''}`}>
                    {conv.otherUsername}
                  </span>
                  <span className="inbox-time">{timeAgo(conv.lastAt)}</span>
                </div>
                <div className={`inbox-preview${unread ? ' unread' : ''}`}>
                  {conv.lastContent}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
