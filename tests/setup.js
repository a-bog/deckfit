require('@testing-library/jest-dom');
const { screen, fireEvent } = require('@testing-library/dom');

// Global test helpers
global.screen = screen;
global.fireEvent = fireEvent;
global.delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Load modules in order
const data = require('../js/data');
const utils = require('../js/utils');
const audio = require('../js/audio');
const training = require('../js/training');
const app = require('../js/app');

// Expose globals for tests that expect browser-like environment
global.exercises = [];
global.beepService = audio.beepService;
global.playCountdownBeep = audio.playCountdownBeep;
global.playDoubleBeep = audio.playDoubleBeep;
global.buildQueue = training.buildQueue;
global.startSession = training.startSession;
global.advanceQueue = training.advanceQueue;
global.tickSession = training.tickSession;
global.renderStep = training.renderStep;
global.togglePause = training.togglePause;
global.skip = training.skip;
global.endSession = training.endSession;
global.renderTrainWarnings = training.renderTrainWarnings;
global.renderSessionSetup = training.renderSessionSetup;
global.Session = training.Session;

Object.defineProperty(global, 'sessionState', {
  get: () => training.getSessionState(),
  set: (val) => training.setSessionState(val),
  configurable: true,
});

Object.defineProperty(window, 'sessionState', {
  get: () => training.getSessionState(),
  set: (val) => training.setSessionState(val),
  configurable: true,
});

Object.defineProperty(global, 'sessionTimer', {
  get: () => training.getSessionTimer(),
  set: (val) => training.setSessionTimer(val),
  configurable: true,
});

// Also attach to window for jsdom inline onclick handlers
Object.assign(window, {
  screen,
  fireEvent,
  delay: global.delay,
  exercises: global.exercises,
  startSession: training.startSession,
  togglePause: training.togglePause,
  skip: training.skip,
  endSession: training.endSession,
  renderTrainWarnings: training.renderTrainWarnings,
  renderSessionSetup: training.renderSessionSetup,
  buildQueue: training.buildQueue,
  beepService: audio.beepService,
  playCountdownBeep: audio.playCountdownBeep,
  playDoubleBeep: audio.playDoubleBeep,
});

afterEach(() => {
  const timer = training.getSessionTimer();
  if (timer) {
    clearInterval(timer);
    training.setSessionTimer(null);
  }
});
