/* library.js – Library UI and edit/modal management
   Exports functions used by the library view and edit components.
   Handles rendering, filtering, modal interactions, and exercise management.
*/

import { DEFAULT_EXERCISES } from './data.js';
import { STORAGE_KEY, API_KEY_STORAGE } from './storage.js';
import { uid, cap } from './utils.js';

// Internal state
let exercises = [...DEFAULT_EXERCISES];
let activeFilter = 'all';
let editingId = null;

// Export for external scripts
export {
  exercises,
  activeFilter,
  editingId,
  loadExercises,
  saveExercises,
  renderLibrary,
  setFilter,
  openVideoLink,
  openEditModal,
  closeEditModal,
  saveExercise,
  deleteExercise,
  fetchExercises,
  toggleAllFetch,
  importFetched,
  openFetchModal,
  closeFetchModal,
  loadApiKey,
  saveApiKey
};

// Load exercises from localStorage or use defaults
function loadExercises() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        exercises = [...parsed];
        return;
      }
    }
  } catch (e) {
    console.warn('loadExercises error, using defaults:', e);
  }
  exercises = [...DEFAULT_EXERCISES];
  saveExercises();
}

// Save exercises to localStorage
function saveExercises() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises));
  } catch (e) {
    console.warn('saveExercises error:', e);
  }
}

// Render the library view
function renderLibrary() {
  const filters = ['all', ...new Set(exercises.map(e => e.category))];
  const filterButtonsHTML = filters.map(cat =>
    `<button class="filter-btn${activeFilter === cat ? ' active' : ''}" onclick="setFilter('${cat}')">
      ${cat === 'all' ? 'All' : cap(cat)}
    </button>`
  ).join('');

  const searchTerm = (document.getElementById('search-input')?.value || '').toLowerCase();
  const filteredExercises = exercises.filter(e => {
    const matchCat = activeFilter === 'all' || e.category === activeFilter;
    const matchQ = !searchTerm || e.name.toLowerCase().includes(searchTerm) ||
      (e.description || '').toLowerCase().includes(searchTerm);
    return matchCat && matchQ;
  });

  // Update stats display
  const statsHTML = `
    <div class="stat-card"><div class="stat-val">${exercises.length}</div><div class="stat-lbl">Exercises</div></div>
    <div class="stat-card"><div class="stat-val">${new Set(exercises.map(e => e.category)).size}</div><div class="stat-lbl">Categories</div></div>
    <div class="stat-card"><div class="stat-val">${filteredExercises.length}</div><div class="stat-lbl">Filtered</div></div>
  `;

  // Render exercise list
  const listHTML = filteredExercises.length > 0
    ? filteredExercises.map(e => `
      <div class="exercise-item" onclick="openEditModal('${e.id}')">
        <div class="exercise-thumb">${e.emoji || '💪'}</div>
        <div class="exercise-info">
          <div class="exercise-name">${e.name}</div>
          <div class="exercise-meta">
            <span class="badge ${getCategoryColor(e.category)}">${cap(e.category)}</span>
            &nbsp;·&nbsp;${cap(e.position || '')}
            &nbsp;·&nbsp;${cap(e.difficulty || '')}
            ${e.sided ? '&nbsp;·&nbsp;<span class="badge badge-pink">sided</span>' : ''}
          </div>
        </div>
        <div class="exercise-actions" onclick="event.stopPropagation()">
          ${e.videoUrl ? `<button class="btn btn-sm" onclick="openVideoLink('${e.id}')">
            <i class="ti ti-brand-youtube" aria-hidden="true"></i>
          </button>` : ''}
          <button class="btn btn-sm" onclick="openEditModal('${e.id}')">
            <i class="ti ti-edit" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    `).join('')
    : `<div class="empty-state">
          <div class="empty-icon">🏋️</div>
          <div class="empty-title">No exercises found</div>
          <div>Try a different filter or add one!</div>
        </div>`;

  // Inject HTML into page
  document.getElementById('category-filters').innerHTML = filterButtonsHTML;
  document.getElementById('library-stats').innerHTML = statsHTML;
  document.getElementById('exercise-list').innerHTML = listHTML;
}

// Get category color mapping
function getCategoryColor(category) {
  const colors = {
    calisthenics: 'badge-blue',
    strength: 'badge-coral',
    core: 'badge-teal',
    abs: 'badge-purple',
    cardio: 'badge-amber',
    flexibility: 'badge-teal'
  };
  return colors[category] || 'badge-blue';
}

// Set filter and re-render
function setFilter(category) {
  activeFilter = category;
  renderLibrary();
}

// Open video link for exercise
export function openVideoLink(id) {
  const ex = exercises.find(e => e.id === id);
  if (ex && ex.videoUrl) {
    window.open(ex.videoUrl, '_blank');
  }
}

// Open edit modal for exercise
export function openEditModal(id) {
  editingId = id;
  document.getElementById('edit-modal-title').textContent = id ? 'Edit exercise' : 'Add exercise';
  document.getElementById('delete-btn').style.display = id ? '' : 'none';

  // Load existing exercise or initialize defaults
  if (id) {
    const ex = exercises.find(e => e.id === id);
    if (ex) {
      document.getElementById('edit-name').value = ex.name || '';
      document.getElementById('edit-category').value = ex.category || 'calisthenics';
      document.getElementById('edit-position').value = ex.position || 'standing';
      document.getElementById('edit-desc').value = ex.description || '';
      document.getElementById('edit-video').value = ex.videoUrl || '';
      document.getElementById('edit-difficulty').value = ex.difficulty || 'beginner';
      document.getElementById('edit-emoji').value = ex.emoji || '';
      document.getElementById('edit-sided').checked = !!ex.sided;
      document.getElementById('edit-sided-label').textContent = ex.sided ? 'On' : 'Off';
    }
  } else {
    // Clear form for new exercise
    ['edit-name', 'edit-desc', 'edit-video', 'edit-emoji'].forEach(field => {
      document.getElementById(field).value = '';
    });
    document.getElementById('edit-category').value = 'calisthenics';
    document.getElementById('edit-position').value = 'standing';
    document.getElementById('edit-difficulty').value = 'beginner';
    document.getElementById('edit-sided').checked = false;
    document.getElementById('edit-sided-label').textContent = 'Off';
  }
  document.getElementById('edit-modal').style.display = 'flex';
}

// Close edit modal
export function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  editingId = null;
}

// Save exercise (edit or new)
export function saveExercise() {
  const name = document.getElementById('edit-name').value.trim();
  if (!name) { alert('Please enter a name.'); return; }

  const newExercise = {
    id: editingId || uid(),
    name,
    category: document.getElementById('edit-category').value,
    position: document.getElementById('edit-position').value,
    description: document.getElementById('edit-desc').value.trim(),
    videoUrl: document.getElementById('edit-video').value.trim(),
    difficulty: document.getElementById('edit-difficulty').value,
    emoji: document.getElementById('edit-emoji').value.trim() || '💪',
    sided: document.getElementById('edit-sided').checked
  };

  if (editingId) {
    // Update existing exercise
    const idx = exercises.findIndex(e => e.id === editingId);
    if (idx >= 0) exercises[idx] = newExercise;
  } else {
    // Add new exercise
    exercises.push(newExercise);
  }
  saveExercises();
  closeEditModal();
  renderLibrary();
}

// Delete exercise
export function deleteExercise() {
  if (!editingId || !confirm('Delete this exercise?')) return;
  exercises = exercises.filter(e => e.id !== editingId);
  saveExercises();
  closeEditModal();
  renderLibrary();
}

// Open fetch modal
export function openFetchModal() {
  document.getElementById('fetch-modal').style.display = 'flex';
  document.getElementById('fetch-results').style.display = 'none';
  document.getElementById('fetch-status').textContent = '';
  document.getElementById('fetch-btn').innerHTML = '<i class="ti ti-sparkles" aria-hidden="true"></i> Generate';
  document.getElementById('fetch-btn').disabled = false;
}

// Close fetch modal
export function closeFetchModal() {
  document.getElementById('fetch-modal').style.display = 'none';
}

// Fetch exercises from API
export async function fetchExercises() {
  const key = loadApiKey();
  if (!key) {
    alert('Please enter your Anthropic API key at the top of the page first.');
    return;
  }

  const category = document.getElementById('fetch-category').value;
  const count = parseInt(document.getElementById('fetch-count').value);
  const btn = document.getElementById('fetch-btn');
  const statusEl = document.getElementById('fetch-status');
  const resultsEl = document.getElementById('fetch-results');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Generating…';
  statusEl.textContent = '';
  resultsEl.style.display = 'none';

  const catLabel = category === 'all' ? 'a mix of calisthenics, strength, abs, and core' : category;
  const prompt = `Generate ${count} ${catLabel} exercises for a woman in her mid-40s. These MUST work in a very small space (like a boat cabin — about 2m x 2m) with NO equipment, NO weights, NO resistance bands, NO props of any kind. Focus on joint health, balance, functional strength, and variety of positions.

  Respond ONLY with a valid JSON array. No markdown, no explanation, no backticks. Each object must have exactly these fields:
  - "name": string
  - "category": one of calisthenics, strength, core, abs, cardio, flexibility
  - "position": one of standing, floor, plank, sitting
  - "difficulty": one of beginner, intermediate, advanced
  - "sided": boolean — true only if the exercise works one side of the body at a time and must be repeated on the other side (e.g. side plank, single-leg balance, lateral leg raise). False for bilateral exercises.
  - "emoji": one relevant emoji character
  - "description": string, 2 sentences — how to do it, then a form tip

  Example:
  [{"name":"Side plank","category":"core","position":"plank","difficulty":"intermediate","sided":true,"emoji":"⬛","description":"Prop on one forearm with elbow under shoulder and lift hips to form a straight line. Keep obliques engaged and avoid letting the hip drop."}]`;

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
        messages: [{ role: 'user', content: prompt }]
      })
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
      const clean = text.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch (e) {
      statusEl.textContent = 'Could not parse response. Try again.';
      return;
    }

    let fetchedList = parsed;
    resultsEl.style.display = '';
    resultsEl.innerHTML = `
      <div style="font-size:13px;font-weight:600;margin-bottom:10px;">${parsed.length} exercises — check those you want to add</div>
      ${parsed.map((ex, i) => `
        <div class="fetch-item">
          <input type="checkbox" id="fetch-cb-${i}" checked style="width:16px;height:16px;margin-top:3px;cursor:pointer;flex-shrink:0;">
          <span style="font-size:22px;flex-shrink:0;">${ex.emoji || '💪'}</span>
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:500;">${ex.name}
              <span class="badge ${getCategoryColor(ex.category)}" style="margin-left:6px;">${cap(ex.category)}</span>
              <span style="font-size:12px;color:var(--text-secondary);margin-left:4px;">${cap(ex.difficulty)}</span>
            </div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:3px;line-height:1.5;">${ex.description}</div>
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

// Toggle all checkboxes
function toggleAllFetch(count) {
  const allChecked = Array.from({ length: count }, (_, i) => document.getElementById('fetch-cb-' + i)).every(cb => cb && cb.checked);
  for (let i = 0; i < count; i++) {
    const cb = document.getElementById('fetch-cb-' + i);
    if (cb) cb.checked = !allChecked;
  }
}

// Import fetched exercises into library
function importFetched(parsed) {
  let added = 0;
  parsed.forEach((ex, i) => {
    const cb = document.getElementById('fetch-cb-' + i);
    if (cb && cb.checked) {
      exercises.push({
        id: uid(),
        name: ex.name,
        category: ex.category,
        position: ex.position,
        difficulty: ex.difficulty,
        sided: !!ex.sided,
        emoji: ex.emoji || '💪',
        description: ex.description,
        videoUrl: ''
      });
      added++;
    }
  });
  saveExercises();
  closeFetchModal();
  renderLibrary();
  if (added) alert(`${added} exercise${added === 1 ? '' : 's'} added to your library!`);
}

// Initialise when page loads
export function initLibrary() {
  loadExercises();
  renderLibrary();
}