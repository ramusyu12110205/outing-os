import { supabase } from '../core/supabase.js';

export async function searchPlaces(query) {
  const value = String(query ?? '').trim();
  if (!value) return [];

  const { data, error } = await supabase.functions.invoke('search-places', {
    body: { query: value }
  });

  if (error) throw new Error(error.message || '検索に失敗しました。');
  if (!data || !Array.isArray(data.results)) {
    throw new Error(data?.error || '検索結果を取得できませんでした。');
  }

  return data.results;
}
