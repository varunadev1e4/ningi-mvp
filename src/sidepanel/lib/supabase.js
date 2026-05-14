import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://iecongygvcachqbmsjja.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllY29uZ3lndmNhY2hxYm1zamphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1Nzc2OTcsImV4cCI6MjA5NDE1MzY5N30.9RjqpDb4iC7ZBxSNplgpXnUAZ_8a7H9hodhXPCt8G7k'

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    'Ningi: Missing Supabase env vars. Copy .env.example to .env and fill in your credentials.'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'implicit'   // Required for Chrome extensions — PKCE needs localStorage
                           // shared between contexts which extensions don't support
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})
