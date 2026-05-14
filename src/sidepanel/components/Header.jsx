import React from 'react'
import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'
import UserAvatar from './UserAvatar'

export default function Header() {
  const { profile, signOut } = useAuthStore()
  const { totalUnread, openInbox, openFeedback, openProfile, _currentUserId } = useAppStore()

  const handleOwnProfile = () => {
    if (profile && _currentUserId) {
      openProfile({ id: _currentUserId, username: profile.username })
    }
  }

  return (
    <div className="header">
      <div className="header-logo">
        <div className="header-logo-mark">N</div>
        <span className="header-logo-text">ningi</span>
        <span className="beta-chip">beta</span>
      </div>

      <div className="header-actions">
        <button className="btn-icon" onClick={openFeedback} title="Give feedback">📝</button>

        <button className="btn-icon" onClick={openInbox} title="Direct Messages" style={{ position: 'relative' }}>
          ✉
          {totalUnread > 0 && (
            <span className="unread-badge">{totalUnread > 9 ? '9+' : totalUnread}</span>
          )}
        </button>

        {profile && (
          <div
            className="header-user"
            onClick={handleOwnProfile}
            style={{ cursor: 'pointer' }}
            title="My Profile"
          >
            <span className="header-username">@{profile.username}</span>
            <UserAvatar username={profile.username} size={26} />
          </div>
        )}

        <button className="btn-icon" onClick={signOut} title="Sign out">↪</button>
      </div>
    </div>
  )
}
