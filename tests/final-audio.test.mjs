import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import validateBrowser from '../exemplar/js/validate-schema.js';
const content=JSON.parse(readFileSync(new URL('../content/vault-content.json',import.meta.url)));
const schema=JSON.parse(readFileSync(new URL('../schema/vault-schema.json',import.meta.url)));
test('final narration transcript matches screen text and timed cues stay inside the supplied recording',()=>{
  const vtt=readFileSync(new URL('../exemplar/'+content.finale.metaLock.captionsSrc,import.meta.url),'utf8');
  const blocks=vtt.trim().split(/\n\n+/).slice(1);
  const text=blocks.map(b=>b.split('\n').slice(1).join(' ')).join(' ');
  assert.equal(text,content.finale.metaLock.prompt);
  const seconds=s=>{const [h,m,t]=s.split(':').map(Number);return h*3600+m*60+t;};
  let previousEnd=0;
  for(const block of blocks){const [start,end]=block.split('\n')[0].split(' --> ').map(seconds);assert.ok(start>=previousEnd&&end>start&&end<=12.435);previousEnd=end;}
});
test('source and compiled browser schemas both require captions for the final voiced lock',()=>{
  const validate=new Ajv2020({strict:false}).compile(schema);
  assert.equal(validate(content),true);assert.equal(validateBrowser(content),true);
  const broken=structuredClone(content);delete broken.finale.metaLock.captionsSrc;
  assert.equal(validate(broken),false);assert.equal(validateBrowser(broken),false);
});
