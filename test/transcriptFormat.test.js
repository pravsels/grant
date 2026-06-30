const test = require('node:test');
const assert = require('node:assert/strict');

const { formatTranscript } = require('../transcriptFormat');

test('formats transcript speakers as markdown sections', () => {
  const transcript = formatTranscript([
    { role: 'user', content: 'How do I read sessions?' },
    { role: 'assistant', content: 'Use Markdown headings.' },
  ]);

  assert.equal(
    transcript,
    [
      '## Learner',
      '',
      'How do I read sessions?',
      '',
      '---',
      '',
      '## Grant',
      '',
      'Use Markdown headings.',
      '',
    ].join('\n')
  );
});
