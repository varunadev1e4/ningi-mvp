import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'
import { useGroupsStore } from '../stores/groupsStore'
import { moderate } from '../lib/moderation'
import MessageBubble from '../components/MessageBubble'
import MessageInput from '../components/MessageInput'
import ReplyBar from '../components/ReplyBar'

export default function GroupPage() {
  const { user, profile } = useAuthStore()
  const { currentGroup, closeGroup } = useAppStore()
  const { leaveGroup, myGroups } = useGroupsStore()

  const [messages, setMessages]   = useState([])
  const [reactions, setReactions] = useState({})
  const [replyingTo, setReplyTo]  = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [modError, setModError]   = useState(null)
  const [members, setMembers]     = useState([])
  const [showInfo, setShowInfo]   = useState(false)

  const bottomRef  = useRef(null)
  const channelRef = useRef(null)
  const mountedRef = useRef(true)
  const group = currentGroup

  const myMembership = myGroups.find(g => g.id === group?.id)
  const isAdmin = myMembership?.myRole === 'admin'

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  useEffect(() => {
    if (!group?.id || !user) return
    setMessages([]); setReactions({}); setError(null); setLoading(true)

    fetchMessages()
    fetchMembers()

    // Realtime channel
    const channel = supabase
      .channel(`group:${group.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'group_messages',
        filter: `group_id=eq.${group.id}`
      }, ({ new: msg }) => {
        if (!mountedRef.current || msg.user_id === user.id) return
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'group_messages',
        filter: `group_id=eq.${group.id}`
      }, ({ new: msg }) => {
        if (!mountedRef.current) return
        setMessages(prev => prev.map(m => m.id === msg.id ? msg : m))
      })
      .on('broadcast', { event: 'react_group' }, ({ payload }) => {
        if (!mountedRef.current) return
        const { msgId, key, emoji, user_id, username } = payload
        setReactions(prev => ({ ...prev, [msgId]: { ...(prev[msgId] || {}), [key]: { emoji, user_id, username } } }))
      })
      .on('broadcast', { event: 'unreact_group' }, ({ payload }) => {
        if (!mountedRef.current) return
        const { msgId, key } = payload
        setReactions(prev => {
          const updated = { ...(prev[msgId] || {}) }
          delete updated[key]
          return { ...prev, [msgId]: updated }
        })
      })
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel); channelRef.current = null }
  }, [group?.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', group.id)
      .order('created_at', { ascending: true })
      .limit(150)
    if (!mountedRef.current) return
    if (error) { setError('Could not load messages.'); setLoading(false); return }
    setMessages(data || [])
    setLoading(false)
  }

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('group_members')
      .select('user_id, role, profiles(username)')
      .eq('group_id', group.id)
    setMembers(data || [])
  }

  const sendMessage = async (content) => {
    if (!content.trim() || !user || !profile) return
    setModError(null)

    // Timeout check
    const { data: modStatus } = await supabase
      .from('profiles').select('is_banned, timeout_until').eq('id', user.id).single()
    if (modStatus?.is_banned) { setModError('Your account has been banned.'); return }
    if (modStatus?.timeout_until && new Date(modStatus.timeout_until) > new Date()) {
      setModError(`You are timed out until ${new Date(modStatus.timeout_until).toLocaleString()}.`); return
    }

    const blocked = moderate(content)
    if (blocked) { setModError(blocked); return }

    const msg = {
      group_id: group.id,
      user_id: user.id,
      username: profile.username,
      content: content.trim(),
      ...(replyingTo && {
        reply_to_id: replyingTo.id,
        reply_to_username: replyingTo.username,
        reply_to_content: replyingTo.content,
      })
    }

    const { data, error: e } = await supabase
      .from('group_messages').insert(msg).select().single()
    if (e) { console.error(e); return }
    setMessages(prev => prev.find(m => m.id === data.id) ? prev : [...prev, data])
    setReplyTo(null)
  }

  const handleDelete = async (msgId) => {
    await supabase.from('group_messages').update({ is_deleted: true }).eq('id', msgId)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_deleted: true } : m))
  }

  const handleReact = (msgId, emoji) => {
    if (!user || !profile) return
    const key = `${user.id}:${emoji}`
    const existing = reactions[msgId]?.[key]
    if (existing) {
      setReactions(prev => {
        const updated = { ...(prev[msgId] || {}) }; delete updated[key]
        return { ...prev, [msgId]: updated }
      })
      channelRef.current?.send({ type: 'broadcast', event: 'unreact_group', payload: { msgId, key } })
    } else {
      const reaction = { emoji, user_id: user.id, username: profile.username }
      setReactions(prev => ({ ...prev, [msgId]: { ...(prev[msgId] || {}), [key]: reaction } }))
      channelRef.current?.send({ type: 'broadcast', event: 'react_group', payload: { msgId, key, ...reaction } })
    }
  }

  const handleLeave = async () => {
    if (!window.confirm('Leave this group?')) return
    await leaveGroup(group.id, user.id)
    closeGroup()
  }

  if (!group) return null

  return (
    <>
      {/* Header */}
      <div className="dm-header">
        <button className="back-btn" onClick={closeGroup}>←</button>
        <div
          className="group-header-avatar"
          style={{ background: group.avatar_color || '#06558D' }}
          onClick={() => setShowInfo(v => !v)}
        >
          {group.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="dm-user-info" style={{ cursor: 'pointer' }} onClick={() => setShowInfo(v => !v)}>
          <div className="dm-user-name">{group.name}</div>
          <div className="dm-user-label">{group.member_count} members · {group.is_public ? '🌐 Public' : '🔒 Private'}</div>
        </div>
        <button className="btn-icon" onClick={() => setShowInfo(v => !v)} title="Group info" style={{ fontSize: 14 }}>ℹ</button>
      </div>

      {/* Group info panel */}
      {showInfo && (
        <div className="group-info-panel">
          {group.description && <p className="group-info-desc">{group.description}</p>}
          <div className="group-info-members-label">Members ({members.length})</div>
          <div className="group-info-members">
            {members.map(m => (
              <div key={m.user_id} className="group-info-member">
                <div className="group-info-member-avatar" style={{ background: group.avatar_color || '#06558D' }}>
                  {(m.profiles?.username || '?')[0].toUpperCase()}
                </div>
                <span className="group-info-member-name">@{m.profiles?.username}</span>
                {m.role === 'admin' && <span className="group-admin-badge">Admin</span>}
              </div>
            ))}
          </div>
          <button className="group-leave-btn" onClick={handleLeave}>Leave Group</button>
        </div>
      )}

      {/* Messages */}
      {error && <div className="error-banner"><span>⚠ {error}</span></div>}

      <div className="message-list">
        {loading && <div className="loading-state"><span className="loading-dot"/><span>Loading…</span></div>}
        {!loading && messages.length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-icon">👋</div>
            <span style={{ fontWeight: 700, color: 'var(--text-soft)' }}>Start the conversation</span>
            <span className="empty-sub">Say hello to your group!</span>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            reactions={reactions[msg.id] || {}}
            onReply={setReplyTo}
            onDelete={handleDelete}
            onReact={handleReact}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {modError && (
        <div className="mod-error-banner">
          <span>🚫 {modError}</span>
          <button onClick={() => setModError(null)}>✕</button>
        </div>
      )}
      <ReplyBar replyingTo={replyingTo} onCancel={() => setReplyTo(null)} />
      <MessageInput onSend={sendMessage} disabled={!!error} placeholder={`Message ${group.name}…`} />
    </>
  )
}
