import { getStats } from '../core/data.js';

export async function renderDashboard(root, { onAdd, onBrowse }) {
  const stats = await getStats();
  const prefRows = Object.entries(stats.byPrefecture).sort((a,b)=>b[1]-a[1]);
  const catRows = Object.entries(stats.byCategory).sort((a,b)=>b[1]-a[1]);

  root.innerHTML = `
    <section class="hero">
      <div>
        <p class="eyebrow">OUTING OS</p>
        <h1>おでかけOS</h1>
        <p>行きたい場所と、行った場所をひとつに。</p>
      </div>
      <button class="primary" id="add-place">＋ 場所を追加</button>
    </section>
    <section class="stats">
      <div class="stat"><span>登録場所</span><strong>${stats.total}</strong></div>
      <div class="stat"><span>行きたい</span><strong>${stats.want}</strong></div>
      <div class="stat"><span>行った</span><strong>${stats.visited}</strong></div>
    </section>
    <div class="dashboard-grid">
      <section class="panel"><div class="panel-head"><h2>都道府県</h2><button class="link" id="browse-pref">一覧を見る</button></div>
        ${prefRows.length ? prefRows.map(([n,c])=>`<div class="bar-row"><span>${n}</span><b>${c}</b></div>`).join('') : '<p class="empty">まだ登録がありません。</p>'}
      </section>
      <section class="panel"><div class="panel-head"><h2>カテゴリ</h2><button class="link" id="browse-cat">一覧を見る</button></div>
        ${catRows.length ? catRows.map(([n,c])=>`<div class="bar-row"><span>${n}</span><b>${c}</b></div>`).join('') : '<p class="empty">まだ登録がありません。</p>'}
      </section>
    </div>`;
  root.querySelector('#add-place').onclick = onAdd;
  root.querySelector('#browse-pref').onclick = onBrowse;
  root.querySelector('#browse-cat').onclick = onBrowse;
}
