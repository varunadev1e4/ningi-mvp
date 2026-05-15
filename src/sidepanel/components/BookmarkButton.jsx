import React, { useState } from 'react'
import { useCollectionsStore } from '../stores/collectionsStore'
import { useAuthStore } from '../stores/authStore'

export default function BookmarkButton({ url, title = '' }) {
  const { user } = useAuthStore()
  const { isSaved, toggleUrl, saving } = useCollectionsStore()
  const [pulse, setPulse] = useState(false)

  if (!user) return null

  const saved = isSaved(url)
  const busy  = saving[url]

  const handleClick = async (e) => {
    e.stopPropagation()
    if (busy) return
    setPulse(true)
    await toggleUrl(user.id, url, title)
    setTimeout(() => setPulse(false), 400)
  }

  return (
    <button
      className={`bookmark-btn${saved ? ' bookmark-btn--saved' : ''}${pulse ? ' bookmark-btn--pulse' : ''}`}
      onClick={handleClick}
      disabled={busy}
      title={saved ? 'Remove from collections' : 'Save to collections'}
      aria-label={saved ? 'Remove bookmark' : 'Add bookmark'}
    >
      {busy ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="32">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.7s" repeatCount="indefinite"/>
          </circle>
        </svg>
      ) : saved ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
      )}
    </button>
  )
}
