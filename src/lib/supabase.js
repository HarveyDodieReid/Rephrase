import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// TODO: Replace these with your own Supabase project credentials.
// Find them in: Supabase Dashboard → Project Settings → API
// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL      = 'https://vmmgbkdekqdbtwubexpd.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_pFNone2AP0_C6ldM47RfeQ_jR9yQYNb'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Session persistence is handled by electron-store in the main process,
    // not by Supabase's own localStorage mechanism.
    persistSession:     false,
    autoRefreshToken:   false,
    detectSessionInUrl: false,
  },
})
