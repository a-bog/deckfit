// storage.js – localStorage management
export const STORAGE_KEY = 'deckfit-exercises-v4';
export const API_KEY_STORAGE = 'deckfit-api-key';

export function loadStorage(key, defaultValue) {
  try {
    return localStorage.getItem(key) || defaultValue;
  } catch (e) {
    console.error('Storage error:', e);
    return defaultValue;
  }
}

export function saveStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('Storage write failed:', e);
  }
}

export function loadApiKey() {
  return loadStorage(API_KEY_STORAGE) || '';
}

export function saveApiKey(key) {
  saveStorage(API_KEY_STORAGE, key);
}
