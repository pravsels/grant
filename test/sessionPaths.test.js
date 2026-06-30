const test = require('node:test');
const assert = require('node:assert/strict');

const { formatDayFolder } = require('../sessionPaths');

test('formats session day folders with sortable and readable dates', () => {
  assert.equal(
    formatDayFolder(new Date(2026, 3, 1)),
    '2026-04-01_1-April-2026'
  );
  assert.equal(
    formatDayFolder(new Date(2026, 4, 1)),
    '2026-05-01_1-May-2026'
  );
});
