// storage.test.js - Storage management test suite

const { loadExercises, saveExercises, loadApiKey, saveApiKey, getApiKey } = require('../js/storage.js');
const { DEFAULT_EXERCISES, STORAGE_KEY, API_KEY_STORAGE } = require('../js/data.js');

describe('Storage Management', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <input type="password" id="api-key-input">
    `;
  });

  describe('Exercises storage', () => {
    it('loads DEFAULT_EXERCISES when localStorage is empty', () => {
      const loaded = loadExercises();
      expect(loaded).toEqual(DEFAULT_EXERCISES);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(DEFAULT_EXERCISES));
    });

    it('loads stored exercises from localStorage when present', () => {
      const custom = [{ id: 'custom-1', name: 'Custom Move', category: 'core' }];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));

      const loaded = loadExercises();
      expect(loaded).toEqual(custom);
    });

    it('reverts to DEFAULT_EXERCISES if localStorage contains invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, '{invalid json');
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const loaded = loadExercises();
      expect(loaded).toEqual(DEFAULT_EXERCISES);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('reverts to DEFAULT_EXERCISES if localStorage contains an empty array', () => {
      localStorage.setItem(STORAGE_KEY, '[]');
      const loaded = loadExercises();
      expect(loaded).toEqual(DEFAULT_EXERCISES);
    });

    it('saveExercises serializes current exercises to localStorage', () => {
      exercises = [{ id: 'saved-1', name: 'Plank' }];
      saveExercises();
      expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(exercises));
    });
  });

  describe('API key storage', () => {
    it('saves and retrieves API key correctly', () => {
      document.getElementById('api-key-input').value = '  sk-ant-test-key  ';
      saveApiKey();

      expect(localStorage.getItem(API_KEY_STORAGE)).toBe('sk-ant-test-key');
      expect(getApiKey()).toBe('sk-ant-test-key');
    });

    it('loadApiKey updates the input field from localStorage', () => {
      localStorage.setItem(API_KEY_STORAGE, 'stored-api-key');
      loadApiKey();

      expect(document.getElementById('api-key-input').value).toBe('stored-api-key');
    });

    it('handles empty API key gracefully', () => {
      loadApiKey();
      expect(document.getElementById('api-key-input').value).toBe('');
      expect(getApiKey()).toBe('');
    });
  });
});

