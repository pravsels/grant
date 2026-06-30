const test = require('node:test');
const assert = require('node:assert/strict');

const { getChunkText } = require('../chunkText');

test('extracts text from every part in a streamed chunk', () => {
  const chunk = {
    candidates: [
      {
        content: {
          parts: [
            { text: 'Start with math: ' },
            { text: '$$\\hat{Q} = r + \\gamma Q(s, a)$$' },
            { text: '\n```js\nconsole.log("done");\n```' },
          ],
        },
      },
    ],
  };

  assert.equal(
    getChunkText(chunk),
    'Start with math: $$\\hat{Q} = r + \\gamma Q(s, a)$$\n```js\nconsole.log("done");\n```'
  );
});
