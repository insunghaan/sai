/* Local two-person prototype state. No networking, sensors, or medical inference. */
(function(root){
  'use strict';
  const TODAY='2026-09-08', USERS=['sumin','jiwoo'];
  const other=id=>id==='sumin'?'jiwoo':'sumin';
  const clone=o=>JSON.parse(JSON.stringify(o));
  const clean=(x,n=160)=>String(x||'').trim().slice(0,n);
  const validDay=d=>/^2026-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(d)&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
  function initial(){return {version:1,rev:0,people:{sumin:{mood:'calm',note:'오늘은 조금 여유롭게 보내고 싶어.',sharing:{mood:true,sleep:true,heart:false,cycle:false},cycleStart:'2026-08-17',symptom:'none'},jiwoo:{mood:'cloudy',note:'조금 졸리지만, 같이 걸으면 좋겠다.',sharing:{mood:true,sleep:true,heart:false,cycle:false},cycleStart:null,symptom:'none'}},messages:[],picks:{},cares:[],pulses:[],breath:null,walk:null,dateSession:null,memories:[],events:[],notices:[],slots:{sumin:[19,20,21],jiwoo:[20,21,22]},slotPicks:{},garden:{sumin:false,jiwoo:false,claimed:false}}}
  function data(id,day=TODAY){if(day>TODAY)return null;const d=Number(day.slice(-2)),s=id==='sumin';return {sleep:day===TODAY?(s?462:372):(s?405:380)+(d*17+(s?9:21))%90,score:day===TODAY?(s?86:72):68+(d*7+(s?3:0))%25,bpm:s?58:64,hrv:s?42:36,temp:s?0.2:0.1,steps:s?3200:2600,bed:s?'23:20':'00:40',wake:s?'07:10':'07:05'}}
  function visible(s,viewer,owner,key){return viewer===owner||!!s.people[owner].sharing[key]}
  function cycleWindow(s,id){const start=s.people[id].cycleStart;if(!start)return [];const dt=new Date(start+'T12:00:00Z');dt.setUTCDate(dt.getUTCDate()+27);return Array.from({length:5},(_,i)=>{const x=new Date(dt);x.setUTCDate(x.getUTCDate()+i);return x.toISOString().slice(0,10)})}
  function agreedMode(s,day){const p=s.picks[day];return p&&p.sumin&&p.sumin===p.jiwoo?p.sumin:null}
  function dayEvents(s,day){return s.events.filter(e=>e.day===day)}
  function notice(s,to,kind,day,id){s.notices.unshift({id:'n'+s.rev+'-'+s.notices.length,to,kind,day,target:id,read:false});s.notices=s.notices.slice(0,50)}
  function event(s,type,day,key,extra={}){if(!s.events.some(e=>e.key===key))s.events.push({type,day,key,...extra})}
  function reduce(prev,who,a,now=Date.now()){
    if(!USERS.includes(who)||!a||typeof a.type!=='string')return prev;
    const s=clone(prev),partner=other(who),day=validDay(a.day)?a.day:TODAY;
    const uid=prefix=>prefix+'-'+now+'-'+(s.rev+1);
    let changed=true;
    switch(a.type){
      case 'message':if(!clean(a.text,1000))return prev;s.messages.push({id:uid('msg'),from:who,text:clean(a.text,1000),at:now});s.messages=s.messages.slice(-80);notice(s,partner,'message',TODAY);break;
      case 'checkin':if(!['tired','cloudy','calm','happy','excited'].includes(a.mood))return prev;s.people[who].mood=a.mood;s.people[who].note=clean(a.note);if(s.people[who].sharing.mood)notice(s,partner,'checkin',TODAY);break;
      case 'share':if(!['mood','sleep','heart','cycle'].includes(a.key)||typeof a.value!=='boolean')return prev;s.people[who].sharing[a.key]=a.value;break;
      case 'cycle':if(a.start&&!validDay(a.start))return prev;s.people[who].cycleStart=a.start||null;s.people[who].symptom=['none','tired','cramps'].includes(a.symptom)?a.symptom:'none';break;
      case 'mode':if(!['rest','light','active'].includes(a.mode))return prev;(s.picks[day]??={})[who]=a.mode;s.events=s.events.filter(e=>e.key!=='mode-'+day);if(agreedMode(s,day))event(s,'mode',day,'mode-'+day,{mode:a.mode});notice(s,partner,agreedMode(s,day)?'mode-agreed':'mode',day);break;
      case 'care':if(!['quiet','food','call','space'].includes(a.need))return prev;{const existing=s.cares.find(x=>x.from===who&&x.day===day&&x.need===a.need&&!['done','cancelled'].includes(x.status));if(existing)return prev;const c={id:uid('care'),from:who,to:partner,day,need:a.need,status:'requested'};s.cares.unshift(c);notice(s,partner,'care',day,c.id)}break;
      case 'care-accept':{const c=s.cares.find(x=>x.id===a.id);if(!c||c.to!==who||c.status!=='requested')return prev;c.status='accepted';notice(s,c.from,'care-accepted',c.day,c.id);event(s,'care',c.day,c.id,{need:c.need,from:c.from,to:c.to})}break;
      case 'care-done':{const c=s.cares.find(x=>x.id===a.id);if(!c||c.to!==who||c.status!=='accepted')return prev;c.status='done';notice(s,c.from,'care-done',c.day,c.id)}break;
      case 'care-cancel':{const c=s.cares.find(x=>x.id===a.id);if(!c||c.from!==who||['done','cancelled'].includes(c.status))return prev;c.status='cancelled';s.events=s.events.filter(e=>e.key!==c.id);notice(s,c.to,'care-cancelled',c.day,c.id)}break;
      case 'pulse':if(a.consent!==true||![60,78,96].includes(a.bpm))return prev;{const p={id:uid('pulse'),from:who,to:partner,bpm:a.bpm,at:now,seen:false};s.pulses.unshift(p);s.pulses=s.pulses.slice(0,12);notice(s,partner,'pulse',TODAY,p.id)}break;
      case 'pulse-seen':{const p=s.pulses.find(x=>x.id===a.id&&x.to===who);if(!p||p.seen)return prev;p.seen=true;notice(s,p.from,'pulse-seen',TODAY,p.id)}break;
      case 'breath-invite':if(s.breath&&['waiting','running'].includes(s.breath.status))return prev;if(a.consent!==true)return prev;s.breath={id:uid('breath'),from:who,status:'waiting',started:null,day:TODAY};notice(s,partner,'breath',TODAY,s.breath.id);break;
      case 'breath-join':if(!s.breath||s.breath.status!=='waiting'||s.breath.from===who||a.consent!==true)return prev;s.breath.status='running';s.breath.started=now;notice(s,s.breath.from,'breath-joined',TODAY,s.breath.id);break;
      case 'breath-cancel':if(!s.breath||!['waiting','running'].includes(s.breath.status))return prev;s.breath.status='cancelled';notice(s,partner,'breath-cancelled',TODAY,s.breath.id);break;
      case 'breath-finish':if(!s.breath||s.breath.status!=='running'||now-s.breath.started<24000)return prev;s.breath.status='done';event(s,'breath',s.breath.day,s.breath.id);break;
      case 'slots':if(!Array.isArray(a.hours)||a.hours.some(h=>![18,19,20,21,22,23].includes(h)))return prev;s.slots[who]=[...new Set(a.hours)].sort();s.slotPicks={};s.events=s.events.filter(e=>e.key!=='slot-'+TODAY);notice(s,partner,'slots',TODAY);break;
      case 'slot-pick':if(!s.slots.sumin.includes(a.hour)||!s.slots.jiwoo.includes(a.hour))return prev;s.slotPicks[who]=a.hour;s.events=s.events.filter(e=>e.key!=='slot-'+TODAY);if(s.slotPicks.sumin===s.slotPicks.jiwoo)event(s,'call',TODAY,'slot-'+TODAY,{hour:a.hour});notice(s,partner,'slot',TODAY);break;
      case 'walk-invite':if(a.consent!==true||s.walk&&['waiting','active'].includes(s.walk.status))return prev;s.walk={id:uid('walk'),from:who,day:TODAY,status:'waiting',steps:{sumin:0,jiwoo:0},goals:{sumin:4000,jiwoo:6000}};notice(s,partner,'walk',TODAY,s.walk.id);break;
      case 'walk-join':if(!s.walk||s.walk.status!=='waiting'||s.walk.from===who||a.consent!==true)return prev;s.walk.status='active';notice(s,partner,'walk-joined',TODAY,s.walk.id);break;
      case 'walk-step':if(!s.walk||s.walk.status!=='active')return prev;s.walk.steps[who]=Math.min(s.walk.goals[who],s.walk.steps[who]+1000);if(USERS.every(u=>s.walk.steps[u]>=s.walk.goals[u])){s.walk.status='done';event(s,'walk',s.walk.day,s.walk.id)}break;
      case 'walk-goal':if(!s.walk||s.walk.status!=='active'||![4000,6000,8000].includes(a.goal)||s.walk.steps[who]>0)return prev;s.walk.goals[who]=a.goal;break;
      case 'walk-cancel':if(!s.walk||!['waiting','active'].includes(s.walk.status))return prev;s.walk.status='cancelled';notice(s,partner,'walk-cancelled',TODAY,s.walk.id);break;
      case 'date-invite':if(a.consent!==true||s.dateSession&&['waiting','active'].includes(s.dateSession.status))return prev;s.dateSession={id:uid('date'),from:who,status:'waiting',started:null,day:TODAY,marks:[]};notice(s,partner,'date',TODAY,s.dateSession.id);break;
      case 'date-join':if(!s.dateSession||s.dateSession.status!=='waiting'||s.dateSession.from===who||a.consent!==true)return prev;s.dateSession.status='active';s.dateSession.started=now;notice(s,partner,'date-joined',TODAY,s.dateSession.id);break;
      case 'date-mark':if(!s.dateSession||s.dateSession.status!=='active'||!['hand','laugh','view'].includes(a.mark))return prev;if(s.dateSession.marks.filter(m=>m.by===who).length>=6)return prev;s.dateSession.marks.push({by:who,mark:a.mark,at:now});break;
      case 'date-end':if(!s.dateSession||s.dateSession.status!=='active')return prev;{const d=s.dateSession;d.status='done';s.memories.unshift({id:d.id,day:d.day,seconds:Math.max(1,Math.floor((now-d.started)/1000)),marks:d.marks,steps:{sumin:1240,jiwoo:1180},bpm:{sumin:78,jiwoo:72}});event(s,'memory',d.day,d.id);notice(s,partner,'date-ended',TODAY,d.id)}break;
      case 'date-cancel':if(!s.dateSession||!['waiting','active'].includes(s.dateSession.status))return prev;s.dateSession.status='cancelled';notice(s,partner,'date-cancelled',TODAY,s.dateSession.id);break;
      case 'garden-join':if(a.consent!==true||s.garden[who])return prev;s.garden[who]=true;notice(s,partner,'garden',TODAY);break;
      case 'garden-sleep':if(!s.garden[who]||s.garden.claimed)return prev;s.garden[who+'Rested']=true;if(s.garden.suminRested&&s.garden.jiwooRested){s.garden.claimed=true;event(s,'garden',TODAY,'garden-'+TODAY)}break;
      case 'read':s.notices.forEach(n=>{if(n.to===who&&(!a.id||n.id===a.id))n.read=true});break;
      default:changed=false;
    }
    if(!changed)return prev;s.rev++;return s;
  }
  const api={TODAY,USERS,other,initial,data,visible,cycleWindow,agreedMode,dayEvents,reduce,validDay};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SAIPair=api;
})(typeof window==='undefined'?globalThis:window);
