// ── Node module loading support ───────────────────────────────────────────────

if (typeof module !== 'undefined') {
  if (typeof cap === 'undefined') {
    const u = require('./utils');
    global.cap = u.cap;
    global.uid = u.uid;
  }
  if (typeof CATEGORY_COLORS === 'undefined') {
    const d = require('./data');
    global.CATEGORY_COLORS = d.CATEGORY_COLORS;
  }
  if (typeof saveExercises === 'undefined') {
    const s = require('./storage');
    global.saveExercises = s.saveExercises;
    global.getApiKey = s.getApiKey;
  }
}

// ── Library state ─────────────────────────────────────────────────────────────

let editingId   = null;
let activeFilter = 'all';

// ── Library rendering ─────────────────────────────────────────────────────────

function renderLibrary() {
  const exList = (typeof exercises !== 'undefined' && Array.isArray(exercises)) ? exercises : [];
  const cats = ['all', ...new Set(exList.map(e => e.category))];

  const catFiltersEl = document.getElementById('category-filters');
  if (catFiltersEl) {
    catFiltersEl.innerHTML = cats.map(c =>
      `<button class="filter-btn${activeFilter === c ? ' active' : ''}" onclick="setFilter('${c}')">
        ${c === 'all' ? 'All' : cap(c)}
      </button>`
    ).join('');
  }

  const searchInput = document.getElementById('search-input');
  const q    = (searchInput ? searchInput.value : '').toLowerCase();
  const list = exList.filter(e => {
    const matchCat = activeFilter === 'all' || e.category === activeFilter;
    const matchQ   = !q || (e.name && e.name.toLowerCase().includes(q)) || (e.description || '').toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  const statsEl = document.getElementById('library-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-card"><div class="stat-val">${exList.length}</div><div class="stat-lbl">Exercises</div></div>
      <div class="stat-card"><div class="stat-val">${new Set(exList.map(e => e.category)).size}</div><div class="stat-lbl">Categories</div></div>
      <div class="stat-card"><div class="stat-val">${exList.filter(e => e.videoUrl).length}</div><div class="stat-lbl">With video</div></div>
    `;
  }

  const listEl = document.getElementById('exercise-list');
  if (!listEl) return;

  if (!list.length) {
    listEl.innerHTML = `<div class="empty-state">
      <div class="empty-icon">&#x1F3CB;&#xFE0F;</div>
      <div class="empty-title">No exercises found</div>
      <div>Try a different filter or add one!</div>
    </div>`;
    return;
  }

  const colors = (typeof CATEGORY_COLORS !== 'undefined') ? CATEGORY_COLORS : {};
  listEl.innerHTML = list.map(e => `
    <div class="exercise-item" onclick="openEditModal('${e.id}')">
      <div class="exercise-thumb">${e.emoji || '&#x1F4AA;'}</div>
      <div class="exercise-info">
        <div class="exercise-name">${e.name}</div>
        <div class="exercise-meta">
          <span class="badge ${colors[e.category] || 'badge-blue'}">${cap(e.category)}</span>
          &nbsp;&middot;&nbsp;${cap(e.position || '')}
          &nbsp;&middot;&nbsp;${cap(e.difficulty || '')}
          ${e.sided ? '&nbsp;&middot;&nbsp;<span class="badge badge-pink">sided</span>' : ''}
        </div>
      </div>
      <div class="exercise-actions" onclick="event.stopPropagation()">
        ${e.videoUrl
          ? `<button class="btn btn-sm" onclick="openVideoLink('${e.id}')" title="Open video">
               <i class="ti ti-brand-youtube" aria-hidden="true"></i>
             </button>`
          : ''}
        <button class="btn btn-sm" onclick="openEditModal('${e.id}')">
          <i class="ti ti-edit" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  `).join('');
}

function setFilter(cat) {
  activeFilter = cat;
  renderLibrary();
}

function openVideoLink(id) {
  const exList = (typeof exercises !== 'undefined' && Array.isArray(exercises)) ? exercises : [];
  const ex = exList.find(e => e.id === id);
  if (ex && ex.videoUrl && typeof window !== 'undefined' && window.open) {
    window.open(ex.videoUrl, '_blank');
  }
}

// ── Edit modal ────────────────────────────────────────────────────────────────

function openEditModal(id) {
  editingId = id;
  const titleEl = document.getElementById('edit-modal-title');
  if (titleEl) titleEl.textContent = id ? 'Edit exercise' : 'Add exercise';
  const deleteBtn = document.getElementById('delete-btn');
  if (deleteBtn) deleteBtn.style.display = id ? '' : 'none';

  if (id) {
    const exList = (typeof exercises !== 'undefined' && Array.isArray(exercises)) ? exercises : [];
    const ex = exList.find(e => e.id === id);
    if (!ex) return;
    const nameEl = document.getElementById('edit-name');
    if (nameEl) nameEl.value = ex.name || '';
    const catEl = document.getElementById('edit-category');
    if (catEl) catEl.value = ex.category || 'calisthenics';
    const posEl = document.getElementById('edit-position');
    if (posEl) posEl.value = ex.position || 'standing';
    const descEl = document.getElementById('edit-desc');
    if (descEl) descEl.value = ex.description || '';
    const vidEl = document.getElementById('edit-video');
    if (vidEl) vidEl.value = ex.videoUrl || '';
    const diffEl = document.getElementById('edit-difficulty');
    if (diffEl) diffEl.value = ex.difficulty || 'beginner';
    const emojiEl = document.getElementById('edit-emoji');
    if (emojiEl) emojiEl.value = ex.emoji || '';
    const sidedEl = document.getElementById('edit-sided');
    if (sidedEl) sidedEl.checked = !!ex.sided;
    const sidedLbl = document.getElementById('edit-sided-label');
    if (sidedLbl) sidedLbl.textContent = ex.sided ? 'On' : 'Off';
  } else {
    ['edit-name', 'edit-desc', 'edit-video', 'edit-emoji'].forEach(fieldId => {
      const el = document.getElementById(fieldId);
      if (el) el.value = '';
    });
    const catEl = document.getElementById('edit-category');
    if (catEl) catEl.value = 'calisthenics';
    const posEl = document.getElementById('edit-position');
    if (posEl) posEl.value = 'standing';
    const diffEl = document.getElementById('edit-difficulty');
    if (diffEl) diffEl.value = 'beginner';
    const sidedEl = document.getElementById('edit-sided');
    if (sidedEl) sidedEl.checked = false;
    const sidedLbl = document.getElementById('edit-sided-label');
    if (sidedLbl) sidedLbl.textContent = 'Off';
  }
  const modal = document.getElementById('edit-modal');
  if (modal) modal.style.display = 'flex';
}

function closeEditModal() {
  const modal = document.getElementById('edit-modal');
  if (modal) modal.style.display = 'none';
  editingId = null;
}

function saveExercise() {
  const nameEl = document.getElementById('edit-name');
  const name = nameEl ? nameEl.value.trim() : '';
  if (!name) {
    if (typeof alert === 'function') alert('Please enter a name.');
    return;
  }

  const catEl = document.getElementById('edit-category');
  const posEl = document.getElementById('edit-position');
  const descEl = document.getElementById('edit-desc');
  const vidEl = document.getElementById('edit-video');
  const diffEl = document.getElementById('edit-difficulty');
  const emojiEl = document.getElementById('edit-emoji');
  const sidedEl = document.getElementById('edit-sided');

  const ex = {
    id:          editingId || (typeof uid === 'function' ? uid() : 'e' + Date.now()),
    name,
    category:    catEl ? catEl.value : 'calisthenics',
    position:    posEl ? posEl.value : 'standing',
    description: descEl ? descEl.value.trim() : '',
    videoUrl:    vidEl ? vidEl.value.trim() : '',
    difficulty:  diffEl ? diffEl.value : 'beginner',
    emoji:       (emojiEl && emojiEl.value.trim()) || '\u{1F4AA}',
    sided:       sidedEl ? sidedEl.checked : false,
  };

  if (typeof exercises === 'undefined') {
    global.exercises = [];
  }

  if (editingId) {
    const idx = exercises.findIndex(e => e.id === editingId);
    if (idx >= 0) exercises[idx] = ex;
  } else {
    exercises.push(ex);
  }

  if (typeof saveExercises === 'function') saveExercises();
  closeEditModal();
  renderLibrary();
}

function deleteExercise() {
  if (!editingId) return;
  if (typeof confirm === 'function' && !confirm('Delete this exercise?')) return;
  if (typeof exercises !== 'undefined' && Array.isArray(exercises)) {
    exercises = exercises.filter(e => e.id !== editingId);
  }
  if (typeof saveExercises === 'function') saveExercises();
  closeEditModal();
  renderLibrary();
}

// ── Fetch modal (AI exercise generation) ─────────────────────────────────────

function openFetchModal() {
  const modal = document.getElementById('fetch-modal');
  if (modal) modal.style.display = 'flex';
  const results = document.getElementById('fetch-results');
  if (results) results.style.display = 'none';
  const statusEl = document.getElementById('fetch-status');
  if (statusEl) statusEl.textContent = '';
  const btn = document.getElementById('fetch-btn');
  if (btn) {
    btn.innerHTML = '<i class="ti ti-sparkles" aria-hidden="true"></i> Generate';
    btn.disabled = false;
  }
}

function closeFetchModal() {
  const modal = document.getElementById('fetch-modal');
  if (modal) modal.style.display = 'none';
}

async function fetchExercises() {
  const key = typeof getApiKey === 'function' ? getApiKey() : '';
  if (!key) {
    if (typeof alert === 'function') alert('Please enter your Anthropic API key at the top of the page first.');
    return;
  }

  const catEl     = document.getElementById('fetch-category');
  const countEl   = document.getElementById('fetch-count');
  const category  = catEl ? catEl.value : 'all';
  const count     = countEl ? parseInt(countEl.value) : 5;
  const btn       = document.getElementById('fetch-btn');
  const statusEl  = document.getElementById('fetch-status');
  const resultsEl = document.getElementById('fetch-results');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Generating&hellip;';
  }
  if (statusEl) statusEl.textContent = '';
  if (resultsEl) resultsEl.style.display = 'none';

  const catLabel = category === 'all'
    ? 'a mix of calisthenics, strength, abs, and core'
    : category;

  const prompt = `Generate ${count} ${catLabel} exercises for a woman in her mid-40s. These MUST work in a very small space (like a boat cabin -- about 2m x 2m) with NO equipment, NO weights, NO resistance bands, NO props of any kind. Focus on joint health, balance, functional strength, and variety of positions.

Respond ONLY with a valid JSON array. No markdown, no explanation, no backticks. Each object must have exactly these fields:
- "name": string
- "category": one of calisthenics, strength, core, abs, cardio, flexibility
- "position": one of standing, floor, plank, sitting
- "difficulty": one of beginner, intermediate, advanced
- "sided": boolean -- true only if the exercise works one side of the body at a time and must be repeated on the other side (e.g. side plank, single-leg balance, lateral leg raise). False for bilateral exercises.
- "emoji": one relevant emoji character
- "description": string, 2 sentences -- how to do it, then a form tip

Example:
[{"name":"Side plank","category":"core","position":"plank","difficulty":"intermediate","sided":true,"emoji":"X","description":"Prop on one forearm with elbow under shoulder and lift hips to form a straight line. Keep obliques engaged and avoid letting the hip drop."}]`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (statusEl) statusEl.textContent = `API error: ${err.error?.message || response.statusText}`;
      return;
    }

    const data = await response.json();
    const text = data.content.map(i => i.text || '').join('');
    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (e) {
      if (statusEl) statusEl.textContent = 'Could not parse response. Try again.';
      return;
    }

    if (resultsEl) {
      const colors = (typeof CATEGORY_COLORS !== 'undefined') ? CATEGORY_COLORS : {};
      resultsEl.style.display = '';
      resultsEl.innerHTML = `
        <div style="font-size:13px;font-weight:600;margin-bottom:10px;">
          ${parsed.length} exercises &mdash; check those you want to add
        </div>
        ${parsed.map((ex, i) => `
          <div class="fetch-item">
            <input type="checkbox" id="fetch-cb-${i}" checked
              style="width:16px;height:16px;margin-top:3px;cursor:pointer;flex-shrink:0;">
            <span style="font-size:22px;flex-shrink:0;">${ex.emoji || '\u{1F4AA}'}</span>
            <div style="flex:1;">
              <div style="font-size:14px;font-weight:500;">${ex.name}
                <span class="badge ${colors[ex.category] || 'badge-blue'}"
                  style="margin-left:6px;">${typeof cap === 'function' ? cap(ex.category) : ex.category}</span>
                <span style="font-size:12px;color:var(--text-secondary);margin-left:4px;">
                  ${typeof cap === 'function' ? cap(ex.difficulty) : ex.difficulty}
                </span>
              </div>
              <div style="font-size:12px;color:var(--text-secondary);margin-top:3px;line-height:1.5;">
                ${ex.description}
              </div>
            </div>
          </div>
        `).join('')}
        <div style="display:flex;justify-content:flex-end;margin-top:14px;gap:8px;">
          <button class="btn btn-sm" onclick="toggleAllFetch(${parsed.length})" id="toggle-all-fetch-btn">Toggle all</button>
          <button class="btn btn-primary" id="import-fetched-btn">
            <i class="ti ti-download" aria-hidden="true"></i> Add checked
          </button>
        </div>
      `;
      const importBtn = document.getElementById('import-fetched-btn');
      if (importBtn) {
        importBtn.onclick = () => importFetched(parsed);
      }
    }
    if (statusEl) statusEl.textContent = '';

  } catch (e) {
    if (statusEl) statusEl.textContent = 'Network error. Check your connection and API key.';
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="ti ti-sparkles" aria-hidden="true"></i> Generate again';
    }
  }
}

function toggleAllFetch(count) {
  const cbs = Array.from({ length: count }, (_, i) => document.getElementById('fetch-cb-' + i));
  const allChecked = cbs.every(cb => cb && cb.checked);
  cbs.forEach(cb => { if (cb) cb.checked = !allChecked; });
}

function importFetched(parsed) {
  let added = 0;
  if (typeof exercises === 'undefined') {
    global.exercises = [];
  }
  parsed.forEach((ex, i) => {
    const cb = document.getElementById('fetch-cb-' + i);
    if (cb && cb.checked) {
      exercises.push({
        id:          typeof uid === 'function' ? uid() : 'e' + Date.now() + i,
        name:        ex.name,
        category:    ex.category,
        position:    ex.position,
        difficulty:  ex.difficulty,
        sided:       !!ex.sided,
        emoji:       ex.emoji || '\u{1F4AA}',
        description: ex.description,
        videoUrl:    '',
      });
      added++;
    }
  });
  if (typeof saveExercises === 'function') saveExercises();
  closeFetchModal();
  renderLibrary();
  if (added && typeof alert === 'function') alert(`${added} exercise${added === 1 ? '' : 's'} added to your library!`);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    renderLibrary,
    setFilter,
    openVideoLink,
    openEditModal,
    closeEditModal,
    saveExercise,
    deleteExercise,
    openFetchModal,
    closeFetchModal,
    fetchExercises,
    toggleAllFetch,
    importFetched,
    getActiveFilter: () => activeFilter,
    setActiveFilter: (f) => { activeFilter = f; },
    getEditingId: () => editingId,
    setEditingId: (id) => { editingId = id; },
  };
}
