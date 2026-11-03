import test from 'node:test';
import assert from 'node:assert/strict';
import { earnedPlace, playerTag } from './player-label';
import { learningFacts, learningFigures, learningSources, learningTimeline } from '../data/learning';
import { validateContent } from './validate-content';
test('identity labels cannot be mistaken for join-order ranks', () => {
  assert.equal(earnedPlace(2),'2-орын'); assert.equal(earnedPlace(null),'Орын жарияланбаған');
  assert.match(playerTag('abcd-0001'),/^ID /); assert(!playerTag('abcd-0001').includes('#'));
  assert.notEqual(playerTag('aaaa-0001'),playerTag('bbbb-0001'));
});
test('published readings have resolvable precise references without claiming academic review', () => {
  assert.equal(learningFacts.length,12); assert.equal(learningTimeline.length,12);
  assert.deepEqual(validateContent({learningFacts,learningFigures,learningTimeline},learningSources),[]);
  assert(learningFacts.every(f=>f.status==='sourced'&&f.sourceRefs.length));
});

test('timeline descriptions do not inherit other events from a reading', () => {
  const entry = (date: string) => learningTimeline.find(e => e.date === date)!;
  assert(!entry('1943').description.includes('1947'));
  assert(!entry('1941-06-22').description.includes('1939'));
  assert(!entry('1945-05').description.includes('қыркүйек'));
  assert(!entry('1947').description.includes('1952'));
  assert(learningTimeline.every(e => !learningFacts.some(f => f.text === e.description)));
});
