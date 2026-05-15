import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'
import { useFriendsStore } from '../stores/friendsStore'
import UserAvatar from '../components/UserAvatar'

export default function InboxPage() {
  const { user } = useAuthStore()
  const { closeInbox, openDM, unreadDMs, clearUnread, setPendingFriendRequests } = useAppStore()
  const { pendingReceived, friends, fetchFriends, acceptRequest, rejectRequest } = useFriendsStore()

  const [tab, setTab]                 = useState('messages')
  const [conversations, setConvos]    = useState([])
  const [loading, setLoading]         = useState(true)
  const [actionId, setActionId]       = useState(null)

  useEffect(() => {
    if (!user) return
    fetchConversations()
    fetchFriends(user.id)
  }, [user])

  // Keep header badge in sync
  useEffect(() => {
    setPendingFriendRequests(pendingReceived.length)
  }, [pendingReceived.length])

  const fetchConversations = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (error) { setLoading(false); return }

    const seen = new Map()
    for (const msg of (data || [])) {
      if (!seen.has(msg.conversation_id)) seen.set(msg.conversation_id, msg)
    }

    const convs = Array.from(seen.values()).map((msg) => {
      const isMe = msg.sender_id === user.id
      return {
        convId: msg.conversation_id,
        otherUserId: isMe ? msg.receiver_id : msg.sender_id,
        otherUsername: isMe ? null : msg.sender_username,
        lastContent: msg.content,
        lastAt: msg.created_at,
        _resolveReceiver: isMe,
        _receiverId: msg.receiver_id,
      }
    })

    const needResolve = convs.filter(c => c._resolveReceiver)
    if (needResolve.length > 0) {
      const ids = needResolve.map(c => c._receiverId)
      const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', ids)
      const map = Object.fromEntries((profiles || []).map(p => [p.id, p.username]))
      for (const c of convs) { if (c._resolveReceiver) c.otherUsername = map[c._receiverId] || 'Unknown' }
    }

    setConvos(convs)
    setLoading(false)
  }

  const handleOpenDM = (conv) => {
    clearUnread(conv.convId)
    openDM({ id: conv.otherUserId, username: conv.otherUsername })
  }

  const handleAccept = async (fid) => {
    setActionId(fid)
    await acceptRequest(fid, user.id)
    setActionId(null)
  }

  const handleReject = async (fid) => {
    setActionId(fid)
    await rejectRequest(fid, user.id)
    setActionId(null)
  }

  function timeAgo(ts) {
    if (!ts) return ''
    const diff = Date.now() - new Date(ts)
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <>
      <div className="dm-header">
        <button className="back-btn" onClick={closeInbox}>←</button>
        <div className="dm-user-info">
          <div className="dm-user-name">Inbox</div>
        </div>
        <button className="btn-icon" onClick={fetchConversations} title="Refresh" style={{ fontSize: 12 }}>↺</button>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button className={`tab-btn${tab === 'messages' ? ' active' : ''}`} onClick={() => setTab('messages')}>
          Messages
          {Object.keys(unreadDMs).length > 0 && (
            <span className="tab-count">{Object.values(unreadDMs).reduce((s, v) => s + v.count, 0)}</span>
          )}
        </button>
        <button className={`tab-btn${tab === 'friends' ? ' active' : ''}`} onClick={() => setTab('friends')}>
          Friends
          {pendingReceived.length > 0 && <span className="tab-count tab-count--alert">{pendingReceived.length}</span>}
        </button>
      </div>

      <div className="message-list" style={{ padding: 0 }}>
        {/* ── Messages tab ── */}
        {tab === 'messages' && (
          <>
            {loading && <div className="loading-state"><span className="loading-dot"/><span>Loading…</span></div>}
            {!loading && conversations.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">✉️</div>
                <span style={{ color: 'var(--text-soft)', fontWeight: 700 }}>No messages yet</span>
                <span className="empty-sub">Click someone's name in a room to start a DM</span>
              </div>
            )}
            {conversations.map(conv => {
              const unread = unreadDMs[conv.convId]
              return (
                <div key={conv.convId} className="inbox-row" onClick={() => handleOpenDM(conv)}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <UserAvatar username={conv.otherUsername || '?'} size={36} />
                    {unread && <span className="inbox-badge">{unread.count > 9 ? '9+' : unread.count}</span>}
                  </div>
                  <div className="inbox-info">
                    <div className="inbox-name-row">
                      <span className={`inbox-username${unread ? ' unread' : ''}`}>{conv.otherUsername}</span>
                      <span className="inbox-time">{timeAgo(conv.lastAt)}</span>
                    </div>
                    <div className={`inbox-preview${unread ? ' unread' : ''}`}>{conv.lastContent}</div>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* ── Friends tab ── */}
        {tab === 'friends' && (
          <>
            {/* Pending requests */}
            {pendingReceived.length > 0 && (
              <>
                <div className="inbox-section-label">Pending requests</div>
                {pendingReceived.map(f => (
                  <div key={f.id} className="inbox-row inbox-row--friend-req">
                    <UserAvatar username={f.other?.username || '?'} size={36} />
                    <div className="inbox-info">
                      <div className="inbox-name-row">
                        <span className="inbox-username">@{f.other?.username}</span>
                        <span className="inbox-time">{timeAgo(f.created_at)}</span>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Sent you a friend request</div>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      <button className="friend-req-accept" onClick={() => handleAccept(f.id)} disabled={actionId === f.id}>✓</button>
                      <button className="friend-req-reject" onClick={() => handleReject(f.id)} disabled={actionId === f.id}>✕</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Friends list */}
            {friends.length > 0 && (
              <>
                <div className="inbox-section-label">Friends ({friends.length})</div>
                {friends.map(f => (
                  <div key={f.id} className="inbox-row" onClick={() => openDM({ id: f.other?.id, username: f.other?.username })}>
                    <UserAvatar username={f.other?.username || '?'} size={36} />
                    <div className="inbox-info">
                      <div className="inbox-username">@{f.other?.username}</div>
                      {f.other?.course && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.other.course}</div>}
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                ))}
              </>
            )}

            {friends.length === 0 && pendingReceived.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🤝</div>
                <span style={{ color: 'var(--text-soft)', fontWeight: 700 }}>No friends yet</span>
                <span className="empty-sub">Visit someone's profile and tap Add Friend</span>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
