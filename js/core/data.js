import { supabase } from './supabase.js';
import { DEFAULT_CATEGORIES } from './constants.js';

export async function seedCategories() {
  const { error } = await supabase.rpc('outing_seed_categories');
  if (error) throw error;
}

export async function getPrefectures() {
  const { data, error } = await supabase.from('outing_prefectures').select('*').order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function getCategories() {
  await seedCategories();
  const { data, error } = await supabase.from('outing_categories')
    .select('*').eq('archived', false).order('sort_order').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(name) {
  const value = name.trim();
  if (!value) throw new Error('カテゴリ名を入力してください。');
  const { data, error } = await supabase.from('outing_categories')
    .insert({ name: value }).select().single();
  if (error) throw error;
  return data;
}

export async function listPlaces(filters = {}) {
  let q = supabase.from('outing_places')
    .select('*, outing_prefectures(id,name), outing_categories(id,name)')
    .order('updated_at', { ascending: false });
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.prefectureId) q = q.eq('prefecture_id', filters.prefectureId);
  if (filters.categoryId) q = q.eq('category_id', filters.categoryId);
  if (filters.search?.trim()) q = q.ilike('name', `%${filters.search.trim()}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getPlace(id) {
  const { data, error } = await supabase.from('outing_places')
    .select('*, outing_prefectures(id,name), outing_categories(id,name), outing_visits(*)')
    .eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function savePlace(payload, id = null) {
  if (id) {
    const { data, error } = await supabase.from('outing_places')
      .update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('outing_places')
    .insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deletePlace(id) {
  const { error } = await supabase.from('outing_places').delete().eq('id', id);
  if (error) throw error;
}

export async function saveVisit(payload, id = null) {
  if (id) {
    const { data, error } = await supabase.from('outing_visits')
      .update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('outing_visits')
    .insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteVisit(id) {
  const { error } = await supabase.from('outing_visits').delete().eq('id', id);
  if (error) throw error;
}

export async function getStats() {
  const { data, error } = await supabase.from('outing_places')
    .select('status,prefecture_id,category_id,outing_prefectures(name),outing_categories(name)');
  if (error) throw error;
  const places = data ?? [];
  const byPrefecture = {};
  const byCategory = {};
  for (const p of places) {
    const pref = p.outing_prefectures?.name ?? '未設定';
    const cat = p.outing_categories?.name ?? '未設定';
    byPrefecture[pref] = (byPrefecture[pref] ?? 0) + 1;
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
  }
  return {
    total: places.length,
    want: places.filter(p => p.status === 'want').length,
    visited: places.filter(p => p.status === 'visited').length,
    byPrefecture, byCategory
  };
}
