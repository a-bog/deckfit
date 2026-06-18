// training.js – Workout session management
import { exercises, renderLibrary } from './library.js';
import { shuffle, cap } from './utils.js';
import { playCountdownBeep, playDoubleBeep } from './audio.js';

// Internal state
let sessionTimer = null;
let sessionState = {};

// Export functions for UI
export function renderTrainWarnings() {
  const el = document.getElementById('train-warnings');
  if (exercises.length < 3) {
    el.innerHTML = `<div class="warn-box">
      <i class="ti ti-alert-triangle" style="font-size:18px;color:#854F0B;flex-shrink:0;" aria-hidden="true"></i>
      <span>Add at least 3 exercises to your library before starting a session.</span>
    </div>`;
  } else {
    el.innerHTML = `<p style="font-size:13px;color:var(--text-secondary);margin-top:6px;">
      ${exercises.length} exercises in library · Order randomized each session · Position changes minimized
    </p>`;
  }
}

// Order exercises minimizing same-position changes
export function orderByPosition(pool) {
  const ordered = [];
  let lastPos = null;
  const rem = [...pool];
  while (rem.length) {
    let best = rem.findIndex(e => e.position !== lastPos);
    if (best === -1) best = 0;
    const [ex] = rem.splice(best, 1);
    ordered.push(ex);
    lastPos = ex.position;
  }
  return ordered;
}

// Build the exercise queue with smart ordering and break placement
export function buildQueue(totalSec, exTime, transTime, breakEvery, breakDuration) {
  const switchTime = Math.max(5, Math.round(transTime * 0.5));

  function addExercise(queue, ex, side) {
    if (ex.sided) {
      const thisSide = side || 'left';
      const otherSide = thisSide === 'left' ? 'right' : 'left';
      queue.push({ type: 'exercise', ex, side: thisSide, duration: exTime });
      queue.push({ type: 'transition', duration: switchTime, nextEx: ex, nextSide: otherSide, isSideSwitch: true });
      queue.push({ type: 'exercise', ex, side: otherSide, duration: exTime });
    } else {
      queue.push({ type: 'exercise', ex, side: null, duration: exTime });
    }
  }

  const estSlots = Math.max(1, Math.floor(totalSec / (exTime + transTime)));
  const flexPool = shuffle([...exercises.filter(e => e.category === 'flexibility')]);
  const workPool = shuffle([...exercises.filter(e => e.category !== 'flexibility')]);
  const flexSlotCount = flexPool.length > 0 ? Math.max(1, Math.round(estSlots * 0.10)) : 0;
  const mainSlotCount = estSlots - flexSlotCount;

  const mainOrdered = orderByPosition(workPool);
  const flexOrdered = orderByPosition(flexPool);

  const mainSlots = [];
  for (let i = 0; i < mainSlotCount; i++) {
    mainSlots.push(mainOrdered[i % mainOrdered.length]);
  }
  const flexSlots = [];
  for (let i = 0; i < flexSlotCount; i++) {
    flexSlots.push(flexOrdered[i % flexOrdered.length]);
  }

  const allSlots = [...mainSlots, ...flexSlots];
  const queue = [];
  let elapsed = 0;
  let lastBreakAt = 0;

  for (let si = 0; si < allSlots.length; si++) {
    const ex = allSlots[si];
    const isLastMain = si === mainSlots.length - 1;
    const isFirstFlex = si === mainSlots.length;

    if (elapsed > 0 && elapsed - lastBreakAt >= breakEvery && !isFirstFlex) {
      queue.push({ type: 'break', duration: breakDuration });
      elapsed += breakDuration;
      lastBreakAt = elapsed;
    }

    const before = queue.length;
    addExercise(queue, ex);
    for (let k = before; k < queue.length; k++) elapsed += queue[k].duration;

    if (elapsed >= totalSec) break;

    const nextEx = allSlots[si + 1];
    if (nextEx) {
      queue.push({
        type: 'transition',
        duration: transTime,
        nextEx,
        nextSide: nextEx.sided ? 'left' : null,
      });
      elapsed += transTime;
    }
    if (elapsed >= totalSec) break;
  }

  return { queue, totalDuration: elapsed };
}

// Start a new workout session
export function startSession() {
  if (exercises.length < 3) {
    alert('Add at least 3 exercises first.');
    return;
  }

  const totalMin = parseInt(document.getElementById('set-duration').value);
  const exTime = parseInt(document.getElementById('set-ex-time').value);
  const transTime = parseInt(document.getElementById('set-trans-time').value);
  const breakEvery = parseInt(document.getElementById('set-break-every').value) * 60;
  const breakDuration = parseInt(document.getElementById('set-break-time').value);

  const { queue, totalDuration } = buildQueue(totalMin * 60, exTime, transTime, breakEvery, breakDuration);

  sessionState = {
    queue,
    totalDuration,
    queueIdx: 0,
    elapsedSoFar: 0,
    paused: false,
    stepStart: Date.now(),
    stepRemaining: 0
  };

  document.getElementById('train-setup').style.display = 'none';
  document.getElementById('train-active').style.display = 'block';
  document.getElementById('pause-btn').innerHTML = '<i class="ti ti-player-pause" aria-hidden="true"></i> Pause';
  advanceQueue();
}

// Advance to the next step in the queue
export function advanceQueue() {
  clearInterval(sessionTimer);

  if (sessionState.queueIdx >= sessionState.queue.length) {
    endSession(true);
    return;
  }

  const step = sessionState.queue[sessionState.queueIdx];
  sessionState.stepRemaining = step.duration;
  sessionState.stepStart = Date.now();
  sessionState._lastCountdownBeep = null;
  renderStep(step);
  sessionTimer = setInterval(() => tickSession(step), 200);
}

// Tick the session timer
export function tickSession(step) {
  if (sessionState.paused) return;

  const elapsed = (Date.now() - sessionState.stepStart) / 1000;
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
    const secLeft = Math.ceil(remaining);
    if (secLeft <= 5 && secLeft !== sessionState._lastCountdownBeep) {
      sessionState._lastCountdownBeep = secLeft;
      playCountdownBeep();
    }
  }
}

// Render current step
export function renderStep(step) {
  const nextStep = sessionState.queue[sessionState.queueIdx + 1];

  if (step.type === 'break') {
    document.getElementById('break-screen').style.display = 'block';
    document.getElementById('exercise-screen').style.display = 'none';
  } else {
    document.getElementById('break-screen').style.display = 'none';
    document.getElementById('exercise-screen').style.display = 'block';

    const isTransition = step.type === 'transition';
    const ex = isTransition ? step.nextEx : step.ex;
    const side = step.side || null;
    const isSideSwitch = step.isSideSwitch || false;

    document.getElementById('ex-emoji').textContent = ex.emoji || '💪';
    document.getElementById('ex-name').textContent = isTransition
      ? (isSideSwitch ? `Switch sides → ${ex.name}` : `Get ready: ${ex.name}`)
      : ex.name;

    let sidePill = '';
    if (!isTransition && side) {
      sidePill = `<span class="side-pill ${side}" style="margin-bottom:6px;">${side === 'left' ? '← Left side' : 'Right side →'}</span>`;
    } else if (isTransition && isSideSwitch) {
      sidePill = `<span class="side-pill right" style="margin-bottom:6px;">Switch → Right side →</span>`;
    }

    document.getElementById('ex-cat').innerHTML = isTransition && !isSideSwitch
      ? `<span style="font-size:13px;color:var(--text-secondary);">Transition — move into position</span>`
      : `${sidePill}<span class="badge ${getCategoryColor(ex.category)}">${cap(ex.category)}</span>
         <span style="font-size:13px;color:var(--text-secondary);margin-left:6px;">${cap(ex.position)} · ${cap(ex.difficulty)}</span>`;

    document.getElementById('ex-description').textContent = isTransition ? '' : (ex.description || '');

    const videoWrap = document.getElementById('video-wrap');
    const videoEl = document.getElementById('ex-video');

    if (!isTransition && ex.videoUrl) {
      videoEl.src = ytEmbed(ex.videoUrl, true);
      videoWrap.style.display = 'block';
    } else {
      videoWrap.style.display = 'none';
      videoEl.src = '';
    }

    if (nextStep) {
      const isNextBreak = nextStep.type === 'break';
      const nextEx = !isNextBreak ? (nextStep.ex || nextStep.nextEx) : null;
      document.getElementById('next-emoji').textContent = isNextBreak ? '🧘' : (nextEx?.emoji || '💪');
      document.getElementById('next-name').textContent = isNextBreak
        ? 'Rest break'
        : ((nextEx?.name || '—') + ((!isNextBreak && nextStep.nextSide) ? ` · ${nextStep.nextSide === 'left' ? '← Left' : 'Right →'}` : ''));
      document.getElementById('next-desc').textContent = (!isNextBreak && nextEx?.description)
        ? nextEx.description
        : '';
      document.getElementById('next-badge').innerHTML = (!isNextBreak && nextEx)
        ? `<span class="badge ${getCategoryColor(nextEx.category)}">${cap(nextEx.category)}</span>`
        : '';
      document.getElementById('next-preview').style.display = 'flex';
    } else {
      document.getElementById('next-preview').style.display = 'none';
    }
  }
  updateSessionProgressLabel();
}

// Update timer display
export function updateTimerDisplay(step, remaining) {
  const sec = Math.ceil(remaining);
  document.getElementById('timer-num').textContent = sec;

  if (step.type === 'break') {
    document.getElementById('break-countdown').textContent = `${sec} seconds remaining`;
  }

  const arc = document.getElementById('timer-arc');
  const pct = remaining / step.duration;
  const circumference = 346;
  arc.setAttribute('stroke-dashoffset', ((1 - pct) * circumference).toFixed(1));
  arc.setAttribute('stroke',
    step.type === 'break' ? '#1D9E75' :
    step.type === 'transition' ? '#EF9F27' : '#534AB7'
  );
}

// Update session progress bar
export function updateSessionBar() {
  const done = sessionState.elapsedSoFar + (sessionState.queue[sessionState.queueIdx].duration - sessionState.stepRemaining);
  const pct = Math.min(100, (done / sessionState.totalDuration) * 100);
  document.getElementById('session-bar').style.width = pct.toFixed(1) + '%';
}

// Update session progress label
export function updateSessionProgressLabel() {
  const exercisesDone = sessionState.queue.slice(0, sessionState.queueIdx).filter(s => s.type === 'exercise').length;
  const exercisesTotal = sessionState.queue.filter(s => s.type === 'exercise').length;
  const secsLeft = sessionState.totalDuration - sessionState.elapsedSoFar;
  const minsLeft = Math.ceil(secsLeft / 60);
  document.getElementById('session-progress-label').textContent =
    `Exercise ${exercisesDone + 1} of ${exercisesTotal} · ~${minsLeft} min remaining`;
}

// Toggle pause/resume
export function togglePause() {
  sessionState.paused = !sessionState.paused;

  if (!sessionState.paused) {
    const stepElapsed = sessionState.queue[sessionState.queueIdx].duration - sessionState.stepRemaining;
    sessionState.stepStart = Date.now() - stepElapsed * 1000;
  }

  const btn = document.getElementById('pause-btn');
  btn.innerHTML = sessionState.paused
    ? '<i class="ti ti-player-play" aria-hidden="true"></i> Resume'
    : '<i class="ti ti-player-pause" aria-hidden="true"></i> Pause';
}

// Skip current exercise
export function skipExercise() {
  clearInterval(sessionTimer);
  sessionState.elapsedSoFar += sessionState.stepRemaining;
  sessionState.queueIdx++;
  advanceQueue();
}

// Skip break
export function skipBreak() {
  clearInterval(sessionTimer);
  sessionState.elapsedSoFar += sessionState.stepRemaining;
  sessionState.queueIdx++;
  advanceQueue();
}

// End session
export function endSession(completed) {
  clearInterval(sessionTimer);
  document.getElementById('train-setup').style.display = 'block';
  document.getElementById('train-active').style.display = 'none';
  document.getElementById('ex-video').src = '';

  if (completed) {
    alert('Great work! Session complete. 🎉 Well done!');
  }

  renderTrainWarnings();
}

// Helper functions
function getCategoryColor(category) {
  const colors = {
    calisthenics: 'badge-blue',
    strength: 'badge-coral',
    core: 'badge-teal',
    abs: 'badge-purple',
    cardio: 'badge-amber',
    flexibility: 'badge-teal'
  };
  return colors[category] || 'badge-blue';
}

function ytEmbed(url, autoplay) {
  if (!url) return '';
  const m = url.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/);
  if (!m) return url;
  const ap = autoplay ? '1&mute=1' : '0';
  return `https://www.youtube.com/embed/${m[1]}?autoplay=${ap}&rel=0&modestbranding=1`;
}