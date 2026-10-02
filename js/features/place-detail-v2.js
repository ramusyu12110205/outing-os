import { getPlace, deletePlace, savePlace, saveVisit, deleteVisit } from '../core/data.js';
import { STATUS } from '../core/constants.js';

export async function renderPlaceDetail(root, id, { onBack, onEdit }) {
  const p = await getPlace(id);
  const visits = [...(p.outing_visits ?? [])].sort((a,b)=>String(b.visited_on).localeCompare(String(a.visited_on)));

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
