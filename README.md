# ⚓ Deck Fit

A browser-based workout app for bodyweight training in small spaces — built for life on a boat. No equipment, no props, no internet required after the first load.

---

## Features

### Exercise Library
- 100 built-in exercises across 6 categories: calisthenics, strength, core, abs, cardio, and flexibility
- Each exercise has a description, difficulty level, position, and a YouTube tutorial link
- **Sided exercises** (e.g. side plank, single-leg squat) are flagged and automatically run on both left and right sides during a session
- Add, edit, and delete exercises through a simple modal form
- Filter by category, search by name or description
- **AI fetch** — generate new exercises via the Anthropic API, preview them, and selectively add them to your library

### Training Mode
- Set session length, exercise duration, transition time, break frequency, and break duration
- Queue is randomised each session with position-change minimisation — going from floor to plank to standing and back is avoided where possible
- **Sided exercises** always run left side → quick switch transition → right side before moving on
- **Flexibility cool-down** — the last 10% of exercise slots are always drawn from the flexibility category
- **Countdown beeps** — a soft tick plays at 5, 4, 3, 2, 1 seconds remaining
- **Double beep** signals the end of each exercise
- Inline YouTube video plays automatically (muted) for each exercise
- "Up next" preview shows the following exercise name, side, category, and description
- Pause, skip, and end session at any time

---

## Testing

The project includes a Jest test suite covering the core logic and UI components. To run the tests locally:

```bash
# Install dependencies
npm install

# Run the test suite
npm test
```

The test suite includes:

- **Queue Builder Tests** (`tests/queue-builder.test.js`): Verifies flexibility exercises are included, break intervals are respected, and the queue ends correctly
- **Session State Tests** (`tests/session-state.test.js`): Validates session lifecycle, pause/resume functionality, and elapsed time tracking
- **UI Rendering Tests** (`tests/render-test.js`): Checks exercise display, countdown beeps, and control states
- **Controls Tests** (`tests/controls.test.js`): Tests skip and pause/resume functionality

## Continuous Integration

A GitHub Actions workflow ([`.github/workflows/tests.yml`](.github/workflows/tests.yml)) runs on every push to `main` and on pull requests. This ensures code changes don't break existing functionality.

---

## Getting Started

### Running locally

The app is plain HTML, CSS, and JavaScript — no build step required.

**Option 1 — Python (recommended for iPhone/Safari):**
```bash
cd deckfit
python3 -m http.server 8080
```
Then open `http://localhost:8080` in any browser.

**Option 2 — Double-click:**
Open `index.html` directly in Chrome or Firefox. Safari on iOS blocks local `<script src>` loads across files, so use the server option for iPhone.

**Option 3 — Any static file server:**
Serve the `deckfit/` folder with nginx, Caddy, a NAS web share, or any host — it's all static files.

### AI exercise fetch (optional)

The "Fetch with AI" button calls the Anthropic API to generate new exercises tailored to small-space, no-equipment training. To use it:

1. Get an API key at [console.anthropic.com](https://console.anthropic.com)
2. Paste the key into the field at the top of the app
3. The key is stored in your browser's `localStorage` — it is only ever sent to `api.anthropic.com`

---

## Project Structure

```
deckfit/
├── index.html          # HTML shell — markup only, no inline scripts or styles
├── css/
│   └── styles.css      # All styles: layout, components, dark mode, responsive
└── js/
    ├── data.js         # 100 default exercises + shared constants
    ├── storage.js      # localStorage read/write (exercises + API key)
    ├── utils.js        # Shared helpers: cap(), uid(), ytEmbed(), shuffle(), orderByPosition()
    ├── audio.js        # Web Audio API beeps (countdown tick + end-of-exercise double beep)
    ├── library.js      # Exercise list rendering, edit modal, AI fetch modal
    ├── training.js     # Session queue builder, timer loop, step rendering, playback controls
    └── app.js          # Global state (exercises[]), boot sequence, tab switching
```

Scripts are loaded in dependency order at the bottom of `index.html`. There is no bundler — each file is a plain script that adds functions to the global scope.

---

## Exercise Data Format

Each exercise in `data.js` (and in `localStorage`) has this shape:

```js
{
  id:          'e1',           // unique string ID
  name:        'Side plank',
  category:    'core',         // calisthenics | strength | core | abs | cardio | flexibility
  position:    'plank',        // standing | floor | plank | sitting
  difficulty:  'intermediate', // beginner | intermediate | advanced
  sided:       true,           // true → run left side then right side in sequence
  emoji:       '⬛',
  description: 'Lie on one side, prop up on forearm… Keep obliques engaged.',
  videoUrl:    'https://www.youtube.com/watch?v=…',
}
```

To add exercises permanently (for all new users), append entries to the `DEFAULT_EXERCISES` array in `data.js` and bump `STORAGE_KEY` in the same file to a new version string (e.g. `deckfit-exercises-v5`). This causes the app to reload the default library for anyone who hasn't stored data under that key yet.

Existing users' customised libraries are stored under the current `STORAGE_KEY` in `localStorage` and are not affected by version bumps.

---

## Customising the Training Flow

All queue-building logic lives in `buildQueue()` in `training.js`. The key rules are:

- **90% of slots** → shuffled working exercises (non-flexibility), position-ordered to minimise abrupt transitions
- **10% of slots** → random selection from the flexibility pool (cool-down)
- **Breaks** fire when the elapsed time since the last break exceeds the "break every N minutes" setting — never in the middle of a sided exercise pair
- **Sided exercises** insert an automatic half-length "switch sides" transition between left and right slots

---

## Data Persistence

All data lives in the browser's `localStorage` under two keys:

| Key | Contents |
|---|---|
| `deckfit-exercises-v4` | JSON array of all exercises |
| `deckfit-api-key` | Anthropic API key string |

No data is sent to any server. Clearing browser storage resets the exercise library to the 100 built-in defaults.

---

## Browser Compatibility

Tested on Chrome, Firefox, and Safari (desktop and iOS). Requires:

- ES2020+ (optional chaining `?.`, `Array.from`, template literals)
- Web Audio API (for beeps — silently skipped if unavailable)
- `localStorage`
- CSS custom properties and `aspect-ratio`

All modern browsers on devices from ~2019 onwards meet these requirements.

---

## Adding a New Feature — Quick Reference

| What you want to change | File to edit |
|---|---|
| Add / edit built-in exercises | `js/data.js` |
| Change how exercises are stored or loaded | `js/storage.js` |
| Modify timer, queue, break, or cool-down logic | `js/training.js` |
| Change the exercise list, search, or modals | `js/library.js` |
| Adjust beep tones or timing | `js/audio.js` |
| Rename a utility function | `js/utils.js` |
| Change colours, fonts, or layout | `css/styles.css` |
| Add a new page or major UI section | `index.html` + a new JS file |
