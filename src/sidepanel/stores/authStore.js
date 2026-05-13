import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  /** Call once on app mount */
  init: async () => {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (session?.user) {
        const profile = await get()._fetchProfile(session.user.id)
        set({ user: session.user, profile, loading: false })
      } else {
        set({ loading: false })
      }
    } catch {
      set({ loading: false })
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await get()._fetchProfile(session.user.id)
        set({ user: session.user, profile })
      } else {
        set({ user: null, profile: null })
      }
    })
  },

  _fetchProfile: async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return data
  },

  signUp: async (email, password, username) => {
    // 1. Create auth user
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    const user = data.user
    if (!user) throw new Error('Signup failed — no user returned')

    // 2. Insert profile row
    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id,
      username: username.trim(),
      email: email.trim().toLowerCase()
    })
    if (profileError) throw profileError

    // 3. Load profile into store
    const profile = await get()._fetchProfile(user.id)
    set({ user, profile })
    return data
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error

    const profile = await get()._fetchProfile(data.user.id)
    set({ user: data.user, profile })
    return data
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  }
}))
