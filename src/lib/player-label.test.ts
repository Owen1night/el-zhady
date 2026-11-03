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
  assert.equal(learningFacts.length,13); assert.equal(learningTimeline.length,12);
  assert.deepEqual(validateContent({learningFacts,learningFigures,learningTimeline},learningSources),[]);
  assert(learningFacts.every(f=>f.status==='sourced'&&f.sourceRefs.length));
});
