import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useGroupsStore = create((set, get) => ({
  myGroups:     [],
  publicGroups: [],
  loading:  false,
  creating: false,
  error:    null,

  fetchMyGroups: async (userId) => {
    if (!userId) return
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('group_id, role, joined_at, groups(*)')
        .eq('user_id', userId)
        .order('joined_at', { ascending: false })
      if (error) throw error
      const myGroups = (data || []).map(row => ({ ...row.groups, myRole: row.role }))
      set({ myGroups, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  fetchPublicGroups: async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('is_public', true)
        .order('member_count', { ascending: false })
        .limit(50)
      if (error) throw error
      set({ publicGroups: data ?? [] })
    } catch (err) {
      set({ error: err.message })
    }
  },

  // Uses a security definer RPC to bypass RLS for group creation
  createGroup: async ({ name, description, isPublic, memberIds = [], avatarColor = '#06558D' }) => {
    set({ creating: true, error: null })
    try {
      const { data: groupId, error } = await supabase.rpc('create_group_with_members', {
        p_name:        name.trim(),
        p_description: description.trim(),
        p_is_public:   isPublic,
        p_avatar_color: avatarColor,
        p_member_ids:  memberIds,
      })
      if (error) throw error

      // Fetch the created group to get full data
      const { data: group } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single()

      set(s => ({ creating: false, myGroups: [{ ...(group || { id: groupId, name, is_public: isPublic, avatar_color: avatarColor, member_count: memberIds.length + 1 }), myRole: 'admin' }, ...s.myGroups] }))
      return group || { id: groupId, name, is_public: isPublic, avatar_color: avatarColor }
    } catch (err) {
      set({ creating: false, error: err.message })
      throw err
    }
  },

  joinGroup: async (groupId, userId) => {
    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, user_id: userId, role: 'member' })
    if (error) throw error
    await get().fetchMyGroups(userId)
  },

  leaveGroup: async (groupId, userId) => {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)
    if (error) throw error
    set(s => ({ myGroups: s.myGroups.filter(g => g.id !== groupId) }))
  },

  isMember: (groupId) => get().myGroups.some(g => g.id === groupId),
  clearError: () => set({ error: null }),
}))
