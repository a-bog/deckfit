// controls.test.js - UI Controls Tests

const { endSession, tickSession, renderStep } = require('../js/training.js');

describe('Session Controls', () => {
  beforeEach(() => {
    // Reset UI state before each test
    document.body.innerHTML = '';
  });

  afterEach(() => {
    if (typeof sessionTimer !== 'undefined' && sessionTimer) {
      clearInterval(sessionTimer);
    }
  });

  it('should resume correctly from pause', async () => {
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

  it('should skip current step and unpause if paused', () => {
    exercises = [
      { name: 'stretch', category: 'flexibility' },
      { name: 'pushup', category: 'strength' }
    ];

    renderSessionSetup();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    // Pause then skip
    fireEvent.click(screen.getByText('Pause'));
    expect(sessionState.paused).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(sessionState.paused).toBe(false);
    expect(sessionState.queueIdx).toBe(1);
  });

  it('should end session and reset UI', () => {
    exercises = [
      { name: 'stretch', category: 'flexibility' },
      { name: 'pushup', category: 'strength' },
      { name: 'situp', category: 'core' },
    ];

    renderSessionSetup();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    endSession(true);

    expect(document.getElementById('train-setup').style.display).toBe('');
    expect(document.getElementById('train-active').style.display).toBe('none');
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Session complete'));
    alertSpy.mockRestore();
  });

  it('should render sided exercise and side-switch transition correctly', () => {
    renderSessionSetup();
    sessionState.queue = [
      { type: 'exercise', ex: { name: 'Side plank', category: 'core', position: 'plank', difficulty: 'beginner', emoji: '🧘' }, side: 'left', duration: 30 },
      { type: 'transition', duration: 5, isSideSwitch: true, nextEx: { name: 'Side plank', category: 'core', position: 'plank', difficulty: 'beginner' }, nextSide: 'right' }
    ];
    sessionState.queueIdx = 0;

    renderStep(sessionState.queue[0]);
    expect(screen.getByText(/Left side/)).toBeInTheDocument();

    sessionState.queueIdx = 1;
    renderStep(sessionState.queue[1]);
    expect(screen.getByText(/Switch sides/)).toBeInTheDocument();
  });

  it('should render break screen during a break step', () => {
    renderSessionSetup();
    sessionState.queue = [
      { type: 'break', duration: 60 }
    ];
    sessionState.queueIdx = 0;

    renderStep(sessionState.queue[0]);
    expect(document.getElementById('break-screen').style.display).toBe('');
    expect(document.getElementById('exercise-screen').style.display).toBe('none');
  });

  it('advances queue and plays double beep when step duration finishes', () => {
    renderSessionSetup();
    exercises = [
      { name: 'stretch', category: 'flexibility' },
      { name: 'pushup', category: 'strength' }
    ];
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    const beepSpy = jest.spyOn(beepService, 'playDoubleBeep');
    // Force elapsed time past duration
    sessionState.stepStart = Date.now() - 100000;
    tickSession(sessionState.queue[0]);

    expect(beepSpy).toHaveBeenCalled();
    expect(sessionState.queueIdx).toBe(1);
    beepSpy.mockRestore();
  });
});
