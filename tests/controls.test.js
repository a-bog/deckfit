// controls.test.js - UI Controls Tests

describe('Session Controls', () => {
  beforeEach(() => {
    // Reset UI state before each test
    document.body.innerHTML = '';
  });

  it('should resume correctly from pause', async () => {
    // Setup exercises
    exercises = [
      { name: 'stretch', category: 'flexibility' },
      { name: 'pushup', category: 'strength' }
    ];

    renderSessionSetup();

    // Start session
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    // Wait for timer to start
    await delay(50);

    // Pause
    fireEvent.click(screen.getByText('Pause'));
    expect(sessionState.paused).toBe(true);

    // Resume
    fireEvent.click(screen.getByText('Resume'));
    expect(sessionState.paused).toBe(false);
  });

  it('should skip current step', () => {
    exercises = [
      { name: 'stretch', category: 'flexibility' },
      { name: 'pushup', category: 'strength' }
    ];

    renderSessionSetup();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    // Click skip
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    expect(sessionState.queueIdx).toBe(1);
  });
});