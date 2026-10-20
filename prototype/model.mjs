export const PRIORITIES = {
  do: { label: 'Jetzt erledigen', hint: 'Wichtig und dringend', tone: 'coral' },
  plan: { label: 'Einplanen', hint: 'Wichtig, nicht dringend', tone: 'forest' },
  delegate: { label: 'Delegieren', hint: 'Dringend, weniger wichtig', tone: 'ochre' },
  later: { label: 'Zurückstellen', hint: 'Weder wichtig noch dringend', tone: 'slate' },
};

export function clampPriority(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(Math.max(0, Math.min(100, number))) : 50;
}

export function priorityKey(urgency, importance) {
  if (importance >= 50) return urgency >= 50 ? 'do' : 'plan';
  return urgency >= 50 ? 'delegate' : 'later';
}

export function priorityFromPoint(x, y, rect) {
  if (rect.width <= 0 || rect.height <= 0) return { urgency: 50, importance: 50 };
  return {
    urgency: clampPriority(((x - rect.left) / rect.width) * 100),
    importance: clampPriority((1 - (y - rect.top) / rect.height) * 100),
  };
}

export function dateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function parseDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function addDays(value, days) {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

export function addMonths(value, months) {
  const date = parseDate(value);
  return dateKey(new Date(date.getFullYear(), date.getMonth() + months, 1, 12));
}

export function calendarDays(month) {
  const first = `${month.slice(0, 7)}-01`;
  const offset = (parseDate(first).getDay() + 6) % 7;
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function taskState(task, tasks, dependencies) {
  if (task.status === 'done') return 'done';
  const blocked = dependencies.some((edge) =>
    edge.to === task.id && edge.required && tasks.find((item) => item.id === edge.from)?.status !== 'done',
  );
  return blocked ? 'blocked' : task.status;
}

export function dateRange(start, end) {
  const days = [];
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
  return days;
}

export function connectionError(tasks, edges, from, to) {
  if (from === to) return 'Ein To-do kann nicht mit sich selbst verbunden werden.';
  const source = tasks.find((task) => task.id === from);
  const target = tasks.find((task) => task.id === to);
  if (!source || !target) return 'Bitte zwei vorhandene To-dos auswählen.';
  if (!source.projectId || source.projectId !== target.projectId) return 'Verbindungen sind nur innerhalb desselben Projekts möglich.';
  if (edges.some((edge) => edge.from === from && edge.to === to)) return 'Diese Verbindung gibt es bereits.';
  const pending = [to];
  const visited = new Set();
  while (pending.length) {
    const id = pending.pop();
    if (id === from) return 'Diese Verbindung würde einen Kreis erzeugen.';
    if (visited.has(id)) continue;
    visited.add(id);
    pending.push(...edges.filter((edge) => edge.from === id).map((edge) => edge.to));
  }
  return '';
}

export function reconnectTask(tasks, edges, task, parents, children) {
  const candidates = [...tasks.filter((item) => item.id !== task.id), task];
  const result = edges.filter((edge) => edge.from !== task.id && edge.to !== task.id);
  const links = [
    ...[...new Set(parents)].map((from) => ({ from, to: task.id })),
    ...[...new Set(children)].map((to) => ({ from: task.id, to })),
  ];
  for (const link of links) {
    const error = connectionError(candidates, result, link.from, link.to);
    if (error) return { edges, error };
    const source = candidates.find((item) => item.id === link.from);
    const target = candidates.find((item) => item.id === link.to);
    const previous = edges.find((edge) => edge.from === link.from && edge.to === link.to);
    result.push({ ...link, required: source.optional && !target.optional ? false : previous?.required ?? true });
  }
  return { edges: result, error: '' };
}

export const NODE_WIDTH = 210;
export const NODE_HEIGHT = 132;

export function autoLayout(tasks, edges) {
  const ids = new Set(tasks.map((task) => task.id));
  const links = edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to));
  const incoming = new Map(tasks.map((task) => [task.id, links.filter((edge) => edge.to === task.id).length]));
  const ranks = new Map(tasks.map((task) => [task.id, 0]));
  const queue = tasks.filter((task) => incoming.get(task.id) === 0).map((task) => task.id);
  let processed = 0;
  while (queue.length) {
    const id = queue.shift();
    processed++;
    for (const edge of links.filter((item) => item.from === id)) {
      ranks.set(edge.to, Math.max(ranks.get(edge.to), ranks.get(id) + 1));
      incoming.set(edge.to, incoming.get(edge.to) - 1);
      if (incoming.get(edge.to) === 0) queue.push(edge.to);
    }
  }
  if (processed !== tasks.length) throw new Error('Der Graph enthält einen Kreis.');
  const columns = new Map();
  for (const task of tasks) {
    const rank = ranks.get(task.id);
    if (!columns.has(rank)) columns.set(rank, []);
    columns.get(rank).push(task.id);
  }
  const rows = Math.max(1, ...[...columns.values()].map((column) => column.length));
  return Object.fromEntries([...columns].flatMap(([rank, column]) =>
    column.map((id, row) => [id, { x: 60 + rank * 280, y: 60 + (rows - column.length) * 94 + row * 188 }]),
  ));
}

export function graphPositions(tasks, edges) {
  const automatic = autoLayout(tasks, edges);
  return Object.fromEntries(tasks.map((task) => [task.id, task.graph || automatic[task.id]]));
}

export function graphBounds(positions) {
  return {
    width: Math.max(980, ...Object.values(positions).map(({ x }) => x + NODE_WIDTH + 90)),
    height: Math.max(470, ...Object.values(positions).map(({ y }) => y + NODE_HEIGHT + 70)),
  };
}

export function edgePath(from, to) {
  const reach = Math.max(45, Math.abs(to.x - from.x) / 2);
  return `M${from.x} ${from.y}C${from.x + reach} ${from.y},${to.x - reach} ${to.y},${to.x} ${to.y}`;
}

export function createDemo(today) {
  const projects = [
    { id: 'portfolio', name: 'Portfolio-Website', tone: 'forest', imageUrl: '', description: 'Ein neuer Auftritt für neue Möglichkeiten.' },
    { id: 'balance', name: 'Mehr Balance', tone: 'ochre', imageUrl: '', description: 'Kleine Schritte, die im Alltag guttun.' },
    { id: 'everyday', name: 'Alltag & Ideen', tone: 'lilac', imageUrl: '', description: 'Platz für alles, was sonst noch zählt.' },
  ];
  const task = (id, title, projectId, plannedOffset, dueOffset, urgency, importance, extra = {}) => ({
    id, title, projectId,
    plannedDate: plannedOffset === null ? '' : addDays(today, plannedOffset),
    dueDate: dueOffset === null ? '' : addDays(today, dueOffset),
    urgency, importance, status: 'open', optional: false, description: '', ...extra,
  });
  const tasks = [
    task('vision', 'Die Richtung festlegen', 'portfolio', -1, -1, 60, 80, {
      status: 'done', description: 'Wofür soll die neue Website stehen? Drei klare Ziele formulieren.', graph: { x: 30, y: 180 },
    }),
    task('content', 'Inhalte zusammentragen', 'portfolio', 0, 0, 64, 72, {
      status: 'done', description: 'Texte, Bilder und Referenzen an einem Ort sammeln.', graph: { x: 270, y: 60 },
    }),
    task('moodboard', 'Ein Moodboard gestalten', 'portfolio', 0, 1, 58, 85, {
      status: 'progress', description: 'Farben, Typografie und erste visuelle Ideen sammeln.', graph: { x: 270, y: 300 },
    }),
    task('homepage', 'Startseite entwerfen', 'portfolio', 1, 3, 42, 88, {
      description: 'Aus den gesammelten Ideen einen ersten Entwurf machen.', graph: { x: 510, y: 60 },
    }),
    task('animation', 'Mikroanimationen ausprobieren', 'portfolio', 2, null, 22, 35, {
      optional: true, description: 'Wenn noch Raum ist: kleine Details lebendig machen.', graph: { x: 510, y: 300 },
    }),
    task('feedback', 'Erstes Feedback einholen', 'portfolio', 3, 4, 28, 70, {
      description: 'Den Entwurf teilen und andere Perspektiven sammeln.', graph: { x: 750, y: 180 },
    }),
    task('walk', 'Eine Runde nach draußen', 'balance', 0, 0, 70, 65, {
      description: 'Eine halbe Stunde frische Luft. Ohne Bildschirm, ohne Eile.',
    }),
    task('training', 'Die Woche in Bewegung bringen', 'balance', 1, 3, 35, 70),
    task('meals', 'Lieblingsrezepte für die Woche', 'balance', 2, 2, 35, 45),
    task('invoice', 'Rechnung für Oktober prüfen', 'everyday', 0, 1, 82, 45),
    task('read', 'Ein Kapitel weiterlesen', 'everyday', 3, null, 12, 48, { optional: true }),
    task('idea', 'Ideen für ein kleines Nebenprojekt', 'everyday', null, null, 20, 72),
    task('checkup', 'Termin für den Jahrescheck vereinbaren', 'everyday', 1, 6, 48, 65),
  ];
  const dependencies = [
    { from: 'vision', to: 'content', required: true },
    { from: 'vision', to: 'moodboard', required: true },
    { from: 'content', to: 'homepage', required: true },
    { from: 'moodboard', to: 'homepage', required: true },
    { from: 'moodboard', to: 'animation', required: false },
    { from: 'homepage', to: 'feedback', required: true },
  ];
  return { projects, tasks, dependencies };
}
