import React, { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../stores/appStore'
import { useAuthStore } from '../stores/authStore'
import { useCollectionsStore } from '../stores/collectionsStore'
import { normalizeUrl } from '../lib/urlUtils'
import BookmarkButton from './BookmarkButton'

export default function UrlDropdown() {
  const { tabs, currentUrl, setCurrentUrl } = useAppStore()
  const { user } = useAuthStore()
  const { fetchCollections } = useCollectionsStore()
  const [open, setOpen] = useState(false)
  const dropRef = useRef(null)

  // Fetch collections on mount so bookmark states are accurate
  useEffect(() => {
    if (user) fetchCollections(user.id)
  }, [user?.id])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selectTab = (tab) => {
    setCurrentUrl(normalizeUrl(tab.url))
    setOpen(false)
  }

  const openInNewTab = (e, url) => {
    e.stopPropagation()
    chrome.tabs.create({ url })
  }

  const seen = new Set()
  const uniqueTabs = tabs.filter((t) => {
    const key = normalizeUrl(t.url)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const displayLabel = currentUrl || 'Select a tab…'

  return (
    <div className="url-bar" ref={dropRef}>
      <button
        className={`url-select-btn${open ? ' open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <span className="url-select-dot" />
        <span className={`url-select-text${currentUrl ? ' active' : ''}`}>{displayLabel}</span>
        <span className={`url-select-chevron${open ? ' open' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="url-dropdown-list">
          {uniqueTabs.length === 0 && (
            <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
              No supported pages open
            </div>
          )}
          {uniqueTabs.map((tab) => {
            const norm = normalizeUrl(tab.url)
            const isSelected = norm === currentUrl
            let hostname = '', pathname = ''
            try {
              const u = new URL(tab.url)
              hostname = u.hostname
              pathname = u.pathname === '/' ? '' : u.pathname
            } catch {}

            return (
              <div
                key={tab.id}
                className={`url-dropdown-item${isSelected ? ' selected' : ''}`}
              >
                {/* Clickable area — switches room */}
                <div
                  className="url-dropdown-item-main"
                  onClick={() => selectTab(tab)}
                >
                  {tab.favIconUrl
                    ? <img className="url-favicon" src={tab.favIconUrl} alt="" onError={(e) => { e.target.style.display = 'none' }} />
                    : <span className="url-favicon-fallback">●</span>
                  }
                  <div className="url-dropdown-label">
                    <div className="url-dropdown-domain">{hostname}</div>
                    {pathname && <div className="url-dropdown-path">{pathname}</div>}
                  </div>
                  {isSelected && <span style={{ color: 'var(--primary)', fontSize: 11, fontWeight: 800 }}>●</span>}
                </div>

                {/* Open in new tab */}
                <button
                  className="tab-open-btn"
                  onClick={(e) => openInNewTab(e, tab.url)}
                  title="Open in new tab"
                >
                  ↗
                </button>

                {/* ── Bookmark button ── */}
                <BookmarkButton url={norm} title={tab.title || tab.url} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
