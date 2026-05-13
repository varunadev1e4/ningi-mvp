import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'
import UserAvatar from '../components/UserAvatar'

export default function ProfilePage() {
  const { user, profile: myProfile, init } = useAuthStore()
  const { profileUser, closeProfile, openDM } = useAppStore()

  const isOwnProfile = user?.id === profileUser?.id

  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState(false)
  const [course, setCourse]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [saveMsg, setSaveMsg]   = useState('')

  useEffect(() => {
    if (!profileUser?.id) return
    setLoading(true)
    supabase.from('profiles').select('*').eq('id', profileUser.id).single()
      .then(({ data }) => {
        setProfile(data)
        setCourse(data?.course || '')
        setLoading(false)
      })
  }, [profileUser?.id])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ course: course.trim() })
      .eq('id', user.id)
    setSaving(false)
    if (!error) {
      setProfile((p) => ({ ...p, course: course.trim() }))
      setSaveMsg('Saved!')
      setEditing(false)
      setTimeout(() => setSaveMsg(''), 2000)
      // Refresh global auth profile so header stays in sync
      await init()
    }
  }

  function joinedDate(ts) {
    if (!ts) return ''
    return new Date(ts).toLocaleDateString([], { year: 'numeric', month: 'long' })
  }

  return (
    <>
      <div className="dm-header">
        <button className="back-btn" onClick={closeProfile}>←</button>
        <div className="dm-user-info">
          <div className="dm-user-name">{isOwnProfile ? 'My Profile' : 'Profile'}</div>
        </div>
        {saveMsg && <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 700 }}>{saveMsg}</span>}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div className="loading-state"><span className="loading-dot" /><span>Loading…</span></div>
        ) : (
          <>
            {/* Hero */}
            <div className="profile-hero">
              <UserAvatar username={profile?.username || '?'} size={72} />
              <div className="profile-username">@{profile?.username}</div>
              {profile?.course && !editing && (
                <div className="profile-course-badge">{profile.course}</div>
              )}
              <div className="profile-joined">Joined {joinedDate(profile?.created_at)}</div>
            </div>

            {/* Actions */}
            <div className="profile-actions">
              {!isOwnProfile && (
                <button className="profile-dm-btn" onClick={() => openDM({ id: profileUser.id, username: profile.username })}>
                  ✉ Send Direct Message
                </button>
              )}
              {isOwnProfile && !editing && (
                <button className="profile-edit-btn" onClick={() => setEditing(true)}>
                  ✏ Edit Profile
                </button>
              )}
            </div>

            {/* Edit form (own profile) */}
            {isOwnProfile && editing && (
              <div className="profile-edit-card">
                <div className="fb-label" style={{ marginBottom: 8 }}>Your Course</div>
                <input
                  className="auth-input"
                  type="text"
                  placeholder="e.g. BCA, MCA, B.Ed, MBA…"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  maxLength={60}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  This helps others find students in the same course
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button className="profile-dm-btn" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button className="profile-edit-btn" style={{ flex: 1 }} onClick={() => { setEditing(false); setCourse(profile?.course || '') }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Info card */}
            <div className="profile-card">
              <div className="profile-row">
                <span className="profile-row-label">Username</span>
                <span className="profile-row-val">@{profile?.username}</span>
              </div>
              <div className="profile-row">
                <span className="profile-row-label">Course</span>
                <span className="profile-row-val">
                  {profile?.course
                    ? profile.course
                    : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        {isOwnProfile ? 'Not set — tap Edit Profile' : 'Not set'}
                      </span>
                  }
                </span>
              </div>
              <div className="profile-row">
                <span className="profile-row-label">Member since</span>
                <span className="profile-row-val">{joinedDate(profile?.created_at)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
