import { useEffect, useState, useRef } from 'react'

/**
 * usePresence
 * Tracks who is currently present in a Supabase Realtime channel.
 * Returns: { onlineUsers: [{user_id, username}], onlineCount }
 *
 * @param {object|null} channel  — the supabase channel ref (channelRef.current)
 * @param {object|null} user     — current auth user
 * @param {object|null} profile  — current user's profile
 */
export function usePresence(channel, user, profile) {
  const [onlineUsers, setOnlineUsers] = useState([])

  useEffect(() => {
    if (!channel || !user || !profile) return

    const syncPresence = () => {
      const state = channel.presenceState()
      const users = Object.values(state)
        .flat()
        .map(p => ({ user_id: p.user_id, username: p.username }))
      // Deduplicate by user_id
      const seen = new Set()
      const unique = users.filter(u => {
        if (seen.has(u.user_id)) return false
        seen.add(u.user_id)
        return true
      })
      setOnlineUsers(unique)
    }

    channel.on('presence', { event: 'sync' },  syncPresence)
    channel.on('presence', { event: 'join' },  syncPresence)
    channel.on('presence', { event: 'leave' }, syncPresence)

    // Track self
    channel.track({ user_id: user.id, username: profile.username })

    return () => setOnlineUsers([])
  }, [channel?.topic, user?.id])

  const isOnline = (userId) => onlineUsers.some(u => u.user_id === userId)

  return {
    onlineUsers,
    onlineCount: onlineUsers.length,
    isOnline,
  }
}
