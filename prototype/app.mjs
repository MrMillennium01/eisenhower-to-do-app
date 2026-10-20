import {
  PRIORITIES, addDays, addMonths, calendarDays, clampPriority, createDemo,
  dateKey, parseDate, priorityFromPoint, priorityKey, projectProgress, taskState,
} from './model.mjs';

const today = dateKey(new Date());
const demo = createDemo(today);
const state = {
  ...demo, view: 'upcoming', layout: 'columns', anchor: today,
  month: today, dateBasis: 'plannedDate', projectFilter: 'all', calendarVisited: false,
};
const root = document.querySelector('#app');
const dialog = document.querySelector('#task-dialog');
const form = document.querySelector('#task-form');
const reviewDialog = document.querySelector('#review-dialog');
const matrix = document.querySelector('#priority-matrix');
const marker = document.querySelector('#priority-marker');
let editingId = null;
let draftPriority = { urgency: 30, importance: 70 };
let activePointer = null;
let returnFocus = null;
let toastTimeout;

const iconPaths = {
  columns: '<rect x="3" y="4" width="7" height="16" rx="2"/><rect x="14" y="4" width="7" height="16" rx="2"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 11h18M8 15h2M14 15h2"/>',
  project: '<rect x="9" y="2" width="6" height="6" rx="1.5"/><rect x="2" y="16" width="6" height="6" rx="1.5"/><rect x="16" y="16" width="6" height="6" rx="1.5"/><path d="M12 8v4M5 16v-4h14v4"/>',
  window: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01M7 13h4M7 16h8"/>',
  leaf: '<path d="M20 3C10 2 3 7 5 14c2 7 13 7 15-11ZM4 21 15 10"/>',
  sparkle: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  arrowUp: '<path d="M7 17 17 7M7 7h10v10"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 2-2.5 2-2.5 3.5M12 16.5h.01"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  circle: '<circle cx="12" cy="12" r="8"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
  flag: '<path d="M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
};
const icon = (name, className = '') => `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.circle}</svg>`;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const formatDate = (value, options) => new Intl.DateTimeFormat('de-DE', options).format(parseDate(value));
const projectFor = (task) => state.projects.find((project) => project.id === task.projectId);
const filteredTasks = () => state.tasks.filter((task) => state.projectFilter === 'all' || task.projectId === state.projectFilter);
const orderedTasks = (tasks) => [...tasks].sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done'));
const viewLabels = { upcoming: 'Demnächst', projects: 'Projekte', calendar: 'Kalender' };

function priorityBadge(task) {
  const key = priorityKey(task.urgency, task.importance);
  const priority = PRIORITIES[key];
  return `<span class="priority-badge tone-${priority.tone}"><span class="priority-glyph" data-priority="${key}" aria-hidden="true"><i></i><i></i><i></i><i></i></span>${priority.label}</span>`;
}

function dueLabel(task) {
  if (!task.dueDate) return '';
  let label = formatDate(task.dueDate, { day: 'numeric', month: 'short' });
  if (task.dueDate === today) label = 'Heute fällig';
  if (task.dueDate === addDays(today, 1)) label = 'Morgen fällig';
  if (task.dueDate < today && task.status !== 'done') label = 'Überfällig';
  return `<span class="due-label ${task.dueDate < today && task.status !== 'done' ? 'overdue' : ''}">${icon('calendar')}${label}</span>`;
}

function taskCard(task, compact = false) {
  const project = projectFor(task);
  return `<article class="task-card ${compact ? 'task-row' : ''} ${task.status === 'done' ? 'is-done' : ''}" data-task-id="${escapeHtml(task.id)}">
    <button class="complete-task ${task.status === 'done' ? 'checked' : ''}" type="button" data-action="complete-task" data-id="${escapeHtml(task.id)}" aria-label="${escapeHtml(task.title)}: ${task.status === 'done' ? 'wieder öffnen' : 'als erledigt markieren'}" aria-pressed="${task.status === 'done'}">${task.status === 'done' ? icon('check') : ''}</button>
    <button class="task-open" type="button" data-action="open-task" data-id="${escapeHtml(task.id)}" data-focus-key="task-${escapeHtml(task.id)}">
      <span class="task-project ${project ? `tone-${project.tone}` : ''}"><span class="color-dot"></span>${project ? escapeHtml(project.name) : 'Ohne Projekt'}${task.optional ? '<span class="optional-tag">Optional</span>' : ''}</span>
      <span class="task-title">${escapeHtml(task.title)}</span>
      ${task.description && !compact ? `<span class="task-description">${escapeHtml(task.description)}</span>` : ''}
      <span class="task-meta">${priorityBadge(task)}${dueLabel(task)}</span>
      ${task.status === 'progress' ? '<span class="working-indicator"><span></span>In Arbeit</span>' : ''}
    </button>
  </article>`;
}

function sidebar() {
  const openCount = state.tasks.filter((task) => task.status !== 'done').length;
  return `<aside class="sidebar">
    <button class="brand" data-action="navigate" data-view="upcoming" aria-label="fokus – zur Tagesplanung">
      <span class="brand-symbol"><i></i><i></i><i></i><i></i></span>
      <span>fokus<span class="brand-period">.</span><small>Ein Schritt nach dem anderen.</small></span>
    </button>
    <div class="sidebar-label">DEIN ARBEITSBEREICH</div>
    <nav class="main-nav" aria-label="Hauptnavigation">
      ${[['upcoming', 'sun'], ['projects', 'project'], ['calendar', 'calendar']].map(([view, symbol]) =>
        `<button class="nav-item ${state.view === view ? 'active' : ''}" data-action="navigate" data-view="${view}" data-focus-key="nav-${view}" ${state.view === view ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${viewLabels[view]}</span>${view === 'upcoming' ? `<span class="nav-count">${openCount}</span>` : ''}</button>`,
      ).join('')}
    </nav>
    <div class="sidebar-label project-label">MEINE PROJEKTE<span>${state.projects.length}</span></div>
    <div class="sidebar-projects">${state.projects.map((project) =>
      `<button class="sidebar-project ${state.projectFilter === project.id ? 'selected' : ''}" data-action="open-project" data-id="${project.id}"><span class="color-dot tone-${project.tone}"></span>${escapeHtml(project.name)}</button>`,
    ).join('')}</div>
    <div class="sidebar-bottom">
      <div class="review-card">
        <span class="review-step">SCHRITT 01</span>
        <strong>Erst ausprobieren.<br>Dann weiterdenken.</strong>
        <p>Dieser Entwurf wartet auf deine Perspektive.</p>
        <button data-action="review">Was kann ich testen? ${icon('arrow')}</button>
      </div>
      <div class="demo-identity"><span class="demo-avatar">D</span><span>Dein Raum<small>Lokaler Entwurf · Beispieldaten</small></span></div>
    </div>
  </aside>`;
}

function projectSelect() {
  return `<label class="toolbar-select"><span class="sr-only">Projektfilter</span>${icon('project')}<select id="project-filter" aria-label="Projektfilter">
    <option value="all">Alle Projekte</option>${state.projects.map((project) => `<option value="${project.id}" ${state.projectFilter === project.id ? 'selected' : ''}>${escapeHtml(project.name)}</option>`).join('')}
  </select></label>`;
}

function basisSelect() {
  return `<label class="toolbar-select basis-select"><span class="sr-only">Terminbezug</span>${icon('calendar')}<select id="date-basis" aria-label="Terminbezug">
    <option value="plannedDate" ${state.dateBasis === 'plannedDate' ? 'selected' : ''}>Geplant für</option>
    <option value="dueDate" ${state.dateBasis === 'dueDate' ? 'selected' : ''}>Fällig bis</option>
  </select></label>`;
}

function upcomingView() {
  const tasks = filteredTasks();
  const days = Array.from({ length: 7 }, (_, index) => addDays(state.anchor, index));
  const todaysTasks = tasks.filter((task) => task.plannedDate === today);
  const completed = todaysTasks.filter((task) => task.status === 'done').length;
  const percentage = todaysTasks.length ? Math.round(completed / todaysTasks.length * 100) : 0;
  const unscheduled = tasks.filter((task) => !task[state.dateBasis]);
  const countInRange = tasks.filter((task) => days.includes(task[state.dateBasis]) && task.status !== 'done').length;
  return `<section class="today-summary" aria-label="Heutiger Überblick">
    <div class="today-symbol">${icon('sun')}</div>
    <div class="today-greeting"><strong>Ein guter Tag für einen kleinen Schritt.</strong><span>${todaysTasks.filter((task) => task.status !== 'done').length} offene To-dos für heute. Du bestimmst, was wichtig ist.</span></div>
    <div class="today-progress"><div class="progress-ring" style="--progress:${percentage}%"><span>${icon('check')}</span></div><span><strong>${completed} von ${todaysTasks.length}</strong><small>heute erledigt</small></span></div>
  </section>
  <div class="section-heading"><div><h2>Deine nächsten Tage <span>${countInRange}</span></h2><p>Ein klarer Überblick. In deinem Rhythmus.</p></div>
    <div class="layout-switch" role="group" aria-label="Darstellung">
      <button data-action="layout" data-layout="columns" data-focus-key="layout-columns" aria-pressed="${state.layout === 'columns'}">${icon('columns')}<span>Spalten</span></button>
      <button data-action="layout" data-layout="list" data-focus-key="layout-list" aria-pressed="${state.layout === 'list'}">${icon('list')}<span>Liste</span></button>
    </div>
  </div>
  <div class="view-toolbar">
    <div class="date-navigation"><button class="icon-button" data-action="week-shift" data-offset="-7" aria-label="Sieben Tage zurück">${icon('left')}</button><span>${formatDate(days[0], { day: 'numeric', month: 'short' })} <span class="date-dash">—</span> ${formatDate(days.at(-1), { day: 'numeric', month: 'short', year: 'numeric' })}</span><button class="icon-button" data-action="week-shift" data-offset="7" aria-label="Sieben Tage weiter">${icon('right')}</button><button class="text-button today-button" data-action="today">Heute</button></div>
    <div class="filter-group">${projectSelect()}${basisSelect()}</div>
  </div>
  <div class="${state.layout === 'columns' ? 'board-scroll' : 'agenda'}" aria-label="${state.layout === 'columns' ? 'Tagesplanung in Spalten' : 'Tagesplanung als Liste'}">
    ${days.map((day) => {
      const dayTasks = orderedTasks(tasks.filter((task) => task[state.dateBasis] === day));
      const isToday = day === today;
      return `<section class="day-column ${isToday ? 'is-today' : ''}">
        <header class="day-heading"><div><div class="day-eyebrow">${isToday ? '<span class="today-dot"></span>HEUTE' : day === addDays(today, 1) ? 'MORGEN' : formatDate(day, { weekday: 'long' }).toUpperCase()}</div><h3>${formatDate(day, { day: 'numeric', month: 'long' })}<span>${dayTasks.length}</span></h3></div><button class="icon-button add-day" data-action="new-task" data-date="${day}" aria-label="To-do für ${formatDate(day, { day: 'numeric', month: 'long' })} erstellen">${icon('plus')}</button></header>
        <div class="day-tasks">${dayTasks.length ? dayTasks.map((task) => taskCard(task, state.layout === 'list')).join('') : `<button class="empty-day" data-action="new-task" data-date="${day}">${icon('plus')}<strong>Noch etwas Luft.</strong><span>Einen Schritt planen</span></button>`}</div>
      </section>`;
    }).join('')}
  </div>
  ${unscheduled.length ? `<section class="unscheduled"><div class="section-heading"><div><h2>Ohne Termin <span>${unscheduled.length}</span></h2><p>Nicht vergessen. Nur noch nicht eingeplant.</p></div></div><div class="unscheduled-tasks">${orderedTasks(unscheduled).map((task) => taskCard(task)).join('')}</div></section>` : ''}
  <p class="view-footnote">${icon('help')}Ein Klick auf ein To-do öffnet seine Details und die Eisenhower-Matrix.</p>`;
}

function miniGraph(tone) {
  return `<svg class="mini-graph tone-${tone}" viewBox="0 0 320 110" aria-hidden="true"><path d="M40 55H100V25h60m-60 30v30h60m45-60h30v30h45m-75 30h30V55" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".3"/><rect x="20" y="40" width="42" height="30" rx="8" fill="currentColor"/><path d="m33 55 5 5 10-10" fill="none" stroke="white" stroke-width="2"/><rect x="150" y="10" width="55" height="30" rx="8" fill="currentColor" opacity=".32"/><rect x="150" y="70" width="55" height="30" rx="8" fill="none" stroke="currentColor" stroke-dasharray="4 3"/><rect x="267" y="40" width="42" height="30" rx="8" fill="currentColor" opacity=".15"/></svg>`;
}

function projectsView() {
  const project = state.projects.find((item) => item.id === state.projectFilter);
  if (!project) {
    return `<div class="section-heading"><div><h2>Deine Vorhaben <span>${state.projects.length}</span></h2><p>Öffne ein Projekt und entdecke seinen Weg.</p></div><span class="subtle-badge">${icon('project')}Progression statt langer Listen</span></div>
      <div class="project-grid">${state.projects.map((item) => {
        const progress = projectProgress(state.tasks, item.id);
        return `<button class="project-card" data-action="open-project" data-id="${item.id}"><span class="project-card-top"><span class="project-symbol tone-${item.tone}">${icon(item.icon)}</span>${icon('arrowUp')}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p>${miniGraph(item.tone)}<span class="project-progress-label"><span>${progress.completed} von ${progress.total} Pflichtschritten</span><strong>${progress.percent}%</strong></span><span class="progress-bar tone-${item.tone}"><i style="width:${progress.percent}%"></i></span></button>`;
      }).join('')}</div>
      <div class="concept-note">${icon('sparkle')}<div><strong>Dein Projekt darf sich verzweigen.</strong><p>Pflichtschritte bilden den Weg zum Ziel. Optionale Abzweigungen geben Ideen ihren Platz – ohne den Fortschritt aufzuhalten.</p></div></div>`;
  }
  const tasks = state.tasks.filter((task) => task.projectId === project.id);
  const progress = projectProgress(state.tasks, project.id);
  const positions = new Map(tasks.map((task, index) => [task.id, task.graph || { x: 30 + (index % 4) * 240, y: 100 + Math.floor(index / 4) * 200 }]));
  const height = Math.max(460, ...[...positions.values()].map((position) => position.y + 160));
  const edges = state.dependencies.filter((edge) => positions.has(edge.from) && positions.has(edge.to));
  return `<button class="back-link" data-action="all-projects">${icon('left')}Alle Projekte</button>
    <section class="project-detail-heading"><span class="project-symbol tone-${project.tone}">${icon(project.icon)}</span><div><h2>${escapeHtml(project.name)}</h2><p>${escapeHtml(project.description)}</p></div><div class="project-detail-progress"><strong>${progress.percent}%</strong><span>${progress.completed} von ${progress.total} Pflichtschritten</span><span class="progress-bar tone-${project.tone}"><i style="width:${progress.percent}%"></i></span></div></section>
    <div class="graph-toolbar"><span class="eyebrow">DEIN PROGRESSIONSBAUM</span><div class="graph-legend"><span><i class="legend-dot"></i>Pflichtschritt</span><span><i class="legend-dot optional"></i>Optional</span></div></div>
    <div class="graph-scroll" aria-label="Projektbaum ${escapeHtml(project.name)}"><div class="graph-canvas" style="height:${height}px">
      <svg class="graph-edges" viewBox="0 0 980 ${height}" aria-hidden="true"><defs><marker id="edge-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" fill="#aab7b1"/></marker></defs>${edges.map((edge) => {
        const from = positions.get(edge.from);
        const to = positions.get(edge.to);
        const x1 = from.x + 190;
        const x2 = to.x;
        const middle = (x1 + x2) / 2;
        return `<path class="${edge.required ? '' : 'optional-edge'}" d="M${x1} ${from.y + 60}C${middle} ${from.y + 60},${middle} ${to.y + 60},${x2 - 5} ${to.y + 60}" marker-end="url(#edge-arrow)"/>`;
      }).join('')}</svg>
      ${tasks.map((task) => {
        const position = positions.get(task.id);
        const status = taskState(task, state.tasks, state.dependencies);
        const statusText = { done: 'Erledigt', progress: 'In Arbeit', open: 'Bereit', blocked: 'Wartet noch' }[status];
        return `<button class="graph-node state-${status} ${task.optional ? 'is-optional' : ''}" style="left:${position.x}px;top:${position.y}px" data-action="open-task" data-id="${task.id}" data-focus-key="graph-${task.id}"><span class="graph-node-status">${icon(status === 'done' ? 'check' : status === 'blocked' ? 'lock' : 'circle')}${task.optional ? 'Optional' : statusText}</span><strong>${escapeHtml(task.title)}</strong><span class="graph-node-priority">${PRIORITIES[priorityKey(task.urgency, task.importance)].label}${icon('arrowUp')}</span></button>`;
      }).join('')}
    </div></div>
    <p class="view-footnote">${icon('help')}Strukturskizze: Knoten öffnen To-dos. Die Verbindungen sind in diesem Entwurf noch nicht bearbeitbar.</p>`;
}

function calendarView() {
  const tasks = filteredTasks();
  const month = state.month.slice(0, 7);
  return `<div class="view-toolbar calendar-toolbar"><div class="month-navigation"><button class="icon-button" data-action="month-shift" data-offset="-1" aria-label="Vorheriger Monat">${icon('left')}</button><h2>${formatDate(state.month, { month: 'long', year: 'numeric' })}</h2><button class="icon-button" data-action="month-shift" data-offset="1" aria-label="Nächster Monat">${icon('right')}</button><button class="text-button" data-action="today">Heute</button></div><div class="filter-group">${projectSelect()}${basisSelect()}</div></div>
    <div class="calendar-scroll"><div class="month-calendar" aria-label="Monatskalender">
      <div class="calendar-weekdays">${['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'].map((day) => `<span>${day}</span>`).join('')}</div>
      <div class="calendar-grid">${calendarDays(state.month).map((day) => {
        const dayTasks = orderedTasks(tasks.filter((task) => task[state.dateBasis] === day));
        return `<section class="calendar-cell ${day.slice(0, 7) !== month ? 'outside-month' : ''} ${day === today ? 'calendar-today' : ''}"><button class="calendar-date" data-action="open-day" data-date="${day}" aria-label="Tagesplanung für ${formatDate(day, { day: 'numeric', month: 'long', year: 'numeric' })}" ${day === today ? 'aria-current="date"' : ''}>${parseDate(day).getDate()}</button><div class="calendar-tasks">${dayTasks.slice(0, 3).map((task) => `<button class="calendar-task tone-${projectFor(task)?.tone || 'slate'} ${task.status === 'done' ? 'is-done' : ''}" data-action="open-task" data-id="${escapeHtml(task.id)}" data-focus-key="calendar-${escapeHtml(task.id)}">${task.status === 'done' ? icon('check') : '<span class="color-dot"></span>'}<span>${escapeHtml(task.title)}</span></button>`).join('')}${dayTasks.length > 3 ? `<button class="calendar-more" data-action="open-day" data-date="${day}">+ ${dayTasks.length - 3} weitere</button>` : ''}</div></section>`;
      }).join('')}</div>
    </div></div>
    <p class="view-footnote">${icon('help')}Ein To-do öffnet seine Details. Ein Datum bringt dich direkt in die Tagesplanung.</p>`;
}

function render() {
  const scrollLeft = root.querySelector('.board-scroll')?.scrollLeft || 0;
  const focusKey = document.activeElement?.dataset.focusKey;
  const headings = {
    upcoming: ['DEINE TAGESPLANUNG', 'Dein nächster Schritt.', 'Weniger im Kopf. Mehr Raum für das Wesentliche.'],
    projects: ['DEINE PROJEKTE', 'Großes beginnt klein.', 'Aus einem Vorhaben werden Schritte. Aus Schritten wird Fortschritt.'],
    calendar: ['DEIN MONATSÜBERBLICK', 'Alles zu seiner Zeit.', 'Deine Termine im Blick. Dein nächster Schritt ganz nah.'],
  }[state.view];
  root.innerHTML = `${sidebar()}<main id="main-content" class="main-content" tabindex="-1">
    <header class="topbar"><div class="breadcrumb"><span>Dein Arbeitsbereich</span>${icon('right')}<strong>${viewLabels[state.view]}</strong></div><button class="review-pill" data-action="review"><span></span>Entwurf 01${icon('help')}</button></header>
    <section class="page-heading"><div><div class="eyebrow">${headings[0]}</div><h1>${headings[1]}</h1><p>${headings[2]}</p></div><button class="button button-primary new-task-button" data-action="new-task" data-focus-key="new-task">${icon('plus')}Neues To-do<span class="key-hint">N</span></button></section>
    <div id="view-content">${state.view === 'upcoming' ? upcomingView() : state.view === 'projects' ? projectsView() : calendarView()}</div>
    <footer class="page-footer"><span>Mit Absicht weniger. Mit Überblick mehr.</span><span>Bedienkonzept · Beispieldaten · Keine dauerhafte Speicherung</span></footer>
  </main>`;
  if (root.querySelector('.board-scroll')) root.querySelector('.board-scroll').scrollLeft = scrollLeft;
  if (focusKey) root.querySelector(`[data-focus-key="${CSS.escape(focusKey)}"]`)?.focus({ preventScroll: true });
}

function notify(message) {
  clearTimeout(toastTimeout);
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimeout = setTimeout(() => toast.classList.remove('visible'), 4000);
}

function setPriority(urgency, importance) {
  draftPriority = { urgency: clampPriority(urgency), importance: clampPriority(importance) };
  const key = priorityKey(draftPriority.urgency, draftPriority.importance);
  marker.style.left = `${draftPriority.urgency}%`;
  marker.style.top = `${100 - draftPriority.importance}%`;
  marker.setAttribute('aria-label', `Priorität verschieben: Dringlichkeit ${draftPriority.urgency}, Wichtigkeit ${draftPriority.importance}`);
  document.querySelector('#matrix-guide-x').style.left = `${draftPriority.urgency}%`;
  document.querySelector('#matrix-guide-y').style.top = `${100 - draftPriority.importance}%`;
  document.querySelector('#task-urgency').value = draftPriority.urgency;
  document.querySelector('#task-importance').value = draftPriority.importance;
  matrix.querySelectorAll('[data-quadrant]').forEach((quadrant) => quadrant.classList.toggle('selected', quadrant.dataset.quadrant === key));
  const summary = document.querySelector('#priority-summary');
  summary.className = `priority-summary tone-${PRIORITIES[key].tone}`;
  summary.innerHTML = `${priorityBadge(draftPriority)}<span>${PRIORITIES[key].hint}</span>`;
}

function openTask(id = null, day = null) {
  const task = id ? state.tasks.find((item) => item.id === id) : {
    title: '', description: '', projectId: state.projectFilter === 'all' ? '' : state.projectFilter,
    plannedDate: day && state.dateBasis === 'dueDate' ? '' : day || state.anchor,
    dueDate: day && state.dateBasis === 'dueDate' ? day : '',
    urgency: 30, importance: 70, status: 'open', optional: false,
  };
  if (!task) return;
  editingId = id;
  returnFocus = document.activeElement;
  form.reset();
  document.querySelector('#task-title').setCustomValidity('');
  document.querySelector('#task-dialog-title').textContent = id ? 'Dein To-do' : 'Neues To-do';
  document.querySelector('#save-task').textContent = id ? 'Änderungen speichern' : 'To-do erstellen';
  document.querySelector('#task-title').value = task.title;
  document.querySelector('#task-description').value = task.description;
  document.querySelector('#task-project').innerHTML = `<option value="">Ohne Projekt</option>${state.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join('')}`;
  document.querySelector('#task-project').value = task.projectId;
  document.querySelector('#task-planned').value = task.plannedDate;
  document.querySelector('#task-due').value = task.dueDate;
  document.querySelector('#task-status').value = task.status;
  document.querySelector('#task-optional').checked = task.optional;
  setPriority(task.urgency, task.importance);
  dialog.showModal();
  document.querySelector('#task-title').focus({ preventScroll: true });
}

function closeTask() {
  dialog.close();
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  else root.querySelector('.new-task-button')?.focus({ preventScroll: true });
}

root.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id, view, date, offset, layout } = button.dataset;
  if (action === 'review') {
    reviewDialog.showModal();
    return;
  }
  if (action === 'new-task' || action === 'open-task') {
    openTask(action === 'open-task' ? id : null, date);
    return;
  }
  if (action === 'navigate') {
    state.view = view;
    if (view === 'calendar') {
      state.month = state.anchor;
      if (!state.calendarVisited) state.dateBasis = 'dueDate';
      state.calendarVisited = true;
    }
  } else if (action === 'layout') {
    state.layout = layout;
  } else if (action === 'week-shift') {
    state.anchor = addDays(state.anchor, Number(offset));
  } else if (action === 'month-shift') {
    state.month = addMonths(state.month, Number(offset));
  } else if (action === 'today') {
    state.anchor = today;
    state.month = today;
  } else if (action === 'open-project') {
    state.projectFilter = id;
    state.view = 'projects';
  } else if (action === 'all-projects') {
    state.projectFilter = 'all';
  } else if (action === 'open-day') {
    state.anchor = date;
    state.view = 'upcoming';
    state.layout = 'list';
  } else if (action === 'complete-task') {
    const task = state.tasks.find((item) => item.id === id);
    task.status = task.status === 'done' ? 'open' : 'done';
    notify(task.status === 'done' ? 'Ein Schritt geschafft. Gut gemacht.' : 'Das To-do ist wieder offen.');
  }
  render();
});

root.addEventListener('change', (event) => {
  if (event.target.id === 'project-filter') state.projectFilter = event.target.value;
  else if (event.target.id === 'date-basis') state.dateBasis = event.target.value;
  else return;
  const id = event.target.id;
  render();
  document.getElementById(id)?.focus({ preventScroll: true });
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const titleInput = document.querySelector('#task-title');
  if (!titleInput.value.trim()) {
    titleInput.setCustomValidity('Gib deinem To-do bitte einen Titel.');
    titleInput.reportValidity();
    return;
  }
  const original = state.tasks.find((task) => task.id === editingId);
  const task = {
    ...original, id: editingId || crypto.randomUUID(), title: titleInput.value.trim(),
    description: document.querySelector('#task-description').value.trim(),
    projectId: document.querySelector('#task-project').value,
    plannedDate: document.querySelector('#task-planned').value,
    dueDate: document.querySelector('#task-due').value,
    status: document.querySelector('#task-status').value,
    optional: document.querySelector('#task-optional').checked, ...draftPriority,
  };
  if (original && original.projectId !== task.projectId) {
    delete task.graph;
    state.dependencies = state.dependencies.filter((edge) => edge.from !== task.id && edge.to !== task.id);
  }
  state.tasks = original ? state.tasks.map((item) => item.id === task.id ? task : item) : [...state.tasks, task];
  render();
  closeTask();
  notify(original ? 'Änderungen übernommen – in allen Ansichten.' : 'Dein nächster Schritt ist eingeplant.');
});

document.querySelector('#task-title').addEventListener('input', (event) => event.target.setCustomValidity(''));
dialog.querySelectorAll('.close-dialog').forEach((button) => button.addEventListener('click', closeTask));
dialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeTask();
});
document.querySelector('#close-review').addEventListener('click', () => reviewDialog.close());
for (const modal of [dialog, reviewDialog]) {
  modal.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const controls = [...modal.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')]
      .filter((control) => control.getClientRects().length > 0);
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  modal.addEventListener('click', (event) => {
    const rect = modal.getBoundingClientRect();
    if (event.target === modal && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) {
      if (modal === dialog) closeTask();
      else modal.close();
    }
  });
}

matrix.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary || event.button !== 0) return;
  event.preventDefault();
  activePointer = event.pointerId;
  matrix.setPointerCapture(event.pointerId);
  marker.focus({ preventScroll: true });
  const values = priorityFromPoint(event.clientX, event.clientY, matrix.getBoundingClientRect());
  setPriority(values.urgency, values.importance);
  matrix.classList.add('is-dragging');
});
matrix.addEventListener('pointermove', (event) => {
  if (event.pointerId !== activePointer) return;
  const values = priorityFromPoint(event.clientX, event.clientY, matrix.getBoundingClientRect());
  setPriority(values.urgency, values.importance);
});
for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  matrix.addEventListener(eventName, (event) => {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    matrix.classList.remove('is-dragging');
  });
}
marker.addEventListener('keydown', (event) => {
  const step = event.shiftKey ? 10 : 1;
  const changes = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
  if (!changes[event.key]) return;
  event.preventDefault();
  const [urgency, importance] = changes[event.key];
  setPriority(draftPriority.urgency + urgency, draftPriority.importance + importance);
});
for (const dimension of ['urgency', 'importance']) {
  document.querySelector(`#task-${dimension}`).addEventListener('input', (event) => {
    if (event.target.value === '' || !event.target.validity.valid) return;
    const values = { ...draftPriority, [dimension]: Number(event.target.value) };
    setPriority(values.urgency, values.importance);
  });
}
document.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'n' && !event.ctrlKey && !event.metaKey && !event.altKey
    && !event.repeat && !event.target.closest('input, textarea, select, [contenteditable]')
    && !dialog.open && !reviewDialog.open) {
    event.preventDefault();
    openTask();
  }
});

render();
