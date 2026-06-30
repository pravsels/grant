const test = require('node:test');
const assert = require('node:assert/strict');

const {
  formatDayFolder,
  formatTimestampFile,
  isTranscriptFile,
  summaryPathFor,
} = require('../sessionPaths');

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

test('formats transcript filenames as markdown', () => {
  assert.equal(
    formatTimestampFile(new Date(2026, 3, 1, 9, 5, 7, 42)),
    '09-05-07-042.md'
  );
});

test('maps markdown and legacy text transcripts to summary files', () => {
  assert.equal(
    summaryPathFor('/sessions/demo/09-05-07-042.md'),
    '/sessions/demo/09-05-07-042.summary.md'
  );
  assert.equal(
    summaryPathFor('/sessions/demo/09-05-07-042.txt'),
    '/sessions/demo/09-05-07-042.summary.md'
  );
});

test('recognizes transcript files without picking up summaries', () => {
  assert.equal(isTranscriptFile('09-05-07-042.md'), true);
  assert.equal(isTranscriptFile('09-05-07-042.txt'), true);
  assert.equal(isTranscriptFile('09-05-07-042.summary.md'), false);
});
