// ── Global mutable state (shared across modules) ──────────────────────────────
// exercises is declared here so all modules can read/write it
let exercises = [];

// ── Navigation ────────────────────────────────────────────────────────────────

function switchTab(t) {
  document.getElementById('view-library').style.display = t === 'library' ? '' : 'none';
  document.getElementById('view-train').style.display   = t === 'train'   ? '' : 'none';
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + t).classList.add('active');
  if (t === 'train') renderTrainWarnings();
}

// Close modal when clicking the backdrop
function bgClose(e, id) {
  if (e.target === document.getElementById(id)) {
    document.getElementById(id).style.display = 'none';
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────

function init() {
  loadExercises();   // storage.js — populates `exercises`, falls back to DEFAULT_EXERCISES
  loadApiKey();      // storage.js — restores saved API key into the input
  renderLibrary();   // library.js — renders exercise list
}

document.addEventListener('DOMContentLoaded', init);
