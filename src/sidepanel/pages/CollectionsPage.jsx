import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'
import { useCollectionsStore } from '../stores/collectionsStore'

export default function CollectionsPage() {
  const { user } = useAuthStore()
  const { setView } = useAppStore()
  const { collections, loading, error, fetchCollections, removeUrl, clearError } = useCollectionsStore()

  const [search, setSearch]         = useState('')
  const [confirmRemove, setConfirm] = useState(null)
  const [leavingId, setLeavingId]   = useState(null)

  useEffect(() => {
    if (user) fetchCollections(user.id)
    window.dispatchEvent(new CustomEvent('ningi:healthy'))
  }, [user?.id])

  const filtered = collections.filter(c => {
    const q = search.toLowerCase()
    return c.url?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q)
  })

  const handleOpen = (url) => {
    // normalizeUrl strips the protocol when saving — restore https:// before opening
    const fullUrl = url.startsWith('http://') || url.startsWith('https://')
      ? url
      : 'https://' + url
    chrome.tabs.create({ url: fullUrl })
  }

  const handleRemove = async (id) => {
    setLeavingId(id)
    setTimeout(async () => {
      await removeUrl(user.id, id)
      setLeavingId(null)
      setConfirm(null)
    }, 200)
  }

  const isEmpty = !loading && collections.length === 0

  return (
    <div className="collections-page">
      {/* Header */}
      <div className="coll-header">
        <button className="back-btn" onClick={() => setView('profile')} aria-label="Back">←</button>
        <span className="coll-header__title">My Collections</span>
        {collections.length > 0 && (
          <span className="coll-header__count">{collections.length} saved</span>
        )}
      </div>

      {/* Search */}
      {collections.length > 2 && (
        <div className="coll-search-wrap">
          <span className="coll-search-icon">🔍</span>
          <input
            className="coll-search"
            placeholder="Search bookmarks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="coll-search-clear" onClick={() => setSearch('')}>×</button>}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error-banner" style={{ margin: '10px 14px', borderRadius: 8 }}>
          <span>{error}</span>
          <button className="error-retry-btn" onClick={clearError}>×</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="loading-state"><span className="loading-dot" /><span>Loading…</span></div>
      )}

      {/* Empty state */}
      {isEmpty && !search && (
        <div className="coll-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
          <p className="coll-empty__title">No bookmarks yet</p>
          <p className="coll-empty__sub">Tap the bookmark icon next to any URL in the tab switcher to save it here.</p>
        </div>
      )}

      {!loading && search && filtered.length === 0 && (
        <div className="coll-empty">
          <p className="coll-empty__title">No results for "{search}"</p>
        </div>
      )}

      {/* List */}
      <div className="coll-list">
        <AnimatePresence>
          {filtered.map((item, i) => {
            let hostname = ''
            try { hostname = new URL(item.url).hostname } catch {}

            return (
              <motion.div
                key={item.id}
                className={`coll-item${leavingId === item.id ? ' coll-item--leaving' : ''}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ delay: i * 0.03, duration: 0.18 }}
                layout
              >
                {/* Favicon */}
                <div className="coll-item__favicon-wrap">
                  <img
                    className="coll-item__favicon"
                    src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
                    alt=""
                    onError={e => { e.target.style.display = 'none' }}
                  />
                </div>

                {/* Info — click opens new tab */}
                <button className="coll-item__info" onClick={() => handleOpen(item.url)} title="Open in new tab">
                  <span className="coll-item__title">{item.title || hostname || item.url}</span>
                  <span className="coll-item__url">{truncate(item.url, 50)}</span>
                  {item.saved_at && <span className="coll-item__date">{formatDate(item.saved_at)}</span>}
                </button>

                {/* Actions */}
                <div className="coll-item__actions">
                  <button className="coll-item__btn" onClick={() => handleOpen(item.url)} title="Open in new tab" aria-label="Open">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </button>

                  {confirmRemove === item.id ? (
                    <div className="coll-item__confirm">
                      <span>Remove?</span>
                      <button className="coll-item__confirm-yes" onClick={() => handleRemove(item.id)}>Yes</button>
                      <button className="coll-item__confirm-no" onClick={() => setConfirm(null)}>No</button>
                    </div>
                  ) : (
                    <button className="coll-item__btn coll-item__btn--danger" onClick={() => setConfirm(item.id)} title="Remove" aria-label="Remove bookmark">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                        <line x1="9" y1="3" x2="15" y2="9"/>
                      </svg>
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

function truncate(str, max) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

function formatDate(iso) {
  try {
    const d = new Date(iso), now = new Date(), diff = (now - d) / 1000
    if (diff < 60)    return 'just now'
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800)return `${Math.floor(diff / 86400)}d ago`
    return d.toLocaleDateString()
  } catch { return '' }
}
