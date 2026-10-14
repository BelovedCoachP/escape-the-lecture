import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import Ajv2020Module from 'ajv/dist/2020.js';

const Ajv2020=Ajv2020Module.default??Ajv2020Module;
const schema=JSON.parse(readFileSync(new URL('../schema/vault-schema.json',import.meta.url)));
const content=JSON.parse(readFileSync(new URL('../content/vault-content.json',import.meta.url)));
const validate=new Ajv2020({allErrors:true,strict:false}).compile(schema);
const clone=x=>structuredClone(x);

test('only the game-wide ambience may autoplay, and only when declared',()=>{
 assert.ok(validate(content),'the published content validates');

 const undeclared=clone(content); undeclared.a11y.audioAutoplay=false;
 assert.equal(validate(undeclared),false,'autoplaying ambience must be declared in a11y');

 const quiet=clone(content); quiet.narrative.ambience.autoplay=false; quiet.a11y.audioAutoplay=false;
 assert.ok(validate(quiet),'an ambience that waits for the player needs no declaration');

 const roomAudio=clone(content); roomAudio.levels[0].ambientAudio={kind:'audio',src:'x.mp3',role:'speech',autoplay:true};
 assert.equal(validate(roomAudio),false,'per-room audio can never autoplay');

 const template=JSON.parse(readFileSync(new URL('../template/example-room.json',import.meta.url)));
 assert.equal(template.a11y.audioAutoplay,false,'template rooms keep autoplay off');
});
