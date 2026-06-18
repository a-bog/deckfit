// ── String helpers ────────────────────────────────────────────────────────────

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function uid() {
  return 'e' + Date.now() + Math.random().toString(36).slice(2, 6);
}

// ── YouTube embed URL ─────────────────────────────────────────────────────────

function ytEmbed(url, autoplay) {
  if (!url) return '';
  const m = url.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/);
  if (!m) return url;
  const ap = autoplay ? '1&mute=1' : '0';
  return 'https://www.youtube.com/embed/' + m[1] + '?autoplay=' + ap + '&rel=0&modestbranding=1';
}

// ── Array helpers ─────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Order a pool minimising back-to-back same-position changes
function orderByPosition(pool) {
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
