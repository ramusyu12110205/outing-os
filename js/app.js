import { ensureOutingAuth } from './core/supabase.js';
import { getPrefectures, getCategories } from './core/data.js';
import { renderDashboard } from './features/dashboard.js';
import { renderPlaces } from './features/places.js';
import { renderPlaceDetail } from './features/place-detail.js';
import { renderPlaceForm } from './features/place-form.js';

const root = document.querySelector('#app');
const state = {
  page: 'home',
  placeId: null,
  editing: null,
  filters: { search: '', prefectureId: '', categoryId: '', status: '' }
};

async function init() {
  root.innerHTML = '<div class="loading">読み込み中…</div>';
  try {
    await ensureOutingAuth();
    state.prefectures = await getPrefectures();
    state.categories = await getCategories();
    await render();
  } catch (e) {
    console.error(e);
    root.innerHTML = '<main class="error panel"><h1>読み込みに失敗しました</h1><p>' +
      escapeHtml(e.message) +
      '</p><button class="primary" id="reload">再読み込み</button></main>';
    root.querySelector('#reload').onclick = () => location.reload();
  }
}

async function render() {
  const shell = '<header class="app-header">' +
    '<button class="brand" id="home">おでかけOS</button>' +
    '<nav><button id="nav-home">ホーム</button><button id="nav-places">場所一覧</button></nav>' +
    '</header><main class="container" id="view"></main>';
  root.innerHTML = shell;
  const view = root.querySelector('#view');

  root.querySelector('#home').onclick = () => { state.page = 'home'; render(); };
  root.querySelector('#nav-home').onclick = () => { state.page = 'home'; render(); };
  root.querySelector('#nav-places').onclick = () => { state.page = 'places'; render(); };

  if (state.page === 'home') {
    return renderDashboard(view, {
      onAdd: () => openForm(),
      onBrowse: () => { state.page = 'places'; render(); }
    });
  }

  if (state.page === 'places') {
    return renderPlaces(view, {
      ...state,
      onFilter: filters => { state.filters = filters; render(); },
      onOpen: id => { state.placeId = id; state.page = 'detail'; render(); },
      onAdd: () => openForm()
    });
  }

  if (state.page === 'detail') {
    return renderPlaceDetail(view, state.placeId, {
      onBack: () => { state.page = 'places'; render(); },
      onEdit: place => openForm(place)
    });
  }

  if (state.page === 'form') {
    return renderPlaceForm(view, {
      place: state.editing,
      prefectures: state.prefectures,
      categories: state.categories,
      onCancel: () => {
        state.page = state.editing ? 'detail' : 'places';
        render();
      },
      onSave: async place => {
        state.placeId = place.id;
        state.page = 'detail';
        state.editing = null;
        state.categories = await getCategories();
        render();
      }
    });
  }
}

function openForm(place = null) {
  state.editing = place;
  state.page = 'form';
  render();
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

init();
