import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicUrl } from './public-url';
import { validateContent } from './validate-content';
test('sharing never falls back to localhost, private addresses or unsafe URLs', () => {
  for (const value of [undefined, '', 'http://localhost:5173', 'https://localhost', 'https://127.0.0.1', 'https://192.168.1.2', 'https://test.local', 'https://[::1]', 'https://user:pass@example.org', 'https://example.org/?q=1', 'javascript:alert(1)']) assert.equal(publicUrl(value), null, value);
  assert.equal(publicUrl('https://example.github.io/repository'), 'https://example.github.io/repository/');
});
test('editorial validation rejects unsourced verification and nested scored answers', () => {
  const errors = validateContent({ questions: [{ id: 'q1', status: 'draft', sourceRefs: [], editorialNote: 'Pending', answers: [{ id: 'a1', status: 'verified', sourceRefs: [] }] }] }, []);
  assert(errors.some(error => error.includes('answers[0]') && error.includes('needs sources')));
  assert.deepEqual(validateContent({ facts: [{ id: 'f1', status: 'draft', sourceRefs: [], editorialNote: 'Pending research' }] }, []), []);
});
