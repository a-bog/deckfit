// ── Node module loading support ───────────────────────────────────────────────

if (typeof module !== 'undefined') {
  if (typeof shuffle === 'undefined') {
    const u = require('./utils');
    global.shuffle = u.shuffle;
    global.orderByPosition = u.orderByPosition;
    global.cap = u.cap;
    global.ytEmbed = u.ytEmbed;
  }
  if (typeof CATEGORY_COLORS === 'undefined') {
    const d = require('./data');
    global.CATEGORY_COLORS = d.CATEGORY_COLORS;
  }
  if (typeof playCountdownBeep === 'undefined') {
    const a = require('./audio');
    global.playCountdownBeep = a.playCountdownBeep;
    global.playDoubleBeep = a.playDoubleBeep;
    global.beepService = a.beepService;
  }
}

// ── Session state ─────────────────────────────────────────────────────────────

let sessionTimer = null;

const defaultSessionState = () => ({
  paused: true,
  queueIdx: 0,
  elapsedSoFar: 0,
  queue: [],
  totalDuration: 0,
  stepRemaining: 0,
  stepStart: null,
  _lastCountdownBeep: null,
});

let sessionState = defaultSessionState();

// ── Training warnings ─────────────────────────────────────────────────────────

function renderTrainWarnings() {
  const el = document.getElementById('train-warnings');
  if (!el) return;
  const count = (typeof exercises !== 'undefined' && exercises) ? exercises.length : 0;
  if (count < 3) {
    el.innerHTML = `<div class="warn-box">
      <i class="ti ti-alert-triangle" style="font-size:18px;color:#854F0B;flex-shrink:0;" aria-hidden="true"></i>
      <span>Add at least 3 exercises to your library before starting a session.</span>
    </div>`;
  } else {
    el.innerHTML = `<p style="font-size:13px;color:var(--text-secondary);margin-top:6px;">
      <span>${count} exercises in library</span> &middot; Order randomized each session &middot; Position changes minimized
    </p>`;
  }
}

// ── Session setup DOM helper for testing/rendering ────────────────────────────

function renderSessionSetup() {
  document.body.innerHTML = `
    <div id="view-train">
      <div id="train-setup" class="training-setup">
        <button class="btn btn-primary" onclick="startSession()" id="start-btn" aria-label="Start">
          <i class="ti ti-player-play" aria-hidden="true"></i> Start workout
        </button>
        <input type="number" class="number-input" id="set-duration" value="20" min="5" max="90">
        <input type="number" class="number-input" id="set-ex-time" value="5" min="5" max="120">
        <input type="number" class="number-input" id="set-trans-time" value="2" min="2" max="30">
        <input type="number" class="number-input" id="set-break-every" value="7" min="3" max="20">
        <input type="number" class="number-input" id="set-break-time" value="60" min="20" max="180">
        <div id="train-warnings" class="mt-2"></div>
      </div>
      <div id="train-active" style="display:none;">
        <span id="session-progress-label"></span>
        <div class="progress-bar" id="session-bar" style="width:0%"></div>
        <div id="break-screen" style="display:none;">
          <div id="break-countdown">60 seconds to recover</div>
          <button class="btn btn-primary" onclick="skip()">Skip break</button>
        </div>
        <div id="exercise-screen">
          <div id="ex-emoji"></div>
          <div id="ex-name">&mdash;</div>
          <div id="ex-cat"></div>
          <svg><circle id="timer-arc" stroke-dashoffset="0"></circle></svg>
          <div id="timer-num">40</div>
          <div id="ex-description"></div>
          <div id="video-wrap" style="display:none;"><iframe id="ex-video" src=""></iframe></div>
          <div id="next-preview" style="display:none;">
            <div id="next-emoji"></div>
            <div id="next-name"></div>
            <div id="next-desc"></div>
            <div id="next-badge"></div>
          </div>
        </div>
        <div class="controls">
          <button class="btn" onclick="togglePause()" id="pause-btn">
            <i class="ti ti-player-pause" aria-hidden="true"></i> Pause
          </button>
          <button class="btn" onclick="skip()" id="skip-btn" aria-label="Skip">
            <i class="ti ti-player-skip-forward" aria-hidden="true"></i> Skip
          </button>
        </div>
      </div>
    </div>
  `;
  renderTrainWarnings();
}

// ── Queue builder ─────────────────────────────────────────────────────────────

function buildQueue(totalSec, exTime, transTime, breakEvery, breakDuration, exercisesList = (typeof exercises !== 'undefined' ? exercises : [])) {
  if (!exercisesList || exercisesList.length === 0) {
    return { queue: [], totalDuration: 0 };
  }

  const switchTime = Math.max(5, Math.round(transTime * 0.5));

  const flexPool  = shuffle(exercisesList.filter(e => e.category === 'flexibility'));
  const workPool  = shuffle(exercisesList.filter(e => e.category !== 'flexibility'));

  const mainOrdered = orderByPosition(workPool);
  const flexOrdered = orderByPosition(flexPool);

  const avgSlotCost = exTime + transTime;           // conservative estimate
  const estSlots    = Math.max(2, Math.floor(totalSec / avgSlotCost));

  let mainSlots = [];
  let flexSlots = [];

  if (workPool.length > 0 && flexPool.length > 0) {
    const flexSlotCount = Math.max(1, Math.round(estSlots * 0.10));
    const mainSlotCount = Math.max(1, estSlots - flexSlotCount);
    mainSlots = Array.from({ length: mainSlotCount }, (_, i) => mainOrdered[i % mainOrdered.length]);
    flexSlots = Array.from({ length: flexSlotCount }, (_, i) => flexOrdered[i % flexOrdered.length]);
  } else if (workPool.length > 0) {
    mainSlots = Array.from({ length: estSlots }, (_, i) => mainOrdered[i % mainOrdered.length]);
  } else if (flexPool.length > 0) {
    flexSlots = Array.from({ length: estSlots }, (_, i) => flexOrdered[i % flexOrdered.length]);
  }

  const allSlots  = [...mainSlots, ...flexSlots];
  if (allSlots.length === 0) {
    return { queue: [], totalDuration: 0 };
  }

  const queue = [];
  let elapsed     = 0;
  let lastBreakAt = 0;

  for (let si = 0; si < allSlots.length; si++) {
    const ex          = allSlots[si];
    const isLast      = si === allSlots.length - 1;
    const nextEx      = allSlots[si + 1];
    const isLastMain  = si === mainSlots.length - 1;

    if (ex.sided) {
      queue.push({ type: 'exercise', ex, side: 'left',  duration: exTime });
      elapsed += exTime;
      queue.push({ type: 'transition', duration: switchTime, nextEx: ex, nextSide: 'right', isSideSwitch: true });
      elapsed += switchTime;
      queue.push({ type: 'exercise', ex, side: 'right', duration: exTime });
      elapsed += exTime;
    } else {
      queue.push({ type: 'exercise', ex, side: null, duration: exTime });
      elapsed += exTime;
    }

    const breakDue = elapsed - lastBreakAt >= breakEvery;
    if (breakDue && !isLast && !isLastMain) {
      queue.push({ type: 'break', duration: breakDuration });
      elapsed     += breakDuration;
      lastBreakAt  = elapsed;
    }

    if (nextEx) {
      queue.push({
        type:     'transition',
        duration: transTime,
        nextEx,
        nextSide: nextEx.sided ? 'left' : null,
      });
      elapsed += transTime;
    }
  }

  while (queue.length > 0 && queue[queue.length - 1].type !== 'exercise') {
    elapsed -= queue[queue.length - 1].duration;
    queue.pop();
  }

  return { queue, totalDuration: elapsed };
}

// ── Session lifecycle ─────────────────────────────────────────────────────────

function startSession() {
  const exerciseList = (typeof exercises !== 'undefined' && exercises) ? exercises : [];
  if (exerciseList.length === 0) {
    if (typeof alert === 'function') alert('Add at least 1 exercise first.');
    return;
  }

  const durationEl = document.getElementById('set-duration');
  const exTimeEl = document.getElementById('set-ex-time');
  const transTimeEl = document.getElementById('set-trans-time');
  const breakEveryEl = document.getElementById('set-break-every');
  const breakDurationEl = document.getElementById('set-break-time');

  const totalMin      = durationEl ? parseInt(durationEl.value) : 20;
  const exTime        = exTimeEl ? parseInt(exTimeEl.value) : 40;
  const transTime     = transTimeEl ? parseInt(transTimeEl.value) : 10;
  const breakEvery    = (breakEveryEl ? parseInt(breakEveryEl.value) : 7) * 60;
  const breakDuration = breakDurationEl ? parseInt(breakDurationEl.value) : 60;

  const { queue, totalDuration } = buildQueue(totalMin * 60, exTime, transTime, breakEvery, breakDuration, exerciseList);

  sessionState = {
    queue, totalDuration,
    queueIdx: 0, elapsedSoFar: 0,
    paused: false, stepStart: Date.now(), stepRemaining: 0,
    _lastCountdownBeep: null,
  };

  const trainSetup = document.getElementById('train-setup');
  if (trainSetup) trainSetup.style.display = 'none';
  const trainActive = document.getElementById('train-active');
  if (trainActive) trainActive.style.display = '';
  const pauseBtn = document.getElementById('pause-btn');
  if (pauseBtn) {
    pauseBtn.innerHTML = '<i class="ti ti-player-pause" aria-hidden="true"></i> Pause';
  }

  advanceQueue();
}

function advanceQueue() {
  clearInterval(sessionTimer);
  if (!sessionState.queue || sessionState.queueIdx >= sessionState.queue.length) {
    endSession(true);
    return;
  }

  const step = sessionState.queue[sessionState.queueIdx];
  sessionState.stepRemaining      = step.duration;
  sessionState.stepStart          = Date.now();
  sessionState._lastCountdownBeep = null;

  renderStep(step);
  sessionTimer = setInterval(() => tickSession(step), 200);
}

function tickSession(step) {
  if (sessionState.paused) return;

  const elapsed   = (Date.now() - sessionState.stepStart) / 1000;
  const remaining = Math.max(0, step.duration - elapsed);
  sessionState.stepRemaining = remaining;

  updateTimerDisplay(step, remaining);
  updateSessionBar();

  if (remaining <= 0) {
    playDoubleBeep();
    sessionState.elapsedSoFar += step.duration;
    sessionState.queueIdx++;
    advanceQueue();
  } else {
    // Countdown tick for last 5 seconds
    const secLeft = Math.ceil(remaining);
    if (secLeft <= 5 && secLeft !== sessionState._lastCountdownBeep) {
      sessionState._lastCountdownBeep = secLeft;
      playCountdownBeep();
    }
  }
}

// ── Step rendering ────────────────────────────────────────────────────────────

function renderStep(step) {
  const qi       = sessionState.queueIdx;
  const queue    = sessionState.queue || [];
  const nextStep = queue[qi + 1];

  const breakScreen = document.getElementById('break-screen');
  const exScreen    = document.getElementById('exercise-screen');

  if (step.type === 'break') {
    if (breakScreen) breakScreen.style.display = '';
    if (exScreen) exScreen.style.display = 'none';
  } else {
    if (breakScreen) breakScreen.style.display = 'none';
    if (exScreen) exScreen.style.display = '';

    const isTransition = step.type === 'transition';
    const isSideSwitch = step.isSideSwitch || false;
    const ex           = isTransition ? step.nextEx : step.ex;
    const side         = step.side || null;

    const exEmoji = document.getElementById('ex-emoji');
    if (exEmoji) exEmoji.textContent = (ex && ex.emoji) || '\u{1F4AA}';

    const exName = document.getElementById('ex-name');
    if (exName) {
      exName.textContent = isTransition
        ? (isSideSwitch ? `Switch sides \u2192 ${ex ? ex.name : ''}` : `Get ready: ${ex ? ex.name : ''}`)
        : (ex ? ex.name : '');
    }

    let sidePill = '';
    if (!isTransition && side) {
      sidePill = `<span class="side-pill ${side}" style="margin-bottom:6px;">
        ${side === 'left' ? '\u2190 Left side' : 'Right side \u2192'}
      </span>`;
    } else if (isTransition && isSideSwitch) {
      sidePill = `<span class="side-pill right" style="margin-bottom:6px;">Switch \u2192 Right side \u2192</span>`;
    }

    const exCat = document.getElementById('ex-cat');
    if (exCat) {
      const colors = (typeof CATEGORY_COLORS !== 'undefined') ? CATEGORY_COLORS : {};
      exCat.innerHTML = (isTransition && !isSideSwitch)
        ? `<span style="font-size:13px;color:var(--text-secondary);">Transition &mdash; move into position</span>`
        : `${sidePill}
           <span class="badge ${colors[ex?.category] || 'badge-blue'}">${typeof cap === 'function' ? cap(ex?.category) : (ex?.category || '')}</span>
           <span style="font-size:13px;color:var(--text-secondary);margin-left:6px;">
             ${typeof cap === 'function' ? cap(ex?.position) : ''} &middot; ${typeof cap === 'function' ? cap(ex?.difficulty) : ''}
           </span>`;
    }

    const exDesc = document.getElementById('ex-description');
    if (exDesc) exDesc.textContent = isTransition ? '' : (ex?.description || '');

    const videoWrap = document.getElementById('video-wrap');
    const videoEl   = document.getElementById('ex-video');
    if (videoWrap && videoEl) {
      if (!isTransition && ex?.videoUrl && typeof ytEmbed === 'function') {
        videoEl.src = ytEmbed(ex.videoUrl, true);
        videoWrap.style.display = '';
      } else {
        videoWrap.style.display = 'none';
        videoEl.src = '';
      }
    }

    const nextPreview = document.getElementById('next-preview');
    if (nextPreview) {
      if (nextStep) {
        const isNextBreak    = nextStep.type === 'break';
        const nex            = isNextBreak ? null : (nextStep.ex || nextStep.nextEx);
        const nextSideLabel  = (!isNextBreak && nextStep.nextSide)
          ? (nextStep.nextSide === 'left' ? ' \u00B7 \u2190 Left' : ' \u00B7 Right \u2192')
          : '';

        const nextEmoji = document.getElementById('next-emoji');
        if (nextEmoji) nextEmoji.textContent = isNextBreak ? '\u{1F9D8}' : (nex?.emoji || '\u{1F4AA}');

        const nextName = document.getElementById('next-name');
        if (nextName) nextName.textContent = isNextBreak ? 'Rest break' : ((nex?.name || '\u2014') + nextSideLabel);

        const nextDesc = document.getElementById('next-desc');
        if (nextDesc) nextDesc.textContent = (!isNextBreak && nex?.description) ? nex.description : '';

        const nextBadge = document.getElementById('next-badge');
        if (nextBadge) {
          const colors = (typeof CATEGORY_COLORS !== 'undefined') ? CATEGORY_COLORS : {};
          nextBadge.innerHTML = (!isNextBreak && nex)
            ? `<span class="badge ${colors[nex.category] || 'badge-blue'}">${typeof cap === 'function' ? cap(nex.category) : nex.category}</span>`
            : '';
        }
        nextPreview.style.display = '';
      } else {
        nextPreview.style.display = 'none';
      }
    }
  }

  updateSessionProgressLabel();
}

// ── Timer display ─────────────────────────────────────────────────────────────

function updateTimerDisplay(step, remaining) {
  const sec = Math.ceil(remaining);
  const timerNum = document.getElementById('timer-num');
  if (timerNum) timerNum.textContent = sec;

  if (step.type === 'break') {
    const breakCountdown = document.getElementById('break-countdown');
    if (breakCountdown) breakCountdown.textContent = `${sec} seconds remaining`;
  }

  const arc = document.getElementById('timer-arc');
  if (arc) {
    arc.setAttribute('stroke-dashoffset', ((1 - remaining / step.duration) * 346).toFixed(1));
    arc.setAttribute('stroke',
      step.type === 'break'       ? '#1D9E75' :
      step.type === 'transition'  ? '#EF9F27' : '#534AB7'
    );
  }
}

function updateSessionBar() {
  const bar = document.getElementById('session-bar');
  if (!bar || !sessionState.queue || !sessionState.queue[sessionState.queueIdx]) return;
  const done = sessionState.elapsedSoFar +
    (sessionState.queue[sessionState.queueIdx].duration - (sessionState.stepRemaining || 0));
  const pct  = sessionState.totalDuration > 0 ? Math.min(100, (done / sessionState.totalDuration) * 100) : 0;
  bar.style.width = pct.toFixed(1) + '%';
}

function updateSessionProgressLabel() {
  const lbl = document.getElementById('session-progress-label');
  if (!lbl || !sessionState.queue) return;
  const done  = sessionState.queue.slice(0, sessionState.queueIdx).filter(s => s.type === 'exercise').length;
  const total = sessionState.queue.filter(s => s.type === 'exercise').length;
  const minsLeft = Math.ceil((sessionState.totalDuration - (sessionState.elapsedSoFar || 0)) / 60);
  lbl.textContent = `Exercise ${done + 1} of ${total} \u00B7 ~${minsLeft} min remaining`;
}

// ── Controls ──────────────────────────────────────────────────────────────────

function togglePause() {
  sessionState.paused = !sessionState.paused;
  if (!sessionState.paused) {
    const step = sessionState.queue && sessionState.queue[sessionState.queueIdx];
    const duration = step ? step.duration : 0;
    const stepElapsed = duration - (sessionState.stepRemaining || 0);
    sessionState.stepStart = Date.now() - stepElapsed * 1000;
  }
  const pauseBtn = document.getElementById('pause-btn');
  if (pauseBtn) {
    pauseBtn.innerHTML = sessionState.paused
      ? '<i class="ti ti-player-play" aria-hidden="true"></i> Resume'
      : '<i class="ti ti-player-pause" aria-hidden="true"></i> Pause';
  }
}

function skip() {
  if (sessionState.paused) {
    sessionState.paused = false;
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
      pauseBtn.innerHTML = '<i class="ti ti-player-pause" aria-hidden="true"></i> Pause';
    }
  }
  clearInterval(sessionTimer);
  sessionState.elapsedSoFar = (sessionState.elapsedSoFar || 0) + (sessionState.stepRemaining || 0);
  sessionState.queueIdx = (sessionState.queueIdx || 0) + 1;
  advanceQueue();
}

function endSession(completed) {
  clearInterval(sessionTimer);
  const setup = document.getElementById('train-setup');
  if (setup) setup.style.display = '';
  const active = document.getElementById('train-active');
  if (active) active.style.display = 'none';
  const video = document.getElementById('ex-video');
  if (video) video.src = '';
  if (completed && typeof alert === 'function') alert('Great work! Session complete. \u{1F389} Well done!');
  renderTrainWarnings();
}

// ── Session object for state management ───────────────────────────────────────

const Session = {
  _current: null,
  get current() {
    return this._current;
  },
  set current(val) {
    this._current = val;
    if (val === null) {
      sessionState = defaultSessionState();
      if (sessionTimer) {
        clearInterval(sessionTimer);
        sessionTimer = null;
      }
    }
  },
  get state() {
    return sessionState;
  },
  set state(val) {
    sessionState = val;
  },
  startSession(opts) {
    this.current = this;
    if (opts && opts.exercises) {
      exercises = opts.exercises;
    }
    sessionState = {
      queue: (opts && opts.exercises) ? opts.exercises : [],
      totalDuration: 60,
      queueIdx: 0,
      elapsedSoFar: 0,
      paused: false,
      stepStart: Date.now(),
      stepRemaining: 60,
      _lastCountdownBeep: null,
    };
    if (sessionTimer) clearInterval(sessionTimer);
    sessionTimer = setInterval(() => {
      if (!sessionState.paused && sessionState.stepStart) {
        sessionState.elapsedSoFar = (Date.now() - sessionState.stepStart) / 1000;
      }
    }, 20);
  },
  togglePause() {
    sessionState.paused = !sessionState.paused;
    if (!sessionState.paused) {
      sessionState.stepStart = Date.now() - (sessionState.elapsedSoFar || 0) * 1000;
    }
  }
};

// ── CommonJS exports ──────────────────────────────────────────────────────────

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildQueue,
    startSession,
    advanceQueue,
    tickSession,
    renderStep,
    updateTimerDisplay,
    updateSessionBar,
    updateSessionProgressLabel,
    togglePause,
    skip,
    endSession,
    renderTrainWarnings,
    renderSessionSetup,
    Session,
    defaultSessionState,
    getSessionState: () => sessionState,
    setSessionState: (s) => { sessionState = s; },
    getSessionTimer: () => sessionTimer,
    setSessionTimer: (t) => { sessionTimer = t; },
  };
}
