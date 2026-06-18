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
}

function saveExercises() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises));
}

// ── API key storage ───────────────────────────────────────────────────────────

function loadApiKey() {
  const key = localStorage.getItem(API_KEY_STORAGE) || '';
  document.getElementById('api-key-input').value = key;
}

function saveApiKey() {
  const key = document.getElementById('api-key-input').value.trim();
  localStorage.setItem(API_KEY_STORAGE, key);
}

function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}
