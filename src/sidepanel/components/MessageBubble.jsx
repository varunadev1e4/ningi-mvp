import React, { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'
import UserAvatar from './UserAvatar'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '🔥', '👀']

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function truncate(str, n) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '…' : str
}

export default function MessageBubble({ message, reactions = {}, onReply, onDelete, onReact }) {
  const { user } = useAuthStore()
  const { openProfile } = useAppStore()
  const [hovered, setHovered] = useState(false)
  const isOwn = message.user_id === user?.id

  if (message.is_deleted) {
    return (
      <div className={`msg-row${isOwn ? ' own' : ''}`}>
        {!isOwn && <div style={{ width: 28, flexShrink: 0 }} />}
        <div className="msg-deleted"><span>🚫</span> Message deleted</div>
        {isOwn && <div style={{ width: 28, flexShrink: 0 }} />}
      </div>
    )
  }

  // Group reactions: { emoji → [reaction, ...] }
  const reactionGroups = {}
  for (const r of Object.values(reactions)) {
    if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = []
    reactionGroups[r.emoji].push(r)
  }
  const myReactions = new Set(
    Object.values(reactions).filter((r) => r.user_id === user?.id).map((r) => r.emoji)
  )

  const handleAvatarClick = () => {
    if (!isOwn) openProfile({ id: message.user_id, username: message.username })
  }

  return (
    <div
      className={`msg-row${isOwn ? ' own' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!isOwn && (
        <UserAvatar username={message.username} size={28} onClick={handleAvatarClick} />
      )}

      <div className="msg-body">
        {/* Name + time */}
        {!isOwn && (
          <div className="msg-meta-left">
            <span className="msg-name" onClick={handleAvatarClick}>{message.username}</span>
            <span className="msg-time">{formatTime(message.created_at)}</span>
          </div>
        )}
        {isOwn && (
          <div className="msg-meta-right">
            <span className="msg-time">{formatTime(message.created_at)}</span>
          </div>
        )}

        {/* Reply quote */}
        {message.reply_to_id && (
          <div className={`reply-quote${isOwn ? ' own' : ''}`}>
            <span className="reply-quote-name">↩ {message.reply_to_username}</span>
            <span className="reply-quote-text">{truncate(message.reply_to_content, 60)}</span>
          </div>
        )}

        {/* Bubble */}
        <div className={`msg-bubble${isOwn ? ' own' : ''}`}>
          {message.content}
        </div>

        {/* Inline action bar — slides in below bubble on hover, no absolute positioning */}
        <div className={`msg-action-row${hovered ? ' visible' : ''}${isOwn ? ' own' : ''}`}>
          {/* Quick emoji reactions */}
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              className={`msg-emoji-btn${myReactions.has(emoji) ? ' active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); onReact?.(message.id, emoji) }}
              title={emoji}
            >
              {emoji}
            </button>
          ))}

          <div className="msg-action-sep" />

          {/* Reply */}
          <button
            className="msg-action-btn"
            onMouseDown={(e) => { e.preventDefault(); onReply?.(message) }}
            title="Reply"
          >
            ↩
          </button>

          {/* Delete (own messages only) */}
          {isOwn && (
            <button
              className="msg-action-btn danger"
              onMouseDown={(e) => { e.preventDefault(); onDelete?.(message.id) }}
              title="Delete"
            >
              🗑
            </button>
          )}
        </div>

        {/* Reaction chips — always visible when reactions exist */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className={`reactions-row${isOwn ? ' own' : ''}`}>
            {Object.entries(reactionGroups).map(([emoji, rs]) => (
              <button
                key={emoji}
                className={`reaction-chip${myReactions.has(emoji) ? ' mine' : ''}`}
                onClick={() => onReact?.(message.id, emoji)}
                title={rs.map((r) => r.username).join(', ')}
              >
                {emoji} <span>{rs.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {isOwn && <div style={{ width: 28, flexShrink: 0 }} />}
    </div>
  )
}