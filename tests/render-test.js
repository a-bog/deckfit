// render-test.js - UI Rendering Tests

describe('Session UI Rendering', () => {
  afterEach(() => {
    // Clean up DOM after each test
    document.body.innerHTML = '';
  });

  it('should display exercise count correctly', () => {
    // Mock exercises setup
    exercises = [
      { name: 'stretch', category: 'flexibility' },
      { name: 'pushup', category: 'strength' },
      { name: 'situp', category: 'strength' }
    ];

    // Render the setup
    renderSessionSetup();

    // Verify exercise count text is displayed
    const countText = screen.getByText('3 exercises in library');
    expect(countText).toBeInTheDocument();
  });

  it('should show countdown beep for last 5 seconds', async () => {
    // Setup with single exercise
    exercises = [
      { name: 'rest', category: 'flexibility', description: 'Rest position' }
    ];

    renderSessionSetup();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    // Wait for timer update
    await delay(500);

    // Verify countdown beep was called
    const beepSpy = jest.spyOn(beepService, 'playCountdownBeep');
    expect(beepSpy).toHaveBeenCalled();
  });

  it('should handle pause/resume controls', () => {
    exercises = [{ name: 'test', category: 'workout' }];

    renderSessionSetup();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    // Check initial pause state
    const pauseButton = screen.getByText('Pause');
    expect(pauseButton).toBeInTheDocument();

    // Click pause/resume
    fireEvent.click(pauseButton);
    expect(screen.getByText('Resume')).toBeInTheDocument();
  });
});