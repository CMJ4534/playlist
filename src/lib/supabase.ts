import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * 2단계 이후 DB 연동 시 사용.
 * env 미설정 시에도 앱이 크래시하지 않도록 placeholder 클라이언트 유지.
 */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createClient('https://placeholder.supabase.co', 'placeholder-key');

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
