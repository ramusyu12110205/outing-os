import { savePlace, createCategory } from '../core/data.js';

export function renderPlaceForm(root, { place, prefectures, categories, onSave, onCancel }) {
  const editing = Boolean(place);
  root.innerHTML =
    '<section class="page-head"><div><button class="back" id="cancel-top">← 戻る</button>' +
    '<h1>' + (editing ? '場所を編集' : '場所を追加') + '</h1></div></section>' +
    '<form class="panel form" id="place-form">' +
      '<div class="form-grid">' +
        field('場所名 *', '<input name="name" required value="' + esc(place?.name) + '" placeholder="例：箱根彫刻の森美術館">') +
        field('都道府県 *', '<select name="prefecture_id" required><option value="">選択してください</option>' +
          prefectures.map(p => '<option value="' + p.id + '"' +
            (String(place?.prefecture_id) === String(p.id) ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') +
          '</select>') +
        field('市区町村', '<input name="city" value="' + esc(place?.city) + '">') +
        field('カテゴリ *', '<div class="inline"><select name="category_id" required><option value="">選択してください</option>' +
          categories.map(c => '<option value="' + c.id + '"' +
            (String(place?.category_id) === String(c.id) ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') +
          '</select><button type="button" class="secondary" id="new-cat">追加</button></div>') +
        field('ステータス', '<select name="status"><option value="want"' +
          (place?.status !== 'visited' ? ' selected' : '') + '>行きたい</option><option value="visited"' +
          (place?.status === 'visited' ? ' selected' : '') + '>行った</option></select>') +
        field('URL', '<input name="url" type="url" value="' + esc(place?.url) + '" placeholder="https://...">') +
        field('概要', '<textarea name="summary" rows="3">' + esc(place?.summary) + '</textarea>', true) +
        field('おすすめポイント', '<textarea name="highlights" rows="4">' + esc(place?.highlights) + '</textarea>', true) +
        field('メモ', '<textarea name="memo" rows="4">' + esc(place?.memo) + '</textarea>', true) +
      '</div>' +
      '<div class="form-actions"><button type="button" class="secondary" id="cancel">キャンセル</button>' +
      '<button class="primary" type="submit">保存</button></div>' +
    '</form>';

  root.querySelector('#cancel').onclick = onCancel;
  root.querySelector('#cancel-top').onclick = onCancel;

  root.querySelector('#new-cat').onclick = () => {
    const name = window.prompt('新しいカテゴリ名を入力してください');
    if (!name || !name.trim()) return;
    addCategory(name.trim());
  };

  async function addCategory(name) {
    const created = await createCategory(name);
    const select = root.querySelector('[name="category_id"]');
    select.insertAdjacentHTML('beforeend',
      '<option value="' + created.id + '" selected>' + esc(created.name) + '</option>');
  }

  root.querySelector('#place-form').onsubmit = async event => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    payload.prefecture_id = Number(payload.prefecture_id);
    payload.category_id = payload.category_id || null;
    payload.city = payload.city.trim() || null;
    payload.url = payload.url.trim() || null;
    payload.summary = payload.summary.trim() || null;
    payload.highlights = payload.highlights.trim() || null;
    payload.memo = payload.memo.trim() || null;
    const saved = await savePlace(payload, place?.id ?? null);
    onSave(saved);
  };
}

function field(label, control, full = false) {
  return '<label class="' + (full ? 'full' : '') + '">' + label + control + '</label>';
}

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}
