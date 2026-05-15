import React, { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'
import { useFriendsStore } from '../stores/friendsStore'
import { useGroupsStore } from '../stores/groupsStore'
import CreateGroupModal from '../components/CreateGroupModal'

export default function GroupsListPage() {
  const { user } = useAuthStore()
  const { setView, openGroup } = useAppStore()
  const { friends, fetchFriends } = useFriendsStore()
  const { myGroups, publicGroups, loading, fetchMyGroups, fetchPublicGroups, joinGroup, isMember } = useGroupsStore()

  const [tab, setTab]             = useState('mine')   // 'mine' | 'discover'
  const [showCreate, setCreate]   = useState(false)
  const [joiningId, setJoiningId] = useState(null)

  useEffect(() => {
    if (!user) return
    fetchMyGroups(user.id)
    fetchPublicGroups()
    fetchFriends(user.id)
  }, [user?.id])

  const handleJoin = async (group) => {
    setJoiningId(group.id)
    try {
      await joinGroup(group.id, user.id)
      openGroup(group)
    } catch { /* already member */ }
    setJoiningId(null)
  }

  const displayedGroups = tab === 'mine' ? myGroups : publicGroups.filter(g => !isMember(g.id))

  return (
    <>
      <div className="page-header">
        <button className="back-btn" onClick={() => setView('chat')}>←</button>
        <span className="page-header-title">Groups</span>
        <button className="header-icon-btn" onClick={() => setCreate(true)} title="Create group">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button className={`tab-btn${tab === 'mine' ? ' active' : ''}`} onClick={() => setTab('mine')}>
          My Groups {myGroups.length > 0 && <span className="tab-count">{myGroups.length}</span>}
        </button>
        <button className={`tab-btn${tab === 'discover' ? ' active' : ''}`} onClick={() => setTab('discover')}>
          Discover
        </button>
      </div>

      <div className="page-scroll">
        {loading && <div className="loading-state"><span className="loading-dot"/><span>Loading…</span></div>}

        {!loading && displayedGroups.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">{tab === 'mine' ? '👥' : '🌐'}</div>
            <span style={{ color: 'var(--text-soft)', fontWeight: 700 }}>
              {tab === 'mine' ? 'No groups yet' : 'No public groups'}
            </span>
            <span className="empty-sub">
              {tab === 'mine'
                ? 'Create a group to start chatting with multiple friends at once.'
                : 'Check back later for public groups to join.'}
            </span>
            {tab === 'mine' && (
              <button className="btn-primary-sm" onClick={() => setCreate(true)}>+ Create a Group</button>
            )}
          </div>
        )}

        {displayedGroups.map(group => (
          <GroupCard
            key={group.id}
            group={group}
            mine={tab === 'mine'}
            onOpen={() => openGroup(group)}
            onJoin={() => handleJoin(group)}
            joining={joiningId === group.id}
          />
        ))}
      </div>

      <CreateGroupModal
        open={showCreate}
        onClose={() => setCreate(false)}
        onCreated={(group) => openGroup(group)}
      />
    </>
  )
}

function GroupCard({ group, mine, onOpen, onJoin, joining }) {
  const initials = group.name.slice(0, 2).toUpperCase()
  return (
    <div className="group-card" onClick={mine ? onOpen : undefined}>
      <div className="group-card-avatar" style={{ background: group.avatar_color || '#06558D' }}>
        {initials}
      </div>
      <div className="group-card-info">
        <div className="group-card-name">{group.name}</div>
        {group.description && (
          <div className="group-card-desc">{group.description}</div>
        )}
        <div className="group-card-meta">
          <span>{group.member_count} member{group.member_count !== 1 ? 's' : ''}</span>
          {group.is_public && <span className="group-public-badge">Public</span>}
          {group.myRole === 'admin' && <span className="group-admin-badge">Admin</span>}
        </div>
      </div>
      {mine ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      ) : (
        <button
          className="btn-primary-sm"
          onClick={e => { e.stopPropagation(); onJoin() }}
          disabled={joining}
          style={{ flexShrink: 0 }}
        >
          {joining ? '…' : 'Join'}
        </button>
      )}
    </div>
  )
}
