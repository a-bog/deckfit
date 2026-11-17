// app.test.js - App boot and navigation test suite

const { switchTab, bgClose, init } = require('../js/app.js');

describe('App navigation and boot', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="tab-bar">
        <button class="tab active" id="tab-library">Exercise Library</button>
        <button class="tab" id="tab-train">Train</button>
      </div>
      <div id="view-library"></div>
      <div id="view-train" style="display:none;">
        <div id="train-warnings"></div>
      </div>
      <div id="test-modal" style="display:flex;">
        <div id="modal-content"></div>
      </div>
      <input type="password" id="api-key-input">
      <div id="category-filters"></div>
      <div id="library-stats"></div>
      <div id="exercise-list"></div>
      <input type="text" id="search-input" value="">
    `;
    global.exercises = [
      { id: 'e1', name: 'Push-up', category: 'calisthenics' }
    ];
  });

  describe('switchTab', () => {
    it('switches to Train tab and shows training view', () => {
      switchTab('train');

      expect(document.getElementById('view-train').style.display).toBe('');
      expect(document.getElementById('view-library').style.display).toBe('none');
      expect(document.getElementById('tab-train').classList.contains('active')).toBe(true);
      expect(document.getElementById('tab-library').classList.contains('active')).toBe(false);
    });

    it('switches back to Library tab', () => {
      switchTab('train');
      switchTab('library');

      expect(document.getElementById('view-library').style.display).toBe('');
      expect(document.getElementById('view-train').style.display).toBe('none');
      expect(document.getElementById('tab-library').classList.contains('active')).toBe(true);
    });
  });

  describe('bgClose', () => {
    it('closes modal when clicking on backdrop', () => {
      const modalEl = document.getElementById('test-modal');
      bgClose({ target: modalEl }, 'test-modal');
      expect(modalEl.style.display).toBe('none');
    });

    it('does not close modal when clicking inside content', () => {
      const modalEl = document.getElementById('test-modal');
      const contentEl = document.getElementById('modal-content');
      bgClose({ target: contentEl }, 'test-modal');
      expect(modalEl.style.display).toBe('flex');
    });
  });

  describe('init', () => {
    it('initializes application on load', () => {
      init();
      expect(exercises.length).toBeGreaterThan(0);
    });
  });
});

