import test from 'node:test';
import assert from 'node:assert/strict';
import { answerText } from '../live/answer-text';
test('admin review displays persisted map and timeline answers instead of calling them unanswered',()=>{
  const options=[{id:'a',text:'Алғашқы оқиға'},{id:'b',text:'Кейінгі оқиға'}];
  assert.equal(answerText(options,'a>b'),'Алғашқы оқиға → Кейінгі оқиға');
  assert.equal(answerText(options,'b'),'Кейінгі оқиға');
  assert.equal(answerText(options,null),'Жауап жоқ');
});
