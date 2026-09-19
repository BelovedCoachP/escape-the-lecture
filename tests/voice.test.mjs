import test from 'node:test';
import assert from 'node:assert/strict';
class Element extends EventTarget {
  children=[]; removed=false;
  append(...children){this.children.push(...children);}
  setAttribute(){}
  remove(){this.removed=true;}
}
const audios=[];
class FakeAudio extends EventTarget {
  paused=true; currentTime=0; rejectPlay=false;
  constructor(src){super();this.src=src;audios.push(this);}
  play(){if(this.rejectPlay)return Promise.reject(Error('autoplay blocked'));this.paused=false;return Promise.resolve();}
  pause(){this.paused=true;}
}
globalThis.document={createElement:()=>new Element()};
globalThis.Audio=FakeAudio;
const {voiceControl,stopVoices}=await import('../exemplar/js/render/voice.js');
test('a second speaker stops the first; leaving a scene stops all speech',async()=>{
 const first=voiceControl('a.mp3','AURA'), second=voiceControl('b.mp3','Archivist');
 await first.play();assert.equal(audios[0].paused,false);
 await second.play();assert.equal(audios[0].paused,true);assert.equal(audios[1].paused,false);
 assert.equal(first.node.children[0].textContent,'▶ Hear AURA');
 stopVoices();assert.ok(audios.every(a=>a.paused));
});
test('blocked autoplay retains manual playback control',async()=>{
 const voice=voiceControl('c.mp3','AURA');const audio=audios.at(-1);audio.rejectPlay=true;
 await voice.play();assert.equal(voice.node.removed,false);assert.equal(voice.node.children[0].textContent,'▶ Hear AURA');
 audio.rejectPlay=false;await voice.play();assert.equal(audio.paused,false);stopVoices();
});
test('unavailable voice removes only its optional control',()=>{
 const voice=voiceControl('missing.mp3','AURA');audios.at(-1).dispatchEvent(new Event('error'));
 assert.equal(voice.node.removed,true);assert.equal(audios.at(-1).paused,true);stopVoices();
});
