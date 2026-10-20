import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, addMonths, calendarDays, clampPriority, createDemo,
  dateKey, parseDate, priorityFromPoint, priorityKey, taskState,
  autoLayout, connectionError, reconnectTask, dateRange,
} from '../model.mjs';

test('matrix coordinates increase urgency to the right and importance upward', () => {
  const rect = { left: 20, top: 40, width: 200, height: 200 };
  assert.deepEqual(priorityFromPoint(20, 40, rect), { urgency: 0, importance: 100 });
  assert.deepEqual(priorityFromPoint(220, 240, rect), { urgency: 100, importance: 0 });
  assert.deepEqual(priorityFromPoint(120, 140, rect), { urgency: 50, importance: 50 });
  assert.deepEqual(priorityFromPoint(-80, -60, rect), { urgency: 0, importance: 100 });
});

test('priority values are bounded integers, including invalid input', () => {
  assert.equal(clampPriority(-5), 0);
  assert.equal(clampPriority(101), 100);
  assert.equal(clampPriority(44.6), 45);
  assert.equal(clampPriority(Number.NaN), 50);
  assert.deepEqual(priorityFromPoint(0, 0, { width: 0, height: 0 }), { urgency: 50, importance: 50 });
});

test('all four quadrants have consistent boundaries', () => {
  assert.equal(priorityKey(100, 100), 'do');
  assert.equal(priorityKey(0, 100), 'plan');
  assert.equal(priorityKey(100, 0), 'delegate');
  assert.equal(priorityKey(0, 0), 'later');
  assert.equal(priorityKey(50, 50), 'do');
});

test('calendar arithmetic uses calendar days across month, year and DST boundaries', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-28', 2), '2026-03-30');
  assert.equal(addDays('2026-10-24', 2), '2026-10-26');
  assert.equal(addMonths('2026-01-31', 1), '2026-02-01');
  assert.equal(dateKey(parseDate('2026-10-20')), '2026-10-20');
});

test('month grid has six Monday-first weeks', () => {
  const days = calendarDays('2026-10-20');
  assert.equal(days.length, 42);
  assert.equal(days[0], '2026-09-28');
  assert.equal(days.at(-1), '2026-11-08');
  assert.equal(parseDate(days[0]).getDay(), 1);
});

test('required dependencies block steps; optional recommendations do not', () => {
  const demo = createDemo('2026-10-20');
  const homepage = demo.tasks.find((task) => task.id === 'homepage');
  const animation = demo.tasks.find((task) => task.id === 'animation');
  assert.equal(taskState(homepage, demo.tasks, demo.dependencies), 'blocked');
  assert.equal(taskState(animation, demo.tasks, demo.dependencies), 'open');
  demo.tasks.find((task) => task.id === 'moodboard').status = 'done';
  assert.equal(taskState(homepage, demo.tasks, demo.dependencies), 'open');
});

test('optional parents create recommendations rather than blocking the main path', () => {
  const demo = createDemo('2026-10-20');
  const task = { id: 'new', title: 'Next', projectId: 'portfolio', optional: false, status: 'open' };
  const result = reconnectTask(demo.tasks, demo.dependencies, task, ['animation'], []);
  assert.equal(result.error, '');
  assert.equal(result.edges.find((edge) => edge.from === 'animation' && edge.to === 'new').required, false);
  assert.equal(taskState(task, [...demo.tasks, task], result.edges), 'open');
});

test('demo sessions are independent and distinguish planning from deadlines', () => {
  const first = createDemo('2026-10-20');
  const second = createDemo('2026-10-20');
  first.tasks[0].title = 'Changed';
  assert.notEqual(first.tasks[0].title, second.tasks[0].title);
  const moodboard = second.tasks.find((task) => task.id === 'moodboard');
  assert.equal(moodboard.plannedDate, '2026-10-20');
  assert.equal(moodboard.dueDate, '2026-10-21');
});

test('graph connections reject self-links, duplicates, cross-project links and cycles', () => {
  const { tasks, dependencies } = createDemo('2026-10-20');
  assert.match(connectionError(tasks, dependencies, 'vision', 'vision'), /selbst/);
  assert.match(connectionError(tasks, dependencies, 'vision', 'content'), /bereits/);
  assert.match(connectionError(tasks, dependencies, 'vision', 'walk'), /Projekt/);
  assert.match(connectionError(tasks, dependencies, 'feedback', 'vision'), /Kreis/);
  assert.equal(connectionError(tasks, dependencies, 'content', 'animation'), '');
});

test('a task can have three parents and three children without mutating draft data', () => {
  const tasks = Array.from({ length: 6 }, (_, index) => ({ id: `n${index}`, projectId: 'p', optional: false }));
  const original = structuredClone(tasks);
  const result = reconnectTask(tasks, [], { id: 'center', projectId: 'p' }, ['n0', 'n1', 'n2'], ['n3', 'n4', 'n5']);
  assert.equal(result.error, '');
  assert.equal(result.edges.filter((edge) => edge.to === 'center').length, 3);
  assert.equal(result.edges.filter((edge) => edge.from === 'center').length, 3);
  assert.deepEqual(tasks, original);
});

test('task placement validates all draft links together and preserves unrelated edges', () => {
  const { tasks, dependencies } = createDemo('2026-10-20');
  const next = { id: 'new', projectId: 'portfolio' };
  const invalid = reconnectTask(tasks, dependencies, next, ['feedback'], ['vision']);
  assert.match(invalid.error, /Kreis/);
  assert.deepEqual(invalid.edges, dependencies);
  const valid = reconnectTask(tasks, dependencies, next, ['content'], ['feedback']);
  assert.equal(valid.error, '');
  assert.ok(valid.edges.some((edge) => edge.from === 'vision' && edge.to === 'moodboard'));
});

test('editing or moving a task replaces only its own incident connections', () => {
  const { tasks, dependencies } = createDemo('2026-10-20');
  const original = tasks.find((task) => task.id === 'homepage');
  const result = reconnectTask(tasks, dependencies, { ...original, projectId: 'balance' }, ['walk'], []);
  assert.equal(result.error, '');
  assert.equal(result.edges.filter((edge) => edge.from === 'homepage').length, 0);
  assert.deepEqual(result.edges.filter((edge) => edge.to === 'homepage'), [{ from: 'walk', to: 'homepage', required: true }]);
  assert.ok(result.edges.some((edge) => edge.from === 'vision' && edge.to === 'content'));
});

test('auto-layout is deterministic, non-overlapping, and respects every dependency', () => {
  const { tasks, dependencies } = createDemo('2026-10-20');
  const projectTasks = tasks.filter((task) => task.projectId === 'portfolio');
  const before = structuredClone(projectTasks);
  const layout = autoLayout(projectTasks, dependencies);
  assert.deepEqual(layout, autoLayout(projectTasks, dependencies));
  assert.deepEqual(projectTasks, before);
  for (const edge of dependencies) assert.ok(layout[edge.from].x < layout[edge.to].x);
  assert.equal(new Set(Object.values(layout).map(({ x, y }) => `${x}:${y}`)).size, projectTasks.length);
  assert.deepEqual(autoLayout([], []), {});
  assert.throws(() => autoLayout(projectTasks, [...dependencies, { from: 'feedback', to: 'vision' }]), /Kreis/);
});

test('continuous day ranges cross month boundaries without missing or duplicating dates', () => {
  const days = dateRange('2026-10-24', '2026-11-04');
  assert.equal(days.length, 12);
  assert.equal(new Set(days).size, 12);
  assert.equal(days[0], '2026-10-24');
  assert.equal(days.at(-1), '2026-11-04');
  assert.deepEqual(dateRange('2026-10-25', '2026-10-24'), []);
});

test('auto-layout only returns positions and never writes to tasks or edited edges', () => {
  const demo = createDemo('2026-10-20');
  const tasks = Object.freeze(demo.tasks.filter((task) => task.projectId === 'portfolio').map((task) =>
    Object.freeze({ ...task, graph: Object.freeze({ x: 500, y: 800 }) }),
  ));
  const edges = Object.freeze([
    ...demo.dependencies.filter((edge) => !(edge.from === 'vision' && edge.to === 'content')),
    { from: 'content', to: 'animation', required: false },
  ].map((edge) => Object.freeze(edge)));
  const before = structuredClone({ tasks, edges });
  for (let index = 0; index < 3; index++) {
    const positions = autoLayout(tasks, edges);
    assert.deepEqual(Object.keys(positions).sort(), tasks.map((task) => task.id).sort());
    for (const point of Object.values(positions)) assert.deepEqual(Object.keys(point).sort(), ['x', 'y']);
    assert.deepEqual({ tasks, edges }, before);
  }
});
