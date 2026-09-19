import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRun,applyResume,resetLevel,markChallengeComplete,openLock,bankEvidence,isLevelRestored,isLevelReachable,loadSavedRun,saveRun} from '../exemplar/js/state.js';
const content=JSON.parse(readFileSync(new URL('../content/vault-content.json',import.meta.url)));
const complete=(run,level)=>{ for(const c of level.challenges)markChallengeComplete(run,level.id,c.id);openLock(run,level);bankEvidence(run,level.id,level.evidenceFragment); };
test('fresh URL jumps never award keys, evidence, or challenge completion',()=>{
 const run=createRun();
 for(const level of content.levels.slice(1))assert.equal(applyResume(run,{view:'level',currentLevelOrder:level.order},content),false);
 assert.equal(applyResume(run,{view:'finale'},content),false);
 assert.deepEqual(run,createRun());
});
test('each wing requires its challenges AND its lock; completion is idempotent',()=>{
 const run=createRun();
 for(const [i,level] of content.levels.entries()){
  assert.equal(isLevelReachable(run,content,level),true);
  for(const c of level.challenges){markChallengeComplete(run,level.id,c.id);markChallengeComplete(run,level.id,c.id);}
  assert.equal(isLevelRestored(run,level),false);
  if(content.levels[i+1])assert.equal(isLevelReachable(run,content,content.levels[i+1]),false);
  openLock(run,level);openLock(run,level);
  assert.equal(isLevelRestored(run,level),true);
  assert.equal(run.keys.length,i+1);
 }
 assert.equal(applyResume(run,{view:'finale'},content),true);
});
test('restarting a room clears its draft and final verdict, but keeps other earned rooms',()=>{
 const run=createRun();content.levels.forEach(l=>complete(run,l));
 run.vaultOpened=true;run.finaleSubmitted=true;run.finaleChoice='Yes';
 const first=content.levels[0], second=content.levels[1];
 run.drafts[first.challenges[0].id]={value:'first'};run.drafts[second.challenges[0].id]={value:'second'};
 resetLevel(run,first);
 assert.equal(run.drafts[first.challenges[0].id],undefined);
 assert.equal(run.drafts[second.challenges[0].id].value,'second');
 assert.equal(run.vaultOpened,false);assert.equal(run.finaleSubmitted,false);assert.equal(run.finaleChoice,null);
 assert.equal(isLevelRestored(run,first),false);
 assert.equal(isLevelReachable(run,content,second),true);
 assert.equal(applyResume(run,{view:'finale'},content),false);
 assert.equal(run.keys.length,4);assert.equal(run.evidence.length,4);
});
test('saved answers round-trip, old saves gain drafts, corrupt saves fail safely',()=>{
 let stored;globalThis.localStorage={getItem:()=>stored,setItem:(_,v)=>{stored=v;}};
 const run=createRun();run.drafts.example={value:'my work'};saveRun(run,content.meta.id);
 assert.deepEqual(loadSavedRun(content.meta.id),run);
 delete run.drafts;saveRun(run,content.meta.id);assert.deepEqual(loadSavedRun(content.meta.id).drafts,{});
 for(const bad of [{...run,keys:null},{...run,completed:{room:null}},{...run,evidence:[null]},{...run,locksOpened:null}]){
  stored=JSON.stringify({contentId:content.meta.id,run:bad});assert.equal(loadSavedRun(content.meta.id),null);
 }
 stored='{bad';assert.equal(loadSavedRun(content.meta.id),null);
 globalThis.localStorage={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}};
 assert.equal(loadSavedRun(content.meta.id),null);assert.doesNotThrow(()=>saveRun(createRun(),content.meta.id));
 delete globalThis.localStorage;
});
test('all required local content assets exist (ambience is optional)',()=>{
 const visit=(value,path=[])=>{
  if(!value||typeof value!=='object')return;
  for(const [key,item] of Object.entries(value)){
   if(['src','audioSrc','captionsSrc','idleVideoSrc','poster'].includes(key)&&typeof item==='string'&&item.startsWith('assets/')&&!path.includes('ambientAudio')){
    assert.ok(existsSync(fileURLToPath(new URL('../exemplar/'+item,import.meta.url))),item);
   }
   visit(item,[...path,key]);
  }
 };visit(content);
});
test('sequence solutions and final keyways reference exactly the playable items',()=>{
 for(const level of content.levels)for(const challenge of level.challenges){
  if(challenge.type==='sequence')assert.deepEqual([...challenge.correctOrder].sort(),challenge.items.map(x=>x.id).sort());
  if(challenge.type==='sort')for(const item of challenge.items)assert.ok(challenge.bins.some(bin=>bin.id===item.correctBin));
 }
 assert.deepEqual(content.finale.metaLock.slots.map(x=>x.keyLabel).sort(),content.levels.map(x=>x.rewardLabel).sort());
});

test('contrast answers use the full ratio and reject ambiguous input',async()=>{
 const {parseNumericAnswer}=await import('../exemplar/js/render/dom.js');
 assert.equal(parseNumericAnswer('4.3:1'),4.3);
 assert.equal(parseNumericAnswer('4,3'),4.3);
 assert.equal(parseNumericAnswer('8.6 / 2'),4.3);
 assert.equal(parseNumericAnswer('4.3:2'),2.15);
 assert.ok(Number.isNaN(parseNumericAnswer('4.3 or 7')));
 assert.ok(Number.isNaN(parseNumericAnswer('4.3:0')));
});

test('previously entered rooms remain replayable after several resets without awarding progress',()=>{
 const run=createRun();content.levels.forEach(level=>{complete(run,level);run.visitedLevels.push(level.id);});
 resetLevel(run,content.levels[3]);resetLevel(run,content.levels[4]);
 assert.equal(isLevelReachable(run,content,content.levels[4]),true);
 assert.equal(applyResume(run,{view:'level',currentLevelOrder:5},content),true);
 assert.equal(run.keys.length,3);assert.equal(isLevelRestored(run,content.levels[4]),false);
 assert.equal(applyResume(run,{view:'finale'},content),false);
});
