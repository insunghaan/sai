// State transitions and two independent UI contexts; no browser/network required.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..'),M=require(path.join(ROOT,'pair-model.js'));
let state=M.initial(),now=1800000000000;
const apply=(who,type,extra={})=>{state=M.reduce(state,who,{type,...extra},now);return state};
assert.equal(M.data('sumin','2026-09-09'),null);
assert.equal(M.validDay('2026-02-31'),false);
assert.equal(M.visible(state,'jiwoo','sumin','cycle'),false);
assert.equal(M.visible(state,'sumin','sumin','cycle'),true);
assert(M.cycleWindow(state,'sumin').includes('2026-09-14'));
apply('sumin','mode',{day:'2026-09-12',mode:'light'});assert.equal(M.agreedMode(state,'2026-09-12'),null);
apply('jiwoo','mode',{day:'2026-09-12',mode:'rest'});assert.equal(state.events.length,0);
apply('jiwoo','mode',{day:'2026-09-12',mode:'light'});assert.equal(state.events.length,1);
apply('sumin','mode',{day:'2026-09-12',mode:'active'});assert.equal(state.events.length,0,'changing a choice removes obsolete agreement');
apply('sumin','care',{need:'food',day:M.TODAY});const c=state.cares[0];
apply('sumin','care-accept',{id:c.id});assert.equal(state.cares[0].status,'requested');
apply('jiwoo','care-accept',{id:c.id});assert.equal(state.cares[0].status,'accepted');
apply('jiwoo','care-done',{id:c.id});assert.equal(state.cares[0].status,'done');
const count=state.events.length;apply('jiwoo','care-done',{id:c.id});assert.equal(state.events.length,count);
apply('sumin','pulse',{bpm:96,consent:false});assert.equal(state.pulses.length,0);
apply('sumin','pulse',{bpm:96,consent:true});assert.equal(state.pulses[0].to,'jiwoo');assert.equal(state.people.sumin.sharing.heart,false);
apply('sumin','pulse-seen',{id:state.pulses[0].id});assert.equal(state.pulses[0].seen,false);
apply('jiwoo','pulse-seen',{id:state.pulses[0].id});assert.equal(state.pulses[0].seen,true);
apply('sumin','breath-invite',{consent:true});apply('sumin','breath-join',{consent:true});assert.equal(state.breath.status,'waiting');
apply('jiwoo','breath-join',{consent:true});apply('sumin','breath-finish');assert.equal(state.breath.status,'running');
now+=24000;apply('sumin','breath-finish');assert.equal(state.breath.status,'done');const finished=state.events.length;apply('jiwoo','breath-finish');assert.equal(state.events.length,finished);
apply('sumin','breath-invite',{consent:true});apply('jiwoo','breath-join',{consent:true});apply('jiwoo','breath-cancel');now+=24000;apply('sumin','breath-finish');assert.equal(state.breath.status,'cancelled');assert.equal(state.events.length,finished);
apply('sumin','walk-invite',{consent:true});apply('sumin','walk-step');assert.equal(state.walk.steps.sumin,0);apply('jiwoo','walk-join',{consent:true});
for(let i=0;i<4;i++)apply('sumin','walk-step');assert.equal(state.walk.status,'active');assert.equal(state.walk.steps.jiwoo,0);
for(let i=0;i<6;i++)apply('jiwoo','walk-step');assert.equal(state.walk.status,'done');
apply('sumin','slot-pick',{hour:20});assert(!state.events.some(e=>e.type==='call'));apply('jiwoo','slot-pick',{hour:20});assert(state.events.some(e=>e.type==='call'));apply('jiwoo','slots',{hours:[22]});assert(!state.events.some(e=>e.type==='call'));
apply('sumin','date-invite',{consent:true});apply('jiwoo','date-join',{consent:true});apply('sumin','date-mark',{mark:'hand'});apply('jiwoo','date-mark',{mark:'view'});now+=61000;apply('jiwoo','date-end');assert.equal(state.memories.length,1);assert.equal(state.memories[0].seconds,61);assert.equal(state.memories[0].marks.length,2);apply('sumin','date-end');assert.equal(state.memories.length,1);
apply('sumin','garden-join',{consent:true});apply('sumin','garden-sleep');assert.equal(state.garden.claimed,false);apply('jiwoo','garden-sleep');assert.equal(state.garden.claimed,false);apply('jiwoo','garden-join',{consent:true});apply('jiwoo','garden-sleep');assert.equal(state.garden.claimed,true);
assert.equal(state.messages.length,0,'data interactions do not create chat messages');
console.log('PASS state: independent consent, ownership, privacy, date matching, care lifecycle, pulse receipt, timed breathing, cancellation, walks, overlapping availability, memories and idempotent rewards.');

// Small DOM fixture for executing actual view generation and event handlers.
const decode=s=>s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
function makeUI(who,bus){
 const regions={},listeners={};let active=null;
 class El{constructor(tag,attrs={}){this.tagName=tag.toUpperCase();this.attrs=attrs;this.id=attrs.id||'';this.value=decode(attrs.value||'');this.disabled='disabled'in attrs;this.checked='checked'in attrs;this.open=false;this.textContent='';this.dataset={};for(const[k,v]of Object.entries(attrs))if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;this.classList={add(){},remove(){},toggle(){}};this.style={setProperty(){}};}set innerHTML(s){this.html=s;this.children=parse(s);if(this.id)regions[this.id]=this.children}get innerHTML(){return this.html||''}setAttribute(k,v){this.attrs[k]=v}focus(){active=this}setSelectionRange(){}scrollIntoView(){}showModal(){this.open=true}close(){this.open=false}reportValidity(){return true}addEventListener(){}getBoundingClientRect(){return {left:0,right:400,top:0,bottom:800}}}
 function parse(html){return [...html.matchAll(/<([a-z][\w-]*)([^>]*?)>/gi)].map(m=>{const attrs={};for(const a of m[2].matchAll(/([^\s=]+)(?:\s*=\s*"([^"]*)")?/g))attrs[a[1]]=decode(a[2]||'');return new El(m[1],attrs)})}
 const root=new El('div',{id:'root'}),dialog=new El('dialog',{id:'dialog'}),toast=new El('div',{id:'toast'}),base=[root,dialog,toast];
 const all=()=>[...base,...Object.values(regions).flat()];
 function matches(e,s){if(s.startsWith('#'))return e.id===s.slice(1);if(s.startsWith('.'))return (e.attrs.class||'').split(' ').includes(s.slice(1));if(s.startsWith('[')){const m=s.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);return m&&m[1]in e.attrs&&(m[2]===undefined||e.attrs[m[1]]===m[2])}return e.tagName===s.toUpperCase()}
 const doc={documentElement:{},get activeElement(){return active},querySelector:s=>all().find(e=>matches(e,s))||null,querySelectorAll:s=>all().filter(e=>matches(e,s)),getElementById:id=>all().find(e=>e.id===id)};
 const parent={postMessage:m=>bus.push({who,msg:m})},window={name:who,parent,scrollY:0,scrollTo(){},addEventListener:(k,fn)=>listeners[k]=fn};
 const ctx=vm.createContext({window,document:doc,SAIPair:M,Date,setTimeout:()=>0,clearTimeout(){},console});
 const outer=fs.readFileSync(path.join(ROOT,'pair-v2.html'),'utf8');const inner=JSON.parse(outer.match(/<script type="application\/json" id="phone-document">([\s\S]*?)<\/script>/)[1]);let src=[...inner.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];src=src.replace(/\}\)\(\);\s*$/, 'window.testUI={go,render,act,getTab:()=>tab};})();');vm.runInContext(src,ctx);
 return {who,ctx,doc,root,dialog,parent,receive:msg=>listeners.message({source:parent,data:{channel:'sai-pair',...msg}}),go:(...args)=>window.testUI.go(...args),click:s=>{const e=doc.querySelector(s);assert(e,who+' missing '+s);assert.equal(typeof e.onclick,'function',s+' not bound');e.onclick()},html:()=>root.innerHTML+'\n'+(dialog.open?dialog.innerHTML:'')};
}
state=M.initial();const queue=[],a=makeUI('sumin',queue),b=makeUI('jiwoo',queue),uis={sumin:a,jiwoo:b};
function flush(){let guard=0;while(queue.length){assert(++guard<100);const {who,msg}=queue.shift();if(msg.type==='ready')uis[who].receive({type:'state',who,state});if(msg.type==='action'){state=M.reduce(state,who,msg.action,now);for(const id of M.USERS)uis[id].receive({type:'state',who:id,state,actor:who})}}}
flush();
for(const ui of [a,b])for(const language of ['ko','ja']){ui.receive({type:'language',lang:language});for(const page of ['today','calendar','chat','settings','health']){ui.go(page);assert(!ui.html().includes('undefined'),page);assert(!ui.html().includes('NaN'),page)}for(const f of ['hub','pulse','breathe','walk','date','garden','rhythm']){ui.go('connect',f);assert(!ui.html().includes('undefined'),f)}}
a.receive({type:'language',lang:'ko'});b.receive({type:'language',lang:'ko'});a.go('calendar','hub','2026-09-14');b.go('calendar','hub','2026-09-14');assert(a.html().includes('생리 예상 기간'));assert(!b.html().includes('생리 예상 기간'));
a.go('settings');a.click('[data-share="cycle"]');flush();assert(b.html().includes('생리 예상 기간'));a.click('[data-share="cycle"]');flush();assert(!b.html().includes('생리 예상 기간'));
a.go('calendar','hub','2026-09-12');b.go('calendar','hub','2026-09-12');a.click('[data-mode="light"]');flush();assert.equal(M.agreedMode(state,'2026-09-12'),null);assert(b.html().includes('수민 ✓'));b.click('[data-mode="light"]');flush();assert.equal(M.agreedMode(state,'2026-09-12'),'light');assert(a.html().includes('둘의 선택이 같아요'));assert(b.html().includes('둘의 선택이 같아요'));
a.click('[data-need="food"]');flush();assert(b.html().includes('내가 챙길게'));b.click('[data-do="care-accept"]');flush();assert(a.html().includes('챙겨주기로 약속했어요'));b.click('[data-do="care-done"]');flush();assert(a.html().includes('작은 배려를 완료했어요'));
a.go('connect','pulse');b.go('connect','pulse');a.click('[data-bpm="96"]');const consent=a.doc.querySelector('#pulse-consent');consent.checked=true;consent.onchange({target:consent});a.click('[data-do="pulse"]');flush();assert(b.html().includes('96 <small>bpm'));b.click('[data-do="pulse-seen"]');flush();assert(a.html().includes('상대가 리듬을 느꼈어요'));
a.go('connect','breathe');b.go('connect','breathe');a.click('[data-do="breathe-invite"]');flush();assert(b.html().includes('동의하고 함께하기'));b.click('[data-do="breathe-join"]');flush();assert(a.doc.querySelector('#breath-left'));assert(b.doc.querySelector('#breath-left'));b.click('[data-do="breathe-cancel"]');flush();assert(a.html().includes('함께 호흡을 중단했어요'));
a.go('chat');b.go('chat');const input=a.doc.querySelector('#message-input');input.oninput({target:{value:'<script>alert(1)</script>'}});a.doc.querySelector('#chat-form').onsubmit({preventDefault(){}});flush();assert(b.html().includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
console.log('PASS two UI contexts: 24 localized screens, live partner state, private cycle visibility, matching dates, accepted/completed care, selected pulse rate and receipt, two-party breathing/cancel, escaped chat.');

// Exercise the shipped v2 UI and ensure personal exploration emits no shared actions.
const snapshot=JSON.stringify(state);queue.length=0;
for(const ui of [a,b])for(const language of ['ko','ja']){
 ui.receive({type:'language',lang:language});ui.go('health');
 for(const n of [7,30]){ui.click(`[data-health-period="${n}"]`);assert.equal(ui.doc.querySelectorAll('[data-health-day]').length,n);
  for(const metric of ['sleep','score','bpm','hrv','temp','steps']){ui.click(`[data-health-metric="${metric}"]`);assert(!/NaN|undefined/.test(ui.html()));const rows=ui.doc.querySelectorAll('[data-health-day]');ui.click(`[data-health-day="${rows[0].dataset.healthDay}"]`);assert(ui.html().includes('aria-live="polite"'));}
 }
 ui.click('[data-health-metric="bpm"]');assert(ui.html().includes(ui.who==='sumin'?'58 bpm':'64 bpm'));
 ui.go('connect','date');assert(!ui.html().includes('몸 기록'));
}
assert.equal(queue.length,0);assert.equal(JSON.stringify(state),snapshot);
a.go('health');a.click('[data-health-period="30"]');a.click('[data-health-day="2026-08-10"]');a.click('[data-health-period="7"]');assert(a.html().includes('09-08'));
assert(fs.existsSync(path.join(ROOT,'mobile-v2.html')));
assert(fs.readFileSync(path.join(ROOT,'pair-v2.html'),'utf8').includes('sai-pair-v2'));
console.log('PASS v2: six metrics, 7/30 days across month boundary, KR/JP, date selection fallback, own-person values, and no shared state/actions from personal exploration.');
