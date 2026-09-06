/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Supabase project URL and publishable ("anon"-equivalent) key — see lib/sync.ts. Both are
  // meant to be public/embedded in the client bundle; Row Level Security plus the sync-state
  // Edge Function's own initData check are what actually gate access, not secrecy of these two.
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
