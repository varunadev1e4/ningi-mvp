import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'
import { useCollectionsStore } from '../stores/collectionsStore'
import UserAvatar from '../components/UserAvatar'
import ReportModal from '../components/ReportModal'

export default function ProfilePage() {
  const { user } = useAuthStore()
  const { profileUser, closeProfile, openDM, setView } = useAppStore()
  const {
    collections, collectionsPublic,
    fetchCollections, setCollectionsPublic,
    fetchPublicCollections, publicCollections,
  } = useCollectionsStore()

  const isOwnProfile = user?.id === profileUser?.id

  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [retryKey, setRetryKey] = useState(0)
  const [editing, setEditing]   = useState(false)
  const [course, setCourse]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [saveMsg, setSaveMsg]   = useState('')

  // Report modal state
  const [reportOpen, setReportOpen] = useState(false)

  // Other user's public collections
  const [showPublicColls, setShowPublicColls] = useState(false)
  const theirCollections = publicCollections[profileUser?.id] ?? []

  useEffect(() => {
    if (!profileUser?.id) return
    setLoading(true); setError(null)
    let cancelled = false
    const load = async () => {
      try {
        const result = await Promise.race([
          supabase.from('profiles').select('*').eq('id', profileUser.id).single(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
        ])
        if (result.error) throw result.error
        if (cancelled) return
        setProfile(result.data)
        setCourse(result.data?.course || '')
        setLoading(false)
        window.dispatchEvent(new CustomEvent('ningi:healthy'))
      } catch {
        if (!cancelled) window.location.reload()
      }
    }
    load()
    return () => { cancelled = true }
  }, [profileUser?.id, retryKey])

  // Fetch own collections count; fetch other user's public collections
  useEffect(() => {
    if (isOwnProfile && user) fetchCollections(user.id)
    else if (!isOwnProfile && profileUser?.id) fetchPublicCollections(profileUser.id)
  }, [profileUser?.id, isOwnProfile])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles').update({ course: course.trim() }).eq('id', user.id)
    setSaving(false)
    if (!error) {
      setProfile(p => ({ ...p, course: course.trim() }))
      setSaveMsg('Saved!')
      setEditing(false)
      setTimeout(() => setSaveMsg(''), 2000)
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {saveMsg && <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 700 }}>{saveMsg}</span>}
          {/* ── Report button (other user only) ── */}
          {!isOwnProfile && profileUser?.id && (
            <button
              className="profile-report-btn"
              onClick={() => setReportOpen(true)}
              title="Report this user"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                <line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
              Report
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && (
          <div className="loading-state"><span className="loading-dot" /><span>Loading…</span></div>
        )}

        {error && !loading && (
          <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <div className="error-banner" style={{ width: '100%', borderRadius: 'var(--radius-sm)', borderTop: 'none', border: '1px solid rgba(255,61,0,0.25)' }}>
              <span>⚠ {error}</span>
              <button className="error-retry-btn" onClick={() => setRetryKey(k => k + 1)}>Retry</button>
            </div>
          </div>
        )}

        {!loading && !error && profile && (
          <>
            <div className="profile-hero">
              <UserAvatar username={profile?.username || '?'} size={72} />
              <div className="profile-username">@{profile?.username}</div>
              {profile?.course && !editing && (
                <div className="profile-course-badge">{profile.course}</div>
              )}
              <div className="profile-joined">Joined {joinedDate(profile?.created_at)}</div>
            </div>

            <div className="profile-actions">
              {!isOwnProfile && (
                <button className="profile-dm-btn"
                  onClick={() => openDM({ id: profileUser.id, username: profile.username })}>
                  ✉ Send Direct Message
                </button>
              )}
              {isOwnProfile && !editing && (
                <button className="profile-edit-btn" onClick={() => setEditing(true)}>
                  ✏ Edit Profile
                </button>
              )}
            </div>

            {/* ── My Collections button (own profile only) ── */}
            {isOwnProfile && (
              <div className="profile-collections-row">
                <button className="profile-collections-btn" onClick={() => setView('collections')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                  My Collections
                  {collections.length > 0 && (
                    <span className="profile-collections-badge">{collections.length}</span>
                  )}
                </button>

                {/* ── Public/Private toggle ── */}
                <button
                  className={`collections-visibility-toggle${collectionsPublic ? ' collections-visibility-toggle--public' : ''}`}
                  onClick={() => setCollectionsPublic(user.id, !collectionsPublic)}
                  title={collectionsPublic ? 'Make private' : 'Make public'}
                >
                  {collectionsPublic ? '🌐 Public' : '🔒 Private'}
                </button>
              </div>
            )}

            {/* ── Their public collections (other user) ── */}
            {!isOwnProfile && theirCollections.length > 0 && (
              <div style={{ padding: '0 14px 8px' }}>
                <button
                  className="profile-public-colls-toggle"
                  onClick={() => setShowPublicColls(v => !v)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                  {showPublicColls ? 'Hide' : 'View'} collections ({theirCollections.length})
                </button>
                {showPublicColls && (
                  <div className="profile-public-colls-list">
                    {theirCollections.map(item => {
                      let hostname = ''
                      try { hostname = new URL(item.url).hostname } catch {}
                      return (
                        <button
                          key={item.id}
                          className="profile-public-coll-item"
                          onClick={() => {
                            const fullUrl = item.url.startsWith('http') ? item.url : 'https://' + item.url
                            chrome.tabs.create({ url: fullUrl })
                          }}
                        >
                          <img
                            className="profile-public-coll-item__favicon"
                            src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
                            alt=""
                            onError={e => { e.target.style.display = 'none' }}
                          />
                          <span className="profile-public-coll-item__title">{item.title || hostname}</span>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {isOwnProfile && editing && (
              <div className="profile-edit-card">
                <div className="fb-label" style={{ marginBottom: 8 }}>Your Course</div>
                <input
                  className="auth-input"
                  type="text"
                  placeholder="e.g. BCA, MCA, B.Ed, MBA…"
                  value={course}
                  onChange={e => setCourse(e.target.value)}
                  maxLength={60}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Helps others find students in the same course
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button className="profile-dm-btn" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button className="profile-edit-btn" style={{ flex: 1 }}
                    onClick={() => { setEditing(false); setCourse(profile?.course || '') }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="profile-card">
              <div className="profile-row">
                <span className="profile-row-label">Username</span>
                <span className="profile-row-val">@{profile?.username}</span>
              </div>
              <div className="profile-row">
                <span className="profile-row-label">Course</span>
                <span className="profile-row-val">
                  {profile?.course || (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      {isOwnProfile ? 'Not set — tap Edit Profile' : 'Not set'}
                    </span>
                  )}
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

      {/* Report modal */}
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        type="user"
        targetId={profileUser?.id}
        targetName={profile?.username ? `@${profile.username}` : 'this user'}
      />
    </>
  )
}
