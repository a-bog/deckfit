// library.test.js - Exercise library UI, modal, and AI fetch test suite

const {
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
} = require('../js/library.js');

describe('Exercise Library UI', () => {
  const setupDOM = () => {
    document.body.innerHTML = `
      <input type="text" id="search-input" value="">
      <div id="category-filters"></div>
      <div id="library-stats"></div>
      <div id="exercise-list"></div>

      <!-- Edit Modal -->
      <div id="edit-modal" style="display:none;">
        <span id="edit-modal-title"></span>
        <button id="delete-btn" style="display:none;"></button>
        <input type="text" id="edit-name">
        <select id="edit-category">
          <option value="calisthenics">calisthenics</option>
          <option value="core">core</option>
          <option value="strength">strength</option>
        </select>
        <select id="edit-position">
          <option value="standing">standing</option>
          <option value="floor">floor</option>
        </select>
        <textarea id="edit-desc"></textarea>
        <input type="text" id="edit-video">
        <select id="edit-difficulty">
          <option value="beginner">beginner</option>
          <option value="advanced">advanced</option>
        </select>
        <input type="text" id="edit-emoji">
        <input type="checkbox" id="edit-sided">
        <span id="edit-sided-label">Off</span>
      </div>

      <!-- Fetch Modal -->
      <div id="fetch-modal" style="display:none;">
        <select id="fetch-category">
          <option value="all">all</option>
          <option value="core">core</option>
        </select>
        <select id="fetch-count">
          <option value="2">2</option>
        </select>
        <button id="fetch-btn">Generate</button>
        <span id="fetch-status"></span>
        <div id="fetch-results" style="display:none;"></div>
      </div>
    `;
  };

  beforeEach(() => {
    setupDOM();
    global.exercises = [
      { id: 'ex-1', name: 'Push-up', category: 'calisthenics', position: 'floor', difficulty: 'beginner', sided: false, emoji: '💪', description: 'Chest move', videoUrl: 'https://youtube.com/watch?v=123' },
      { id: 'ex-2', name: 'Side plank', category: 'core', position: 'floor', difficulty: 'intermediate', sided: true, emoji: '🧘', description: 'Obliques move', videoUrl: '' },
    ];
  });

  describe('renderLibrary', () => {
    it('renders category filter buttons and statistics correctly', () => {
      renderLibrary();

      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Calisthenics' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Core' })).toBeInTheDocument();

      expect(screen.getByText('Push-up')).toBeInTheDocument();
      expect(screen.getByText('Side plank')).toBeInTheDocument();
      expect(screen.getByText('sided')).toBeInTheDocument();
    });

    it('filters exercises by active category', () => {
      setFilter('core');
      expect(screen.queryByText('Push-up')).not.toBeInTheDocument();
      expect(screen.getByText('Side plank')).toBeInTheDocument();

      setFilter('all');
      expect(screen.getByText('Push-up')).toBeInTheDocument();
    });

    it('filters exercises by search query', () => {
      document.getElementById('search-input').value = 'chest';
      renderLibrary();

      expect(screen.getByText('Push-up')).toBeInTheDocument();
      expect(screen.queryByText('Side plank')).not.toBeInTheDocument();
    });

    it('shows empty state when no exercises match', () => {
      document.getElementById('search-input').value = 'nonexistent move';
      renderLibrary();

      expect(screen.getByText('No exercises found')).toBeInTheDocument();
    });

    it('opens video in a new window when openVideoLink is called', () => {
      const openSpy = jest.spyOn(window, 'open').mockImplementation(() => {});
      openVideoLink('ex-1');
      expect(openSpy).toHaveBeenCalledWith('https://youtube.com/watch?v=123', '_blank');
      openSpy.mockRestore();
    });
  });

  describe('Exercise modal operations', () => {
    it('opens modal in Add mode with blank fields', () => {
      openEditModal(null);
      expect(document.getElementById('edit-modal').style.display).toBe('flex');
      expect(document.getElementById('edit-modal-title').textContent).toBe('Add exercise');
      expect(document.getElementById('delete-btn').style.display).toBe('none');
      expect(document.getElementById('edit-name').value).toBe('');
    });

    it('opens modal in Edit mode with populated fields', () => {
      openEditModal('ex-2');
      expect(document.getElementById('edit-modal').style.display).toBe('flex');
      expect(document.getElementById('edit-modal-title').textContent).toBe('Edit exercise');
      expect(document.getElementById('delete-btn').style.display).toBe('');
      expect(document.getElementById('edit-name').value).toBe('Side plank');
      expect(document.getElementById('edit-sided').checked).toBe(true);
      expect(document.getElementById('edit-sided-label').textContent).toBe('On');
    });

    it('closes modal correctly', () => {
      openEditModal('ex-1');
      closeEditModal();
      expect(document.getElementById('edit-modal').style.display).toBe('none');
    });

    it('alerts if trying to save an exercise without a name', () => {
      openEditModal(null);
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      document.getElementById('edit-name').value = '   ';
      saveExercise();

      expect(alertSpy).toHaveBeenCalledWith('Please enter a name.');
      alertSpy.mockRestore();
    });

    it('saves a new exercise to library', () => {
      openEditModal(null);
      document.getElementById('edit-name').value = 'Squats';
      document.getElementById('edit-category').value = 'strength';
      document.getElementById('edit-desc').value = 'Leg move';
      saveExercise();

      expect(exercises.some(e => e.name === 'Squats')).toBe(true);
      expect(screen.getByText('Squats')).toBeInTheDocument();
      expect(document.getElementById('edit-modal').style.display).toBe('none');
    });

    it('updates an existing exercise', () => {
      openEditModal('ex-1');
      document.getElementById('edit-name').value = 'Updated Push-up';
      saveExercise();

      expect(exercises.find(e => e.id === 'ex-1').name).toBe('Updated Push-up');
      expect(screen.getByText('Updated Push-up')).toBeInTheDocument();
    });

    it('deletes an exercise after confirmation', () => {
      openEditModal('ex-1');
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      deleteExercise();

      expect(exercises.some(e => e.id === 'ex-1')).toBe(false);
      expect(screen.queryByText('Push-up')).not.toBeInTheDocument();
      confirmSpy.mockRestore();
    });

    it('cancels deletion when confirm is rejected', () => {
      openEditModal('ex-1');
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      deleteExercise();

      expect(exercises.some(e => e.id === 'ex-1')).toBe(true);
      confirmSpy.mockRestore();
    });
  });

  describe('AI Exercise Fetch', () => {
    it('opens and closes fetch modal', () => {
      openFetchModal();
      expect(document.getElementById('fetch-modal').style.display).toBe('flex');
      closeFetchModal();
      expect(document.getElementById('fetch-modal').style.display).toBe('none');
    });

    it('alerts if API key is missing when fetching', async () => {
      localStorage.removeItem(API_KEY_STORAGE);
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      await fetchExercises();
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('API key'));
      alertSpy.mockRestore();
    });

    it('handles successful API response and renders exercises with checkboxes', async () => {
      localStorage.setItem(API_KEY_STORAGE, 'sk-test-valid-key');
      const mockResult = [
        { name: 'Bear crawl', category: 'core', position: 'floor', difficulty: 'intermediate', sided: false, emoji: '🐻', description: 'Crawling hold' }
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify(mockResult) }]
        })
      });

      openFetchModal();
      await fetchExercises();

      expect(screen.getByText('Bear crawl')).toBeInTheDocument();
      expect(document.getElementById('fetch-results').style.display).not.toBe('none');
    });

    it('toggles all checkboxes and imports selected exercises', () => {
      const mockResult = [
        { name: 'Move 1', category: 'core', position: 'floor', difficulty: 'beginner', sided: false, emoji: '1️⃣', description: 'Desc 1' },
        { name: 'Move 2', category: 'cardio', position: 'standing', difficulty: 'intermediate', sided: false, emoji: '2️⃣', description: 'Desc 2' }
      ];

      document.body.innerHTML += `
        <input type="checkbox" id="fetch-cb-0" checked>
        <input type="checkbox" id="fetch-cb-1" checked>
      `;

      toggleAllFetch(2);
      expect(document.getElementById('fetch-cb-0').checked).toBe(false);
      expect(document.getElementById('fetch-cb-1').checked).toBe(false);

      toggleAllFetch(2);
      expect(document.getElementById('fetch-cb-0').checked).toBe(true);
      expect(document.getElementById('fetch-cb-1').checked).toBe(true);

      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      importFetched(mockResult);

      expect(exercises.some(e => e.name === 'Move 1')).toBe(true);
      expect(exercises.some(e => e.name === 'Move 2')).toBe(true);
      expect(alertSpy).toHaveBeenCalledWith('2 exercises added to your library!');
      alertSpy.mockRestore();
    });
  });
});
