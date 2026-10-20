import {
  PRIORITIES, addDays, addMonths, calendarDays, clampPriority, createDemo,
  dateKey, parseDate, priorityFromPoint, priorityKey, taskState, dateRange,
  autoLayout, connectionError, reconnectTask, graphPositions, graphBounds, edgePath, NODE_WIDTH, NODE_HEIGHT,
} from './model.mjs';

const today = dateKey(new Date());
const demo = createDemo(today);
const state = {
  ...demo, view: 'upcoming', layout: 'columns', anchor: today,
  month: today, dateBasis: 'plannedDate', projectFilter: 'all', calendarVisited: false,
  rangeStart: addDays(today, -14), rangeEnd: addDays(today, 27),
};
const root = document.querySelector('#app');
const dialog = document.querySelector('#task-dialog');
const form = document.querySelector('#task-form');
const reviewDialog = document.querySelector('#review-dialog');
const matrix = document.querySelector('#priority-matrix');
const marker = document.querySelector('#priority-marker');
const placementDialog = document.querySelector('#placement-dialog');
const projectDialog = document.querySelector('#project-dialog');
let editingId = null;
let draftTaskId;
let draftProjectId = '';
let draftLinks = { parents: [], children: [] };
let placementDraft = null;
let placementRole = 'parents';
let placementReturnFocus;
let editingProjectId = null;
let projectImageUrl = '';
let imageRequest = 0;
let imageLoading = false;
let projectReturnFocus;
let graphGesture = null;
let connectionStart = null;
let selectedEdge = null;
let suppressGraphClickUntil = 0;
let resetTimeline = true;
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
  move: '<path d="M12 3v18M3 12h18m-12-6 3-3 3 3m-6 12 3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 16 6-5 5 4 3-3 4 4"/>',
  edit: '<path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15v5Z"/>',
  layout: '<rect x="3" y="9" width="5" height="6" rx="1"/><rect x="16" y="3" width="5" height="6" rx="1"/><rect x="16" y="15" width="5" height="6" rx="1"/><path d="M8 12h4V6h4m-4 6v6h4"/>',
  unlink: '<path d="m3 3 18 18M9 14l-2 2a3 3 0 0 1-4-4l3-3m9 1 2-2a3 3 0 0 0-4-4l-3 3M10 14l4-4"/>',
};
const icon = (name, className = '') => `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.circle}</svg>`;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const formatDate = (value, options) => new Intl.DateTimeFormat('de-DE', options).format(parseDate(value));
const projectFor = (task) => state.projects.find((project) => project.id === task.projectId);
const filteredTasks = () => state.tasks.filter((task) => state.projectFilter === 'all' || task.projectId === state.projectFilter);
const orderedTasks = (tasks) => [...tasks].sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done'));
const viewLabels = { upcoming: 'Dein Arbeitsbereich', projects: 'Projekte', calendar: 'Kalender' };
const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();

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
  const checkbox = `<button class="complete-task ${task.status === 'done' ? 'checked' : ''}" type="button" data-action="complete-task" data-id="${escapeHtml(task.id)}" aria-label="${escapeHtml(task.title)}: ${task.status === 'done' ? 'wieder öffnen' : 'als erledigt markieren'}" aria-pressed="${task.status === 'done'}">${task.status === 'done' ? icon('check') : ''}</button>`;
  if (compact) return `<article class="task-row ${task.status === 'done' ? 'is-done' : ''}" data-task-id="${escapeHtml(task.id)}">
    ${checkbox}<button class="task-open task-row-open" data-action="open-task" data-id="${escapeHtml(task.id)}" data-focus-key="task-${escapeHtml(task.id)}" title="${escapeHtml(task.title)}">
      <span class="row-title task-title">${escapeHtml(task.title)}${task.optional ? '<small>Optional</small>' : ''}</span>
      <span class="row-project tone-${project?.tone || 'slate'}"><span class="color-dot"></span>${escapeHtml(project?.name || 'Ohne Projekt')}</span>
      <span class="row-priority">${priorityBadge(task)}</span><span class="row-due">${dueLabel(task) || 'Keine Frist'}</span>
    </button></article>`;
  return `<article class="task-card ${task.status === 'done' ? 'is-done' : ''}" data-task-id="${escapeHtml(task.id)}">
    ${checkbox}
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
    <button class="brand" data-action="navigate" data-view="upcoming" aria-label="fokus – zu deinem Arbeitsbereich">
      <span class="brand-symbol"><i></i><i></i><i></i><i></i></span>
      <span>fokus<span class="brand-period">.</span><small>Ein Schritt nach dem anderen.</small></span>
    </button>
    <div class="sidebar-label">NAVIGATION</div>
    <nav class="main-nav" aria-label="Hauptnavigation">
      ${[['upcoming', 'sun'], ['projects', 'project'], ['calendar', 'calendar']].map(([view, symbol]) =>
        `<button class="nav-item ${state.view === view ? 'active' : ''}" data-action="navigate" data-view="${view}" data-focus-key="nav-${view}" ${state.view === view ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${viewLabels[view]}</span>${view === 'upcoming' ? `<span class="nav-count">${openCount}</span>` : ''}</button>`,
      ).join('')}
    </nav>
    <div class="sidebar-label project-label"><span>MEINE PROJEKTE</span><button class="icon-button" data-action="new-project" aria-label="Projekt in der Sidebar hinzufügen">${icon('plus')}</button></div>
    <div class="sidebar-projects">${state.projects.map((project) =>
      `<button class="sidebar-project ${state.projectFilter === project.id ? 'selected' : ''}" data-action="open-project" data-id="${project.id}"><span class="color-dot tone-${project.tone}"></span>${escapeHtml(project.name)}</button>`,
    ).join('')}</div>
    <div class="sidebar-bottom">
      <div class="review-card">
        <span class="review-step">SCHRITT 01</span>
        <strong>Erst ausprobieren.<br>Dann weiterdenken.</strong>
        <p>Neue Verbindungen. Dein eigener Weg. Entwurf 02 wartet auf dein Feedback.</p>
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

function daySection(day) {
  const dayTasks = orderedTasks(filteredTasks().filter((task) => task[state.dateBasis] === day));
  const isToday = day === today;
  return `<section class="day-column ${isToday ? 'is-today' : ''}" data-date="${day}">
    <header class="day-heading"><div><div class="day-eyebrow">${isToday ? '<span class="today-dot"></span>HEUTE' : day === addDays(today, 1) ? 'MORGEN' : formatDate(day, { weekday: 'long' }).toUpperCase()}</div><h3>${formatDate(day, { day: 'numeric', month: 'long' })}<span>${dayTasks.length} To-dos</span></h3></div><button class="icon-button add-day" data-action="new-task" data-date="${day}" aria-label="To-do für ${formatDate(day, { day: 'numeric', month: 'long', year: 'numeric' })} erstellen">${icon('plus')}</button></header>
    <div class="day-tasks">${dayTasks.length ? dayTasks.map((task) => taskCard(task, state.layout === 'list')).join('') : `<button class="empty-day" data-action="new-task" data-date="${day}">${icon('plus')}<strong>Noch etwas Luft.</strong><span>Einen Schritt planen</span></button>`}</div>
  </section>`;
}

function upcomingView() {
  const tasks = filteredTasks();
  const todaysTasks = tasks.filter((task) => task.plannedDate === today);
  const unscheduled = tasks.filter((task) => !task[state.dateBasis]);
  return `<section class="today-summary" aria-label="Heutiger Überblick">
    <div class="today-symbol">${icon('sun')}</div>
    <div class="today-greeting"><strong>Ein guter Tag für einen kleinen Schritt.</strong><span>${todaysTasks.filter((task) => task.status !== 'done').length} offene To-dos für heute. Du bestimmst, was wichtig ist.</span></div>
    <span class="summary-note">Dein Tempo. Kein Prozentwert.</span>
  </section>
  <section class="unscheduled"><div class="section-heading"><div><h2>Ohne Termin <span>${unscheduled.length}</span></h2><p>Erst sammeln. Dann einen passenden Tag finden.</p></div><button class="text-button" data-action="new-task" data-undated="true">${icon('plus')}To-do sammeln</button></div>
    <div class="unscheduled-tasks ${state.layout === 'list' ? 'row-collection' : ''}">${unscheduled.length ? orderedTasks(unscheduled).map((task) => taskCard(task, state.layout === 'list')).join('') : '<p class="quiet-empty">Alles hat seinen Platz. Hier ist Raum für neue Gedanken.</p>'}</div>
  </section>
  <div class="section-heading"><div><h2>Deine nächsten Tage</h2><p>Einfach weiterscrollen. In beide Richtungen.</p></div>
    <div class="layout-switch" role="group" aria-label="Darstellung">
      <button data-action="layout" data-layout="columns" data-focus-key="layout-columns" aria-pressed="${state.layout === 'columns'}">${icon('columns')}<span>Spalten</span></button>
      <button data-action="layout" data-layout="list" data-focus-key="layout-list" aria-pressed="${state.layout === 'list'}">${icon('list')}<span>Liste</span></button>
    </div>
  </div>
  <div class="view-toolbar">
    <div class="date-navigation">${icon('calendar')}<span id="timeline-period">${formatDate(state.anchor, { month: 'long', year: 'numeric' })}</span><button class="text-button today-button" data-action="today">Zu heute</button><span class="continuous-hint">Fortlaufende Tage</span></div>
    <div class="filter-group">${projectSelect()}${basisSelect()}</div>
  </div>
  ${state.layout === 'list' ? '<div class="list-column-labels" aria-hidden="true"><span>To-do</span><span>Projekt</span><span>Priorität</span><span>Fälligkeit</span></div>' : ''}
  <div class="timeline-scroll ${state.layout === 'columns' ? 'board-scroll' : 'agenda'}" tabindex="0" data-layout="${state.layout}" data-start="${state.rangeStart}" data-end="${state.rangeEnd}" aria-label="${state.layout === 'columns' ? 'Tagesplanung in Spalten, fortlaufend scrollen' : 'Tagesplanung als Liste, fortlaufend scrollen'}">
    ${dateRange(state.rangeStart, state.rangeEnd).map(daySection).join('')}
  </div>
  <p class="view-footnote">${icon('help')}Am Rand erscheinen automatisch weitere Tage. Ein Klick auf ein To-do öffnet seine Details.</p>`;
}

function projectCover(project, small = false) {
  return `<span class="project-cover tone-${project.tone} ${small ? 'small-cover' : ''}">${project.imageUrl ? `<img src="${escapeHtml(project.imageUrl)}" alt="" draggable="false">` : `<span class="cover-initials">${escapeHtml(initials(project.name))}</span>${small ? '' : '<small>Platz für dein eigenes Bild</small>'}`}</span>`;
}

function ensurePositions(projectId) {
  const tasks = state.tasks.filter((task) => task.projectId === projectId);
  const positions = graphPositions(tasks, state.dependencies);
  for (const task of tasks) task.graph = { ...positions[task.id] };
  return positions;
}

function graphEdges(positions) {
  return `<defs><marker id="edge-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" fill="#829a78"/></marker></defs>${state.dependencies.filter((edge) => positions[edge.from] && positions[edge.to]).map((edge) => {
    const from = positions[edge.from];
    const to = positions[edge.to];
    const path = edgePath({ x: from.x + NODE_WIDTH, y: from.y + NODE_HEIGHT / 2 }, { x: to.x, y: to.y + NODE_HEIGHT / 2 });
    const selected = selectedEdge?.from === edge.from && selectedEdge?.to === edge.to;
    const label = `Verbindung von ${state.tasks.find((task) => task.id === edge.from).title} zu ${state.tasks.find((task) => task.id === edge.to).title}`;
    return `<g class="graph-edge ${edge.required ? '' : 'optional-edge'} ${selected ? 'selected' : ''}" data-from="${edge.from}" data-to="${edge.to}"><path class="edge-line" d="${path}" marker-end="url(#edge-arrow)"/><path class="edge-hit" d="${path}" role="button" tabindex="0" data-action="select-edge" data-from="${edge.from}" data-to="${edge.to}" aria-label="${escapeHtml(label)}" aria-pressed="${selected}"/></g>`;
  }).join('')}<path id="connection-preview" class="connection-preview" hidden/>`;
}

function graphNode(task) {
  const status = taskState(task, state.tasks, state.dependencies);
  const statusText = { done: 'Erledigt', progress: 'In Arbeit', open: 'Bereit', blocked: 'Wartet noch' }[status];
  return `<article class="graph-node state-${status} ${task.optional ? 'is-optional' : ''}" style="left:${task.graph.x}px;top:${task.graph.y}px" data-id="${task.id}">
    <button class="graph-node-drag" data-action="move-node" data-id="${task.id}" aria-label="${escapeHtml(task.title)} verschieben" aria-describedby="graph-help" title="Ziehen oder mit Pfeiltasten verschieben">${icon('move')}</button>
    <button class="graph-node-open" data-action="open-task" data-id="${task.id}" data-focus-key="graph-${task.id}"><span class="graph-node-status">${icon(status === 'done' ? 'check' : status === 'blocked' ? 'lock' : 'circle')}${task.optional ? 'Optional' : statusText}</span><strong>${escapeHtml(task.title)}</strong><span class="graph-node-priority">${PRIORITIES[priorityKey(task.urgency, task.importance)].label}${icon('arrowUp')}</span></button>
    <button class="graph-port port-in" data-action="port" data-port="in" data-id="${task.id}" aria-label="Eingang: ${escapeHtml(task.title)}" title="Eingehende Verbindung"></button>
    <button class="graph-port port-out" data-action="port" data-port="out" data-id="${task.id}" aria-label="Ausgang: ${escapeHtml(task.title)}" title="Verbindung zu einem anderen To-do zeichnen"></button>
    <button class="node-add-child" data-action="new-child" data-id="${task.id}" aria-label="Folgeschritt für ${escapeHtml(task.title)} hinzufügen" title="Neuen Folgeschritt hinzufügen">${icon('plus')}</button>
  </article>`;
}

function projectsView() {
  const project = state.projects.find((item) => item.id === state.projectFilter);
  if (!project) {
    return `<div class="section-heading"><div><h2>Deine Vorhaben <span>${state.projects.length}</span></h2><p>Öffne ein Projekt und entdecke seinen Weg.</p></div><span class="subtle-badge">${icon('project')}Progression statt langer Listen</span></div>
      <div class="project-grid">${state.projects.map((item) => `<article class="project-card"><button class="project-card-open" data-action="open-project" data-id="${item.id}">${projectCover(item)}<span class="project-card-content"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description || 'Ein neuer Raum für deine Ideen.')}</p><span class="project-card-footer">${state.tasks.filter((task) => task.projectId === item.id).length} To-dos<span>Projekt öffnen ${icon('arrow')}</span></span></span></button><button class="project-edit icon-button" data-action="edit-project" data-id="${item.id}" aria-label="${escapeHtml(item.name)} bearbeiten">${icon('edit')}</button></article>`).join('')}
        <button class="project-create-card" data-action="new-project">${icon('plus')}<strong>Ein neues Vorhaben</strong><span>Mit deinem Namen und deinem Bild.</span></button>
      </div>
      <div class="concept-note">${icon('sparkle')}<div><strong>Dein Projekt braucht keinen Prozentwert.</strong><p>Sein Weg wird durch Schritte und Verbindungen sichtbar. Ein eigenes Bild gibt jedem Vorhaben seinen persönlichen Platz.</p></div></div>`;
  }
  const tasks = state.tasks.filter((task) => task.projectId === project.id);
  const positions = ensurePositions(project.id);
  const bounds = graphBounds(positions);
  return `<button class="back-link" data-action="all-projects">${icon('left')}Alle Projekte</button>
    <section class="project-detail-heading">${projectCover(project, true)}<div><h2>${escapeHtml(project.name)}</h2><p>${escapeHtml(project.description)}</p></div><button class="button button-quiet project-details-button" data-action="edit-project" data-id="${project.id}">${icon('edit')}Projektdetails</button></section>
    <div class="graph-toolbar"><span class="eyebrow">DEIN PROJEKTBAUM · ${tasks.length} TO-DOS</span><div class="graph-actions"><button class="button button-quiet" data-action="auto-layout">${icon('layout')}Autoformatieren</button><button class="button button-primary" data-action="new-task">${icon('plus')}To-do hinzufügen</button></div></div>
    <div id="connection-status" class="connection-status" role="status">Knoten verschieben · Ausgang mit Eingang verbinden · Plus für einen Folgeschritt</div>
    <div class="graph-scroll" aria-label="Projektbaum ${escapeHtml(project.name)}"><div class="graph-canvas" style="width:${bounds.width}px;height:${bounds.height}px">
      <svg class="graph-edges" width="${bounds.width}" height="${bounds.height}" viewBox="0 0 ${bounds.width} ${bounds.height}">${graphEdges(positions)}</svg>
      ${tasks.map(graphNode).join('')}
      ${tasks.length ? '' : `<div class="graph-empty">${icon('project')}<h3>Dein erster Schritt beginnt hier.</h3><p>Lege einen Startknoten an. Dein Projekt darf danach in jede Richtung wachsen.</p><button class="button button-primary" data-action="new-task">${icon('plus')}Erstes To-do anlegen</button></div>`}
    </div></div>
    <div id="edge-selection" class="edge-selection" hidden></div>
    <p id="graph-help" class="view-footnote">${icon('help')}Punkte ziehen oder nacheinander anklicken, um zu verbinden. Pfeile lassen sich auswählen und entfernen. Am Verschiebegriff funktionieren auch die Pfeiltasten. Gestrichelte Pfeile sind Empfehlungen.</p>`;
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

function timelineAnchor() {
  const container = root.querySelector('.timeline-scroll');
  if (!container) return { date: state.anchor, offset: 0, layout: state.layout };
  const axis = container.dataset.layout === 'columns' ? 'left' : 'top';
  const end = axis === 'left' ? 'right' : 'bottom';
  const start = container.getBoundingClientRect()[axis];
  const day = [...container.querySelectorAll('.day-column')].find((element) => element.getBoundingClientRect()[end] > start + 5);
  return day ? { date: day.dataset.date, offset: day.getBoundingClientRect()[axis] - start, layout: container.dataset.layout } : { date: state.anchor, offset: 0, layout: state.layout };
}

function initializeTimeline(anchor) {
  const container = root.querySelector('.timeline-scroll');
  if (!container) return;
  const horizontal = state.layout === 'columns';
  const position = horizontal ? 'scrollLeft' : 'scrollTop';
  const extent = horizontal ? 'scrollWidth' : 'scrollHeight';
  const viewport = horizontal ? 'clientWidth' : 'clientHeight';
  const axis = horizontal ? 'left' : 'top';
  const target = container.querySelector(`[data-date="${anchor.date}"]`);
  if (target) container[position] += target.getBoundingClientRect()[axis] - container.getBoundingClientRect()[axis] - (anchor.layout === state.layout ? anchor.offset : 0);
  let queued = false;
  container.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (!container.isConnected) return;
      if (container[position] < 180) {
        const oldExtent = container[extent];
        const oldPosition = container[position];
        const end = addDays(state.rangeStart, -1);
        state.rangeStart = addDays(state.rangeStart, -14);
        container.insertAdjacentHTML('afterbegin', dateRange(state.rangeStart, end).map(daySection).join(''));
        container[position] = oldPosition + container[extent] - oldExtent;
      } else if (container[extent] - container[viewport] - container[position] < 360) {
        const start = addDays(state.rangeEnd, 1);
        state.rangeEnd = addDays(state.rangeEnd, 14);
        container.insertAdjacentHTML('beforeend', dateRange(start, state.rangeEnd).map(daySection).join(''));
      }
      container.dataset.start = state.rangeStart;
      container.dataset.end = state.rangeEnd;
      const visible = timelineAnchor();
      state.anchor = visible.date;
      container.dataset.anchorDate = visible.date;
      document.querySelector('#timeline-period').textContent = formatDate(visible.date, { month: 'long', year: 'numeric' });
    });
  }, { passive: true });
  container.dataset.anchorDate = anchor.date;
}

function render() {
  const anchor = resetTimeline ? { date: state.anchor, offset: 0, layout: state.layout } : timelineAnchor();
  if (resetTimeline) {
    state.rangeStart = addDays(state.anchor, -14);
    state.rangeEnd = addDays(state.anchor, 27);
  }
  const graphScroll = root.querySelector('.graph-scroll');
  const graphOffset = { x: graphScroll?.scrollLeft || 0, y: graphScroll?.scrollTop || 0 };
  const focusKey = document.activeElement?.dataset.focusKey;
  const headings = {
    upcoming: ['DEIN ARBEITSBEREICH', 'Dein nächster Schritt.', 'Weniger im Kopf. Mehr Raum für das Wesentliche.'],
    projects: ['DEINE PROJEKTE', 'Großes beginnt klein.', 'Eigene Bilder, neue Verbindungen. Dein Weg ist nicht geradlinig.'],
    calendar: ['DEIN MONATSÜBERBLICK', 'Alles zu seiner Zeit.', 'Deine Termine im Blick. Dein nächster Schritt ganz nah.'],
  }[state.view];
  root.innerHTML = `${sidebar()}<main id="main-content" class="main-content" tabindex="-1">
    <header class="topbar"><div class="breadcrumb"><span>fokus</span>${icon('right')}<strong>${viewLabels[state.view]}</strong></div><button class="review-pill" data-action="review"><span></span>Entwurf 02${icon('help')}</button></header>
    <section class="page-heading"><div><div class="eyebrow">${headings[0]}</div><h1>${headings[1]}</h1><p>${headings[2]}</p></div>${state.view === 'projects' ? `<button class="button button-primary primary-action" data-action="new-project">${icon('plus')}Neues Projekt</button>` : `<button class="button button-primary new-task-button primary-action" data-action="new-task" data-focus-key="new-task">${icon('plus')}Neues To-do<span class="key-hint">N</span></button>`}</section>
    <div id="view-content">${state.view === 'upcoming' ? upcomingView() : state.view === 'projects' ? projectsView() : calendarView()}</div>
    <footer class="page-footer"><span>Mit Absicht weniger. Mit Überblick mehr.</span><span>Bedienkonzept · Beispieldaten · Keine dauerhafte Speicherung</span></footer>
  </main>`;
  initializeTimeline(anchor);
  resetTimeline = false;
  const nextGraph = root.querySelector('.graph-scroll');
  if (nextGraph) {
    nextGraph.scrollLeft = graphOffset.x;
    nextGraph.scrollTop = graphOffset.y;
    updateEdgeSelection();
  }
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

function openTask(id = null, day = null, options = {}) {
  clearConnection();
  const task = id ? state.tasks.find((item) => item.id === id) : {
    title: '', description: '', projectId: options.projectId || (state.projectFilter === 'all' ? '' : state.projectFilter),
    plannedDate: options.undated || (day && state.dateBasis === 'dueDate') ? '' : day || state.anchor,
    dueDate: day && state.dateBasis === 'dueDate' ? day : '',
    urgency: 30, importance: 70, status: 'open', optional: false,
  };
  if (!task) return;
  editingId = id;
  draftTaskId = id || crypto.randomUUID();
  draftProjectId = task.projectId;
  draftLinks = {
    parents: id ? state.dependencies.filter((edge) => edge.to === id).map((edge) => edge.from) : options.parentId ? [options.parentId] : [],
    children: id ? state.dependencies.filter((edge) => edge.from === id).map((edge) => edge.to) : [],
  };
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
  document.querySelector('#task-error').textContent = '';
  updatePlacementSummary();
  setPriority(task.urgency, task.importance);
  dialog.showModal();
  document.querySelector('#task-title').focus({ preventScroll: true });
  if (!id && task.projectId && !options.parentId) openPlacement(task.projectId);
}

function closeTask() {
  dialog.close();
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  else root.querySelector('.primary-action')?.focus({ preventScroll: true });
}

function draftTask() {
  return {
    ...state.tasks.find((task) => task.id === editingId),
    id: draftTaskId, projectId: document.querySelector('#task-project').value,
    title: document.querySelector('#task-title').value.trim() || 'Dein neues To-do',
    optional: document.querySelector('#task-optional').checked,
  };
}

function updatePlacementSummary() {
  document.querySelector('#task-placement').hidden = !draftProjectId;
  document.querySelector('#task-placement-summary').textContent = draftLinks.parents.length || draftLinks.children.length
    ? `${draftLinks.parents.length} Vorgänger · ${draftLinks.children.length} Nachfolger`
    : 'Eigener Startpunkt · noch ohne Verbindungen';
}

function openPlacement(projectId) {
  if (!projectId) return;
  placementReturnFocus = document.activeElement;
  placementRole = 'parents';
  placementDraft = {
    projectId,
    parents: projectId === draftProjectId ? [...draftLinks.parents] : [],
    children: projectId === draftProjectId ? [...draftLinks.children] : [],
  };
  document.querySelector('#placement-error').textContent = '';
  renderPlacement();
  placementDialog.showModal();
}

function renderPlacement() {
  const project = state.projects.find((item) => item.id === placementDraft.projectId);
  const tasks = state.tasks.filter((task) => task.projectId === project.id && task.id !== draftTaskId);
  const positions = graphPositions(tasks, state.dependencies);
  const bounds = graphBounds(positions);
  const scale = .78;
  document.querySelector('#placement-project-name').textContent = `${project.name} · ${document.querySelector('#task-title').value.trim() || 'Neues To-do'}`;
  placementDialog.querySelectorAll('[data-role]').forEach((button) => button.setAttribute('aria-pressed', button.dataset.role === placementRole));
  document.querySelector('#placement-graph').innerHTML = tasks.length ? `<div class="placement-canvas" style="width:${bounds.width * scale}px;height:${bounds.height * scale}px">
    <svg class="placement-edges" width="${bounds.width * scale}" height="${bounds.height * scale}" aria-hidden="true">${state.dependencies.filter((edge) => positions[edge.from] && positions[edge.to]).map((edge) => {
      const from = positions[edge.from];
      const to = positions[edge.to];
      return `<path d="${edgePath({ x: from.x * scale + 162, y: from.y * scale + 42 }, { x: to.x * scale, y: to.y * scale + 42 })}" class="${edge.required ? '' : 'optional-edge'}"/>`;
    }).join('')}</svg>
    ${tasks.map((task) => {
      const role = placementDraft.parents.includes(task.id) ? 'parent' : placementDraft.children.includes(task.id) ? 'child' : '';
      return `<button class="placement-node ${role ? `selected-${role}` : ''}" style="left:${positions[task.id].x * scale}px;top:${positions[task.id].y * scale}px" data-node="${task.id}" aria-pressed="${Boolean(role)}"><span>${role === 'parent' ? 'Vorgänger' : role === 'child' ? 'Nachfolger' : 'Auswählen'}</span><strong>${escapeHtml(task.title)}</strong></button>`;
    }).join('')}</div>` : '<div class="placement-empty"><strong>Hier beginnt dein Projekt.</strong><p>Dieses To-do wird der erste Startpunkt. Weitere Schritte kannst du später direkt am Knoten ergänzen.</p></div>';
  const names = (ids) => ids.map((id) => escapeHtml(state.tasks.find((task) => task.id === id)?.title || '')).join(', ');
  document.querySelector('#placement-summary').innerHTML = `<div><small>DAVOR</small><strong>${names(placementDraft.parents) || 'Kein Vorgänger'}</strong></div>${icon('arrow')}<div class="placement-current"><small>DIESES TO-DO</small><strong>${escapeHtml(document.querySelector('#task-title').value.trim() || 'Dein neuer Schritt')}</strong></div>${icon('arrow')}<div><small>DANACH</small><strong>${names(placementDraft.children) || 'Kein Nachfolger'}</strong></div>`;
}

function closePlacement() {
  placementDialog.close();
  document.querySelector('#task-project').value = draftProjectId;
  placementReturnFocus?.focus({ preventScroll: true });
}

document.querySelector('#task-project').addEventListener('change', (event) => {
  if (event.target.value) openPlacement(event.target.value);
  else {
    draftProjectId = '';
    draftLinks = { parents: [], children: [] };
    updatePlacementSummary();
  }
});
document.querySelector('#edit-placement').addEventListener('click', () => openPlacement(draftProjectId));
placementDialog.addEventListener('click', (event) => {
  const roleButton = event.target.closest('[data-role]');
  const node = event.target.closest('[data-node]');
  if (roleButton) placementRole = roleButton.dataset.role;
  else if (node) {
    const id = node.dataset.node;
    const other = placementRole === 'parents' ? 'children' : 'parents';
    placementDraft[other] = placementDraft[other].filter((value) => value !== id);
    placementDraft[placementRole] = placementDraft[placementRole].includes(id)
      ? placementDraft[placementRole].filter((value) => value !== id) : [...placementDraft[placementRole], id];
  } else return;
  document.querySelector('#placement-error').textContent = '';
  renderPlacement();
  if (node) placementDialog.querySelector(`[data-node="${node.dataset.node}"]`)?.focus({ preventScroll: true });
});
document.querySelector('#placement-root').addEventListener('click', () => {
  placementDraft.parents = [];
  placementDraft.children = [];
  document.querySelector('#placement-error').textContent = '';
  renderPlacement();
});
document.querySelector('#apply-placement').addEventListener('click', () => {
  const task = { ...draftTask(), projectId: placementDraft.projectId };
  const result = reconnectTask(state.tasks, state.dependencies, task, placementDraft.parents, placementDraft.children);
  if (result.error) {
    document.querySelector('#placement-error').textContent = result.error;
    return;
  }
  draftProjectId = placementDraft.projectId;
  draftLinks = { parents: [...placementDraft.parents], children: [...placementDraft.children] };
  updatePlacementSummary();
  closePlacement();
});

function refreshImagePreview() {
  const name = document.querySelector('#project-name').value.trim() || 'Dein Projekt';
  document.querySelector('#project-image-preview').innerHTML = projectImageUrl
    ? `<img src="${escapeHtml(projectImageUrl)}" alt="Vorschau deines Projektbildes">`
    : `<span>${escapeHtml(initials(name))}</span><strong>Dein Bild. Dein Projekt.</strong><small>Oder starte erstmal ohne Bild.</small>`;
  document.querySelector('#remove-project-image').disabled = !projectImageUrl;
}

function openProject(id = null) {
  clearConnection();
  const project = state.projects.find((item) => item.id === id);
  editingProjectId = id;
  projectReturnFocus = document.activeElement;
  imageRequest++;
  imageLoading = false;
  projectImageUrl = project?.imageUrl || '';
  document.querySelector('#project-form').reset();
  document.querySelector('#project-name').setCustomValidity('');
  document.querySelector('#project-name').value = project?.name || '';
  document.querySelector('#project-description').value = project?.description || '';
  document.querySelector('#project-tone').value = project?.tone || 'forest';
  document.querySelector('#project-heading').textContent = project ? 'Dein Projekt' : 'Neues Projekt';
  document.querySelector('#save-project').textContent = project ? 'Änderungen speichern' : 'Projekt anlegen';
  document.querySelector('#save-project').disabled = false;
  document.querySelector('#project-error').textContent = '';
  document.querySelector('#image-error').textContent = '';
  refreshImagePreview();
  projectDialog.showModal();
  document.querySelector('#project-name').focus();
}

function releaseDraftImage() {
  const original = state.projects.find((project) => project.id === editingProjectId)?.imageUrl;
  if (projectImageUrl && projectImageUrl !== original) URL.revokeObjectURL(projectImageUrl);
}

function closeProject() {
  imageRequest++;
  releaseDraftImage();
  projectImageUrl = '';
  projectDialog.close();
  if (projectReturnFocus?.isConnected) projectReturnFocus.focus({ preventScroll: true });
  else root.querySelector('.primary-action')?.focus({ preventScroll: true });
}

document.querySelector('#project-name').addEventListener('input', (event) => {
  event.target.setCustomValidity('');
  refreshImagePreview();
});
document.querySelector('#pick-project-image').addEventListener('click', () => document.querySelector('#project-image-file').click());
document.querySelector('#remove-project-image').addEventListener('click', () => {
  imageRequest++;
  imageLoading = false;
  document.querySelector('#save-project').disabled = false;
  releaseDraftImage();
  projectImageUrl = '';
  document.querySelector('#project-image-file').value = '';
  refreshImagePreview();
});
document.querySelector('#project-image-file').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const request = ++imageRequest;
  imageLoading = false;
  document.querySelector('#save-project').disabled = false;
  const error = document.querySelector('#image-error');
  error.textContent = '';
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    error.textContent = 'Bitte ein PNG-, JPG- oder WebP-Bild mit maximal 5 MB auswählen.';
    return;
  }
  imageLoading = true;
  document.querySelector('#save-project').disabled = true;
  let url;
  try {
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const isRaster = (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
      || (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
      || (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP');
    if (!isRaster) throw new Error('invalid image');
    url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > 32_000_000) throw new Error('image too large');
    if (request !== imageRequest || !projectDialog.open) {
      URL.revokeObjectURL(url);
      return;
    }
    releaseDraftImage();
    projectImageUrl = url;
    refreshImagePreview();
  } catch {
    if (url) URL.revokeObjectURL(url);
    if (request === imageRequest) error.textContent = 'Dieses Bild konnte nicht geladen werden. Bitte ein anderes PNG, JPG oder WebP auswählen.';
  } finally {
    if (request === imageRequest) {
      imageLoading = false;
      document.querySelector('#save-project').disabled = false;
    }
  }
});
document.querySelector('#project-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (imageLoading) return;
  const name = document.querySelector('#project-name');
  if (!name.value.trim()) {
    name.setCustomValidity('Gib deinem Projekt bitte einen Namen.');
    name.reportValidity();
    return;
  }
  const original = state.projects.find((project) => project.id === editingProjectId);
  const project = {
    id: original?.id || crypto.randomUUID(), name: name.value.trim(),
    description: document.querySelector('#project-description').value.trim(),
    tone: document.querySelector('#project-tone').value, imageUrl: projectImageUrl,
  };
  state.projects = original ? state.projects.map((item) => item.id === project.id ? project : item) : [...state.projects, project];
  if (!original) {
    selectedEdge = null;
    state.view = 'projects';
    state.projectFilter = project.id;
  }
  const oldImage = original?.imageUrl;
  projectImageUrl = '';
  render();
  closeProject();
  if (oldImage && oldImage !== project.imageUrl) URL.revokeObjectURL(oldImage);
  notify(original ? 'Dein Projekt wurde aktualisiert.' : 'Dein neues Projekt ist bereit für den ersten Schritt.');
});

function updateEdgeSelection() {
  const panel = root.querySelector('#edge-selection');
  if (!panel) return;
  const edge = state.dependencies.find((item) => item.from === selectedEdge?.from && item.to === selectedEdge?.to);
  panel.hidden = !edge;
  if (edge) {
    const from = state.tasks.find((task) => task.id === edge.from);
    const to = state.tasks.find((task) => task.id === edge.to);
    panel.innerHTML = `<span>${escapeHtml(from.title)} ${icon('arrow')} ${escapeHtml(to.title)}<small>${edge.required ? 'Voraussetzung' : 'Empfehlung'}</small></span><button class="button button-quiet" data-action="remove-edge">${icon('unlink')}Verbindung entfernen</button>`;
  }
  root.querySelectorAll('.graph-edge').forEach((element) => {
    const selected = element.dataset.from === selectedEdge?.from && element.dataset.to === selectedEdge?.to;
    element.classList.toggle('selected', selected);
    element.querySelector('.edge-hit').setAttribute('aria-pressed', selected);
  });
}

function connectionStatus(text, error = false) {
  const status = root.querySelector('#connection-status');
  if (!status) return;
  status.textContent = text;
  status.classList.toggle('is-error', error);
}

function clearConnection() {
  connectionStart = null;
  root.querySelector('#connection-preview')?.setAttribute('hidden', '');
  root.querySelectorAll('.graph-port.is-connecting').forEach((port) => port.classList.remove('is-connecting'));
  connectionStatus('Knoten verschieben · Ausgang mit Eingang verbinden · Plus für einen Folgeschritt');
}

function selectPort(port) {
  if (!connectionStart || connectionStart.port === port.port) {
    const same = connectionStart?.id === port.id && connectionStart?.port === port.port;
    clearConnection();
    if (same) return;
    connectionStart = port;
    root.querySelector(`.graph-port[data-id="${port.id}"][data-port="${port.port}"]`)?.classList.add('is-connecting');
    connectionStatus(`Jetzt einen ${port.port === 'out' ? 'Eingang' : 'Ausgang'} wählen. Escape bricht ab.`);
    return;
  }
  const from = connectionStart.port === 'out' ? connectionStart.id : port.id;
  const to = connectionStart.port === 'in' ? connectionStart.id : port.id;
  const error = connectionError(state.tasks, state.dependencies, from, to);
  clearConnection();
  if (error) {
    connectionStatus(error, true);
    notify(error);
    return;
  }
  const source = state.tasks.find((task) => task.id === from);
  const target = state.tasks.find((task) => task.id === to);
  state.dependencies.push({ from, to, required: !(source.optional && !target.optional) });
  selectedEdge = { from, to };
  render();
  notify('Neue Verbindung hinzugefügt.');
}

function paintGraph() {
  const canvas = root.querySelector('.graph-canvas');
  if (!canvas) return;
  const tasks = state.tasks.filter((task) => task.projectId === state.projectFilter);
  const positions = Object.fromEntries(tasks.map((task) => [task.id, task.graph]));
  const bounds = graphBounds(positions);
  canvas.style.width = `${bounds.width}px`;
  canvas.style.height = `${bounds.height}px`;
  const svg = canvas.querySelector('.graph-edges');
  svg.setAttribute('width', bounds.width);
  svg.setAttribute('height', bounds.height);
  svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
  svg.innerHTML = graphEdges(positions);
  for (const task of tasks) {
    const node = canvas.querySelector(`.graph-node[data-id="${task.id}"]`);
    node.style.left = `${task.graph.x}px`;
    node.style.top = `${task.graph.y}px`;
  }
}

function previewConnection(source, clientX, clientY) {
  const canvas = root.querySelector('.graph-canvas');
  const path = root.querySelector('#connection-preview');
  if (!canvas || !path) return;
  const rect = canvas.getBoundingClientRect();
  const task = state.tasks.find((item) => item.id === source.id);
  const anchor = { x: task.graph.x + (source.port === 'out' ? NODE_WIDTH : 0), y: task.graph.y + NODE_HEIGHT / 2 };
  const cursor = { x: clientX - rect.left, y: clientY - rect.top };
  path.removeAttribute('hidden');
  path.setAttribute('d', source.port === 'out' ? edgePath(anchor, cursor) : edgePath(cursor, anchor));
}

root.addEventListener('pointerdown', (event) => {
  const canvas = event.target.closest('.graph-canvas');
  if (!canvas || !event.isPrimary || event.button !== 0) return;
  const port = event.target.closest('.graph-port');
  const node = event.target.closest('.graph-node');
  if (!node || event.target.closest('.node-add-child')) return;
  event.preventDefault();
  const scroll = canvas.parentElement;
  const task = state.tasks.find((item) => item.id === node.dataset.id);
  graphGesture = {
    kind: port ? 'connect' : 'move', id: task.id, pointerId: event.pointerId,
    x: event.clientX, y: event.clientY, moved: false, canvas,
    original: { ...task.graph }, scrollX: scroll.scrollLeft, scrollY: scroll.scrollTop,
    port: port ? { id: task.id, port: port.dataset.port } : null,
    openOnClick: Boolean(event.target.closest('.graph-node-open')),
  };
  canvas.setPointerCapture(event.pointerId);
  (port || event.target.closest('button'))?.focus({ preventScroll: true });
});

root.addEventListener('pointermove', (event) => {
  if (!graphGesture) {
    if (connectionStart && event.target.closest('.graph-canvas')) previewConnection(connectionStart, event.clientX, event.clientY);
    return;
  }
  if (graphGesture.pointerId !== event.pointerId) return;
  const dx = event.clientX - graphGesture.x;
  const dy = event.clientY - graphGesture.y;
  if (Math.hypot(dx, dy) > 4) graphGesture.moved = true;
  if (!graphGesture.moved) return;
  if (graphGesture.kind === 'connect') {
    previewConnection(connectionStart || graphGesture.port, event.clientX, event.clientY);
    return;
  }
  const task = state.tasks.find((item) => item.id === graphGesture.id);
  const scroll = graphGesture.canvas.parentElement;
  task.graph = {
    x: Math.max(36, Math.round(graphGesture.original.x + dx + scroll.scrollLeft - graphGesture.scrollX)),
    y: Math.max(36, Math.round(graphGesture.original.y + dy + scroll.scrollTop - graphGesture.scrollY)),
  };
  graphGesture.canvas.querySelector(`.graph-node[data-id="${task.id}"]`).classList.add('is-dragging');
  paintGraph();
});

root.addEventListener('pointerup', (event) => {
  if (!graphGesture || graphGesture.pointerId !== event.pointerId) return;
  const gesture = graphGesture;
  graphGesture = null;
  if (gesture.canvas.hasPointerCapture(event.pointerId)) gesture.canvas.releasePointerCapture(event.pointerId);
  if (gesture.kind === 'move') {
    gesture.canvas.querySelector(`.graph-node[data-id="${gesture.id}"]`)?.classList.remove('is-dragging');
    if (gesture.moved) suppressGraphClickUntil = performance.now() + 350;
    else if (gesture.openOnClick) {
      suppressGraphClickUntil = performance.now() + 350;
      openTask(gesture.id);
    }
    return;
  }
  suppressGraphClickUntil = performance.now() + 350;
  if (!gesture.moved) {
    selectPort(gesture.port);
    return;
  }
  const hit = document.elementFromPoint(event.clientX, event.clientY);
  const node = hit?.closest('.graph-node');
  if (!node) {
    clearConnection();
    return;
  }
  const source = connectionStart || gesture.port;
  const target = { id: node.dataset.id, port: hit.closest('.graph-port')?.dataset.port || (source.port === 'out' ? 'in' : 'out') };
  connectionStart = source;
  selectPort(target);
});

for (const type of ['pointercancel', 'lostpointercapture']) {
  root.addEventListener(type, (event) => {
    if (!graphGesture || event.pointerId !== graphGesture.pointerId) return;
    const gesture = graphGesture;
    graphGesture = null;
    if (gesture.kind === 'move') {
      state.tasks.find((task) => task.id === gesture.id).graph = gesture.original;
      gesture.canvas.querySelector(`.graph-node[data-id="${gesture.id}"]`)?.classList.remove('is-dragging');
      paintGraph();
    }
    clearConnection();
  });
}

root.addEventListener('keydown', (event) => {
  const grip = event.target.closest('[data-action="move-node"]');
  const movement = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
  if (grip && movement) {
    event.preventDefault();
    const task = state.tasks.find((item) => item.id === grip.dataset.id);
    const step = event.shiftKey ? 40 : 10;
    task.graph.x = Math.max(36, task.graph.x + movement[0] * step);
    task.graph.y = Math.max(36, task.graph.y + movement[1] * step);
    paintGraph();
  }
  const edge = event.target.closest('.edge-hit');
  if (edge && ['Enter', ' '].includes(event.key)) {
    event.preventDefault();
    selectedEdge = { from: edge.dataset.from, to: edge.dataset.to };
    updateEdgeSelection();
  }
});

root.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  if (button.closest('.graph-canvas') && event.detail > 0 && performance.now() < suppressGraphClickUntil) return;
  const { action, id, view, date, offset, layout } = button.dataset;
  if (action === 'review') {
    reviewDialog.showModal();
    return;
  }
  if (action === 'new-task' || action === 'open-task') {
    openTask(action === 'open-task' ? id : null, date, { undated: button.dataset.undated === 'true' });
    return;
  }
  if (action === 'new-project' || action === 'edit-project') {
    openProject(action === 'edit-project' ? id : null);
    return;
  }
  if (action === 'new-child') {
    const parent = state.tasks.find((task) => task.id === id);
    openTask(null, null, { projectId: parent.projectId, parentId: id });
    return;
  }
  if (action === 'port') {
    selectPort({ id, port: button.dataset.port });
    return;
  }
  if (action === 'move-node') return;
  if (action === 'select-edge') {
    selectedEdge = { from: button.dataset.from, to: button.dataset.to };
    updateEdgeSelection();
    return;
  }
  if (action === 'navigate') {
    clearConnection();
    selectedEdge = null;
    state.view = view;
    if (view === 'calendar') {
      state.month = state.anchor;
      if (!state.calendarVisited) state.dateBasis = 'dueDate';
      state.calendarVisited = true;
    }
  } else if (action === 'layout') {
    state.layout = layout;
    resetTimeline = true;
  } else if (action === 'month-shift') {
    state.month = addMonths(state.month, Number(offset));
  } else if (action === 'today') {
    state.anchor = today;
    state.month = today;
    resetTimeline = true;
  } else if (action === 'open-project') {
    clearConnection();
    selectedEdge = null;
    state.projectFilter = id;
    state.view = 'projects';
  } else if (action === 'all-projects') {
    clearConnection();
    selectedEdge = null;
    state.projectFilter = 'all';
  } else if (action === 'open-day') {
    state.anchor = date;
    state.view = 'upcoming';
    state.layout = 'list';
    resetTimeline = true;
  } else if (action === 'auto-layout') {
    const tasks = state.tasks.filter((task) => task.projectId === state.projectFilter);
    const positions = autoLayout(tasks, state.dependencies);
    for (const task of tasks) task.graph = positions[task.id];
    clearConnection();
    render();
    root.querySelector('.graph-scroll')?.scrollTo(0, 0);
    notify('Der Projektbaum ist wieder automatisch angeordnet.');
    return;
  } else if (action === 'remove-edge' && selectedEdge) {
    state.dependencies = state.dependencies.filter((edge) => !(edge.from === selectedEdge.from && edge.to === selectedEdge.to));
    selectedEdge = null;
    clearConnection();
    notify('Verbindung entfernt. Die To-dos bleiben erhalten.');
  } else if (action === 'complete-task') {
    const task = state.tasks.find((item) => item.id === id);
    task.status = task.status === 'done' ? 'open' : 'done';
    notify(task.status === 'done' ? 'Ein Schritt geschafft. Gut gemacht.' : 'Das To-do ist wieder offen.');
  }
  render();
});

root.addEventListener('change', (event) => {
  if (event.target.id === 'project-filter') {
    clearConnection();
    selectedEdge = null;
    state.projectFilter = event.target.value;
  }
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
    ...original, id: editingId || draftTaskId, title: titleInput.value.trim(),
    description: document.querySelector('#task-description').value.trim(),
    projectId: document.querySelector('#task-project').value,
    plannedDate: document.querySelector('#task-planned').value,
    dueDate: document.querySelector('#task-due').value,
    status: document.querySelector('#task-status').value,
    optional: document.querySelector('#task-optional').checked, ...draftPriority,
  };
  const result = reconnectTask(state.tasks, state.dependencies, task, draftLinks.parents, draftLinks.children);
  if (result.error) {
    document.querySelector('#task-error').textContent = result.error;
    return;
  }
  if (!original || original.projectId !== task.projectId) {
    delete task.graph;
    if (task.projectId) {
      const others = state.tasks.filter((item) => item.projectId === task.projectId && item.id !== task.id);
      const positions = graphPositions(others, result.edges);
      const parents = draftLinks.parents.map((id) => positions[id]).filter(Boolean);
      const children = draftLinks.children.map((id) => positions[id]).filter(Boolean);
      const automatic = autoLayout([...others, task], result.edges)[task.id];
      task.graph = parents.length
        ? { x: Math.max(...parents.map((point) => point.x)) + 280, y: parents.reduce((sum, point) => sum + point.y, 0) / parents.length }
        : children.length ? { x: Math.max(36, Math.min(...children.map((point) => point.x)) - 280), y: children[0].y } : automatic;
      while (Object.values(positions).some((point) => Math.abs(point.x - task.graph.x) < NODE_WIDTH + 24 && Math.abs(point.y - task.graph.y) < NODE_HEIGHT + 24)) task.graph.y += NODE_HEIGHT + 40;
    }
  }
  state.dependencies = result.edges;
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
placementDialog.querySelectorAll('.close-placement').forEach((button) => button.addEventListener('click', closePlacement));
projectDialog.querySelectorAll('.close-project').forEach((button) => button.addEventListener('click', closeProject));
for (const [modal, close] of [[placementDialog, closePlacement], [projectDialog, closeProject]]) {
  modal.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
}
for (const modal of [dialog, reviewDialog, placementDialog, projectDialog]) {
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
      else if (modal === placementDialog) closePlacement();
      else if (modal === projectDialog) closeProject();
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
  if (event.key === 'Escape' && !document.querySelector('dialog[open]')) clearConnection();
  if (event.key.toLowerCase() === 'n' && !event.ctrlKey && !event.metaKey && !event.altKey
    && !event.repeat && !event.target.closest('input, textarea, select, [contenteditable]')
    && !document.querySelector('dialog[open]')) {
    event.preventDefault();
    openTask();
  }
});

render();
