/* Morning-only adaptation of sai-interactive-review: identical five values and
   share -> receive -> acknowledge state. Local demo, no sensor/network calls. */
(()=>{
const root=document.getElementById('morning-demo');
let sent=null,mood='okay',active="sumin",sending=false,transferTimer=null,tabInteracted=false;

// Local demonstration fixtures; stages sum to each person's total sleep minutes.
const data={sumin:{sleep:462,score:86,hrv:42,oxygen:98,total:84,stages:[96,258,108],awakenings:1},jiwoo:{sleep:372,score:72,hrv:36,oxygen:97,total:76,stages:[66,222,84],awakenings:2}};
const mobile=matchMedia('(max-width:700px)');
const t=(ko,ja)=>document.documentElement.lang==='ja'?ja:ko;
const moods={low:{emoji:'😔',ko:'피곤해',ja:'疲れ気味'},okay:{emoji:'🙂',ko:'보통',ja:'普通'},good:{emoji:'😊',ko:'개운해',ja:'すっきり'}};
function moodPicker(){return `<fieldset class="morning-moods"><legend class="morning-moods-legend"><span>${t('오늘 내 아침 기분은?','今朝の自分の気分は？')}</span><span class="morning-mood-hint">${t('기분을 눌러 변경할 수 있어요','タップして気分を選び直せます')}</span></legend><div class="morning-mood-options">${Object.entries(moods).map(([key,v])=>`<button type="button" data-morning="mood" data-mood="${key}" aria-pressed="${mood===key}" ${sent?'disabled':''}><span aria-hidden="true">${v.emoji}</span><strong>${t(v.ko,v.ja)}</strong></button>`).join('')}</div></fieldset>`}
function receivedMood(key){const v=moods[key];return `<div class="morning-shared-mood"><span aria-hidden="true">${v.emoji}</span><div><small>${t('수민이 전한 오늘의 기분','ユイが伝えた今朝の気分')}</small><strong>${t(v.ko,v.ja)}</strong></div></div>`}
function metrics(v){return `<div class="morning-chart" role="group" aria-label="${t('수면과 신체 기록','睡眠とからだの記録')}">${[
[t('수면 시간','睡眠時間'),`${Math.floor(v.sleep/60)}<small>${t('시간','時間')} ${v.sleep%60}${t('분','分')}</small>`,v.sleep/720*100,`12${t('시간','時間')}`],
[t('심박 변이도(HRV)','心拍変動(HRV)'),`${v.hrv}<small>ms</small>`,v.hrv,'100 ms'],
[t('혈중 산소(SpO₂)','血中酸素(SpO₂)'),`${v.oxygen}<small>%</small>`,v.oxygen,'100%']
].map(([label,value,bar,max])=>`<div class="morning-chart-row"><div class="morning-chart-label"><span>${label}</span><strong>${value}</strong></div><div class="morning-chart-track" aria-hidden="true"><i style="width:${Math.min(bar,100)}%"></i></div></div>`).join('')}<div class="morning-chart-foot"><span>${t('수면 점수','睡眠スコア')}</span><strong>${v.score}<small> / 100</small></strong></div></div>`}
function score(v){return `<div class="morning-score"><strong aria-label="${t('종합점수','総合スコア')} ${v.total}">${v.total}<small>/ 100</small></strong><div class="morning-orbit" style="--score:${v.total}%" aria-hidden="true"><span>☀</span></div></div>`}
function morningArt(person){return `<div class="morning-cartoon morning-cartoon-${person}"><img src="/assets/morning-couple.png" width="1774" height="887" alt="${person==='sumin'?t('기지개를 켜며 아침을 시작하는 수민','背伸びをして朝を迎えるユイ'):t('침대에서 기지개를 켜며 일어나는 지우','ベッドで背伸びをして起きるレン')}" loading="lazy" decoding="async"><div class="morning-art-overlay"><header><span class="morning-avatar ${person==='jiwoo'?'peach':''}">${person==='sumin'?t('수민','ユイ'):t('지우','レン')}</span><time>07:30</time></header>${score(data[person])}</div></div>`}
function sharedList(){const v=sent.values,m=moods[sent.mood];return `<section class="morning-shared-list"><header><span class="morning-avatar">${t('수민','ユイ')}</span><strong>${m.emoji} ${t(m.ko,m.ja)}</strong></header><dl>${[
[t('수면 시간','睡眠時間'),`${Math.floor(v.sleep/60)}${t('시간','時間')} ${v.sleep%60}${t('분','分')}`],
[t('심박 변이도(HRV)','心拍変動(HRV)'),`${v.hrv} ms`],
[t('혈중 산소(SpO₂)','血中酸素(SpO₂)'),`${v.oxygen}%`],
[t('수면 점수','睡眠スコア'),`${v.score} / 100`]
].map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl></section>`}
function partner(){return `${morningArt('jiwoo')}${sent&&!sent.seen?`<div class="morning-received"><div class="morning-received-label">↙ ${t('수민의 좋은 아침','ユイのおはよう')}</div>${receivedMood(sent.mood)}${metrics(sent.values)}<button class="morning-primary" data-morning="confirm">${t('좋은 아침, 확인했어','おはよう、確認したよ')}</button></div>`:''}<div class="morning-own-data">${metrics(data.jiwoo)}</div>${sent&&sent.seen?sharedList():''}${sent?`<button type="button" class="morning-sub-action" data-morning="reset">${t('다시 해보기 ↻','もう一度 ↻')}</button>`:''}`}
function render(){
 const copy={ 'feat1-title':t('잘 잤어?<br>데이터로 아침 인사를 전해요','よく眠れた？<br>データで朝のあいさつを。'),'feat1-desc':t('지난밤 얼마나 잘 잤는지 보면, 오늘의 컨디션을 가늠할 수 있어요. 지금 느끼는 기분도 함께 전해보세요.','昨夜の眠りから、今日の調子のヒントが見えてきます。今の気分も一緒に伝えてみましょう。')};
 Object.entries(copy).forEach(([id,v])=>document.getElementById(id).innerHTML=v);
 root.innerHTML=`<div class="morning-inline" data-active="${active}">${!tabInteracted?`<div class="morning-tab-hint" role="note"><span class="morning-tab-hint-pulse"></span>${t('탭을 눌러 서로의 화면을 확인해보세요','タップしてふたりの画面を切り替えられます')}</div>`:''}<div class="morning-tabs" role="tablist" aria-label="${t('화면 선택','画面を選択')}">${['sumin','jiwoo'].map(person=>`<button id="morning-tab-${person}" role="tab" aria-controls="morning-panel-${person}" aria-selected="${active===person}" tabindex="${active===person?0:-1}" data-morning="tab" data-person="${person}">${person==='sumin'?t('수민','ユイ'):t('지우','レン')}${person==='jiwoo'&&sent&&!sent.seen?'<i aria-label="New">•</i>':''}</button>`).join('')}</div>${sending?`<div class="morning-transfer" role="status"><span>${t('수민','ユイ')}</span><i aria-hidden="true">♡ →</i><span>${t('지우','レン')}</span></div>`:''}<div class="morning-screens"><section id="morning-panel-sumin" class="morning-screen" ${mobile.matches?'role="tabpanel" aria-labelledby="morning-tab-sumin"':''}>${morningArt('sumin')}${metrics(data.sumin)}${moodPicker()}<button class="morning-primary" data-morning="share" ${sent||!mood?'disabled':''}>${sent?t('기분과 데이터 전달 완료 ✓','気分とデータを送りました ✓'):t('내 기분과 함께 데이터 전달하기','気分と一緒にデータを送る')}</button>${sent?`<button type="button" class="morning-sub-action" data-morning="reset">${t('다시 해보기 ↻','もう一度 ↻')}</button>`:''}</section><section id="morning-panel-jiwoo" class="morning-screen morning-desktop-partner" ${mobile.matches?'role="tabpanel" aria-labelledby="morning-tab-jiwoo"':''}>${partner()}</section></div></div>`;

}
function reveal(){
 if(!mobile.matches)return;
 const box=root.querySelector('.morning-inline');
 if(box.getBoundingClientRect().top<70||box.getBoundingClientRect().top>innerHeight/2)box.scrollIntoView({block:'start',behavior:'instant'});
}
function focusTab(){if(mobile.matches)root.querySelector(`#morning-tab-${active}`).focus({preventScroll:true});}
function resetMorning(focus=false){
 clearTimeout(transferTimer);transferTimer=null;
 sent=null;mood='okay';active='sumin';sending=false;
 render();
 if(focus){reveal();if(mobile.matches)focusTab();else root.querySelector('[data-morning="mood"]').focus({preventScroll:true});}
}
function action(e){const a=e.target.closest('[data-morning]')?.dataset.morning;if(!a)return;
 if(a==='mood'&&!sent){const key=e.target.closest('[data-mood]').dataset.mood;if(moods[key]){mood=key;render();root.querySelector(`[data-mood="${key}"]`).focus({preventScroll:true});}}
 if(a==='tab'){
 tabInteracted=true;
 active=e.target.closest('[data-person]').dataset.person;
 clearTimeout(transferTimer);transferTimer=null;sending=false;
 render();focusTab();
 }
 if(a==='share'&&!sent&&mood){
 sent={values:{sleep:data.sumin.sleep,score:data.sumin.score,hrv:data.sumin.hrv,oxygen:data.sumin.oxygen},mood,seen:false};
 sending=mobile.matches;render();
 if(mobile.matches){reveal();focusTab();transferTimer=setTimeout(()=>{sending=false;active='jiwoo';render();reveal();focusTab();},matchMedia('(prefers-reduced-motion:reduce)').matches?0:650);}
 else root.querySelector('[data-morning="confirm"]').focus({preventScroll:true});
 }
 if(a==='confirm'&&sent&&!sent.seen){sent.seen=true;render();if(mobile.matches){reveal();focusTab();}else root.querySelector('[data-morning="reset"]').focus({preventScroll:true});}
 if(a==='reset')resetMorning(true);
}
root.addEventListener('click',action);
root.addEventListener('keydown',e=>{
 if(!e.target.matches('[role="tab"]')||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
 e.preventDefault();tabInteracted=true;active=e.key==='Home'?'sumin':e.key==='End'?'jiwoo':active==='sumin'?'jiwoo':'sumin';
 clearTimeout(transferTimer);sending=false;render();focusTab();
});
mobile.addEventListener('change',()=>{clearTimeout(transferTimer);if(sending)active='jiwoo';sending=false;render();});
window.renderMorning=render;
// Clear restored page state too (mobile back/forward cache).
window.addEventListener('pageshow',()=>resetMorning());
resetMorning();
})();
// Keep the acquisition CTA from covering the interactive sharing controls.
new IntersectionObserver(([entry])=>entry.target.classList.toggle('morning-in-view',entry.isIntersecting),{threshold:0}).observe(document.getElementById('morning-feature'));
