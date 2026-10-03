import { savePlace } from '../core/data.js';
import { TAG_GROUPS, TAG_NAMES } from '../core/constants.js';
import { searchPlaces } from '../services/place-search.js';

export function renderPlaceForm(root, { place, prefectures, categories, onSave, onCancel }) {
  const editing = Boolean(place);
  const existingTags = getPlaceTags(place);

  root.innerHTML =
    '<section class="page-head"><div><button class="back" id="cancel-top">← 戻る</button>' +
    '<h1>' + (editing ? '場所を編集' : '場所を追加') + '</h1></div></section>' +

    '<section class="panel search-panel">' +
      '<div class="panel-head"><div><h2>場所を検索して自動入力</h2>' +
      '<p class="form-help">場所名を検索すると、主カテゴリ・特徴タグを含む登録項目を自動判定します。内容は保存前に確認・変更できます。</p></div></div>' +
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
        field('カテゴリ *', '<select name="category_id" required><option value="">選択してください</option>' +
          categories.map(c => '<option value="' + c.id + '"' +
            (String(place?.category_id) === String(c.id) ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') +
          '</select>') +
        field('ステータス', '<select name="status"><option value="want"' +
          (place?.status !== 'visited' ? ' selected' : '') + '>行きたい</option><option value="visited"' +
          (place?.status === 'visited' ? ' selected' : '') + '>行った</option></select>') +
        field('URL', '<input name="url" type="url" value="' + esc(place?.url) + '" placeholder="https://...">') +
        field('概要', '<textarea name="summary" rows="3">' + esc(place?.summary) + '</textarea>', true) +
        field('おすすめポイント', '<textarea name="highlights" rows="4">' + esc(place?.highlights) + '</textarea>', true) +
        '<div class="full tag-editor"><div class="tag-editor-title">特徴タグ</div>' +
          '<p class="form-help">複数選択できます。検索で自動判定されたタグも、ここで追加・削除できます。</p>' +
          TAG_GROUPS.map(group => '<fieldset class="tag-group"><legend>' + esc(group.name) + '</legend><div class="tag-options">' +
            group.tags.map(tag => '<label class="tag-option"><input type="checkbox" name="tags" value="' + esc(tag) + '"' +
              (existingTags.includes(tag) ? ' checked' : '') + '><span>' + esc(tag) + '</span></label>').join('') +
          '</div></fieldset>').join('') +
        '</div>' +
        field('メモ', '<textarea name="memo" rows="4">' + esc(place?.memo) + '</textarea>', true) +
      '</div>' +
      '<div class="form-actions"><button type="button" class="secondary" id="cancel">キャンセル</button>' +
      '<button class="primary" type="submit">保存</button></div>' +
    '</form>';

  root.querySelector('#cancel').onclick = onCancel;
  root.querySelector('#cancel-top').onclick = onCancel;
  setupSearch(root);

  root.querySelector('#place-form').onsubmit = async event => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    payload.tags = [...root.querySelectorAll('input[name="tags"]:checked')]
      .map(input => input.value)
      .filter(tag => TAG_NAMES.includes(tag));
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
      const { auto, results: items } = await searchPlaces(query);
      if (!items.length || !auto) {
        status.textContent = '検索結果が見つかりませんでした。別の名前でも試せます。';
        return;
      }

      const applied = applySearchResult(root, auto);
      if (!applied) {
        status.textContent = '検索結果はフォームに反映していません。';
        return;
      }

      status.textContent = '検索結果から自動入力しました。内容を確認してから保存してください。';
      results.innerHTML =
        '<div class="search-auto-note">' +
          '<div><strong>自動判定</strong></div>' +
          '<div>正式名称：<strong>' + esc(auto.name || auto.title || '未確定') + '</strong></div>' +
          '<div>主カテゴリ：<strong>' + esc(auto.category || 'その他') + '</strong></div>' +
          '<div class="auto-tag-line">特徴： ' + renderTagChips(auto.tags ?? []) + '</div>' +
          '<small>代表候補：' + esc(auto.title) + '<br>' + esc(auto.url) + '</small>' +
        '</div>';

      if (items.length > 1) {
        results.innerHTML += '<details class="search-more"><summary>他の検索結果も確認する</summary>' +
          '<div class="search-results">' + items.slice(1, 5).map((item, index) => searchCard(item, index + 1)).join('') +
          '</div></details>';

        results.querySelectorAll('[data-result-index]').forEach(buttonEl => {
          buttonEl.onclick = () => {
            const item = items[Number(buttonEl.dataset.resultIndex)];
            const changed = applySearchResult(root, item);
            if (changed) {
              status.textContent = '選択した検索結果をフォームへ反映しました。内容を確認して保存してください。';
            }
          };
        });
      }
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
    '<h3>' + esc(item.name || item.title) + '</h3>' +
    '<p class="muted">掲載タイトル：' + esc(item.title) + '</p>'
    '<a href="' + safeUrl(item.url) + '" target="_blank" rel="noopener noreferrer">' +
      esc(item.url) + '</a>' +
    (item.description ? '<p>' + esc(item.description) + '</p>' : '') +
    '<button type="button" class="secondary" data-result-index="' + index + '">この結果を使用</button>' +
  '</article>';
}

function applySearchResult(root, item) {
  const nameInput = root.querySelector('[name="name"]');
  const urlInput = root.querySelector('[name="url"]');
  const cityInput = root.querySelector('[name="city"]');
  const prefSelect = root.querySelector('[name="prefecture_id"]');
  const categorySelect = root.querySelector('[name="category_id"]');
  const summaryInput = root.querySelector('[name="summary"]');

  const hasExisting = Boolean(
    nameInput.value.trim() || urlInput.value.trim() || summaryInput.value.trim() ||
    root.querySelectorAll('input[name="tags"]:checked').length
  );
  if (hasExisting) {
    const confirmed = window.confirm(
      'すでに入力されている場所情報があります。\n検索結果で上書きしますか？'
    );
    if (!confirmed) return false;
  }

  if (item.name || item.title) nameInput.value = item.name || item.title;
  if (item.url) urlInput.value = item.url;
  if (item.description) summaryInput.value = item.description;
  if (item.city) cityInput.value = item.city;

  if (item.prefecture) {
    const option = [...prefSelect.options].find(o => o.textContent === item.prefecture);
    if (option) prefSelect.value = option.value;
  }

  if (item.category) {
    const option = [...categorySelect.options].find(o => o.textContent === item.category);
    if (option) categorySelect.value = option.value;
  }

  const tagSet = new Set((item.tags ?? []).filter(tag => TAG_NAMES.includes(tag)));
  root.querySelectorAll('input[name="tags"]').forEach(input => {
    input.checked = tagSet.has(input.value);
  });

  nameInput.focus();
  return true;
}

function getPlaceTags(place) {
  return (place?.outing_place_tags ?? [])
    .map(row => row.outing_tags?.name)
    .filter(Boolean)
    .filter(tag => TAG_NAMES.includes(tag));
}

function renderTagChips(tags) {
  const valid = tags.filter(tag => TAG_NAMES.includes(tag));
  if (!valid.length) return '<span class="muted">根拠を確認できた特徴なし</span>';
  return valid.map(tag => '<span class="tag-chip">' + esc(tag) + '</span>').join(' ');
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
