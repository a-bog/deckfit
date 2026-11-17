// ── Node module loading support ───────────────────────────────────────────────

if (typeof module !== 'undefined') {
  if (typeof DEFAULT_EXERCISES === 'undefined') {
    const data = require('./data');
    global.DEFAULT_EXERCISES = data.DEFAULT_EXERCISES;
    global.STORAGE_KEY = data.STORAGE_KEY;
    global.API_KEY_STORAGE = data.API_KEY_STORAGE;
  }
}

// ── Exercise storage ──────────────────────────────────────────────────────────

function loadExercises() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      exercises = (Array.isArray(parsed) && parsed.length > 0) ? parsed : [...DEFAULT_EXERCISES];
    } else {
      exercises = [...DEFAULT_EXERCISES];
    }
  } catch (e) {
    console.warn('loadExercises error, using defaults:', e);
    exercises = [...DEFAULT_EXERCISES];
  }
  if (!Array.isArray(exercises) || exercises.length === 0) {
    exercises = [...DEFAULT_EXERCISES];
  }
  saveExercises();
  return exercises;
}

function saveExercises() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises));
}

// ── API key storage ───────────────────────────────────────────────────────────

function loadApiKey() {
  const key = localStorage.getItem(API_KEY_STORAGE) || '';
  const input = document.getElementById('api-key-input');
  if (input) input.value = key;
  return key;
}

function saveApiKey() {
  const input = document.getElementById('api-key-input');
  const key = input ? input.value.trim() : '';
  localStorage.setItem(API_KEY_STORAGE, key);
  return key;
}

function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadExercises,
    saveExercises,
    loadApiKey,
    saveApiKey,
    getApiKey,
  };
}
