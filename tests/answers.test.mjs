import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Minimal DOM stand-in: enough for el(), before(), remove(), focus and
// querySelector('.class'), which is all mercy.js touches.
class FakeEl {
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.parent=null;this.className='';this.textContent='';this.listeners={};}
 append(...nodes){for(const n of nodes){if(typeof n==='object'){n.parent=this;}this.children.push(n);}}
 setAttribute(k,v){this.attrs[k]=String(v);}
 hasAttribute(k){return k in this.attrs;}
 focus(){globalThis.document.activeElement=this;}
 before(n){const i=this.parent.children.indexOf(this);this.parent.children.splice(i,0,n);n.parent=this.parent;}
 remove(){if(!this.parent)return;const i=this.parent.children.indexOf(this);this.parent.children.splice(i,1);this.parent=null;}
 scrollIntoView(){}
 addEventListener(type,fn){this.listeners[type]=fn;}
 click(){this.listeners.click?.();}
 querySelector(sel){const cls=sel.slice(1);const walk=n=>{for(const c of n.children){if(typeof c!=='object')continue;if(String(c.className).split(' ').includes(cls))return c;const r=walk(c);if(r)return r;}return null;};return walk(this);}
}
globalThis.document={createElement:t=>new FakeEl(t),activeElement:null};

const {normalize,answerMatches,parseNumericAnswer}=await import('../exemplar/js/render/dom.js');
const {mercy}=await import('../exemplar/js/render/mercy.js');
const content=JSON.parse(readFileSync(new URL('../content/vault-content.json',import.meta.url)));

test('answer matching forgives case, punctuation, hyphens, curly quotes and spacing',()=>{
 assert.equal(normalize('  Screen-Reader users navigate by headings! '),'screen reader users navigate by headings');
 assert.equal(normalize('“Describe.”'),'describe');
 assert.ok(answerMatches(['screen reader users navigate by headings'],'Screen-reader users navigate by headings.'));
 assert.ok(answerMatches(['test the result with a screen reader'],'Test the result with a screenreader'));
 assert.ok(answerMatches(['instruct'],'I N S T R U C T'));
 assert.ok(answerMatches(['instruct'],'i-n-s-t-r-u-c-t'));
 assert.ok(!answerMatches(['describe'],''));
 assert.ok(!answerMatches(['describe'],'...'));
 assert.ok(!answerMatches(['describe'],'decide'));
});

test('numeric answers forgive a trailing period or the word ratio',()=>{
 assert.equal(parseNumericAnswer('4.3:1.'),4.3);
 assert.equal(parseNumericAnswer('4.3 to 1 ratio'),4.3);
 assert.equal(parseNumericAnswer('4.3 to 1 ratio.'),4.3);
 assert.ok(Number.isNaN(parseNumericAnswer('4.3 or 7.')));
});

test('every wing lock accepts its key word, its noun form, and stray punctuation',()=>{
 const nounForms={describe:'description',distinguish:'distinction',transcribe:'transcription',structure:'structured',instruct:'instruction'};
 for(const level of content.levels){
  const codes=level.lock.acceptedCodes;
  const word=codes[0];
  assert.ok(answerMatches(codes,`${word.toUpperCase()}.`),`${level.id} rejects "${word.toUpperCase()}."`);
  assert.ok(answerMatches(codes,nounForms[word]),`${level.id} rejects "${nounForms[word]}"`);
 }
});

test('every repair line accepts its first answer after normalization, and none accepts its broken text',()=>{
 for(const level of content.levels)for(const c of level.challenges){
  if(c.type!=='repair')continue;
  for(const s of c.segments){
   assert.ok(answerMatches(s.accepted,s.accepted[0].toUpperCase()+'!'),`${c.id}/${s.id}`);
   assert.ok(!answerMatches(s.accepted,s.broken),`${c.id}/${s.id} accepts its own broken text`);
  }
 }
});

function setup(opts={}){
 const parent=new FakeEl('div');const anchor=new FakeEl('p');parent.append(anchor);
 let applied=0;
 const relief=mercy({answerLines:()=>['the answer'],onApply:()=>{applied+=1;relief.resolve();},...opts});
 return {parent,anchor,relief,applied:()=>applied};
}

test('mercy counts only changed answers, never the untouched start',()=>{
 const {parent,anchor,relief}=setup({startSignature:'start'});
 assert.equal(relief.fail(anchor,'start'),false);
 assert.equal(relief.fail(anchor,'a'),false);
 assert.equal(relief.fail(anchor,'a'),false);
 assert.equal(relief.fail(anchor,'b'),false);
 assert.equal(parent.querySelector('.mercy-card'),null);
 assert.equal(relief.fail(anchor,'c'),true);
 assert.ok(parent.querySelector('.mercy-card'));
 assert.equal(relief.fail(anchor,'d'),false,'the card opens once');
});

test('a self-solve removes the card; Apply keeps the answer and focuses a confirmation',()=>{
 const self=setup();
 for(const s of ['a','b','c'])self.relief.fail(self.anchor,s);
 self.relief.resolve();
 assert.equal(self.parent.querySelector('.mercy-card'),null);

 const helped=setup();
 for(const s of ['a','b','c'])helped.relief.fail(helped.anchor,s);
 const card=helped.parent.querySelector('.mercy-card');
 card.querySelector('.mercy-actions').children[0].click();
 assert.equal(helped.applied(),1);
 assert.equal(card.querySelector('.mercy-actions'),null,'Apply is gone once used');
 assert.equal(document.activeElement,card.querySelector('.mercy-done'));
 card.querySelector('.mercy-done');
 assert.equal(helped.relief.fail(helped.anchor,'z'),false,'resolved relief never reopens');
});
