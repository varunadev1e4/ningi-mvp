import React, { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'
import { useNotificationsStore } from '../stores/notificationsStore'
import { useFriendsStore } from '../stores/friendsStore'
import UserAvatar from '../components/UserAvatar'

const TYPE_META = {
  mention:        { icon: '@', label: 'Mentioned you',          color: '#FF3D00' },
  friend_request: { icon: '🤝', label: 'Sent you a friend request', color: '#06558D' },
  friend_accepted:{ icon: '✓',  label: 'Accepted your request', color: '#22c55e' },
  group_invite:   { icon: '👥', label: 'Added you to a group',  color: '#7c3aed' },
}

export default function NotificationsPage() {
  const { user } = useAuthStore()
  const { setView, openProfile, openGroups } = useAppStore()
  const { notifications, unreadCount, loading, fetchNotifications, markRead, markAllRead } = useNotificationsStore()
  const { pendingReceived, acceptRequest, rejectRequest, fetchFriends } = useFriendsStore()
  const [tab, setTab]       = useState('all')
  const [actionId, setActionId] = useState(null)

  useEffect(() => {
    if (!user) return
    fetchNotifications(user.id)
    fetchFriends(user.id)
  }, [user?.id])

  const handleClick = async (n) => {
    if (!n.read) await markRead(n.id)
    if (n.type === 'mention' && n.data?.room_url) {
      setView('chat') // navigate to room via chat
    }
    if (n.type === 'group_invite') openGroups()
    if ((n.type === 'friend_request' || n.type === 'friend_accepted') && n.actor_id) {
      openProfile({ id: n.actor_id, username: n.actor_username })
    }
  }

  const filtered = tab === 'all'     ? notifications
    : tab === 'mentions' ? notifications.filter(n => n.type === 'mention')
    : tab === 'friends'  ? notifications.filter(n => n.type === 'friend_request' || n.type === 'friend_accepted')
    : notifications.filter(n => n.type === 'group_invite')

  function timeAgo(ts) {
    const diff = (Date.now() - new Date(ts)) / 1000
    if (diff < 60)    return 'just now'
    if (diff < 3600)  return `${Math.floor(diff/60)}m ago`
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
    return `${Math.floor(diff/86400)}d ago`
  }

  return (
    <>
      {/* Header */}
      <div className="dm-header">
        <button className="back-btn" onClick={() => setView('chat')}>←</button>
        <div className="dm-user-info">
          <div className="dm-user-name">Notifications</div>
        </div>
        {unreadCount > 0 && (
          <button className="btn-icon" style={{ fontSize: 11 }} onClick={() => markAllRead(user?.id)} title="Mark all read">
            ✓ all
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {[
          { key: 'all',      label: 'All' },
          { key: 'mentions', label: '@Mentions' },
          { key: 'friends',  label: 'Friends' },
          { key: 'groups',   label: 'Groups' },
        ].map(t => (
          <button
            key={t.key}
            className={`tab-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Pending friend requests (always at top of friends tab) */}
      {tab === 'friends' && pendingReceived.length > 0 && (
        <div>
          <div className="inbox-section-label">Pending requests</div>
          {pendingReceived.map(f => (
            <div key={f.id} className="notif-row notif-row--unread">
              <UserAvatar username={f.other?.username || '?'} size={36} />
              <div className="notif-info">
                <span className="notif-actor">@{f.other?.username}</span>
                <span className="notif-text"> sent you a friend request</span>
                <div className="notif-time">{timeAgo(f.created_at)}</div>
              </div>
              <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                <button className="friend-req-accept" onClick={async () => {
                  setActionId(f.id); await acceptRequest(f.id, user.id); setActionId(null)
                }} disabled={actionId === f.id}>✓</button>
                <button className="friend-req-reject" onClick={async () => {
                  setActionId(f.id); await rejectRequest(f.id, user.id); setActionId(null)
                }} disabled={actionId === f.id}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notifications list */}
      <div className="page-scroll">
        {loading && <div className="loading-state"><span className="loading-dot"/><span>Loading…</span></div>}

        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔔</div>
            <span style={{ fontWeight: 700, color: 'var(--text-soft)' }}>No notifications</span>
            <span className="empty-sub">You're all caught up!</span>
          </div>
        )}

        {filtered.map(n => {
          const meta = TYPE_META[n.type] || { icon: '●', label: n.type, color: 'var(--text-muted)' }
          return (
            <div
              key={n.id}
              className={`notif-row${!n.read ? ' notif-row--unread' : ''}`}
              onClick={() => handleClick(n)}
            >
              <div className="notif-icon-wrap" style={{ background: meta.color + '18' }}>
                <span style={{ color: meta.color, fontSize: 14 }}>{meta.icon}</span>
              </div>
              <div className="notif-info">
                {n.actor_username && <span className="notif-actor">@{n.actor_username} </span>}
                <span className="notif-text">{meta.label}</span>
                {n.data?.message_preview && (
                  <div className="notif-preview">"{n.data.message_preview}"</div>
                )}
                {n.data?.room_url && (
                  <div className="notif-preview">{n.data.room_url}</div>
                )}
                <div className="notif-time">{timeAgo(n.created_at)}</div>
              </div>
              {!n.read && <span className="notif-dot" />}
            </div>
          )
        })}
      </div>
    </>
  )
}
