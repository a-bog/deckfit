// ── Session state ─────────────────────────────────────────────────────────────

let sessionTimer = null;
let sessionState = {};

// ── Training warnings ─────────────────────────────────────────────────────────

function renderTrainWarnings() {
  const el = document.getElementById('train-warnings');
  if (exercises.length < 3) {
    el.innerHTML = `<div class="warn-box">
      <i class="ti ti-alert-triangle" style="font-size:18px;color:#854F0B;flex-shrink:0;" aria-hidden="true"></i>
      <span>Add at least 3 exercises to your library before starting a session.</span>
    </div>`;
  } else {
    el.innerHTML = `<p style="font-size:13px;color:var(--text-secondary);margin-top:6px;">
      ${exercises.length} exercises in library &middot; Order randomized each session &middot; Position changes minimized
    </p>`;
  }
}

// ── Queue builder ─────────────────────────────────────────────────────────────

function buildQueue(totalSec, exTime, transTime, breakEvery, breakDuration) {
  const switchTime = Math.max(5, Math.round(transTime * 0.5));

  // ── Step 1: figure out how many slots fit ──────────────────────────────────
  // Use a dry-run to count slots precisely, so flex slots are always included.
  // A slot costs: exTime (non-sided) or exTime*2 + switchTime (sided) + transTime after.
  // We iterate from the library and count until we exceed totalSec.
  const flexPool  = shuffle(exercises.filter(e => e.category === 'flexibility'));
  const workPool  = shuffle(exercises.filter(e => e.category !== 'flexibility'));

  const mainOrdered = orderByPosition(workPool);
  const flexOrdered = orderByPosition(flexPool);

  // Estimate total slots assuming average non-sided cost, then derive flex/main split
  const avgSlotCost = exTime + transTime;           // conservative estimate
  const estSlots    = Math.max(2, Math.floor(totalSec / avgSlotCost));
  const flexSlotCount = flexPool.length > 0 ? Math.max(1, Math.round(estSlots * 0.10)) : 0;
  const mainSlotCount = estSlots - flexSlotCount;

  // Expand, cycling if session is longer than library
  const mainSlots = Array.from({ length: mainSlotCount }, (_, i) => mainOrdered[i % mainOrdered.length]);
  const flexSlots = Array.from({ length: flexSlotCount }, (_, i) => flexOrdered[i % flexOrdered.length]);
  const allSlots  = [...mainSlots, ...flexSlots];

  // ── Step 2: build the full queue for ALL slots, ignoring totalSec ──────────
  // We guarantee flex slots are always emitted. After building, we trim to fit.
  const queue = [];
  let elapsed     = 0;
  let lastBreakAt = 0;

  for (let si = 0; si < allSlots.length; si++) {
    const ex          = allSlots[si];
    const isLast      = si === allSlots.length - 1;
    const nextEx      = allSlots[si + 1];
    const isLastMain  = si === mainSlots.length - 1;

    if (ex.sided) {
      // Sided pair: left -> switch-transition -> right, uninterruptible
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

    // Break: only after a completed exercise/pair, never crossing into flex block
    const breakDue = elapsed - lastBreakAt >= breakEvery;
    if (breakDue && !isLast && !isLastMain) {
      queue.push({ type: 'break', duration: breakDuration });
      elapsed     += breakDuration;
      lastBreakAt  = elapsed;
    }

    // Transition to next exercise (not after the very last slot)
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

  // ── Step 3: trim trailing non-exercise steps ───────────────────────────────
  // Session must never end on a transition or a break.
  while (queue.length > 0 && queue[queue.length - 1].type !== 'exercise') {
    elapsed -= queue[queue.length - 1].duration;
    queue.pop();
  }

  console.log(queue)

  return { queue, totalDuration: elapsed };
}

// ── Session lifecycle ─────────────────────────────────────────────────────────

function startSession() {
  if (exercises.length < 3) { alert('Add at least 3 exercises first.'); return; }

  const totalMin     = parseInt(document.getElementById('set-duration').value);
  const exTime       = parseInt(document.getElementById('set-ex-time').value);
  const transTime    = parseInt(document.getElementById('set-trans-time').value);
  const breakEvery   = parseInt(document.getElementById('set-break-every').value) * 60;
  const breakDuration = parseInt(document.getElementById('set-break-time').value);

  const { queue, totalDuration } = buildQueue(totalMin * 60, exTime, transTime, breakEvery, breakDuration);

  sessionState = {
    queue, totalDuration,
    queueIdx: 0, elapsedSoFar: 0,
    paused: false, stepStart: Date.now(), stepRemaining: 0,
    _lastCountdownBeep: null,
  };

  document.getElementById('train-setup').style.display  = 'none';
  document.getElementById('train-active').style.display = '';
  document.getElementById('pause-btn').innerHTML =
    '<i class="ti ti-player-pause" aria-hidden="true"></i> Pause';

  advanceQueue();
}

function advanceQueue() {
  clearInterval(sessionTimer);
  if (sessionState.queueIdx >= sessionState.queue.length) { endSession(true); return; }

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
  const queue    = sessionState.queue;
  const nextStep = queue[qi + 1];

  if (step.type === 'break') {
    document.getElementById('break-screen').style.display   = '';
    document.getElementById('exercise-screen').style.display = 'none';
  } else {
    document.getElementById('break-screen').style.display   = 'none';
    document.getElementById('exercise-screen').style.display = '';

    const isTransition = step.type === 'transition';
    const isSideSwitch = step.isSideSwitch || false;
    const ex           = isTransition ? step.nextEx : step.ex;
    const side         = step.side || null;

    document.getElementById('ex-emoji').textContent = ex.emoji || '\u{1F4AA}';
    document.getElementById('ex-name').textContent  = isTransition
      ? (isSideSwitch ? `Switch sides \u2192 ${ex.name}` : `Get ready: ${ex.name}`)
      : ex.name;

    // Side pill
    let sidePill = '';
    if (!isTransition && side) {
      sidePill = `<span class="side-pill ${side}" style="margin-bottom:6px;">
        ${side === 'left' ? '\u2190 Left side' : 'Right side \u2192'}
      </span>`;
    } else if (isTransition && isSideSwitch) {
      sidePill = `<span class="side-pill right" style="margin-bottom:6px;">Switch \u2192 Right side \u2192</span>`;
    }

    document.getElementById('ex-cat').innerHTML = (isTransition && !isSideSwitch)
      ? `<span style="font-size:13px;color:var(--text-secondary);">Transition &mdash; move into position</span>`
      : `${sidePill}
         <span class="badge ${CATEGORY_COLORS[ex.category] || 'badge-blue'}">${cap(ex.category)}</span>
         <span style="font-size:13px;color:var(--text-secondary);margin-left:6px;">
           ${cap(ex.position)} &middot; ${cap(ex.difficulty)}
         </span>`;

    document.getElementById('ex-description').textContent = isTransition ? '' : (ex.description || '');

    // Video
    const videoWrap = document.getElementById('video-wrap');
    const videoEl   = document.getElementById('ex-video');
    if (!isTransition && ex.videoUrl) {
      videoEl.src = ytEmbed(ex.videoUrl, true);
      videoWrap.style.display = '';
    } else {
      videoWrap.style.display = 'none';
      videoEl.src = ''; // clears/stops playback
    }

    // Next preview
    const nextPreview = document.getElementById('next-preview');
    if (nextStep) {
      const isNextBreak    = nextStep.type === 'break';
      const nex            = isNextBreak ? null : (nextStep.ex || nextStep.nextEx);
      const nextSideLabel  = (!isNextBreak && nextStep.nextSide)
        ? (nextStep.nextSide === 'left' ? ' \u00B7 \u2190 Left' : ' \u00B7 Right \u2192')
        : '';

      document.getElementById('next-emoji').textContent = isNextBreak ? '\u{1F9D8}' : (nex?.emoji || '\u{1F4AA}');
      document.getElementById('next-name').textContent  = isNextBreak ? 'Rest break' : ((nex?.name || '\u2014') + nextSideLabel);
      document.getElementById('next-desc').textContent  = (!isNextBreak && nex?.description) ? nex.description : '';
      document.getElementById('next-badge').innerHTML   = (!isNextBreak && nex)
        ? `<span class="badge ${CATEGORY_COLORS[nex.category] || 'badge-blue'}">${cap(nex.category)}</span>`
        : '';
      nextPreview.style.display = '';
    } else {
      nextPreview.style.display = 'none';
    }
  }

  updateSessionProgressLabel();
}

// ── Timer display ─────────────────────────────────────────────────────────────

function updateTimerDisplay(step, remaining) {
  const sec = Math.ceil(remaining);
  document.getElementById('timer-num').textContent = sec;

  if (step.type === 'break') {
    document.getElementById('break-countdown').textContent = `${sec} seconds remaining`;
  }

  const arc = document.getElementById('timer-arc');
  arc.setAttribute('stroke-dashoffset', ((1 - remaining / step.duration) * 346).toFixed(1));
  arc.setAttribute('stroke',
    step.type === 'break'       ? '#1D9E75' :
    step.type === 'transition'  ? '#EF9F27' : '#534AB7'
  );
}

function updateSessionBar() {
  const done = sessionState.elapsedSoFar +
    (sessionState.queue[sessionState.queueIdx].duration - sessionState.stepRemaining);
  const pct  = Math.min(100, (done / sessionState.totalDuration) * 100);
  document.getElementById('session-bar').style.width = pct.toFixed(1) + '%';
}

function updateSessionProgressLabel() {
  const done  = sessionState.queue.slice(0, sessionState.queueIdx).filter(s => s.type === 'exercise').length;
  const total = sessionState.queue.filter(s => s.type === 'exercise').length;
  const minsLeft = Math.ceil((sessionState.totalDuration - sessionState.elapsedSoFar) / 60);
  document.getElementById('session-progress-label').textContent =
    `Exercise ${done + 1} of ${total} \u00B7 ~${minsLeft} min remaining`;
}

// ── Controls ──────────────────────────────────────────────────────────────────

function togglePause() {
  sessionState.paused = !sessionState.paused;
  if (!sessionState.paused) {
    const stepElapsed = sessionState.queue[sessionState.queueIdx].duration - sessionState.stepRemaining;
    sessionState.stepStart = Date.now() - stepElapsed * 1000;
  }
  document.getElementById('pause-btn').innerHTML = sessionState.paused
    ? '<i class="ti ti-player-play" aria-hidden="true"></i> Resume'
    : '<i class="ti ti-player-pause" aria-hidden="true"></i> Pause';
}

function skip() {
  if (sessionState.paused) {
    sessionState.paused = false
    document.getElementById('pause-btn').innerHTML = sessionState.paused
      ? '<i class="ti ti-player-play" aria-hidden="true"></i> Resume'
      : '<i class="ti ti-player-pause" aria-hidden="true"></i> Pause';
  }
  clearInterval(sessionTimer);
  sessionState.elapsedSoFar += sessionState.stepRemaining;
  sessionState.queueIdx++;
  advanceQueue();
}

function endSession(completed) {
  clearInterval(sessionTimer);
  document.getElementById('train-setup').style.display  = '';
  document.getElementById('train-active').style.display = 'none';
  document.getElementById('ex-video').src = '';
  if (completed) alert('Great work! Session complete. \u{1F389} Well done!');
  renderTrainWarnings();
}