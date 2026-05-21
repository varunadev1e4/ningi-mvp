import React from 'react'

const COLORS = [
  '#e05c3f','#d4843a','#c4a02d','#6aa84f',
  '#3c9ead','#4a7fbf','#7b5ea7','#c2598c',
  '#e05c7a','#1a8c6e','#2d7fc1','#b5651d'
]

function colorFor(str = '') {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

/**
 * UserAvatar
 * @param {string}  username
 * @param {number}  size
 * @param {boolean} online     — show green presence dot
 * @param {function} onClick
 */
export default function UserAvatar({ username = '?', size = 28, online = false, onClick }) {
  const bg       = colorFor(username)
  const initial  = username.charAt(0).toUpperCase()
  const fontSize = Math.round(size * 0.44)
  const dotSize  = Math.max(8, Math.round(size * 0.28))

  return (
    <div
      style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}
      onClick={onClick}
    >
      <div
        className="user-avatar"
        style={{
          width: size, height: size,
          background: bg, fontSize,
          cursor: onClick ? 'pointer' : 'default',
          borderRadius: Math.round(size * 0.28),
        }}
        title={onClick ? `@${username}` : username}
      >
        {initial}
      </div>
      {online && (
        <span
          className="presence-dot"
          style={{
            width: dotSize, height: dotSize,
            bottom: -1, right: -1,
            borderRadius: '50%',
          }}
        />
      )}
    </div>
  )
}
