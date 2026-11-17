require('@testing-library/jest-dom');
const { screen, fireEvent } = require('@testing-library/dom');

// Global test helpers
global.screen = screen;
global.fireEvent = fireEvent;
global.delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Load modules in order
const data = require('../js/data');
const utils = require('../js/utils');
const storage = require('../js/storage');
const audio = require('../js/audio');
const library = require('../js/library');
const training = require('../js/training');
const app = require('../js/app');

// Expose globals for tests that expect browser-like environment
global.exercises = [];
global.DEFAULT_EXERCISES = data.DEFAULT_EXERCISES;
global.STORAGE_KEY = data.STORAGE_KEY;
global.API_KEY_STORAGE = data.API_KEY_STORAGE;
global.CATEGORY_COLORS = data.CATEGORY_COLORS;

global.cap = utils.cap;
global.uid = utils.uid;
global.ytEmbed = utils.ytEmbed;
global.shuffle = utils.shuffle;
global.orderByPosition = utils.orderByPosition;

global.loadExercises = storage.loadExercises;
global.saveExercises = storage.saveExercises;
global.loadApiKey = storage.loadApiKey;
global.saveApiKey = storage.saveApiKey;
global.getApiKey = storage.getApiKey;

global.beepService = audio.beepService;
global.playCountdownBeep = audio.playCountdownBeep;
global.playDoubleBeep = audio.playDoubleBeep;

global.renderLibrary = library.renderLibrary;
global.setFilter = library.setFilter;
global.openVideoLink = library.openVideoLink;
global.openEditModal = library.openEditModal;
global.closeEditModal = library.closeEditModal;
global.saveExercise = library.saveExercise;
global.deleteExercise = library.deleteExercise;
global.openFetchModal = library.openFetchModal;
global.closeFetchModal = library.closeFetchModal;
global.fetchExercises = library.fetchExercises;
global.toggleAllFetch = library.toggleAllFetch;
global.importFetched = library.importFetched;

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

global.switchTab = app.switchTab;
global.bgClose = app.bgClose;
global.init = app.init;

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
  DEFAULT_EXERCISES: data.DEFAULT_EXERCISES,
  STORAGE_KEY: data.STORAGE_KEY,
  API_KEY_STORAGE: data.API_KEY_STORAGE,
  CATEGORY_COLORS: data.CATEGORY_COLORS,
  cap: utils.cap,
  uid: utils.uid,
  ytEmbed: utils.ytEmbed,
  shuffle: utils.shuffle,
  orderByPosition: utils.orderByPosition,
  loadExercises: storage.loadExercises,
  saveExercises: storage.saveExercises,
  loadApiKey: storage.loadApiKey,
  saveApiKey: storage.saveApiKey,
  getApiKey: storage.getApiKey,
  renderLibrary: library.renderLibrary,
  setFilter: library.setFilter,
  openVideoLink: library.openVideoLink,
  openEditModal: library.openEditModal,
  closeEditModal: library.closeEditModal,
  saveExercise: library.saveExercise,
  deleteExercise: library.deleteExercise,
  openFetchModal: library.openFetchModal,
  closeFetchModal: library.closeFetchModal,
  fetchExercises: library.fetchExercises,
  toggleAllFetch: library.toggleAllFetch,
  importFetched: library.importFetched,
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
  switchTab: app.switchTab,
  bgClose: app.bgClose,
  init: app.init,
});

afterEach(() => {
  const timer = training.getSessionTimer();
  if (timer) {
    clearInterval(timer);
    training.setSessionTimer(null);
  }
});
