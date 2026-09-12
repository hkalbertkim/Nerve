import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMissionMarkdown as normalize } from './normalize-mission-markdown';

const report = '# Report\n\n| Project | Revenue |\n| --- | ---: |\n| Beta | 1200 |';
test('unwraps a complete model Markdown report, including CRLF and bare wrappers', () => {
  for (const label of ['markdown', 'md', '']) {
    assert.equal(normalize('```' + label + '\n' + report + '\n```'), report);
  }
  assert.equal(normalize(('~~~markdown\n' + report + '\n~~~').replaceAll('\n', '\r\n')), report);
});
test('preserves ordinary Markdown, actual code, incomplete and mixed documents', () => {
  for (const source of [report, '```js\nconst x = 1;\n```', '```\nconst x = 1;\n```',
    '```markdown\n' + report, '```md\n# Example\n```\nOther text',
    '```md\n# Example\n```\n```md\n# Other\n```']) assert.equal(normalize(source), source);
});
test('preserves inner code fences inside a longer outer Markdown fence', () => {
  const body = '# Report\n\n```js\nconst x = 1;\n```';
  assert.equal(normalize('````markdown\n' + body + '\n````'), body);
});
