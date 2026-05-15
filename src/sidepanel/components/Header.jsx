import React, { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'
import { useThemeStore } from '../stores/themeStore'
import UserAvatar from './UserAvatar'

export default function Header() {
  const { profile, signOut } = useAuthStore()
  const { totalUnread, openInbox, openFeedback, openProfile, _currentUserId } = useAppStore()
  const { theme, toggleTheme } = useThemeStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleOwnProfile = () => {
    setMenuOpen(false)
    if (profile && _currentUserId) {
      openProfile({ id: _currentUserId, username: profile.username })
    }
  }

  const handleFeedback = () => {
    setMenuOpen(false)
    openFeedback()
  }

  const handleSignOut = () => {
    setMenuOpen(false)
    signOut()
  }

  return (
    <div className="header">
      {/* ── Left: Logo ── */}
      <div className="header-logo">
        <div className="header-logo-mark">N</div>
        <span className="header-logo-text">ningi</span>
      </div>

      {/* ── Right: Actions ── */}
      <div className="header-actions">

        {/* Theme toggle */}
        <button
          className="header-icon-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        {/* Inbox */}
        <button
          className="header-icon-btn"
          onClick={openInbox}
          title="Messages"
          aria-label="Open inbox"
          style={{ position: 'relative' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          {totalUnread > 0 && (
            <span className="header-badge">{totalUnread > 9 ? '9+' : totalUnread}</span>
          )}
        </button>

        {/* Avatar + dropdown */}
        <div className="header-profile-wrap" ref={menuRef}>
          <button
            className={`header-avatar-btn${menuOpen ? ' open' : ''}`}
            onClick={() => setMenuOpen(v => !v)}
            title="Account"
            aria-label="Open account menu"
          >
            <UserAvatar username={profile?.username || '?'} size={28} />
            <svg className="header-chevron" width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </button>

          {menuOpen && (
            <div className="header-menu">
              {/* User info */}
              <div className="header-menu-user">
                <UserAvatar username={profile?.username || '?'} size={32} />
                <div className="header-menu-user-info">
                  <span className="header-menu-name">{profile?.displayName || profile?.username}</span>
                  <span className="header-menu-handle">@{profile?.username}</span>
                </div>
              </div>

              <div className="header-menu-divider" />

              <button className="header-menu-item" onClick={handleOwnProfile}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                My Profile
              </button>

              <button className="header-menu-item" onClick={handleFeedback}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Send Feedback
              </button>

              <div className="header-menu-divider" />

              <button className="header-menu-item header-menu-item--danger" onClick={handleSignOut}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
