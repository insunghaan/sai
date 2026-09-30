(()=>{
const root=document.getElementById('date-demo');
const t=(ko,ja)=>document.documentElement.lang==='ja'?ja:ko;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Local accelerated demonstration. No sensor access or network requests.
const sampleA=[76,78,81,85,80,89,98,112,102,94,86,82];
const sampleB=[72,75,77,81,79,85,93,106,97,88,81,78];
let phase='ready',count=0,timer=null,note='',choice='',records=[],selected=null,started=0;
const today=new Date();const year=today.getFullYear(),month=today.getMonth(),day=today.getDate();
function option(k){return k==='hands'?t('손잡았을 때','手をつないだとき'):t('같이 웃던 순간','一緒に笑った瞬間')}
function peak(n){const vals=sampleA.slice(0,n);const max=Math.max(...vals);return {a:max,b:Math.max(...sampleB.slice(0,n)),index:vals.indexOf(max)}}
function graph(n,highlight=false){const x=i=>16+i*268/11,y=v=>134-(v-60)*1.8;const p=n?peak(n):null;return `<svg class="date-graph" viewBox="0 0 300 168" preserveAspectRatio="none" role="img" aria-label="${t('두 사람의 심박 기록 예시','ふたりの心拍記録の例')}"><g stroke="#e7e4e9" stroke-dasharray="2 5"><path d="M16 26H284M16 80H284M16 134H284"/></g>${[sampleA,sampleB].map((arr,j)=>`<polyline points="${arr.slice(0,n).map((v,i)=>`${x(i)},${y(v)}`).join(' ')}" fill="none" stroke="${j?'#8d83ad':'#ce3657'}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/>`).join('')}${highlight&&p?`<path d="M${x(p.index)} 16V138" stroke="#ce3657" stroke-dasharray="3 4"/><circle cx="${x(p.index)}" cy="${y(p.a)}" r="4" fill="#ce3657"/><text x="${Math.min(244,Math.max(42,x(p.index)))}" y="${y(p.a)-13}" text-anchor="middle">${p.a} BPM</text>`:''}<text x="16" y="160">${t('기록 시작','記録開始')}</text><text x="284" y="160" text-anchor="end">${highlight?t('기록 종료','記録終了'):t('지금','今')}</text></svg>`}
function stats(n){const p=peak(n);return `<div class="date-stats"><span><i></i>${t('수민','スミン')} <strong>${p.a}</strong> BPM</span><span><i></i>${t('지우','ジウ')} <strong>${p.b}</strong> BPM</span></div>`}
function calendar(){
 // Two complete calendar weeks: last week and the current week.
 const start=new Date(year,month,day-today.getDay()-7);
 const dates=Array.from({length:14},(_,i)=>new Date(start.getFullYear(),start.getMonth(),start.getDate()+i));
 const end=dates[13];
 const range=`${start.getMonth()+1}.${start.getDate()} — ${end.getMonth()+1}.${end.getDate()}`;
 return `<div class="date-calendar"><h4>${range}</h4><div class="date-grid">${t(['일','월','화','수','목','금','토'],['日','月','火','水','木','金','土']).map(w=>`<small>${w}</small>`).join('')}${dates.map(date=>{const d=date.getDate(),isToday=date.getFullYear()===year&&date.getMonth()===month&&d===day,has=isToday&&records.length;return `<button data-date="day" data-day="${d}" ${has?'':'disabled'} class="${has?'has-memory':''} ${has&&selected===day?'selected':''}" aria-label="${date.getMonth()+1}${t('월','月')} ${d}${t('일','日')} ${has?t('저장된 기록','保存した記録'):t('기록 없음','記録なし')}" ${has?`aria-pressed="${selected===day}"`:''}>${d}${has?'<i></i>':''}</button>`}).join('')}</div></div>${selected===day?records.map(r=>`<article class="date-memory"><h4>${esc(r.choice?option(r.choice):r.note)}</h4>${stats(r.count)}${graph(r.count,true)}</article>`).join(''):''}`}
function render(){
const step=phase==='calendar'?3:phase==='annotate'?2:1;
root.innerHTML=`<div class="date-demo-top"><span>${t('함께한 순간','ふたりの瞬間')}</span></div><ol class="date-steps">${[t('기록','記録'),t('순간 남기기','メモ'),t('달력','カレンダー')].map((v,i)=>`<li ${step===i+1?'aria-current="step"':''}><b>${i+1}</b>${v}</li>`).join('')}</ol><div class="date-demo-content">
${phase==='ready'?`<div class="date-start"><span aria-hidden="true">♡</span><h4>${t('오늘의 데이트, 기록할까?','今日のデート、記録する？')}</h4><p>${t('기록하기를 누르면 둘의 심박 기록이 시작돼요.','記録するを押すと、ふたりの心拍記録が始まります。')}</p></div><button class="date-primary" data-date="start">${t('기록하기','記録する')}</button>`:''}
${phase==='recording'?`<div class="date-recording"><strong><i></i>${t('심박 기록 중','心拍を記録中')}</strong><span>${count} / ${sampleA.length}</span></div>${graph(count)}<div class="date-stats"><span><i></i>${t('수민','スミン')} <strong>${sampleA[Math.max(0,count-1)]}</strong> BPM</span><span><i></i>${t('지우','ジウ')} <strong>${sampleB[Math.max(0,count-1)]}</strong> BPM</span></div><button class="date-primary" data-date="stop" ${count<2?'disabled':''}>${t('기록 마치기','記録を終える')}</button>`:''}
${phase==='annotate'?`<h4>${t('어떤 순간이었나요?','どんな瞬間だった？')}</h4>${graph(count,true)}${stats(count)}<div class="date-choices">${['hands','laugh','custom'].map(k=>`<button data-date="choice" data-choice="${k}" aria-pressed="${choice===k}">${k==='custom'?t('직접 입력','自分で入力'):option(k)}</button>`).join('')}</div>${choice==='custom'?`<label class="date-note-label" for="date-note">${t('순간을 한 줄로','ひと言で残す')}</label><textarea id="date-note" maxlength="100" rows="2" placeholder="${t('그때 무슨 일이 있었나요?','そのとき、何があった？')}">${esc(note)}</textarea>`:''}<button class="date-primary" data-date="save" ${!choice||choice==='custom'&&!note.trim()?'disabled':''}>${t('달력에 남기기','カレンダーに保存')}</button>`:''}
${phase==='calendar'?`<p class="date-saved" role="status">${t('오늘의 순간이 달력에 남았어요. 날짜를 눌러 다시 볼 수 있어요.','今日の瞬間を保存しました。日付を押すと振り返れます。')}</p>${calendar()}<button class="date-primary" data-date="start">${t('다른 순간 기록하기','別の瞬間を記録する')}</button><button type="button" class="date-sub-action" data-date="reset">${t('처음부터 다시 해보기 ↻','最初からやり直す ↻')}</button>`:''}
</div>`;
}
function focusAction(name){root.querySelector(`[data-date="${name}"]`)?.focus({preventScroll:true});}
function stop(){clearInterval(timer);timer=null;phase='annotate';render();focusAction('choice');}
function reset(){clearInterval(timer);timer=null;phase='ready';count=0;choice='';note='';records=[];selected=null;render();}
root.addEventListener('click',e=>{const el=e.target.closest('[data-date]');if(!el)return;switch(el.dataset.date){
case 'start':clearInterval(timer);records=[];selected=null;phase='recording';count=0;choice='';note='';started=Date.now();render();timer=setInterval(()=>{count++;if(count>=sampleA.length){stop();return;}render();},600);break;
case 'stop':if(phase==='recording'&&count>=2)stop();break;
case 'choice':choice=el.dataset.choice;render();if(choice==='custom')root.querySelector('textarea').focus({preventScroll:true});else root.querySelector(`[data-choice="${choice}"]`).focus({preventScroll:true});break;
case 'save':if(phase!=='annotate'||!choice||choice==='custom'&&!note.trim())return;records.unshift({count,choice:choice==='custom'?'':choice,note:note.trim(),time:new Date(started+peak(count).index*600).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'})});phase='calendar';selected=day;render();focusAction('day');break;
case 'day':selected=selected===day?null:day;render();focusAction('day');break;
case 'reset':reset();focusAction('start');break;
}});
root.addEventListener('input',e=>{if(e.target.id==='date-note'){note=e.target.value;root.querySelector('[data-date="save"]').disabled=!note.trim();}});
window.renderDateDemo=render;window.addEventListener('pageshow',reset);window.addEventListener('pagehide',()=>clearInterval(timer));reset();
})();

new IntersectionObserver(([entry])=>entry.target.classList.toggle("date-in-view",entry.isIntersecting)).observe(document.getElementById("date-demo"));
