import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, addMonths, calendarDays, clampPriority, createDemo,
  dateKey, parseDate, priorityFromPoint, priorityKey, projectProgress, taskState,
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

test('optional tasks do not alter required project progress', () => {
  const demo = createDemo('2026-10-20');
  assert.deepEqual(projectProgress(demo.tasks, 'portfolio'), { completed: 2, total: 5, percent: 40 });
  demo.tasks.find((task) => task.id === 'animation').status = 'done';
  assert.equal(projectProgress(demo.tasks, 'portfolio').percent, 40);
  assert.deepEqual(projectProgress([], 'empty'), { completed: 0, total: 0, percent: 0 });
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
