import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useFriendsStore = create((set, get) => ({
  friends: [],           // accepted friendships with profile data
  pendingReceived: [],   // requests sent TO me (status=pending)
  pendingSent: [],       // requests I sent (status=pending)
  loading: false,
  error: null,

  // ── Fetch all friendship data for current user ────────────
  fetchFriends: async (userId) => {
    if (!userId) return
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id, status, requester_id, addressee_id, created_at,
          requester:requester_id(id, username, course),
          addressee:addressee_id(id, username, course)
        `)
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .neq('status', 'blocked')
        .order('created_at', { ascending: false })

      if (error) throw error

      const friends = []
      const pendingReceived = []
      const pendingSent = []

      for (const f of (data || [])) {
        const isRequester = f.requester_id === userId
        const other = isRequester ? f.addressee : f.requester

        const item = { ...f, other }

        if (f.status === 'accepted') {
          friends.push(item)
        } else if (f.status === 'pending') {
          if (isRequester) pendingSent.push(item)
          else pendingReceived.push(item)
        }
      }

      set({ friends, pendingReceived, pendingSent, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  // ── Send a friend request ────────────────────────────────
  sendRequest: async (requesterId, addresseeId) => {
    const { error } = await supabase
      .from('friendships')
      .insert({ requester_id: requesterId, addressee_id: addresseeId })
    if (error) throw error
    await get().fetchFriends(requesterId)
  },

  // ── Accept a request ────────────────────────────────────
  acceptRequest: async (friendshipId, userId) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)
      .eq('addressee_id', userId)
    if (error) throw error
    await get().fetchFriends(userId)
  },

  // ── Reject a request ────────────────────────────────────
  rejectRequest: async (friendshipId, userId) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'rejected' })
      .eq('id', friendshipId)
      .eq('addressee_id', userId)
    if (error) throw error
    await get().fetchFriends(userId)
  },

  // ── Remove friend / cancel request ──────────────────────
  removeFriend: async (friendshipId, userId) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId)
    if (error) throw error
    await get().fetchFriends(userId)
  },

  // ── Get friendship status with a specific user ───────────
  // Returns: 'none' | 'pending_sent' | 'pending_received' | 'friends'
  getFriendStatus: (targetUserId) => {
    const { friends, pendingSent, pendingReceived } = get()
    if (friends.some(f => f.other?.id === targetUserId)) return 'friends'
    if (pendingSent.some(f => f.other?.id === targetUserId)) return 'pending_sent'
    if (pendingReceived.some(f => f.other?.id === targetUserId)) return 'pending_received'
    return 'none'
  },

  getFriendshipId: (targetUserId) => {
    const { friends, pendingSent, pendingReceived } = get()
    const all = [...friends, ...pendingSent, ...pendingReceived]
    return all.find(f => f.other?.id === targetUserId)?.id ?? null
  },

  clearError: () => set({ error: null }),
}))
