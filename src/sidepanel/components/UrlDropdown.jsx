import React, { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../stores/appStore'
import { useAuthStore } from '../stores/authStore'
import { useCollectionsStore } from '../stores/collectionsStore'
import { normalizeUrl } from '../lib/urlUtils'
import { useRoomHistory } from '../hooks/useRoomHistory'
import BookmarkButton from './BookmarkButton'

export default function UrlDropdown({ onlineCount = 0 }) {
  const { tabs, currentUrl, setCurrentUrl } = useAppStore()
  const { user } = useAuthStore()
  const { fetchCollections } = useCollectionsStore()
  const { history, addRoom } = useRoomHistory()

  const [open, setOpen] = useState(false)
  const dropRef = useRef(null)

  useEffect(() => { if (user) fetchCollections(user.id) }, [user?.id])

  // Track room visits
  useEffect(() => {
    if (currentUrl) {
      const tab = tabs.find(t => normalizeUrl(t.url) === currentUrl)
      addRoom(currentUrl, tab?.title || currentUrl)
    }
  }, [currentUrl])

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selectTab = (url, tabObj) => {
    setCurrentUrl(normalizeUrl(url))
    if (tabObj) addRoom(normalizeUrl(url), tabObj.title || url)
    setOpen(false)
  }

  const openInNewTab = (e, url) => {
    e.stopPropagation()
    chrome.tabs.create({ url })
  }

  const seen = new Set()
  const uniqueTabs = tabs.filter(t => {
    const key = normalizeUrl(t.url)
    if (seen.has(key)) return false
    seen.add(key); return true
  })

  // Recent rooms not currently open as tabs
  const openUrls = new Set(uniqueTabs.map(t => normalizeUrl(t.url)))
  const recentOnly = history.filter(h => !openUrls.has(h.url)).slice(0, 4)

  return (
    <div className="url-bar" ref={dropRef}>
      <button
        className={`url-select-btn${open ? ' open' : ''}`}
        onClick={() => setOpen(v => !v)}
        type="button"
      >
        <span className="url-select-dot" />
        <span className={`url-select-text${currentUrl ? ' active' : ''}`}>
          {currentUrl || 'Select a tab…'}
        </span>
        {onlineCount > 1 && (
          <span className="url-online-pill" title={`${onlineCount} people here`}>
            <span className="url-online-dot" />{onlineCount}
          </span>
        )}
        <span className={`url-select-chevron${open ? ' open' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="url-dropdown-list">
          {/* Open tabs */}
          {uniqueTabs.length > 0 && (
            <div className="url-dropdown-section-label">Open tabs</div>
          )}
          {uniqueTabs.length === 0 && recentOnly.length === 0 && (
            <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
              No supported pages open
            </div>
          )}
          {uniqueTabs.map(tab => {
            const norm = normalizeUrl(tab.url)
            const isSelected = norm === currentUrl
            let hostname = '', pathname = ''
            try {
              const u = new URL(tab.url)
              hostname = u.hostname
              pathname = u.pathname === '/' ? '' : u.pathname
            } catch {}
            return (
              <div key={tab.id} className={`url-dropdown-item${isSelected ? ' selected' : ''}`}>
                <div className="url-dropdown-item-main" onClick={() => selectTab(tab.url, tab)}>
                  {tab.favIconUrl
                    ? <img className="url-favicon" src={tab.favIconUrl} alt="" onError={e => { e.target.style.display = 'none' }} />
                    : <span className="url-favicon-fallback">●</span>
                  }
                  <div className="url-dropdown-label">
                    <div className="url-dropdown-domain">{hostname}</div>
                    {pathname && <div className="url-dropdown-path">{pathname}</div>}
                  </div>
                  {isSelected && <span style={{ color: 'var(--primary)', fontSize: 11, fontWeight: 800 }}>●</span>}
                </div>
                <button className="tab-open-btn" onClick={e => openInNewTab(e, tab.url)} title="Open in new tab">↗</button>
                <BookmarkButton url={norm} title={tab.title || tab.url} />
              </div>
            )
          })}

          {/* Recent rooms */}
          {recentOnly.length > 0 && (
            <>
              <div className="url-dropdown-section-label">Recently visited</div>
              {recentOnly.map(room => (
                <div key={room.url} className="url-dropdown-item url-dropdown-item--recent">
                  <div className="url-dropdown-item-main" onClick={() => { setCurrentUrl(room.url); setOpen(false) }}>
                    <span className="url-favicon-fallback" style={{ opacity: 0.5 }}>🕐</span>
                    <div className="url-dropdown-label">
                      <div className="url-dropdown-domain">{room.url}</div>
                    </div>
                  </div>
                  <BookmarkButton url={room.url} title={room.title} />
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
