import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useNotificationsStore = create((set, get) => ({
  notifications: [],
  unreadCount:   0,
  loading:       false,

  // ── Fetch ─────────────────────────────────────────────────
  fetchNotifications: async (userId) => {
    if (!userId) return
    set({ loading: true })
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(60)
    const notifs     = data ?? []
    const unreadCount = notifs.filter(n => !n.read).length
    set({ notifications: notifs, unreadCount, loading: false })
  },

  // ── Mark one as read ──────────────────────────────────────
  markRead: async (notifId) => {
    await supabase.from('notifications').update({ read: true }).eq('id', notifId)
    set(s => ({
      notifications: s.notifications.map(n => n.id === notifId ? { ...n, read: true } : n),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }))
  },

  // ── Mark all read ─────────────────────────────────────────
  markAllRead: async (userId) => {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    set(s => ({
      notifications: s.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    }))
  },

  // ── Create a notification (called locally after mention / invite) ──
  createNotification: async ({ userId, type, actorId, actorUsername, data = {} }) => {
    if (!userId || userId === actorId) return // never notify yourself
    const { error } = await supabase.from('notifications').insert({
      user_id:        userId,
      type,
      actor_id:       actorId,
      actor_username: actorUsername,
      data,
    })
    if (error) console.error('[Ningi] notification insert:', error.message)
  },

  // ── Push a real-time notification into local state ────────
  pushLocal: (notif) => {
    set(s => ({
      notifications: [notif, ...s.notifications],
      unreadCount: s.unreadCount + 1,
    }))
  },
}))
