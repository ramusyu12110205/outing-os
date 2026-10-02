import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
});

export async function ensureOutingAuth() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data?.session) return data.session;
  const { data: signed, error: signError } = await supabase.auth.signInAnonymously();
  if (signError) throw signError;
  if (!signed?.session) throw new Error('認証セッションを作成できませんでした。');
  return signed.session;
}
