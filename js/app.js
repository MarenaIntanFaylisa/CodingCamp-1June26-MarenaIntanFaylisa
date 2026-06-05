/* ============================================================
   Todo Life Dashboard — js/app.js
   All application behaviour in one file (no modules, no build step)
   Compatible with ES2019 and file:// protocol
   ============================================================ */

/* ===== CONSTANTS ===== */

var STORAGE_KEYS = {
  tasks: 'tld_tasks',
  links: 'tld_links',
  theme: 'tld_theme', 
  name: 'tld_name'
};

/* ===== STORAGE HELPERS ===== */

/**
 * Load and parse an array from localStorage.
 * Returns [] for missing key, null, malformed JSON, or non-array values.
 * @param {string} key
 * @returns {any[]}
 */
function safeLoad(key) {
  var raw = localStorage.getItem(key);
  if (raw === null) return [];
  try {
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    // Malformed JSON: discard and return empty (Requirement 5.5)
    return [];
  }
  // Errors thrown after this point propagate without further recovery (Req 5.6)
}

/**
 * Serialise data and write to localStorage.
 * @param {string} key
 * @param {any} data
 */
function saveState(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

/* ===== GREETING WIDGET ===== */

var WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Format a Date to HH:MM (24-hour, zero-padded).
 * @param {Date} date
 * @returns {string}
 */
function formatTime(date) {
  var h = date.getHours();
  var m = date.getMinutes();
  var s = date.getSeconds(); // Tambahkan detik
  return (h < 10 ? '0' : '') + h + ':' + 
         (m < 10 ? '0' : '') + m + ':' + 
         (s < 10 ? '0' : '') + s;
}

/**
 * Format a Date to "Weekday, DD Month YYYY".
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  var weekday = WEEKDAY_NAMES[date.getDay()];
  var day = date.getDate();
  var month = MONTH_NAMES[date.getMonth()];
  var year = date.getFullYear();
  return weekday + ', ' + (day < 10 ? '0' : '') + day + ' ' + month + ' ' + year;
}

/**
 * Return the appropriate greeting for a given hour (0–23).
 * @param {number} hour
 * @returns {string}
 */
function getGreeting(hour) {
  if (hour >= 5 && hour <= 11) return 'Good Morning';
  if (hour >= 12 && hour <= 17) return 'Good Afternoon';
  if (hour >= 18 && hour <= 21) return 'Good Evening';
  return 'Good Night'; // [22–23] and [0–4]
}

/* ===== FOCUS TIMER ===== */

/**
 * Create the initial timer state: 25:00, not running.
 * @returns {{minutes: number, seconds: number, running: boolean}}
 */
function createTimerState() {
  return { minutes: 25, seconds: 0, running: false };
}

/**
 * Decrement state by one second. Returns state unchanged if already at 00:00.
 * Pure function — does not mutate input.
 * @param {{minutes: number, seconds: number, running: boolean}} state
 * @returns {{minutes: number, seconds: number, running: boolean}}
 */
function tickTimer(state) {
  var total = state.minutes * 60 + state.seconds;
  if (total === 0) return state;
  var newTotal = total - 1;
  return {
    minutes: Math.floor(newTotal / 60),
    seconds: newTotal % 60,
    running: state.running
  };
}

/**
 * Pause the timer (set running to false), preserving time.
 * Pure function — does not mutate input.
 * @param {{minutes: number, seconds: number, running: boolean}} state
 * @returns {{minutes: number, seconds: number, running: boolean}}
 */
function stopTimer(state) {
  return { minutes: state.minutes, seconds: state.seconds, running: false };
}

/**
 * Reset the timer to its initial 25:00 state.
 * @returns {{minutes: number, seconds: number, running: boolean}}
 */
function resetTimer() {
  return createTimerState();
}

/**
 * Format minutes and seconds to a zero-padded MM:SS string.
 * @param {number} m  Minutes (0–25)
 * @param {number} s  Seconds (0–59)
 * @returns {string}
 */
function formatTimer(m, s) {
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

/**
 * Derive button enabled/disabled state from timer state.
 * @param {{minutes: number, seconds: number, running: boolean}} state
 * @returns {{startDisabled: boolean, stopDisabled: boolean}}
 */
function getButtonState(state) {
  return {
    startDisabled: state.running,
    stopDisabled: !state.running
  };
}

/**
 * Render the greeting widget with the current time, date, and greeting.
 */
function renderGreeting() {
  var date = new Date();
  var hour = date.getHours();
  
  // Ambil nama dari local storage, jika belum ada default-nya 'Set Name'
  var savedName = localStorage.getItem(STORAGE_KEYS.name) || 'Set Name';
  
  // Tulis ucapan selamat ke dalam span teks greeting
  document.getElementById('greeting-text').textContent = getGreeting(hour);
  // Tulis nama pengguna ke dalam span user-name
  document.getElementById('user-name').textContent = savedName;
  
  // Tampilkan jam dan tanggal
  document.getElementById('greeting-time').textContent = formatTime(date);
  document.getElementById('greeting-date').textContent = formatDate(date);
}

/**
 * Initialise the greeting widget.
 * Renders immediately on load, then updates every 60 seconds.
 */
function initGreeting() {
  renderGreeting();
  setInterval(renderGreeting, 1000);
  document.getElementById('user-name').addEventListener('click', function() {
    var currentName = this.textContent === 'Set Name' ? '' : this.textContent;
    var newName = prompt('Enter your name:', currentName);
    if (newName !== null && newName.trim() !== '') {
      localStorage.setItem(STORAGE_KEYS.name, newName.trim());
      renderGreeting();
    }
  });
}

/* --- Timer render + init --- */

/** Module-level timer state */
var timerState;
var intervalId;

/**
 * Update the timer DOM from the current state.
 * @param {{minutes: number, seconds: number, running: boolean}} state
 */
function renderTimer(state) {
  var display = document.getElementById('timer-display');
  var btnStart = document.getElementById('timer-start');
  var btnStop = document.getElementById('timer-stop');
  var notification = document.getElementById('timer-notification');
  var btnState = getButtonState(state);

  display.textContent = formatTimer(state.minutes, state.seconds);
  btnStart.disabled = btnState.startDisabled;
  btnStop.disabled = btnState.stopDisabled;

  // Show notification only when countdown has reached 00:00 and is not running
  if (state.minutes === 0 && state.seconds === 0 && !state.running) {
    notification.textContent = 'Session complete! Take a break.';
    notification.removeAttribute('hidden');
  } else {
    notification.setAttribute('hidden', '');
    notification.textContent = '';
  }
}

/**
 * Tick handler called every second while the timer is running.
 */
function onTick() {
  var newState = tickTimer(timerState);
  var reachedZero = newState.minutes === 0 && newState.seconds === 0;
  if (reachedZero) {
    clearInterval(intervalId);
    intervalId = null;
    // Mark as not running so the notification appears
    newState = { minutes: 0, seconds: 0, running: false };
  }
  timerState = newState;
  renderTimer(timerState);
}

/**
 * Initialise the focus timer widget.
 */
function initTimer() {
  timerState = createTimerState();
  intervalId = null;
  renderTimer(timerState);

  document.getElementById('timer-start').addEventListener('click', function () {
    if (timerState.running) return; // already running
    timerState = { minutes: timerState.minutes, seconds: timerState.seconds, running: true };
    intervalId = setInterval(onTick, 1000);
    renderTimer(timerState);
  });

  document.getElementById('timer-stop').addEventListener('click', function () {
    if (!timerState.running) return;
    clearInterval(intervalId);
    intervalId = null;
    timerState = stopTimer(timerState);
    renderTimer(timerState);
  });

  document.getElementById('timer-reset').addEventListener('click', function () {
    clearInterval(intervalId);
    intervalId = null;
    timerState = resetTimer();
    // Ensure notification is hidden on reset (Requirement 2.7)
    var notification = document.getElementById('timer-notification');
    notification.setAttribute('hidden', '');
    notification.textContent = '';
    renderTimer(timerState);
  });
}

/* ===== QUICK LINKS ===== */

/** Module-level links array */
var links = [];

/**
 * Validate a link entry.
 * @param {string} label
 * @param {string} url
 * @returns {boolean}
 */
function validateLink(label, url) {
  return label.trim().length >= 1 && /^https?:\/\//.test(url.trim());
}

/**
 * Add a new link to the array. Returns null if the input is invalid.
 * Pure function — does not mutate input.
 * @param {Array} links
 * @param {string} label
 * @param {string} url
 * @returns {Array|null}
 */
function addLink(links, label, url) {
  if (!validateLink(label, url)) return null;
  return links.concat([{ id: generateId(), label: label.trim(), url: url.trim() }]);
}

/**
 * Remove a link by id.
 * Pure function — does not mutate input.
 * @param {Array} links
 * @param {string} id
 * @returns {Array}
 */
function deleteLink(links, id) {
  return links.filter(function (l) { return l.id !== id; });
}

/* ===== TODO LIST ===== */

/** Module-level tasks array */
var tasks = [];

/**
 * Generate a unique ID. Uses crypto.randomUUID if available,
 * with a fallback for older environments (e.g. file:// on older Chromium).
 * @returns {string}
 */
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/**
 * Validate a task title: trimmed length must be 1–255.
 * @param {string} title
 * @returns {boolean}
 */
function validateTaskTitle(title) {
  var trimmed = title.trim();
  return trimmed.length >= 1 && trimmed.length <= 255;
}

/**
 * Add a new task to the array. Returns null if the title is invalid.
 * Pure function — does not mutate input.
 * @param {Array} taskList
 * @param {string} title
 * @returns {Array|null}
 */
function addTask(taskList, title) {
  if (!validateTaskTitle(title)) return null;
  return taskList.concat([{ id: generateId(), title: title.trim(), completed: false }]);
}

/**
 * Update a task's title by id. Returns null if the new title is invalid.
 * Pure function — does not mutate input.
 * @param {Array} taskList
 * @param {string} id
 * @param {string} title
 * @returns {Array|null}
 */
function updateTask(taskList, id, title) {
  if (!validateTaskTitle(title)) return null;
  return taskList.map(function (t) {
    return t.id === id ? { id: t.id, title: title.trim(), completed: t.completed } : t;
  });
}

/**
 * Toggle the completed status of a task by id.
 * Pure function — does not mutate input.
 * @param {Array} taskList
 * @param {string} id
 * @returns {Array}
 */
function toggleTask(taskList, id) {
  return taskList.map(function (t) {
    return t.id === id ? { id: t.id, title: t.title, completed: !t.completed } : t;
  });
}

/**
 * Remove a task by id.
 * Pure function — does not mutate input.
 * @param {Array} taskList
 * @param {string} id
 * @returns {Array}
 */
function deleteTask(taskList, id) {
  return taskList.filter(function (t) { return t.id !== id; });
}

/**
 * Render the task list DOM from the tasks array.
 * @param {Array} taskList
 */
function renderTasks(taskList) {
  var ul = document.getElementById('todo-items');
  ul.innerHTML = '';
  taskList.forEach(function (task) {
    var li = document.createElement('li');
    li.setAttribute('data-id', task.id);

    var span = document.createElement('span');
    span.textContent = task.title;
    if (task.completed) {
      span.className = 'task-completed';
    }

    var checkboxToggle = document.createElement('input');
    checkboxToggle.type = 'checkbox';
    checkboxToggle.checked = task.completed; // Otomatis tercentang jika task selesai
    checkboxToggle.setAttribute('data-action', 'toggle');
    checkboxToggle.style.cursor = 'pointer';

    var btnEdit = document.createElement('button');
    btnEdit.textContent = 'Edit';
    btnEdit.setAttribute('data-action', 'edit');

    var btnDelete = document.createElement('button');
    btnDelete.textContent = 'Delete';
    btnDelete.setAttribute('data-action', 'delete');

    li.appendChild(checkboxToggle);
    li.appendChild(span);
    li.appendChild(btnEdit);
    li.appendChild(btnDelete);
    ul.appendChild(li);
  });
}

/**
 * Enter inline edit mode for a task <li>.
 * @param {HTMLElement} li
 * @param {string} id
 * @param {string} currentTitle
 */
function enterEditMode(li, id, currentTitle) {
  li.innerHTML = '';

  var input = document.createElement('input');
  input.type = 'text';
  input.value = currentTitle;
  input.maxLength = 255;

  var btnSave = document.createElement('button');
  btnSave.textContent = 'Save';

  var btnCancel = document.createElement('button');
  btnCancel.textContent = 'Cancel';

  var validationSpan = document.createElement('span');
  validationSpan.className = 'validation-error';

  li.appendChild(input);
  li.appendChild(btnSave);
  li.appendChild(btnCancel);
  li.appendChild(validationSpan);
  input.focus();

  function saveEdit() {
    var result = updateTask(tasks, id, input.value);
    if (result === null) {
      validationSpan.textContent = 'Title cannot be empty.';
      return;
    }
    tasks = result;
    renderTasks(tasks);
    saveState(STORAGE_KEYS.tasks, tasks);
  }

  function cancelEdit() {
    renderTasks(tasks);
  }

  btnSave.addEventListener('click', saveEdit);
  btnCancel.addEventListener('click', cancelEdit);

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
    if (e.key === 'Escape') { cancelEdit(); }
  });
}

/**
 * Initialise the to-do list widget.
 */
function initTodo() {
  tasks = safeLoad(STORAGE_KEYS.tasks);
  renderTasks(tasks);

  // Form submission — add a new task
  document.getElementById('todo-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = document.getElementById('todo-input');
    var validation = document.getElementById('todo-validation');
    var isDuplicate = tasks.some(function(task) {
      return task.title.toLowerCase() === input.value.trim().toLowerCase();
    });

    if (isDuplicate) {
      validation.textContent = 'Oops! Task dengan nama ini sudah ada di daftar.';
      return;
    }
    var result = addTask(tasks, input.value);
    if (result === null) {
      validation.textContent = 'Task title cannot be empty or longer than 255 characters.';
      return;
    }
    tasks = result;
    validation.textContent = '';
    input.value = '';
    renderTasks(tasks);
    saveState(STORAGE_KEYS.tasks, tasks);
  });

  // Event delegation for toggle, edit, delete
  document.getElementById('todo-items').addEventListener('click', function (e) {
    var btn = e.target;
    if (btn.tagName !== 'BUTTON') return;
    var action = btn.getAttribute('data-action');
    var li = btn.closest('li');
    if (!li) return;
    var id = li.getAttribute('data-id');
    var task = tasks.filter(function (t) { return t.id === id; })[0];
    if (!task) return;

    if (action === 'toggle') {
      tasks = toggleTask(tasks, id);
      renderTasks(tasks);
      saveState(STORAGE_KEYS.tasks, tasks);
    } else if (action === 'delete') {
      tasks = deleteTask(tasks, id);
      renderTasks(tasks);
      saveState(STORAGE_KEYS.tasks, tasks);
    } else if (action === 'edit') {
      enterEditMode(li, id, task.title);
    }
  });
}

/**
 * Render the quick links panel from the links array.
 * @param {Array} linkList
 */
function renderLinks(linkList) {
  var container = document.getElementById('links-items');
  container.innerHTML = '';
  linkList.forEach(function (link) {
    var wrapper = document.createElement('div');
    wrapper.style.display = 'inline-flex';
    wrapper.style.gap = '0.25rem';
    wrapper.style.alignItems = 'center';

    var btnLink = document.createElement('button');
    btnLink.textContent = link.label;
    btnLink.setAttribute('data-url', link.url);
    btnLink.setAttribute('data-action', 'open');
    btnLink.setAttribute('data-id', link.id);

    var btnDelete = document.createElement('button');
    btnDelete.textContent = '×';
    btnDelete.setAttribute('data-action', 'delete-link');
    btnDelete.setAttribute('data-id', link.id);
    btnDelete.setAttribute('aria-label', 'Delete ' + link.label);

    wrapper.appendChild(btnLink);
    wrapper.appendChild(btnDelete);
    container.appendChild(wrapper);
  });
}

/**
 * Initialise the quick links widget.
 */
function initLinks() {
  links = safeLoad(STORAGE_KEYS.links);
  renderLinks(links);

  // Form submission — add a new link
  document.getElementById('links-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var labelInput = document.getElementById('links-label');
    var urlInput = document.getElementById('links-url');
    var validation = document.getElementById('links-validation');

    if (!validateLink(labelInput.value, urlInput.value)) {
      validation.textContent = 'Please provide a non-empty label and a URL starting with http:// or https://.';
      return;
    }

    var result = addLink(links, labelInput.value, urlInput.value);
    if (result === null) {
      validation.textContent = 'Invalid link.';
      return;
    }

    links = result;
    validation.textContent = '';
    labelInput.value = '';
    urlInput.value = '';
    renderLinks(links);
    try {
      saveState(STORAGE_KEYS.links, links);
    } catch (_) {
      // Storage write failed; in-memory state is already updated (Requirement 4.3)
    }
  });

  // Event delegation for open and delete
  document.getElementById('links-items').addEventListener('click', function (e) {
    var btn = e.target;
    if (btn.tagName !== 'BUTTON') return;
    var action = btn.getAttribute('data-action');
    var id = btn.getAttribute('data-id');

    if (action === 'open') {
      var url = btn.getAttribute('data-url');
      window.open(url, '_blank');
    } else if (action === 'delete-link') {
      links = deleteLink(links, id);
      renderLinks(links);
      try {
        saveState(STORAGE_KEYS.links, links);
      } catch (_) {
        // Storage write failed; UI already reflects deletion (Requirement 4.7)
      }
    }
  });
}

/* ===== THEME TOGGLE WIDGET ===== */
function initTheme() {
  var themeToggleBtn = document.getElementById('theme-toggle');
  var currentTheme = localStorage.getItem(STORAGE_KEYS.theme);

  // Cek tema awal saat dimuat
  if (currentTheme === 'light') {
    document.body.classList.add('light-theme');
    themeToggleBtn.textContent = '☀️ Light Mode';
  } else {
    themeToggleBtn.textContent = '🌙 Dark Mode';
  }

  // Aksi saat tombol diklik
  themeToggleBtn.addEventListener('click', function() {
    document.body.classList.toggle('light-theme');

    if (document.body.classList.contains('light-theme')) {
      localStorage.setItem(STORAGE_KEYS.theme, 'light');
      themeToggleBtn.textContent = '☀️ Light Mode';
    } else {
      localStorage.setItem(STORAGE_KEYS.theme, 'dark');
      themeToggleBtn.textContent = '🌙 Dark Mode';
    }
  });
}

initGreeting();
initTimer();
initTodo();
initLinks();
initTheme(); 