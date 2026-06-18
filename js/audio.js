// ── Web Audio context ─────────────────────────────────────────────────────────

let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration, gainVal, startDelay) {
  try {
    const ctx = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = ctx.currentTime + (startDelay || 0);
    gain.gain.setValueAtTime(gainVal, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration);
  } catch (e) { /* audio unavailable */ }
}

// Short soft tick for the 5-second countdown
function playCountdownBeep() {
  playTone(660, 0.12, 0.18, 0);
}

// Two sharp beeps marking the end of an exercise
function playDoubleBeep() {
  playTone(880, 0.18, 0.35, 0);
  playTone(880, 0.18, 0.35, 0.28);
}
