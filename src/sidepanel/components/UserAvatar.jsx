import React from 'react'

// Stable colour from username string
const COLORS = [
  '#e05c3f', '#d4843a', '#c4a02d', '#6aa84f',
  '#3c9ead', '#4a7fbf', '#7b5ea7', '#c2598c',
  '#e05c7a', '#1a8c6e', '#2d7fc1', '#b5651d'
]

function colorFor(str = '') {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

export default function UserAvatar({ username = '?', size = 28, onClick }) {
  const bg = colorFor(username)
  const initial = username.charAt(0).toUpperCase()
  const fontSize = Math.round(size * 0.44)

  return (
    <div
      className="user-avatar"
      onClick={onClick}
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize,
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: Math.round(size * 0.28)
      }}
      title={onClick ? `DM ${username}` : username}
    >
      {initial}
    </div>
  )
}
