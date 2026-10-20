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

export function projectProgress(tasks, projectId) {
  const required = tasks.filter((task) => task.projectId === projectId && !task.optional);
  const completed = required.filter((task) => task.status === 'done').length;
  return { completed, total: required.length, percent: required.length ? Math.round((completed / required.length) * 100) : 0 };
}

export function createDemo(today) {
  const projects = [
    { id: 'portfolio', name: 'Portfolio-Website', tone: 'forest', icon: 'window', description: 'Ein neuer Auftritt für neue Möglichkeiten.' },
    { id: 'balance', name: 'Mehr Balance', tone: 'ochre', icon: 'leaf', description: 'Kleine Schritte, die im Alltag guttun.' },
    { id: 'everyday', name: 'Alltag & Ideen', tone: 'lilac', icon: 'sparkle', description: 'Platz für alles, was sonst noch zählt.' },
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
