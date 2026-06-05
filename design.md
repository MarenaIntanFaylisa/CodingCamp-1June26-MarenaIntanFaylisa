# Design Document — Todo Life Dashboard

## Overview

The Todo Life Dashboard is a self-contained, single-page web application built with plain HTML, CSS, and Vanilla JavaScript. There is no build step, no server, no third-party runtime dependencies, and no network I/O. All persistent state lives in `localStorage`. The app can be opened directly via `file://`, served from any static HTTP server, or packaged as a Manifest V3 browser extension.

### Key Design Goals

- **Zero dependencies** — no npm, no bundler, no CDN scripts.
- **Predictable state** — all data mutations happen through pure helper functions that can be tested in isolation.
- **Graceful degradation** — corrupted `localStorage` data never crashes the app; each widget falls back to an empty initial state.
- **Responsive layout** — a single CSS file handles all breakpoints from 320 px (narrow phone) to 1920 px (wide desktop) without horizontal scroll.
- **Separation of concerns** — `index.html` provides structure, `css/style.css` owns all visual rules, `js/app.js` owns all behaviour.

---

## Architecture

### High-Level View

```
┌─────────────────────────────────────────────────────┐
│                    index.html                        │
│  ┌──────────────┐  ┌──────────────────────────────┐  │
│  │  <head>      │  │  <body>                       │  │
│  │  <link>      │  │  ┌────────┐  ┌─────────────┐ │  │
│  │  css/style.css│  │  │Greeting│  │Focus Timer  │ │  │
│  └──────────────┘  │  └────────┘  └─────────────┘ │  │
│                    │  ┌────────┐  ┌─────────────┐ │  │
│  <script>          │  │Todo    │  │Quick Links  │ │  │
│  js/app.js         │  │List    │  │             │ │  │
│  (deferred)        │  └────────┘  └─────────────┘ │  │
│                    └──────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                           │  reads/writes
                    ┌──────▼──────┐
                    │ localStorage │
                    │  tld_tasks   │
                    │  tld_links   │
                    └─────────────┘
```

### Execution Flow

1. Browser parses `index.html` and applies `css/style.css`.
2. `js/app.js` is loaded with `defer` so it runs after the DOM is ready.
3. `init()` is the single entry point: it calls each widget's `init` function in order.
4. Each widget's `init` reads from `localStorage`, populates its in-memory state, and renders its DOM section.
5. Event listeners are attached once during `init` — the app uses event delegation on container elements where possible.
6. All data mutations call a shared `saveState(key, data)` helper that serialises and writes to `localStorage` synchronously.

### Module Structure (single file)

`js/app.js` is organised into clearly separated sections using block comments. This is intentional — keeping one file avoids import/export complexity and stays compatible with `file://` protocol:

```
js/app.js
├── CONSTANTS
├── STORAGE HELPERS       (safeLoad, saveState)
├── GREETING WIDGET       (initGreeting, formatTime, formatDate, getGreeting)
├── FOCUS TIMER           (initTimer, createTimerState, tickTimer, formatTimer, ...)
├── TODO LIST             (initTodo, addTask, updateTask, toggleTask, deleteTask, renderTasks)
├── QUICK LINKS           (initLinks, addLink, deleteLink, validateLink, renderLinks)
└── BOOTSTRAP             (init → calls all widget inits)
```

---

## Components and Interfaces

### 1. Greeting Widget

**Purpose**: Show the current local time (HH:MM), full date string, and a time-of-day greeting. Updates automatically every minute.

**DOM anchor**: `#greeting`

**Public functions**:

| Function | Signature | Description |
|---|---|---|
| `initGreeting()` | `() → void` | Renders the widget and starts the one-minute interval. |
| `formatTime(date)` | `(Date) → string` | Returns `"HH:MM"` in 24-hour format, zero-padded. |
| `formatDate(date)` | `(Date) → string` | Returns `"Weekday, DD Month YYYY"`. |
| `getGreeting(hour)` | `(number) → string` | Returns the greeting string for an hour value 0–23. |
| `renderGreeting()` | `() → void` | Updates the DOM with the current time/date/greeting. |

**Internal state**: none (reads the system clock on every render call).

**Update cycle**: `setInterval(renderGreeting, 60_000)` started in `initGreeting`. The interval ticks every 60 s; the first render happens synchronously at load.

---

### 2. Focus Timer

**Purpose**: 25-minute Pomodoro countdown with Start / Stop / Reset controls and a completion notification.

**DOM anchor**: `#timer`

**State object** (`TimerState`):

```js
{
  minutes: number,   // 0–25
  seconds: number,   // 0–59
  running: boolean
}
```

**Public functions**:

| Function | Signature | Description |
|---|---|---|
| `initTimer()` | `() → void` | Sets up state, renders, attaches event listeners. |
| `createTimerState()` | `() → TimerState` | Returns `{ minutes: 25, seconds: 0, running: false }`. |
| `tickTimer(state)` | `(TimerState) → TimerState` | Returns a new state with one second deducted. Does not mutate. |
| `stopTimer(state)` | `(TimerState) → TimerState` | Returns state with `running: false`. Does not mutate. |
| `resetTimer()` | `() → TimerState` | Returns `createTimerState()`. |
| `formatTimer(m, s)` | `(number, number) → string` | Returns `"MM:SS"` zero-padded. |
| `getButtonState(state)` | `(TimerState) → {startDisabled, stopDisabled}` | Derives button enable/disable from state. |
| `renderTimer(state)` | `(TimerState) → void` | Updates DOM display and button states. |

**Internal state**: module-level `let timerState` and `let intervalId`.

**Tick loop**: `setInterval(onTick, 1000)` is created on Start; cleared on Stop and Reset.

**Completion signal**: When `tickTimer` produces `{ minutes: 0, seconds: 0, running: false }` (after the last decrement), `renderTimer` shows a notification banner (`#timer-notification`).

---

### 3. Todo List

**Purpose**: CRUD task management persisted to `localStorage`.

**DOM anchor**: `#todo`

**Task object**:

```js
{
  id: string,          // crypto.randomUUID() or Date.now().toString()
  title: string,       // trimmed, 1–255 chars
  completed: boolean
}
```

**Public functions**:

| Function | Signature | Description |
|---|---|---|
| `initTodo()` | `() → void` | Loads tasks from storage, renders, attaches listeners. |
| `addTask(tasks, title)` | `(Task[], string) → Task[] \| null` | Returns new array with task appended, or `null` if title is invalid. |
| `updateTask(tasks, id, title)` | `(Task[], string, string) → Task[] \| null` | Returns updated array, or `null` if title is invalid. |
| `toggleTask(tasks, id)` | `(Task[], string) → Task[]` | Returns array with matching task's `completed` flipped. |
| `deleteTask(tasks, id)` | `(Task[], string) → Task[]` | Returns array without the specified task. |
| `renderTasks(tasks)` | `(Task[]) → void` | Clears and repopulates the task list DOM. |
| `validateTaskTitle(title)` | `(string) → boolean` | Returns `true` if trimmed length is 1–255. |

**Internal state**: module-level `let tasks = []`.

**Edit mode**: Activating the edit button for a task replaces its `<li>` content with an `<input>` pre-filled with the title. Saving or pressing Enter commits the edit; pressing Escape cancels it.

---

### 4. Quick Links

**Purpose**: Saved URL shortcuts rendered as clickable buttons; opens in new tab.

**DOM anchor**: `#links`

**Link object**:

```js
{
  id: string,    // crypto.randomUUID() or Date.now().toString()
  label: string, // trimmed, non-empty
  url: string    // must start with http:// or https://
}
```

**Public functions**:

| Function | Signature | Description |
|---|---|---|
| `initLinks()` | `() → void` | Loads links from storage, renders, attaches listeners. |
| `addLink(links, label, url)` | `(Link[], string, string) → Link[] \| null` | Returns new array with link appended, or `null` if invalid. |
| `deleteLink(links, id)` | `(Link[], string) → Link[]` | Returns array without the specified link. |
| `validateLink(label, url)` | `(string, string) → boolean` | Returns `true` if label is non-empty (after trim) and URL starts with `http://` or `https://`. |
| `renderLinks(links)` | `(Link[]) → void` | Clears and repopulates the links DOM. |

**Internal state**: module-level `let links = []`.

**Storage-failure behaviour**: `saveState` is wrapped in a `try/catch`. If it throws, the in-memory array retains the mutation (add or delete) but the UI reflects the current in-memory state without rollback.

---

### 5. Storage Helpers

Shared utilities used by all widgets.

| Function | Signature | Description |
|---|---|---|
| `safeLoad(key)` | `(string) → any[]` | Reads `localStorage[key]`, parses JSON. Returns `[]` on missing key, null, or any parse error. Lets non-JSON errors propagate per Requirement 5.6. |
| `saveState(key, data)` | `(string, any) → void` | Calls `localStorage.setItem(key, JSON.stringify(data))`. Wrapped in `try/catch` by the caller (Quick Links) where needed. |

---

## Data Models

### localStorage Schema

| Key | Type | Example value |
|---|---|---|
| `tld_tasks` | `JSON string → Task[]` | `[{"id":"1","title":"Buy milk","completed":false}]` |
| `tld_links` | `JSON string → Link[]` | `[{"id":"2","label":"GitHub","url":"https://github.com"}]` |

### Task

```js
/**
 * @typedef {Object} Task
 * @property {string} id           - Unique identifier (UUID or timestamp string)
 * @property {string} title        - Task title, trimmed, max 255 chars
 * @property {boolean} completed   - Whether the task is done
 */
```

### Link

```js
/**
 * @typedef {Object} Link
 * @property {string} id     - Unique identifier
 * @property {string} label  - Display text for the button
 * @property {string} url    - Full URL beginning with http:// or https://
 */
```

### TimerState

```js
/**
 * @typedef {Object} TimerState
 * @property {number}  minutes  - Remaining minutes (0–25)
 * @property {number}  seconds  - Remaining seconds (0–59)
 * @property {boolean} running  - Whether the countdown is active
 */
```

> The timer state is **not** persisted to `localStorage`. If the user refreshes the page during a session, the timer resets to 25:00. This is an intentional design decision to keep the storage model simple and avoid stale timer states.

---

## UI Layout Approach

### Grid Strategy

The layout uses CSS Grid at the body level to place the four widgets:

```
┌─────────────────────────────────────┐
│         Greeting Widget             │  ← full width, top
├──────────────────┬──────────────────┤
│   Focus Timer    │   Quick Links    │  ← two-column row
├──────────────────┴──────────────────┤
│           Todo List                 │  ← full width, bottom
└─────────────────────────────────────┘
```

At **320 px**: single-column stack (all widgets full width, top-to-bottom in DOM order: Greeting → Timer → Todo → Links).

At **768 px**: two-column grid for the middle row (Timer + Links side by side).

At **1920 px**: two-column grid with max-width container (~1200 px) centred with `margin: 0 auto`.

### Responsive Breakpoints

```css
/* Mobile-first base: single column */
.dashboard { display: grid; grid-template-columns: 1fr; gap: 1rem; }

/* Tablet and above */
@media (min-width: 600px) {
  .dashboard {
    grid-template-columns: 1fr 1fr;
  }
  .greeting-widget,
  .todo-list { grid-column: 1 / -1; } /* span full width */
}

/* Wide desktop: constrain max width */
@media (min-width: 1280px) {
  body { max-width: 1200px; margin: 0 auto; }
}
```

### Typography

- Body base: `font-size: 16px` (≥ 14 px per Requirement 6.4).
- Widget headings: `font-size: 1.25rem` (≥ 20 px at default scale, ≥ 18 px per Requirement 6.4).
- Timer display: `font-size: 3rem` — large, readable at a glance.
- Colour contrast: foreground/background pairs will be chosen to meet WCAG 2.1 AA (≥ 4.5:1 for text < 18 px, ≥ 3:1 for text ≥ 18 px).

---

## State Management

### In-Memory + localStorage Sync

Each widget owns a module-level variable:

```js
let tasks = [];   // Todo List
let links = [];   // Quick Links
// timerState is local to the timer module section
```

The synchronisation contract is:

1. **On load**: `safeLoad(key)` reads from `localStorage` and populates the in-memory array.
2. **On every mutation**: the helper function returns a new array (immutable pattern), the widget updates its module variable, calls `renderX()` to update the DOM, then calls `saveState(key, newArray)` to persist.
3. **No two-way binding**: the DOM is never used as a source of truth. State flows **data → DOM** only.

```
User action
    │
    ▼
Pure helper fn (e.g., addTask)
    │ returns new array
    ▼
Update module variable
    │
    ├──► renderX()  →  DOM update
    │
    └──► saveState() → localStorage write
```

This one-way data flow makes the state easy to reason about and test.

---

## Error Handling

### Malformed JSON Recovery

`safeLoad(key)` follows this logic:

```js
function safeLoad(key) {
  const raw = localStorage.getItem(key);
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw);
    // Ensure we got an array; if not, treat as corrupted
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    // Malformed JSON: discard and start fresh (Requirement 5.5)
    return [];
  }
  // Any error thrown AFTER this point (e.g. in widget init) propagates
  // without further catch (Requirement 5.6)
}
```

### localStorage Write Failures

`saveState` can fail if storage quota is exceeded. The Quick Links widget wraps its `saveState` calls in `try/catch` per Requirements 4.3 and 4.7. The in-memory state is already updated before the write is attempted, so the UI remains consistent for the current session.

### Timer Edge Cases

- `tickTimer` is a guard-checked function: it only decrements if `totalSeconds > 0`.
- When the timer reaches 00:00 from a tick, the interval is cleared before the completion notification is shown, preventing a race condition.

### Input Validation

All user input is validated before state is mutated:

- Task titles and link labels: `title.trim().length >= 1 && title.trim().length <= 255`.
- Link URLs: `/^https?:\/\//.test(url.trim())`.
- Validation errors are shown as inline messages (e.g., `<span class="validation-error">`) adjacent to the relevant input field. Messages are cleared on the next successful submission (Requirement 3.3).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Time formatting is correct for all valid times

*For any* `Date` object, `formatTime(date)` shall return a 5-character string where the first two characters are the zero-padded 24-hour hours value and the last two characters are the zero-padded minutes value, separated by a colon.

**Validates: Requirements 1.1, 1.2**

---

### Property 2: Date formatting includes all required components

*For any* `Date` object, `formatDate(date)` shall return a string that contains the correct English weekday name, the zero-padded day of month, the correct English month name, and the 4-digit full year — in the format `"Weekday, DD Month YYYY"`.

**Validates: Requirements 1.3**

---

### Property 3: Greeting coverage — all 24 hours map to exactly one greeting

*For any* integer hour `h` in the range `[0, 23]`, `getGreeting(h)` shall return exactly one of `"Good Morning"`, `"Good Afternoon"`, `"Good Evening"`, or `"Good Night"` according to the following partition: `[5–11] → Morning`, `[12–17] → Afternoon`, `[18–21] → Evening`, `[22–23] ∪ [0–4] → Night`. No hour maps to more than one greeting.

**Validates: Requirements 1.4, 1.5, 1.6, 1.7**

---

### Property 4: Timer tick decrements by exactly one second

*For any* `TimerState` where the total remaining seconds (minutes × 60 + seconds) is greater than 0, `tickTimer(state)` shall return a new state where total remaining seconds equals the original total minus one, and `running` is unchanged.

**Validates: Requirements 2.2, 2.3**

---

### Property 5: Stop timer preserves time and clears running flag

*For any* `TimerState` (running or stopped), `stopTimer(state)` shall return a state where `minutes` and `seconds` are identical to the input, and `running` is `false`.

**Validates: Requirements 2.4**

---

### Property 6: Timer display is always a valid MM:SS string

*For any* integer `m` in `[0, 25]` and integer `s` in `[0, 59]`, `formatTimer(m, s)` shall return a 5-character string matching the pattern `^\d{2}:\d{2}$`.

**Validates: Requirements 2.8**

---

### Property 7: Adding a valid task grows the list and stores correct data

*For any* task array `tasks` and any string `title` where `title.trim().length` is in `[1, 255]`, `addTask(tasks, title)` shall return an array of length `tasks.length + 1` whose last element has `title === title.trim()`, `completed === false`, and a non-empty `id`.

**Validates: Requirements 3.2**

---

### Property 8: Whitespace-only titles are always rejected

*For any* string `title` composed entirely of whitespace characters (including the empty string), `validateTaskTitle(title)` shall return `false`, and calling `addTask(tasks, title)` on any task array shall leave the array unchanged.

**Validates: Requirements 3.3, 3.6**

---

### Property 9: Task completion toggle is its own inverse (round-trip)

*For any* task array `tasks` containing a task with id `id`, applying `toggleTask` twice — `toggleTask(toggleTask(tasks, id), id)` — shall produce an array whose task with `id` has the same `completed` value as in the original `tasks`.

**Validates: Requirements 3.7**

---

### Property 10: Deleting a task removes exactly one element by id

*For any* task array `tasks` and any `id` that exists in `tasks`, `deleteTask(tasks, id)` shall return an array of length `tasks.length - 1` that contains no task with the given `id`, and all other tasks are preserved unchanged.

**Validates: Requirements 3.8**

---

### Property 11: Storage round-trip preserves task data

*For any* array of valid `Task` objects, `safeLoad('tld_tasks')` called immediately after `saveState('tld_tasks', tasks)` shall return an array that is deep-equal to the original `tasks` array.

**Validates: Requirements 3.9, 5.1, 5.3, 5.4**

---

### Property 12: Malformed JSON always produces an empty array

*For any* string that is not valid JSON, `safeLoad` (given that string as its raw storage value) shall return `[]` without throwing.

**Validates: Requirements 5.5**

---

### Property 13: Link validation rejects all invalid inputs

*For any* pair `(label, url)` where `label.trim()` is empty OR `url.trim()` does not start with `http://` or `https://`, `validateLink(label, url)` shall return `false`. Conversely, *for any* non-whitespace `label` and URL beginning with `http://` or `https://`, `validateLink` shall return `true`.

**Validates: Requirements 4.4**

---

### Property 14: Adding a valid link grows the list

*For any* links array `links`, non-empty label, and valid URL, `addLink(links, label, url)` shall return an array of length `links.length + 1` whose new element has the trimmed label and the given URL.

**Validates: Requirements 4.2**

---

### Property 15: Deleting a link removes exactly one element by id

*For any* links array `links` and any `id` that exists in `links`, `deleteLink(links, id)` shall return an array of length `links.length - 1` containing no link with the given `id`, and all other links are preserved unchanged.

**Validates: Requirements 4.6**

---

### Reflection: Redundancy Analysis

After reviewing all 15 properties:

- Properties 7 and 10 are analogous for tasks; Properties 14 and 15 are analogous for links. They target different functions so they are not redundant.
- Properties 8 covers both task creation and task update rejection (Requirements 3.3 and 3.6) — this consolidates what would otherwise be two separate properties.
- Properties 11 (storage round-trip) subsumes what would be separate serialise and deserialise properties — a single round-trip property is sufficient.
- Property 3 (greeting coverage) covers all four greeting requirements (1.4–1.7) in a single exhaustive partition property — more powerful than four separate range-check properties.
- Property 4 (timer tick) and Property 5 (stop timer) are kept separate because they test different functions with different contracts.

No further consolidation is necessary. All 15 properties provide unique validation value.

---

## Testing Strategy

### Dual Testing Approach

Unit tests and property tests are complementary:

- **Unit / example tests** cover specific scenarios: initial state, edge case at exactly 00:00, the UI clearing after a task is added, the completion notification appearing.
- **Property tests** verify universal correctness across the entire input space: all possible hour values, all valid dates, all valid/invalid title strings, all timer state combinations.

### Property-Based Testing Library

For Vanilla JS with no build tools, the recommended library is **[fast-check](https://fast-check.dev/)**, loaded from a CDN in the test HTML file only (not in the app itself). Alternatively, **[jsverify](https://github.com/jsverify/jsverify)** can be used as a single-file include.

Each property test is configured for **a minimum of 100 iterations**.

Each test is tagged with a comment:

```js
// Feature: todo-life-dashboard, Property 3: Greeting coverage — all 24 hours map to exactly one greeting
```

### Unit Test Targets (example-based)

| Scenario | Widget |
|---|---|
| `createTimerState()` returns `{minutes:25, seconds:0, running:false}` | Timer |
| `resetTimer()` returns the same as `createTimerState()` | Timer |
| Notification shown when last tick produces 00:00 | Timer |
| No notification shown after stop/reset | Timer |
| Edit mode pre-fills input with existing title | Todo |
| Pressing Escape during edit cancels without mutation | Todo |
| `window.open` called with correct URL and `'_blank'` on link click | Links |
| localStorage failure on add/delete does not crash the widget | Links |
| Correct storage keys `tld_tasks` and `tld_links` are used | Storage |

### Property Test Targets (linked to design properties)

| Property | Function under test | Generator |
|---|---|---|
| P1: Time formatting | `formatTime` | Arbitrary `Date` (random epoch ms in valid range) |
| P2: Date formatting | `formatDate` | Arbitrary `Date` |
| P3: Greeting coverage | `getGreeting` | Integer in [0, 23] |
| P4: Timer tick | `tickTimer` | TimerState with totalSeconds > 0 |
| P5: Stop preserves time | `stopTimer` | Any TimerState |
| P6: Timer display format | `formatTimer` | m in [0,25], s in [0,59] |
| P7: Add task grows list | `addTask` | tasks array + valid title string |
| P8: Whitespace rejected | `validateTaskTitle`, `addTask` | Whitespace-only strings |
| P9: Toggle round-trip | `toggleTask` | tasks array + valid id |
| P10: Delete task removes one | `deleteTask` | tasks array + existing id |
| P11: Storage round-trip | `saveState` + `safeLoad` | Valid Task[] |
| P12: Malformed JSON → `[]` | `safeLoad` | Arbitrary non-JSON strings |
| P13: Link validation | `validateLink` | Pairs of (label, url) — valid and invalid |
| P14: Add link grows list | `addLink` | links array + valid label/url |
| P15: Delete link removes one | `deleteLink` | links array + existing id |

### Browser Compatibility Notes

- All JavaScript is written to the **ES2019** baseline — no optional chaining, no nullish coalescing — to maximise compatibility with Safari 12+, Chrome 70+, Firefox 65+, and Edge 79+ without transpilation.
- `crypto.randomUUID()` is available in all modern browsers (Chrome 92+, Firefox 95+, Safari 15.4+). A fallback using `Date.now().toString(36) + Math.random().toString(36).slice(2)` should be provided for environments that do not support it (e.g., `file://` in older Chromium).
- `localStorage` is available in all target browsers, including `file://` in Chrome and Edge (Firefox blocks `localStorage` on `file://` by default — a note should be added to the README).
- No `import`/`export` syntax is used in `app.js` to maintain `file://` compatibility without a module server.
- **Manifest V3 packaging**: If packaged as a browser extension, `index.html` becomes the `default_popup` or a `chrome_url_overrides.newtab` page. The `manifest.json` must declare `storage` permission only if `chrome.storage` is used — since this design uses `localStorage` directly, no extra permissions are needed. Content Security Policy in MV3 restricts inline scripts, which is already satisfied since all JS is in `app.js`.

---

## File Structure

```
project-root/
├── index.html          # Single page — all four widgets in one file
├── css/
│   └── style.css       # All styles — no inline styles, no additional sheets
├── js/
│   └── app.js          # All behaviour — no inline scripts, no additional files
└── manifest.json       # (Optional) Manifest V3 for browser extension packaging
```

### index.html Skeleton

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Todo Life Dashboard</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <main class="dashboard">

    <!-- Greeting Widget -->
    <section id="greeting" class="greeting-widget">
      <p id="greeting-message" aria-live="polite"></p>
      <p id="greeting-time" aria-live="polite"></p>
      <p id="greeting-date"></p>
    </section>

    <!-- Focus Timer -->
    <section id="timer" class="focus-timer">
      <h2>Focus Timer</h2>
      <p id="timer-display" aria-live="polite">25:00</p>
      <div class="timer-controls">
        <button id="timer-start">Start</button>
        <button id="timer-stop" disabled>Stop</button>
        <button id="timer-reset">Reset</button>
      </div>
      <div id="timer-notification" role="alert" hidden></div>
    </section>

    <!-- Todo List -->
    <section id="todo" class="todo-list">
      <h2>Tasks</h2>
      <form id="todo-form">
        <input id="todo-input" type="text" placeholder="Add a task…" maxlength="255">
        <button type="submit">Add</button>
        <span id="todo-validation" class="validation-error" role="alert"></span>
      </form>
      <ul id="todo-items"></ul>
    </section>

    <!-- Quick Links -->
    <section id="links" class="quick-links">
      <h2>Quick Links</h2>
      <form id="links-form">
        <input id="links-label" type="text" placeholder="Label">
        <input id="links-url" type="text" placeholder="https://…">
        <button type="submit">Add</button>
        <span id="links-validation" class="validation-error" role="alert"></span>
      </form>
      <div id="links-items"></div>
    </section>

  </main>
  <script src="js/app.js" defer></script>
</body>
</html>
```
