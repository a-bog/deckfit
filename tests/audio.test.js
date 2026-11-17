// audio.test.js - Web Audio and beeps test suite

const { beepService, playCountdownBeep, playDoubleBeep, playTone, getAudioCtx, setAudioCtx } = require('../js/audio.js');

describe('Audio System', () => {
  let mockOscillator;
  let mockGain;
  let mockContext;

  beforeEach(() => {
    mockOscillator = {
      connect: jest.fn(),
      type: 'sine',
      frequency: { value: 0 },
      start: jest.fn(),
      stop: jest.fn(),
    };

    mockGain = {
      connect: jest.fn(),
      gain: {
        setValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
      },
    };

    mockContext = {
      createOscillator: jest.fn(() => mockOscillator),
      createGain: jest.fn(() => mockGain),
      destination: {},
      currentTime: 10,
    };

    window.AudioContext = jest.fn(() => mockContext);
    setAudioCtx(null);
  });

  afterEach(() => {
    delete window.AudioContext;
    setAudioCtx(null);
  });

  it('initializes and reuses AudioContext', () => {
    const ctx1 = getAudioCtx();
    const ctx2 = getAudioCtx();
    expect(ctx1).toBe(ctx2);
  });

  it('plays tone with correct frequency and scheduling', () => {
    playTone(440, 0.5, 0.2, 0.1);

    expect(mockContext.createOscillator).toHaveBeenCalled();
    expect(mockContext.createGain).toHaveBeenCalled();
    expect(mockOscillator.frequency.value).toBe(440);
    expect(mockGain.gain.setValueAtTime).toHaveBeenCalledWith(0.2, 10.1);
    expect(mockOscillator.start).toHaveBeenCalledWith(10.1);
    expect(mockOscillator.stop).toHaveBeenCalledWith(10.6);
  });

  it('handles audio errors without throwing', () => {
    mockContext.createOscillator.mockImplementationOnce(() => {
      throw new Error('Audio blocked');
    });

    expect(() => playTone(500, 0.2, 0.1)).not.toThrow();
  });

  it('plays countdown beep at 660Hz', () => {
    const spy = jest.spyOn(beepService, 'playTone');
    playCountdownBeep();
    expect(spy).toHaveBeenCalledWith(660, 0.12, 0.18, 0);
    spy.mockRestore();
  });

  it('plays double beep at 880Hz', () => {
    const spy = jest.spyOn(beepService, 'playTone');
    playDoubleBeep();
    expect(spy).toHaveBeenCalledWith(880, 0.18, 0.35, 0);
    expect(spy).toHaveBeenCalledWith(880, 0.18, 0.35, 0.28);
    spy.mockRestore();
  });
});
