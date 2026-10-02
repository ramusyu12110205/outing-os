import { savePlace, createCategory } from '../core/data.js';
import { searchPlaces } from '../services/place-search.js';

export function renderPlaceForm(root, { place, prefectures, categories, onSave, onCancel }) {
  const editing = Boolean(place);

  root.innerHTML =
    '<section class="page-head"><div><button class="back" id="cancel-top">← 戻る</button>' +
    '<h1>' + (editing ? '場所を編集' : '場所を追加') + '</h1></div></section>' +

    '<section class="panel search-panel">' +
      '<div class="panel-head"><div><h2>場所を検索して情報を取得</h2>' +
      '<p class="form-help">Web検索の候補を確認して、登録フォームへ反映できます。</p></div></div>' +
      '<div class="search-row"><input id="place-search-query" type="search" value="' + esc(place?.name) +
      '" placeholder="例：箱根ガラスの森美術館"><button type="button" class="primary" id="search-place">検索</button></div>' +
      '<div id="search-status" class="search-status"></div><div id="search-results"></div>' +
    '</section>' +

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
  setupSearch(root);

  root.querySelector('#new-cat').onclick = () => {
    const name = window.prompt('新しいカテゴリ名を入力してください');
    if (!name || !name.trim()) return;
    addCategory(name.trim());
  };

  async function addCategory(name) {
    try {
      const created = await createCategory(name);
      const select = root.querySelector('[name="category_id"]');
      select.insertAdjacentHTML('beforeend',
        '<option value="' + created.id + '" selected>' + esc(created.name) + '</option>');
    } catch (error) {
      window.alert(error.message || 'カテゴリの追加に失敗しました。');
    }
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

    try {
      const saved = await savePlace(payload, place?.id ?? null);
      onSave(saved);
    } catch (error) {
      window.alert(error.message || '保存に失敗しました。');
    }
  };
}

function setupSearch(root) {
  const queryInput = root.querySelector('#place-search-query');
  const button = root.querySelector('#search-place');
  const status = root.querySelector('#search-status');
  const results = root.querySelector('#search-results');

  const run = async () => {
    const query = queryInput.value.trim();
    if (!query) {
      status.textContent = '検索する場所名を入力してください。';
      results.innerHTML = '';
      queryInput.focus();
      return;
    }

    button.disabled = true;
    status.textContent = '検索しています…';
    results.innerHTML = '';

    try {
      const items = await searchPlaces(query);
      if (!items.length) {
        status.textContent = '検索結果が見つかりませんでした。別の名前でも試せます。';
        return;
      }
      status.textContent = items.length + '件の候補が見つかりました。';

      results.innerHTML = '<div class="search-results">' +
        items.map((item, index) => searchCard(item, index)).join('') +
        '</div>';

      results.querySelectorAll('[data-result-index]').forEach(buttonEl => {
        buttonEl.onclick = () => {
          const item = items[Number(buttonEl.dataset.resultIndex)];
          applySearchResult(root, item);
        };
      });
    } catch (error) {
      status.textContent = error.message || '検索に失敗しました。時間をおいて再度お試しください。';
    } finally {
      button.disabled = false;
    }
  };

  button.onclick = run;
  queryInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      run();
    }
  });
}

function searchCard(item, index) {
  const type = item.sourceType === 'official_candidate' ? '公式候補' :
    item.sourceType === 'third_party' ? '第三者情報' : 'Web検索結果';

  return '<article class="search-result-card">' +
    '<div class="search-result-top"><span class="badge">' + type + '</span></div>' +
    '<h3>' + esc(item.title) + '</h3>' +
    '<a href="' + safeUrl(item.url) + '" target="_blank" rel="noopener noreferrer">' +
      esc(item.url) + '</a>' +
    (item.description ? '<p>' + esc(item.description) + '</p>' : '') +
    '<button type="button" class="secondary" data-result-index="' + index + '">この候補を使用</button>' +
  '</article>';
}

function applySearchResult(root, item) {
  const nameInput = root.querySelector('[name="name"]');
  const urlInput = root.querySelector('[name="url"]');
  const cityInput = root.querySelector('[name="city"]');
  const prefSelect = root.querySelector('[name="prefecture_id"]');

  const hasExisting = Boolean(nameInput.value.trim() || urlInput.value.trim());
  if (hasExisting) {
    const confirmed = window.confirm(
      'すでに入力されている場所名またはURLがあります。\n検索結果で上書きしますか？'
    );
    if (!confirmed) return;
  }

  if (item.title) nameInput.value = item.title;
  if (item.url) urlInput.value = item.url;

  if (!cityInput.value.trim() && item.city) cityInput.value = item.city;
  if (!prefSelect.value && item.prefecture) {
    const option = [...prefSelect.options].find(o => o.textContent === item.prefecture);
    if (option) prefSelect.value = option.value;
  }

  const status = root.querySelector('#search-status');
  status.textContent = '候補を登録フォームへ反映しました。内容を確認して保存してください。';
  nameInput.focus();
}

function field(label, control, full = false) {
  return '<label class="' + (full ? 'full' : '') + '">' + label + control + '</label>';
}

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '#';
  } catch {
    return '#';
  }
}
