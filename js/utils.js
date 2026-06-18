// utils.js – Shared utility functions

// Capitalize first letter
export function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// Generate unique ID
export function uid() {
  return 'e' + Date.now() + Math.random().toString(36).slice(2, 6);
}

// Shuffle array (in place)
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Extract YouTube embed URL from watch URL
export function ytEmbed(url, autoplay = false) {
  if (!url) return '';
  const m = url.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/);
  if (!m) return url;
  const ap = autoplay ? '1&mute=1' : '0';
  return `https://www.youtube.com/embed/${m[1]}?autoplay=${ap}&rel=0&modestbranding=1`;
}