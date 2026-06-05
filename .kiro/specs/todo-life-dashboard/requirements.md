# Requirements Document

## Introduction

The Todo List Life Dashboard is a client-side web application that provides a personal productivity hub in a single-page interface. It combines a contextual greeting with the current time and date, a Focus Timer based on the Pomodoro technique, a persistent to-do list, and a customizable Quick Links panel. All data is stored in the browser's Local Storage — no backend or server is required. The app can be used as a standalone web page or packaged as a browser extension.

The interface follows a clean, minimal visual design with clear hierarchy and readable typography. The entire application is implemented using HTML, CSS, and Vanilla JavaScript only, with all code split into a single CSS file and a single JavaScript file.

---

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Greeting_Widget**: The UI section that displays the current time, date, and a time-based greeting message.
- **Focus_Timer**: The UI section that implements a 25-minute countdown timer.
- **Todo_List**: The UI section that manages the user's personal task list.
- **Quick_Links**: The UI section that displays user-defined shortcut buttons to external URLs.
- **Task**: A single to-do item that has a title, a completion status, and a persistent identifier.
- **Link**: A Quick Links entry composed of a display label and a URL.
- **Storage**: The browser's `localStorage` API used to persist all application data.
- **Session**: The period of time during which a Focus_Timer countdown is actively running.

---

## Requirements

### Requirement 1: Greeting Widget

**User Story:** As a user, I want to see the current time, date, and a greeting tailored to the time of day, so that the dashboard feels personal and contextually relevant each time I open it.

#### Acceptance Criteria

1. WHEN the Dashboard is loaded, THE Greeting_Widget SHALL immediately display the current local time in HH:MM (24-hour) format.
2. WHEN a new minute boundary is crossed, THE Greeting_Widget SHALL update the displayed time to reflect the new current local time in HH:MM format.
3. WHEN the Dashboard is loaded, THE Greeting_Widget SHALL display the current local date in the format "Weekday, DD Month YYYY" (e.g., "Monday, 26 June 2026").
4. WHEN the local hour is between 05 and 11 (inclusive), THE Greeting_Widget SHALL display the message "Good Morning" and no other greeting.
5. WHEN the local hour is between 12 and 17 (inclusive), THE Greeting_Widget SHALL display the message "Good Afternoon" and no other greeting.
6. WHEN the local hour is between 18 and 21 (inclusive), THE Greeting_Widget SHALL display the message "Good Evening" and no other greeting.
7. WHEN the local hour is between 22 and 23 or between 00 and 04 (inclusive), THE Greeting_Widget SHALL display the message "Good Night" and no other greeting.
8. THE Greeting_Widget SHALL render the time, date, and greeting without requiring any user interaction or page reload.

---

### Requirement 2: Focus Timer

**User Story:** As a user, I want a 25-minute countdown timer with start, stop, and reset controls, so that I can work in focused intervals without needing a separate application.

#### Acceptance Criteria

1. THE Focus_Timer SHALL initialise with a countdown value of 25 minutes and 00 seconds (25:00).
2. WHEN the user activates the start control, THE Focus_Timer SHALL begin counting down from the current displayed value at one-second intervals.
3. WHILE a Session is active, THE Focus_Timer SHALL update the displayed time every second.
4. WHEN the user activates the stop control, THE Focus_Timer SHALL pause the countdown and retain the current remaining time.
5. WHEN the user activates the reset control, THE Focus_Timer SHALL stop any active countdown and restore the display to 25:00.
6. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically and display a visible notification (e.g., a banner or modal) to alert the user that the session is complete.
7. IF the user activates the stop control or the reset control, THEN THE Focus_Timer SHALL NOT display any notification.
8. THE Focus_Timer SHALL display the remaining time in MM:SS format at all times.
9. WHILE a Session is active, THE Focus_Timer SHALL disable the start control and enable the stop control.
10. WHILE no Session is active, THE Focus_Timer SHALL enable the start control and disable the stop control.

---

### Requirement 3: To-Do List

**User Story:** As a user, I want to manage a persistent list of tasks — adding, editing, completing, and deleting them — so that I can track what needs to be done and keep my progress across browser sessions.

#### Acceptance Criteria

1. THE Todo_List SHALL display all Tasks currently saved in Storage in the order they were created.
2. WHEN the user submits a non-empty task title of up to 255 characters, THE Todo_List SHALL add a new Task with a unique identifier, the trimmed title, and a completion status of false, then persist it to Storage.
3. IF the user submits an empty or whitespace-only task title, THEN THE Todo_List SHALL reject the submission and display an inline validation message; the validation message SHALL be cleared on the next successful task submission.
4. WHEN the user activates the edit control for a Task, THE Todo_List SHALL present the Task title in an editable field pre-filled with the current title.
5. WHEN the user saves an edited Task with a non-empty title, THE Todo_List SHALL update the Task title in the list and persist the change to Storage.
6. IF the user saves an edited Task with an empty or whitespace-only title, THEN THE Todo_List SHALL reject the save, retain the previous title, and display an inline validation message.
7. WHEN the user activates the complete control for a Task, THE Todo_List SHALL toggle the Task's completion status; completed Tasks SHALL be displayed with a strikethrough style, and the change SHALL be persisted to Storage.
8. WHEN the user activates the delete control for a Task, THE Todo_List SHALL remove the Task from the list and from Storage; automatic or programmatic deletion without explicit user action SHALL NOT occur.
9. WHEN the Dashboard is loaded, THE Todo_List SHALL retrieve and render all Tasks from Storage.
10. THE Todo_List SHALL persist all Task data exclusively using Storage, with no network requests.

---

### Requirement 4: Quick Links

**User Story:** As a user, I want to save and access buttons that open my favourite websites, so that I can reach them quickly from the dashboard without manually typing URLs.

#### Acceptance Criteria

1. THE Quick_Links SHALL display all Links currently saved in Storage as clickable buttons.
2. WHEN the user submits a new Link with both a non-empty, non-whitespace label and a URL beginning with `http://` or `https://`, THE Quick_Links SHALL add the Link to the panel and persist it to Storage.
3. IF the Storage write fails when adding a Link, THEN THE Quick_Links SHALL retain the Link in the panel for the current session without rolling back the UI update.
4. IF the user submits a new Link with an empty or whitespace-only label, an empty or whitespace-only URL, or a URL that does not begin with `http://` or `https://`, THEN THE Quick_Links SHALL reject the submission and display an inline validation message.
5. WHEN the user activates a Link button, THE Quick_Links SHALL open the corresponding URL in a new browser tab.
6. WHEN the user activates the delete control for a Link, THE Quick_Links SHALL remove the Link from the panel and from Storage.
7. IF the Storage write fails when deleting a Link, THEN THE Quick_Links SHALL retain the removal in the panel for the current session without re-adding the Link to the UI.
8. WHEN the Dashboard is loaded, THE Quick_Links SHALL retrieve and render all Links from Storage.
9. THE Quick_Links SHALL persist all Link data exclusively using Storage, with no network requests.

---

### Requirement 5: Data Persistence and Storage

**User Story:** As a user, I want all my tasks and quick links to survive browser refreshes and tab closures, so that I never lose my data unexpectedly.

#### Acceptance Criteria

1. THE Storage SHALL persist Task data under the dedicated key `tld_tasks`.
2. THE Storage SHALL persist Link data under the dedicated key `tld_links`.
3. WHEN data is written to Storage, THE Dashboard SHALL serialise it as valid JSON using `JSON.stringify`.
4. WHEN data is read from Storage, THE Dashboard SHALL deserialise the JSON using `JSON.parse` and restore the full application state for the corresponding widget.
5. IF Storage contains malformed or unparseable JSON for `tld_tasks` or `tld_links`, THEN THE Dashboard SHALL catch the parse error, discard the corrupted entry, and initialise the corresponding widget with an empty array.
6. IF the discard or empty-state initialisation itself throws an unhandled error, THEN THE Dashboard SHALL allow that error to propagate without further recovery attempts.
7. THE Dashboard SHALL perform all Storage reads synchronously on initial page load and all Storage writes synchronously and immediately after any data mutation (add, edit, delete, toggle).

---

### Requirement 6: Layout and Visual Design

**User Story:** As a user, I want a clean, minimal interface with a clear visual hierarchy, so that the dashboard is easy to scan and use at a glance.

#### Acceptance Criteria

1. WHEN the Dashboard is loaded, THE Dashboard SHALL render all four widgets — Greeting_Widget, Focus_Timer, Todo_List, and Quick_Links — within the single HTML page without navigation or routing.
2. THE Dashboard SHALL apply all styles exclusively from the single CSS file located at `css/style.css`; no inline styles or additional stylesheets SHALL be used.
3. THE Dashboard SHALL apply all interactive behaviour exclusively from the single JavaScript file located at `js/app.js`; no additional script files or inline scripts SHALL be used.
4. THE Dashboard SHALL set body text font size to at least 14px and widget heading font size to at least 18px.
5. THE Dashboard SHALL maintain a layout where all four widgets are visible and operable without horizontal scrolling at viewport widths of 320px, 768px, and 1920px.
6. THE Dashboard SHALL maintain a layout where no widget content is clipped or overlaps another widget at viewport widths of 320px, 768px, and 1920px.
7. THE Dashboard SHALL ensure all text elements have a colour contrast ratio of at least 4.5:1 against their background for text smaller than 18px, and at least 3:1 for text at 18px or larger, per WCAG 2.1 Level AA.

---

### Requirement 7: Browser Compatibility

**User Story:** As a user, I want the dashboard to work correctly in any modern browser, so that I can use it regardless of my preferred browser or environment.

#### Acceptance Criteria

1. THE Dashboard SHALL render all four widgets and respond to user interactions as specified in Requirements 1–4 when opened in the latest stable releases of Chrome, Firefox, Edge, and Safari.
2. THE Dashboard SHALL not require any build tools, transpilers, or package managers to run.
3. THE Dashboard SHALL be openable directly from the local filesystem (via `file://` protocol) or served from any static HTTP server without modification.
4. WHERE the Dashboard is packaged as a browser extension, THE Dashboard SHALL comply with the Manifest V3 extension format for Chrome and Edge, and SHALL load and operate without any browser-reported extension errors.
