import { getPlace, deletePlace, savePlace, saveVisit, deleteVisit } from '../core/data.js';
import { STATUS, TAG_NAMES } from '../core/constants.js';
import { searchRelatedPlaces } from '../services/place-search.js';

export async function renderPlaceDetail(root, id, { onBack, onEdit }) {
  const p = await getPlace(id);
  const visits = [...(p.outing_visits ?? [])].sort((a,b)=>String(b.visited_on).localeCompare(String(a.visited_on)));
  const tags = getPlaceTags(p);

  root.innerHTML = `
    <section class="page-head"><div><button class="back" id="back">← 一覧へ</button><h1>${escapeHtml(p.name)}</h1></div>
      <div class="actions"><button class="secondary" id="edit">編集</button><button class="danger" id="delete">削除</button></div>
    </section>
    <section class="detail-grid">
      <div class="panel">
        <div class="detail-status"><span class="badge ${p.status}">${STATUS[p.status]}</span></div>
        <dl class="detail-list">
          <dt>都道府県</dt><dd>${display(p.outing_prefectures?.name)}</dd>
          <dt>市区町村</dt><dd>${display(p.city)}</dd>
          <dt>カテゴリ</dt><dd>${display(p.outing_categories?.name)}</dd>
          <dt>特徴</dt><dd>${renderTags(tags)}</dd>
          ${p.url ? `<dt>URL</dt><dd><a href="${safeUrl(p.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(p.url)}</a></dd>` : ''}
          <dt>概要</dt><dd>${display(p.summary)}</dd>
          <dt>おすすめポイント</dt><dd>${display(p.highlights)}</dd>
          <dt>メモ</dt><dd>${display(p.memo)}</dd>
        </dl>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>訪問記録</h2><button class="primary small" id="add-visit">＋ 記録</button></div>
        ${visits.length ? visits.map(v=>`<div class="visit"><div><strong>${escapeHtml(v.visited_on ?? '')}</strong><p>${display(v.memo)}</p></div><button class="link danger-text" data-visit="${v.id}">削除</button></div>`).join('') : '<p class="empty">まだ訪問記録がありません。</p>'}
      </div>
    </section>
    <section class="panel related-panel">
      <div class="panel-head">
        <div><h2>関連施設</h2><p class="muted">この施設の敷地内・施設内にある関連施設を、必要なときだけ検索します。</p></div>
        <button class="secondary" id="related-search">関連施設を検索</button>
      </div>
      <div id="related-results"><p class="empty">必要なときに「関連施設を検索」を押してください。</p></div>
    </section>`;

  root.querySelector('#back').onclick = onBack;
  root.querySelector('#edit').onclick = () => onEdit(p);
  root.querySelector('#delete').onclick = async () => {
    if (!confirm('この場所を削除しますか？')) return;
    await deletePlace(id);
    onBack();
  };

  root.querySelector('#add-visit').onclick = async () => {
    const date = prompt('訪問日（YYYY-MM-DD）', new Date().toISOString().slice(0,10));
    if (!date) return;
    const memo = prompt('訪問メモ（任意）', '') ?? '';
    await saveVisit({ place_id:id, visited_on:date, memo });
    if (p.status !== 'visited') await savePlace({ status:'visited' }, id);
    await renderPlaceDetail(root,id,{onBack,onEdit});
  };

  root.querySelectorAll('[data-visit]').forEach(button => {
    button.onclick = async () => {
      if (!confirm('この訪問記録を削除しますか？')) return;
      await deleteVisit(button.dataset.visit);
      await renderPlaceDetail(root,id,{onBack,onEdit});
    };
  });

  root.querySelector('#related-search').onclick = async () => {
    const button = root.querySelector('#related-search');
    const target = root.querySelector('#related-results');
    button.disabled = true;
    button.textContent = '検索中…';
    target.innerHTML = '<p class="loading">関連施設を検索しています…</p>';
    try {
      const rows = await searchRelatedPlaces(p.name);
      target.innerHTML = rows.length
        ? rows.map(row => `<article class="related-item"><div><h3>${escapeHtml(row.name)}</h3><p>${display(row.summary)}</p><p class="muted">${display(row.reason)}</p></div>${row.url ? `<a class="secondary" href="${safeUrl(row.url)}" target="_blank" rel="noopener noreferrer">公式・情報を見る</a>` : ''}</article>`).join('')
        : '<p class="empty">関連施設を確認できませんでした。</p>';
    } catch (e) {
      console.error(e);
      target.innerHTML = `<p class="error-text">${escapeHtml(e.message || '関連施設の検索に失敗しました。')}</p>`;
    } finally {
      button.disabled = false;
      button.textContent = '再検索';
    }
  };
}

function getPlaceTags(place) {
  return (place?.outing_place_tags ?? [])
    .map(row => row.outing_tags?.name)
    .filter(tag => tag && TAG_NAMES.includes(tag));
}

function renderTags(tags) {
  if (!tags.length) return '<span class="muted">—</span>';
  return '<div class="tag-chips">' + tags.map(tag => '<span class="tag-chip">' + escapeHtml(tag) + '</span>').join('') + '</div>';
}

function display(value) {
  if (value === null || value === undefined || String(value).trim() === '' || String(value) === 'null') {
    return '<span class="muted">—</span>';
  }
  return escapeHtml(String(value));
}

function escapeHtml(s='') {
  return String(s).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function safeUrl(value) {
  try {
    const u = new URL(value);
    return ['http:','https:'].includes(u.protocol) ? u.href : '#';
  } catch {
    return '#';
  }
}
