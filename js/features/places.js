import { listPlaces } from '../core/data.js';
import { STATUS } from '../core/constants.js';

export async function renderPlaces(root, { prefectures, categories, filters, onFilter, onOpen, onAdd }) {
  const places = await listPlaces(filters);
  root.innerHTML = `
    <section class="page-head"><div><p class="eyebrow">PLACES</p><h1>場所一覧</h1></div><button class="primary" id="add-place">＋ 場所を追加</button></section>
    <section class="filters panel">
      <input id="search" type="search" placeholder="場所名で検索" value="${escapeHtml(filters.search ?? '')}">
      <select id="pref"><option value="">都道府県</option>${prefectures.map(p=>`<option value="${p.id}" ${String(filters.prefectureId)===String(p.id)?'selected':''}>${p.name}</option>`).join('')}</select>
      <select id="cat"><option value="">カテゴリ</option>${categories.map(c=>`<option value="${c.id}" ${String(filters.categoryId)===String(c.id)?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select>
      <select id="status"><option value="">ステータス</option><option value="want" ${filters.status==='want'?'selected':''}>行きたい</option><option value="visited" ${filters.status==='visited'?'selected':''}>行った</option></select>
    </section>
    <section class="place-list">
      ${places.length ? places.map(card).join('') : '<div class="empty panel">条件に合う場所がありません。</div>'}
    </section>`;
  root.querySelector('#add-place').onclick = onAdd;
  const apply = () => onFilter({
    search: root.querySelector('#search').value,
    prefectureId: root.querySelector('#pref').value,
    categoryId: root.querySelector('#cat').value,
    status: root.querySelector('#status').value
  });
  root.querySelector('#search').addEventListener('input', debounce(apply, 250));
  ['pref','cat','status'].forEach(id => root.querySelector('#'+id).onchange = apply);
  root.querySelectorAll('[data-place]').forEach(el => el.onclick = () => onOpen(el.dataset.place));
}

function card(p) {
  const status = p.status === 'visited' ? 'visited' : 'want';
  return `<article class="place-card" data-place="${p.id}">
    <div class="card-top"><span class="badge ${status}">${STATUS[status]}</span><span>${p.outing_prefectures?.name ?? ''}</span></div>
    <h3>${escapeHtml(p.name)}</h3>
    <p>${escapeHtml([p.city,p.outing_categories?.name].filter(Boolean).join(' ・ '))}</p>
    ${p.summary ? `<p class="muted">${escapeHtml(p.summary)}</p>` : ''}
  </article>`;
}
function debounce(fn, ms){let t;return (...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
