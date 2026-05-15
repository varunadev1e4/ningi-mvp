import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  user:    null,
  profile: null,
  loading: true,

  // ── Internal flag: stop onAuthStateChange from clobbering
  // signInWithGoogle's in-progress state update
  _googleSignInInProgress: false,

  // ── Init ────────────────────────────────────────────────────
  init: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      console.log('[Ningi init] session user:', session?.user?.id ?? 'none')

      if (session?.user) {
        const profile = await get()._loadProfile(session.user)
        console.log('[Ningi init] profile:', profile?.username ?? 'null')
        set({ user: session.user, profile, loading: false })
      } else {
        set({ loading: false })
      }
    } catch (e) {
      console.error('[Ningi init] error:', e.message)
      set({ loading: false })
    }

    // Only react to auth state changes when we're NOT mid-Google-sign-in
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (get()._googleSignInInProgress) return

      if (session?.user) {
        const profile = await get()._loadProfile(session.user)
        set({ user: session.user, profile })
      } else {
        set({ user: null, profile: null })
      }
    })
  },

  // ── Profile helpers ─────────────────────────────────────────
  _fetchProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles').select('*').eq('id', userId).single()
    if (error && error.code !== 'PGRST116') {
      // PGRST116 = row not found (expected for new users)
      console.error('[Ningi] _fetchProfile error:', error.code, error.message)
    }
    return data ?? null
  },

  /** Re-fetch profile from DB and update store — use before sending messages */
  refreshProfile: async () => {
    const user = get().user
    if (!user) return null
    const profile = await get()._fetchProfile(user.id)
    if (profile) set({ profile })
    return profile
  },

  /** Fetch profile, creating it if it doesn't exist yet */
  _loadProfile: async (user) => {
    let profile = await get()._fetchProfile(user.id)
    if (profile) return profile

    // Profile missing → create it (first-time Google login)
    console.log('[Ningi] profile not found, creating...')
    profile = await get()._createProfile(user)
    return profile
  },

  _createProfile: async (user) => {
    const raw = (
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'user'
    ).replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+|_+$/g, '').slice(0, 20) || 'user'

    let username = raw
    for (let attempt = 0; attempt < 10; attempt++) {
      const { error } = await supabase.from('profiles').insert({
        id:    user.id,
        username,
        email: user.email ?? ''
        // course has DB default ''
      })

      if (!error) {
        console.log('[Ningi] profile created:', username)
        return get()._fetchProfile(user.id)
      }

      // Any uniqueness conflict → try to fetch (profile might already exist)
      if (error.code === '23505') {
        const existing = await get()._fetchProfile(user.id)
        if (existing) return existing
        // Conflict was on username, not id — try different username
        username = `${raw}_${Math.floor(Math.random() * 9000) + 1000}`
      } else {
        console.error('[Ningi] profile insert error:', error.code, error.message)
        break
      }
    }

    return get()._fetchProfile(user.id)
  },

  // ── Sign up / Sign in ───────────────────────────────────────
  signUp: async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    const user = data.user
    if (!user) throw new Error('Signup failed — no user returned')

    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id, username: username.trim(), email: email.trim().toLowerCase()
    })
    if (profileError) throw profileError

    const profile = await get()._fetchProfile(user.id)
    set({ user, profile })
    return data
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    const profile = await get()._loadProfile(data.user)
    set({ user: data.user, profile })
    return data
  },

  // ── Google sign in ──────────────────────────────────────────
  signInWithGoogle: async () => {
    // Block onAuthStateChange from interfering during this flow
    set({ _googleSignInInProgress: true })

    try {
      const redirectUrl = chrome.identity.getRedirectURL()
      console.log('[Ningi Google] step 1 — redirectUrl:', redirectUrl)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options:  { redirectTo: redirectUrl, skipBrowserRedirect: true }
      })
      if (error) throw error
      console.log('[Ningi Google] step 2 — OAuth URL ready')

      const responseUrl = await Promise.race([
        new Promise((resolve, reject) => {
          chrome.identity.launchWebAuthFlow(
            { url: data.url, interactive: true },
            (url) => {
              if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
              else if (!url)               reject(new Error('Sign-in was cancelled'))
              else                         resolve(url)
            }
          )
        }),
        new Promise((_, reject) =>
          setTimeout(() =>
            reject(new Error(
              `Timed out. Add this to Supabase → Authentication → URL Configuration → Redirect URLs: ${redirectUrl}`
            )), 60000
          )
        )
      ])
      console.log('[Ningi Google] step 3 — responseUrl:', responseUrl.slice(0, 80))

      const parsed = new URL(responseUrl)
      const params = new URLSearchParams(
        parsed.hash ? parsed.hash.slice(1) : parsed.search.slice(1)
      )
      const access_token  = params.get('access_token')
      const refresh_token = params.get('refresh_token') ?? ''
      console.log('[Ningi Google] step 4 — access_token:', !!access_token, '| refresh_token:', !!refresh_token)

      if (!access_token) {
        throw new Error(
          'No access_token in redirect URL. ' +
          'Make sure Supabase client uses flowType: "implicit" and the redirect URL is in Supabase allowed list.'
        )
      }

      const { data: sd, error: se } = await supabase.auth.setSession({ access_token, refresh_token })
      if (se) throw se
      console.log('[Ningi Google] step 5 — setSession, user:', sd?.session?.user?.id ?? sd?.user?.id ?? 'null')

      const user = sd?.session?.user ?? sd?.user
      if (!user) throw new Error('No user after setSession')

      const profile = await get()._loadProfile(user)
      console.log('[Ningi Google] step 6 — profile:', profile?.username ?? 'null')

      set({ user, profile, _googleSignInInProgress: false })
      console.log('[Ningi Google] step 7 — done ✓')

    } catch (e) {
      set({ _googleSignInInProgress: false })
      throw e
    }
  },

  // ── Sign out ────────────────────────────────────────────────
  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  }
}))
