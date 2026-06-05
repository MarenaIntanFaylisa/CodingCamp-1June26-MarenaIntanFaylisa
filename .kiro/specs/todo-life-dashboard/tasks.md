# Implementation Plan: Todo Life Dashboard

## Overview

Build a zero-dependency, single-page productivity dashboard in plain HTML, CSS, and Vanilla JavaScript. The app is structured across three files (`index.html`, `css/style.css`, `js/app.js`) with all data persisted to `localStorage` under the keys `tld_tasks` and `tld_links`. Implementation proceeds in layers: HTML skeleton → CSS layout → shared storage helpers → each widget in isolation → integration wiring → final validation.

---

## Tasks

- [x] 1. Create project file structure and HTML skeleton
  - Create `index.html` with DOCTYPE, `<meta charset>`, viewport meta, `<link>` to `css/style.css`, and `<script defer>` pointing to `js/app.js`
  - Add `<main class="dashboard">` with four `<section>` elements: `#greeting`, `#timer`, `#todo`, `#links` — each containing the element IDs and ARIA attributes specified in the design (`aria-live`, `role="alert"`, `hidden`)
  - Create empty `css/style.css` and empty `js/app.js` placeholder files
  - Create `manifest.json` stub with Manifest V3 fields (`manifest_version: 3`, `name`, `version`, `action.default_popup`)
  - _Requirements: 6.1, 6.2, 6.3, 7.2, 7.3, 7.4_

- [x] 2. Implement CSS layout and visual design
  - [x] 2.1 Implement responsive grid layout
    - Write mobile-first single-column `.dashboard` CSS Grid rule
    - Add `@media (min-width: 600px)` two-column rule with `.greeting-widget` and `.todo-list` spanning full width via `grid-column: 1 / -1`
    - Add `@media (min-width: 1280px)` rule constraining `body` to `max-width: 1200px; margin: 0 auto`
    - _Requirements: 6.5, 6.6_
  - [x] 2.2 Apply typography and colour rules
    - Set `body { font-size: 16px }` and widget `h2 { font-size: 1.25rem }`; set `#timer-display { font-size: 3rem }`
    - Choose and apply foreground/background colour pairs meeting WCAG 2.1 AA contrast ratios (≥ 4.5:1 for text < 18 px; ≥ 3:1 for text ≥ 18 px)
    - Add `.validation-error` style (e.g., red colour, small font) and `[hidden]` utility rule
    - Add strikethrough style for completed tasks: `.task-completed { text-decoration: line-through }`
    - _Requirements: 6.4, 6.7_

- [x] 3. Implement shared storage helpers in `js/app.js`
  - [x] 3.1 Implement `safeLoad` and `saveState`
    - Write the `CONSTANTS` block defining `STORAGE_KEYS = { tasks: 'tld_tasks', links: 'tld_links' }`
    - Implement `safeLoad(key)`: reads `localStorage.getItem(key)`, returns `[]` if `null`; wraps `JSON.parse` in `try/catch` — returns `[]` on error, returns parsed array if `Array.isArray`, otherwise `[]`
    - Implement `saveState(key, data)`: calls `localStorage.setItem(key, JSON.stringify(data))`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  - [ ]* 3.2 Write property test for `safeLoad` — malformed JSON (Property 12)
    - **Property 12: Malformed JSON always produces an empty array**
    - **Validates: Requirements 5.5**
    - Use `fast-check` loaded from CDN in a test HTML file; generate arbitrary non-JSON strings and assert `safeLoad` returns `[]` without throwing
  - [ ]* 3.3 Write property test for storage round-trip (Property 11)
    - **Property 11: Storage round-trip preserves task data**
    - **Validates: Requirements 3.9, 5.1, 5.3, 5.4**
    - Generate arbitrary valid `Task[]` arrays; call `saveState('tld_tasks', tasks)` then `safeLoad('tld_tasks')` and assert deep equality

- [x] 4. Implement Greeting Widget
  - [x] 4.1 Implement `formatTime`, `formatDate`, and `getGreeting`
    - Implement `formatTime(date)`: extract `date.getHours()` and `date.getMinutes()`, zero-pad each to 2 digits, return `"HH:MM"`
    - Implement `formatDate(date)`: build string `"Weekday, DD Month YYYY"` using arrays of English weekday and month names
    - Implement `getGreeting(hour)`: return `"Good Morning"` for `[5–11]`, `"Good Afternoon"` for `[12–17]`, `"Good Evening"` for `[18–21]`, `"Good Night"` for `[22–23] ∪ [0–4]`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  - [ ]* 4.2 Write property test for `formatTime` (Property 1)
    - **Property 1: Time formatting is correct for all valid times**
    - **Validates: Requirements 1.1, 1.2**
    - Generate arbitrary `Date` objects (random epoch ms); assert result is a 5-char string matching `^\d{2}:\d{2}$` with correct hour and minute values
  - [ ]* 4.3 Write property test for `formatDate` (Property 2)
    - **Property 2: Date formatting includes all required components**
    - **Validates: Requirements 1.3**
    - Generate arbitrary `Date` objects; assert result contains correct weekday name, zero-padded day, month name, and 4-digit year
  - [ ]* 4.4 Write property test for `getGreeting` (Property 3)
    - **Property 3: Greeting coverage — all 24 hours map to exactly one greeting**
    - **Validates: Requirements 1.4, 1.5, 1.6, 1.7**
    - Generate integers in `[0, 23]`; assert each returns exactly one of the four valid greeting strings per the defined partition
  - [x] 4.5 Implement `renderGreeting` and `initGreeting`
    - Implement `renderGreeting()`: create a `new Date()`, set `#greeting-message` textContent to `getGreeting(hour)`, `#greeting-time` to `formatTime(date)`, `#greeting-date` to `formatDate(date)`
    - Implement `initGreeting()`: call `renderGreeting()` synchronously, then call `setInterval(renderGreeting, 60_000)`
    - _Requirements: 1.1, 1.2, 1.3, 1.8_

- [x] 5. Implement Focus Timer
  - [x] 5.1 Implement timer state functions
    - Implement `createTimerState()`: return `{ minutes: 25, seconds: 0, running: false }`
    - Implement `tickTimer(state)`: guard — if `(state.minutes * 60 + state.seconds) === 0` return state unchanged; otherwise compute new total = total − 1, return `{ minutes: Math.floor(newTotal/60), seconds: newTotal % 60, running: state.running }`
    - Implement `stopTimer(state)`: return `{ minutes: state.minutes, seconds: state.seconds, running: false }`
    - Implement `resetTimer()`: return `createTimerState()`
    - Implement `formatTimer(m, s)`: return zero-padded `"MM:SS"` string
    - Implement `getButtonState(state)`: return `{ startDisabled: state.running, stopDisabled: !state.running }`
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 2.8_
  - [ ]* 5.2 Write property test for `tickTimer` (Property 4)
    - **Property 4: Timer tick decrements by exactly one second**
    - **Validates: Requirements 2.2, 2.3**
    - Generate `TimerState` where `minutes * 60 + seconds > 0`; assert `tickTimer` result has total seconds equal to original − 1 and `running` unchanged
  - [ ]* 5.3 Write property test for `stopTimer` (Property 5)
    - **Property 5: Stop timer preserves time and clears running flag**
    - **Validates: Requirements 2.4**
    - Generate arbitrary `TimerState`; assert `stopTimer` result has same `minutes`/`seconds` and `running === false`
  - [ ]* 5.4 Write property test for `formatTimer` (Property 6)
    - **Property 6: Timer display is always a valid MM:SS string**
    - **Validates: Requirements 2.8**
    - Generate `m` in `[0, 25]` and `s` in `[0, 59]`; assert result is a 5-char string matching `^\d{2}:\d{2}$`
  - [x] 5.5 Implement `renderTimer` and `initTimer`
    - Implement `renderTimer(state)`: set `#timer-display` textContent to `formatTimer(state.minutes, state.seconds)`; apply `getButtonState` to set `disabled` on `#timer-start` and `#timer-stop`; show/hide `#timer-notification` based on whether `minutes === 0 && seconds === 0 && !state.running`
    - Implement `initTimer()`: initialise module-level `timerState = createTimerState()` and `intervalId = null`; render; attach click listeners to Start (set `running: true`, start `setInterval(onTick, 1000)`), Stop (`stopTimer`, clear interval), Reset (`resetTimer`, clear interval, hide notification); in `onTick`: compute `newState = tickTimer(timerState)`, check if reached 00:00, clear interval if so, update `timerState`, call `renderTimer`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

- [ ] 6. Checkpoint — Greeting and Timer
  - Ensure `initGreeting` and `initTimer` work correctly when `init()` calls them; verify time displays, greeting updates, timer counts down, stop/reset work, and completion notification appears. Ask the user if questions arise.

- [ ] 7. Implement To-Do List
  - [x] 7.1 Implement task helper functions
    - Implement `validateTaskTitle(title)`: return `title.trim().length >= 1 && title.trim().length <= 255`
    - Implement `addTask(tasks, title)`: return `null` if `!validateTaskTitle(title)`; otherwise append `{ id: generateId(), title: title.trim(), completed: false }` and return new array
    - Implement `updateTask(tasks, id, title)`: return `null` if `!validateTaskTitle(title)`; otherwise return array with matching task's `title` replaced by `title.trim()`
    - Implement `toggleTask(tasks, id)`: return array with matching task's `completed` flipped
    - Implement `deleteTask(tasks, id)`: return array filtered to exclude the task with the given `id`
    - Implement `generateId()`: use `crypto.randomUUID()` with fallback to `Date.now().toString(36) + Math.random().toString(36).slice(2)`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_
  - [ ]* 7.2 Write property test for `addTask` (Property 7)
    - **Property 7: Adding a valid task grows the list and stores correct data**
    - **Validates: Requirements 3.2**
    - Generate task arrays + valid title strings; assert result length is `tasks.length + 1`, last element has trimmed title, `completed === false`, and non-empty `id`
  - [ ]* 7.3 Write property test for `validateTaskTitle` / `addTask` with whitespace (Property 8)
    - **Property 8: Whitespace-only titles are always rejected**
    - **Validates: Requirements 3.3, 3.6**
    - Generate whitespace-only strings (spaces, tabs, newlines); assert `validateTaskTitle` returns `false` and `addTask` returns `null`
  - [ ]* 7.4 Write property test for `toggleTask` round-trip (Property 9)
    - **Property 9: Task completion toggle is its own inverse**
    - **Validates: Requirements 3.7**
    - Generate task arrays with at least one task; assert `toggleTask(toggleTask(tasks, id), id)` produces identical `completed` value as original
  - [ ]* 7.5 Write property test for `deleteTask` (Property 10)
    - **Property 10: Deleting a task removes exactly one element by id**
    - **Validates: Requirements 3.8**
    - Generate task arrays + existing id; assert result length is `tasks.length - 1` with no element matching `id` and all others preserved
  - [ ] 7.6 Implement `renderTasks` and `initTodo`
    - Implement `renderTasks(tasks)`: clear `#todo-items`; for each task append an `<li>` with: task title span (with `.task-completed` class when `completed`), Edit button, Delete button, and Complete (toggle) button; in edit mode replace `<li>` content with a pre-filled `<input>` plus Save/Cancel; pressing Enter saves, Escape cancels
    - Implement `initTodo()`: `tasks = safeLoad(STORAGE_KEYS.tasks)`; call `renderTasks`; attach submit listener on `#todo-form` — validate input, call `addTask`, on `null` show `#todo-validation` message, on success update `tasks`, clear validation, call `renderTasks`, call `saveState`; wire edit/toggle/delete via event delegation on `#todo-items`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [ ] 8. Implement Quick Links
  - [x] 8.1 Implement link helper functions
    - Implement `validateLink(label, url)`: return `label.trim().length >= 1 && /^https?:\/\//.test(url.trim())`
    - Implement `addLink(links, label, url)`: return `null` if `!validateLink(label, url)`; otherwise append `{ id: generateId(), label: label.trim(), url: url.trim() }` and return new array
    - Implement `deleteLink(links, id)`: return array filtered to exclude the link with the given `id`
    - _Requirements: 4.2, 4.4, 4.6_
  - [ ]* 8.2 Write property test for `validateLink` (Property 13)
    - **Property 13: Link validation rejects all invalid inputs**
    - **Validates: Requirements 4.4**
    - Generate pairs where label is empty/whitespace OR url does not start with `http://`/`https://`; assert `validateLink` returns `false`. Also generate valid pairs; assert returns `true`
  - [ ]* 8.3 Write property test for `addLink` (Property 14)
    - **Property 14: Adding a valid link grows the list**
    - **Validates: Requirements 4.2**
    - Generate links arrays + valid (label, url); assert result length is `links.length + 1` with trimmed label and given url in last element
  - [ ]* 8.4 Write property test for `deleteLink` (Property 15)
    - **Property 15: Deleting a link removes exactly one element by id**
    - **Validates: Requirements 4.6**
    - Generate links arrays + existing id; assert result length is `links.length - 1` with no element matching `id` and all others preserved
  - [ ] 8.5 Implement `renderLinks` and `initLinks`
    - Implement `renderLinks(links)`: clear `#links-items`; for each link append a `<button>` with link label that calls `window.open(link.url, '_blank')` on click, and a Delete button beside it
    - Implement `initLinks()`: `links = safeLoad(STORAGE_KEYS.links)`; call `renderLinks`; attach submit listener on `#links-form` — validate label/url, on invalid show `#links-validation`, on valid call `addLink`, update `links`, call `renderLinks`, wrap `saveState` in `try/catch`; wire delete via event delegation — call `deleteLink`, update `links`, call `renderLinks`, wrap `saveState` in `try/catch`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

- [ ] 9. Checkpoint — Todo List and Quick Links
  - Ensure `initTodo` and `initLinks` work end-to-end: add/edit/toggle/delete tasks persist to `localStorage`; add/delete links persist; validation messages appear and clear correctly; localStorage failures on links do not crash the widget. Ask the user if questions arise.

- [ ] 10. Wire everything together in `init` and verify browser compatibility
  - [ ] 10.1 Implement the `init` bootstrap function
    - Write the `BOOTSTRAP` section at the bottom of `js/app.js`: `function init() { initGreeting(); initTimer(); initTodo(); initLinks(); }`
    - Attach `document.addEventListener('DOMContentLoaded', init)` (or rely on `defer` attribute — confirm `defer` is set on the `<script>` tag in `index.html`)
    - _Requirements: 6.1, 6.3_
  - [ ] 10.2 Verify responsive layout at required breakpoints
    - Open `index.html` in a browser and use DevTools to confirm all four widgets render without horizontal scroll or clipping at 320 px, 768 px, and 1920 px viewport widths
    - Confirm Greeting, Timer, Todo, and Links are all visible and operable at each breakpoint
    - _Requirements: 6.5, 6.6_
  - [ ]* 10.3 Write unit tests for timer edge cases and notification behaviour
    - Test `createTimerState()` returns `{ minutes: 25, seconds: 0, running: false }`
    - Test `resetTimer()` returns the same shape as `createTimerState()`
    - Test that the completion notification (`#timer-notification`) becomes visible when the last `onTick` reaches 00:00, and stays hidden after Stop/Reset
    - _Requirements: 2.1, 2.5, 2.6, 2.7_
  - [ ]* 10.4 Write unit tests for edit-mode and storage-failure scenarios
    - Test that activating edit on a task pre-fills the `<input>` with the existing title
    - Test that pressing Escape during edit cancels without mutating `tasks`
    - Test that `window.open` is called with the correct URL and `'_blank'` on a link button click
    - Test that a `localStorage.setItem` failure on Quick Links does not throw an uncaught error and leaves in-memory `links` updated
    - _Requirements: 3.4, 3.5, 4.3, 4.5, 4.7_

- [ ] 11. Final checkpoint — full integration and cross-browser check
  - Ensure all automated tests pass. Verify the app opens correctly via `file://` in Chrome and Edge. Confirm `manifest.json` loads without browser-reported extension errors when sideloaded. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP delivery
- Each task references specific requirements for full traceability
- Property tests use `fast-check` loaded from CDN in a separate test HTML file — it is never included in `app.js` or `index.html`
- Each property test must be tagged with a comment: `// Feature: todo-life-dashboard, Property N: <name>`
- Each property test is configured for a minimum of 100 iterations
- Unit tests and property tests are complementary: unit tests cover specific scenarios, property tests verify universal correctness
- `crypto.randomUUID()` requires a fallback for `file://` on older Chromium — implement in `generateId()`
- Firefox blocks `localStorage` on `file://` by default; add a note to `README.md`
- All JavaScript targets the ES2019 baseline — no optional chaining, no nullish coalescing

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "3.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "4.1", "5.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4", "4.5", "5.2", "5.3", "5.4", "7.1", "8.1"] },
    { "id": 4, "tasks": ["5.5", "7.2", "7.3", "7.4", "7.5", "8.2", "8.3", "8.4"] },
    { "id": 5, "tasks": ["7.6", "8.5"] },
    { "id": 6, "tasks": ["10.1", "10.3", "10.4"] },
    { "id": 7, "tasks": ["10.2"] }
  ]
}
```
