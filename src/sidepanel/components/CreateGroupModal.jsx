import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../stores/authStore'
import { useFriendsStore } from '../stores/friendsStore'
import { useGroupsStore } from '../stores/groupsStore'

const AVATAR_COLORS = ['#06558D','#FF3D00','#7c3aed','#0891b2','#16a34a','#d97706','#db2777']

export default function CreateGroupModal({ open, onClose, onCreated }) {
  const { user } = useAuthStore()
  const { friends } = useFriendsStore()
  const { createGroup, creating } = useGroupsStore()

  const [name, setName]             = useState('')
  const [description, setDesc]      = useState('')
  const [isPublic, setIsPublic]     = useState(false)
  const [selectedIds, setSelected]  = useState([])
  const [avatarColor, setColor]     = useState(AVATAR_COLORS[0])
  const [error, setError]           = useState('')

  const reset = () => {
    setName(''); setDesc(''); setIsPublic(false)
    setSelected([]); setColor(AVATAR_COLORS[0]); setError('')
  }

  const handleClose = () => { reset(); onClose() }

  const toggleFriend = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleCreate = async () => {
    if (!name.trim()) { setError('Group name is required.'); return }
    if (name.trim().length < 2) { setError('Name must be at least 2 characters.'); return }
    setError('')
    try {
      const group = await createGroup({
        name, description, isPublic,
        createdBy: user.id,
        memberIds: selectedIds,
        avatarColor,
      })
      reset()
      onCreated?.(group)
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="modal-backdrop-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} />
          <motion.div
            className="bottom-sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            {/* Header */}
            <div className="sheet-header">
              <button className="sheet-close" onClick={handleClose}>✕</button>
              <span className="sheet-title">New Group</span>
              <button className="sheet-action-btn" onClick={handleCreate} disabled={!name.trim() || creating}>
                {creating ? '…' : 'Create'}
              </button>
            </div>

            <div className="sheet-body">
              {/* Avatar color picker */}
              <div className="cg-color-row">
                {AVATAR_COLORS.map(color => (
                  <button
                    key={color}
                    className={`cg-color-dot${avatarColor === color ? ' selected' : ''}`}
                    style={{ background: color }}
                    onClick={() => setColor(color)}
                  />
                ))}
              </div>

              {/* Group name */}
              <div className="cg-field">
                <label className="cg-label">Group name *</label>
                <input
                  className="cg-input"
                  placeholder="e.g. Study Squad, IGNOU BCA 2025"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={60}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className="cg-field">
                <label className="cg-label">Description</label>
                <input
                  className="cg-input"
                  placeholder="What's this group about? (optional)"
                  value={description}
                  onChange={e => setDesc(e.target.value)}
                  maxLength={120}
                />
              </div>

              {/* Public / Private toggle */}
              <div className="cg-row">
                <div>
                  <div className="cg-toggle-label">Visibility</div>
                  <div className="cg-toggle-sub">{isPublic ? 'Anyone can find and join' : 'Invite only'}</div>
                </div>
                <button
                  className={`cg-toggle${isPublic ? ' on' : ''}`}
                  onClick={() => setIsPublic(v => !v)}
                >
                  {isPublic ? '🌐 Public' : '🔒 Private'}
                </button>
              </div>

              {/* Friends to add */}
              {friends.length > 0 && (
                <div className="cg-field">
                  <label className="cg-label">Add friends ({selectedIds.length} selected)</label>
                  <div className="cg-friends-list">
                    {friends.map(f => (
                      <button
                        key={f.id}
                        className={`cg-friend-item${selectedIds.includes(f.other?.id) ? ' selected' : ''}`}
                        onClick={() => toggleFriend(f.other?.id)}
                      >
                        <div className="cg-friend-avatar" style={{ background: avatarColor }}>
                          {(f.other?.username || '?')[0].toUpperCase()}
                        </div>
                        <span className="cg-friend-name">@{f.other?.username}</span>
                        {selectedIds.includes(f.other?.id) && <span className="cg-check">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {friends.length === 0 && (
                <div className="cg-empty-friends">Add friends first to invite them to groups.</div>
              )}

              {error && <div className="cg-error">{error}</div>}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
