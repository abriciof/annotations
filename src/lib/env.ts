const env = import.meta.env

export const appName = env.VITE_APP_NAME ?? 'Annotations'
export const supabaseUrl = env.VITE_SUPABASE_URL ?? ''
export const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY ?? ''
export const storageBucket = env.VITE_SUPABASE_STORAGE_BUCKET ?? 'study-assets'
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
