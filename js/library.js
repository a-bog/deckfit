// ── Library state ─────────────────────────────────────────────────────────────

let editingId   = null;
let activeFilter = 'all';

// ── Library rendering ─────────────────────────────────────────────────────────

function renderLibrary() {
  const cats = ['all', ...new Set(exercises.map(e => e.category))];

  document.getElementById('category-filters').innerHTML = cats.map(c =>
    `<button class="filter-btn${activeFilter === c ? ' active' : ''}" onclick="setFilter('${c}')">
      ${c === 'all' ? 'All' : cap(c)}
    </button>`
  ).join('');

  const q    = (document.getElementById('search-input').value || '').toLowerCase();
  const list = exercises.filter(e => {
    const matchCat = activeFilter === 'all' || e.category === activeFilter;
    const matchQ   = !q || e.name.toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  document.getElementById('library-stats').innerHTML = `
    <div class="stat-card"><div class="stat-val">${exercises.length}</div><div class="stat-lbl">Exercises</div></div>
    <div class="stat-card"><div class="stat-val">${new Set(exercises.map(e => e.category)).size}</div><div class="stat-lbl">Categories</div></div>
    <div class="stat-card"><div class="stat-val">${exercises.filter(e => e.videoUrl).length}</div><div class="stat-lbl">With video</div></div>
  `;

  const listEl = document.getElementById('exercise-list');
  if (!list.length) {
    listEl.innerHTML = `<div class="empty-state">
      <div class="empty-icon">&#x1F3CB;&#xFE0F;</div>
      <div class="empty-title">No exercises found</div>
      <div>Try a different filter or add one!</div>
    </div>`;
    return;
  }

  listEl.innerHTML = list.map(e => `
    <div class="exercise-item" onclick="openEditModal('${e.id}')">
      <div class="exercise-thumb">${e.emoji || '&#x1F4AA;'}</div>
      <div class="exercise-info">
        <div class="exercise-name">${e.name}</div>
        <div class="exercise-meta">
          <span class="badge ${CATEGORY_COLORS[e.category] || 'badge-blue'}">${cap(e.category)}</span>
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
  const ex = exercises.find(e => e.id === id);
  if (ex && ex.videoUrl) window.open(ex.videoUrl, '_blank');
}

// ── Edit modal ────────────────────────────────────────────────────────────────

function openEditModal(id) {
  editingId = id;
  document.getElementById('edit-modal-title').textContent = id ? 'Edit exercise' : 'Add exercise';
  document.getElementById('delete-btn').style.display = id ? '' : 'none';

  if (id) {
    const ex = exercises.find(e => e.id === id);
    if (!ex) return;
    document.getElementById('edit-name').value       = ex.name        || '';
    document.getElementById('edit-category').value   = ex.category    || 'calisthenics';
    document.getElementById('edit-position').value   = ex.position    || 'standing';
    document.getElementById('edit-desc').value       = ex.description || '';
    document.getElementById('edit-video').value      = ex.videoUrl    || '';
    document.getElementById('edit-difficulty').value = ex.difficulty  || 'beginner';
    document.getElementById('edit-emoji').value      = ex.emoji       || '';
    document.getElementById('edit-sided').checked    = !!ex.sided;
    document.getElementById('edit-sided-label').textContent = ex.sided ? 'On' : 'Off';
  } else {
    ['edit-name', 'edit-desc', 'edit-video', 'edit-emoji'].forEach(fieldId => {
      document.getElementById(fieldId).value = '';
    });
    document.getElementById('edit-category').value   = 'calisthenics';
    document.getElementById('edit-position').value   = 'standing';
    document.getElementById('edit-difficulty').value = 'beginner';
    document.getElementById('edit-sided').checked    = false;
    document.getElementById('edit-sided-label').textContent = 'Off';
  }
  document.getElementById('edit-modal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  editingId = null;
}

function saveExercise() {
  const name = document.getElementById('edit-name').value.trim();
  if (!name) { alert('Please enter a name.'); return; }

  const ex = {
    id:          editingId || uid(),
    name,
    category:    document.getElementById('edit-category').value,
    position:    document.getElementById('edit-position').value,
    description: document.getElementById('edit-desc').value.trim(),
    videoUrl:    document.getElementById('edit-video').value.trim(),
    difficulty:  document.getElementById('edit-difficulty').value,
    emoji:       document.getElementById('edit-emoji').value.trim() || '\u{1F4AA}',
    sided:       document.getElementById('edit-sided').checked,
  };

  if (editingId) {
    const idx = exercises.findIndex(e => e.id === editingId);
    if (idx >= 0) exercises[idx] = ex;
  } else {
    exercises.push(ex);
  }

  saveExercises();
  closeEditModal();
  renderLibrary();
}

function deleteExercise() {
  if (!editingId || !confirm('Delete this exercise?')) return;
  exercises = exercises.filter(e => e.id !== editingId);
  saveExercises();
  closeEditModal();
  renderLibrary();
}

// ── Fetch modal (AI exercise generation) ─────────────────────────────────────

function openFetchModal() {
  document.getElementById('fetch-modal').style.display = 'flex';
  document.getElementById('fetch-results').style.display = 'none';
  document.getElementById('fetch-status').textContent = '';
  document.getElementById('fetch-btn').innerHTML = '<i class="ti ti-sparkles" aria-hidden="true"></i> Generate';
  document.getElementById('fetch-btn').disabled = false;
}

function closeFetchModal() {
  document.getElementById('fetch-modal').style.display = 'none';
}

async function fetchExercises() {
  const key = getApiKey();
  if (!key) {
    alert('Please enter your Anthropic API key at the top of the page first.');
    return;
  }

  const category  = document.getElementById('fetch-category').value;
  const count     = parseInt(document.getElementById('fetch-count').value);
  const btn       = document.getElementById('fetch-btn');
  const statusEl  = document.getElementById('fetch-status');
  const resultsEl = document.getElementById('fetch-results');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Generating&hellip;';
  statusEl.textContent = '';
  resultsEl.style.display = 'none';

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
      statusEl.textContent = `API error: ${err.error?.message || response.statusText}`;
      return;
    }

    const data = await response.json();
    const text = data.content.map(i => i.text || '').join('');
    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (e) {
      statusEl.textContent = 'Could not parse response. Try again.';
      return;
    }

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
              <span class="badge ${CATEGORY_COLORS[ex.category] || 'badge-blue'}"
                style="margin-left:6px;">${cap(ex.category)}</span>
              <span style="font-size:12px;color:var(--text-secondary);margin-left:4px;">
                ${cap(ex.difficulty)}
              </span>
            </div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:3px;line-height:1.5;">
              ${ex.description}
            </div>
          </div>
        </div>
      `).join('')}
      <div style="display:flex;justify-content:flex-end;margin-top:14px;gap:8px;">
        <button class="btn btn-sm" onclick="toggleAllFetch(${parsed.length})">Toggle all</button>
        <button class="btn btn-primary" onclick='importFetched(${JSON.stringify(parsed)})'>
          <i class="ti ti-download" aria-hidden="true"></i> Add checked
        </button>
      </div>
    `;
    statusEl.textContent = '';

  } catch (e) {
    statusEl.textContent = 'Network error. Check your connection and API key.';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-sparkles" aria-hidden="true"></i> Generate again';
  }
}

function toggleAllFetch(count) {
  const cbs = Array.from({ length: count }, (_, i) => document.getElementById('fetch-cb-' + i));
  const allChecked = cbs.every(cb => cb && cb.checked);
  cbs.forEach(cb => { if (cb) cb.checked = !allChecked; });
}

function importFetched(parsed) {
  let added = 0;
  parsed.forEach((ex, i) => {
    const cb = document.getElementById('fetch-cb-' + i);
    if (cb && cb.checked) {
      exercises.push({
        id:          uid(),
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
  saveExercises();
  closeFetchModal();
  renderLibrary();
  if (added) alert(`${added} exercise${added === 1 ? '' : 's'} added to your library!`);
}
