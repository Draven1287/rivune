import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAnswer, parseInline, safeAnswerLink } from './compiled/components/shared/answerFormat.js';

test('answer structure separates headings, paragraphs, lists and quotes', () => {
  const blocks = parseAnswer('## A practical plan\n\nStart small.\nKeep learning.\n\n- Demand\n- Operations\n\n3. Test\n4. Decide\n\n> One perspective\n> Another perspective\n\n### Next step\n\nFinish.');
  assert.deepEqual(blocks.map(block => block.type), ['heading', 'paragraph', 'list', 'list', 'quote', 'heading', 'paragraph']);
  assert.equal(blocks[0].level, 2);
  assert.equal(blocks[1].content[0].text, 'Start small.\nKeep learning.');
  assert.equal(blocks[2].ordered, false);
  assert.equal(blocks[2].items.length, 2);
  assert.equal(blocks[3].start, 3);
  assert.equal(blocks[4].content[0].text, 'One perspective\nAnother perspective');
  assert.equal(blocks[5].level, 3);
});

test('code fences preserve code literally including HTML and markdown', () => {
  const blocks = parseAnswer('Before\r\n\r\n```html\r\n<script>alert("x")</script>\r\n**literal**\r\n\r\n```\r\nAfter');
  assert.deepEqual(blocks[1], { type: 'code', language: 'html', text: '<script>alert("x")</script>\n**literal**\n' });
  assert.equal(blocks[2].type, 'paragraph');
});

test('long and unfinished fences safely contain shorter fences and remaining lines', () => {
  assert.deepEqual(parseAnswer('````js\n```\nconst n = 1;\n````')[0], { type: 'code', language: 'js', text: '```\nconst n = 1;' });
  assert.deepEqual(parseAnswer('~~~\n- still code\n<script>')[0], { type: 'code', language: '', text: '- still code\n<script>' });
});

test('inline content supports emphasis and code while retaining raw HTML as text', () => {
  const parts = parseInline('A **strong** and *soft* `literal <img>` <script>alert(1)</script>');
  assert.deepEqual(parts.filter(part => part.type !== 'text').map(part => part.type), ['strong', 'em', 'code']);
  assert.equal(parts.at(-1).text, ' <script>alert(1)</script>');
  assert.equal(parts.find(part => part.type === 'code').text, 'literal <img>');
  assert.deepEqual(parseInline('snake_case and \\*literal\\*'), [{ type: 'text', text: 'snake_case and *literal*' }]);
});

test('only explicit valid HTTP and HTTPS destinations become links', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,<script>', '//evil.test', '/local', 'https://good.test\\@evil.test', 'https://good.test\n', 'file:///etc/passwd', 'https://']) assert.equal(safeAnswerLink(value), null, value);
  assert.equal(safeAnswerLink('https://example.com/a?q=1'), 'https://example.com/a?q=1');
  const parts = parseInline('[source](https://example.com/a_(b)) and [attack](javascript:alert(1))');
  assert.equal(parts[0].type, 'link');
  assert.equal(parts[0].href, 'https://example.com/a_(b)');
  assert.equal(parts[1].text, ' and [attack](javascript:alert(1))');
  assert.deepEqual(parseInline('[<img src=x onerror=alert(1)>](https://example.com)')[0].children, [{type: 'text', text: '<img src=x onerror=alert(1)>'}]);
});

test('empty and unsupported markdown remain predictable text without producing executable content', () => {
  assert.deepEqual(parseAnswer(' \n\n'), []);
  assert.deepEqual(parseInline('**unfinished'), [{ type: 'text', text: '**unfinished' }]);
  assert.deepEqual(parseAnswer('<iframe src="https://example.com"></iframe>')[0], { type: 'paragraph', content: [{ type: 'text', text: '<iframe src="https://example.com"></iframe>' }] });
});
