import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useCollectionsStore = create((set, get) => ({
  // ── State ───────────────────────────────────────────────────
  collections: [],
  publicCollections: {},   // { userId: [...] }
  collectionsPublic: true, // current user's visibility setting
  loading: false,
  saving: {},              // { url: true }
  error: null,

  // ── Fetch own collections ───────────────────────────────────
  fetchCollections: async (userId) => {
    if (!userId) return
    set({ loading: true, error: null })
    try {
      const [bookmarksRes, profileRes] = await Promise.all([
        supabase
          .from('collections')
          .select('id, url, title, saved_at')
          .eq('user_id', userId)
          .order('saved_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('collections_public')
          .eq('id', userId)
          .single(),
      ])
      if (bookmarksRes.error) throw bookmarksRes.error
      set({
        collections: bookmarksRes.data ?? [],
        collectionsPublic: profileRes.data?.collections_public ?? true,
        loading: false,
      })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  // ── Save a URL ──────────────────────────────────────────────
  saveUrl: async (userId, url, title = '') => {
    set(s => ({ saving: { ...s.saving, [url]: true } }))
    try {
      const { data, error } = await supabase
        .from('collections')
        .upsert(
          { user_id: userId, url, title: title.slice(0, 500) },
          { onConflict: 'user_id,url', ignoreDuplicates: false }
        )
        .select('id, url, title, saved_at')
        .single()
      if (error) throw error
      set(s => ({
        collections: [data, ...s.collections.filter(c => c.url !== url)],
        saving: { ...s.saving, [url]: false },
      }))
      return true
    } catch (err) {
      set(s => ({ saving: { ...s.saving, [url]: false }, error: err.message }))
      return false
    }
  },

  // ── Remove a bookmark ───────────────────────────────────────
  removeUrl: async (userId, collectionId) => {
    const prev = get().collections
    set(s => ({ collections: s.collections.filter(c => c.id !== collectionId) }))
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', collectionId)
      .eq('user_id', userId)
    if (error) {
      set({ collections: prev, error: error.message })
    }
  },

  // ── Toggle saved ────────────────────────────────────────────
  toggleUrl: async (userId, url, title = '') => {
    const existing = get().collections.find(c => c.url === url)
    if (existing) {
      await get().removeUrl(userId, existing.id)
      return false
    } else {
      await get().saveUrl(userId, url, title)
      return true
    }
  },

  isSaved: (url) => get().collections.some(c => c.url === url),

  // ── Update visibility ───────────────────────────────────────
  setCollectionsPublic: async (userId, isPublic) => {
    const prev = get().collectionsPublic
    set({ collectionsPublic: isPublic })
    const { error } = await supabase
      .from('profiles')
      .update({ collections_public: isPublic })
      .eq('id', userId)
    if (error) set({ collectionsPublic: prev, error: error.message })
  },

  // ── Fetch another user's public collections ─────────────────
  fetchPublicCollections: async (userId) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('collections_public')
        .eq('id', userId)
        .single()
      if (!profile?.collections_public) {
        set(s => ({ publicCollections: { ...s.publicCollections, [userId]: [] } }))
        return []
      }
      const { data, error } = await supabase
        .from('collections')
        .select('id, url, title, saved_at')
        .eq('user_id', userId)
        .order('saved_at', { ascending: false })
      if (error) throw error
      set(s => ({ publicCollections: { ...s.publicCollections, [userId]: data ?? [] } }))
      return data ?? []
    } catch {
      return []
    }
  },

  clearError: () => set({ error: null }),
}))
