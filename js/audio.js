// audio.js – Sound functions
import { loadStorage } from './storage.js';

// Tone player
export function playTone(freq, duration, gainVal, startDelay = 0) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = ctx.currentTime + startDelay;
    gain.gain.setValueAtTime(gainVal, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration);
  } catch (e) {
    console.warn('Audio unavailable:', e);
  }
}

// Countdown beep (light tick)
export function playCountdownBeep() {
  playTone(660, 0.12, 0.18);
}

// Double beep (exercise completion)
export function playDoubleBeep() {
  playTone(880, 0.18, 0.35);
  playTone(880, 0.18, 0.35, 0.28);
}