/* Couple activity snapshots: local composition and real PNG export. */
(()=>{
  'use strict';
  const extra=window.SAIExtras,previous=extra.content;
  const demo={id:'demo',label:'실외 걷기',date:'2026. 10. 20.',seconds:2520,metrics:{distance:'3.36',calories:'176.4',heart:102,speed:'4.8'}};
  const partners=[
    {id:'walk',label:'실외 걷기',date:demo.date,seconds:2640,metrics:{distance:'3.23',calories:'167.2',heart:98,speed:'4.4'}},
    {id:'run',label:'야외 달리기',date:demo.date,seconds:1800,metrics:{distance:'4.80',calories:'312.0',heart:148,speed:'9.6'}}
  ];
  const fields=[['distance','거리','km'],['time','활동 시간','분:초'],['calories','칼로리','kcal'],['heart','평균 심박수','bpm'],['speed','평균 속도','km/h']];
  let mine='demo',partner='walk',theme='lilac',format='story',caption='각자의 페이스, 함께한 하루.',photo=null,photoPosition=50,sticker=false,back='activity';
  const included=new Set(['distance','time','calories']);
  let step=1,useDemo=true;
  const mineRecords=()=>[...(useDemo?[demo]:[]),...window.SAIActivity.records()];
  const partnerRecords=()=>useDemo?partners:(window.SAIShared?.library()||[]).filter(r=>r.kind==='activity'&&r.from==='jiwoo').map(r=>{const metrics={};let seconds=null;for(const [key,label] of fields){const value=r.values.find(v=>v[0]===label)?.[1];if(value!==undefined){if(key==='time'){const parts=String(value).split(' ')[0].split(':').map(Number);seconds=parts.reduce((a,b)=>a*60+b,0)}else metrics[key]=parseFloat(value)}}return {id:r.id,label:r.title,date:r.day,seconds,metrics}});
  const available=key=>[record(),peer()].every(r=>r&&(key==='time'?r.seconds!=null:r.metrics[key]!=null));
  function syncFields(){for(const key of included)if(!available(key))included.delete(key);if(!included.size){const first=fields.find(([k])=>available(k));if(first)included.add(first[0])}}
  function picker(){const rows=step===1?mineRecords():partnerRecords(),active=step===1?mine:partner;return formPage(SAIWeek.header('COUPLE SNAPSHOT','','',true,{backAttrs:step===1?'data-go="'+back+'"':'data-snap-prev',backLabel:'뒤로 가기',trendSuffix:false})+`<p class="tiny">${step} / 3 · ${['내 활동','파트너 활동','담을 데이터'][step-1]}</p><h2>${['내 활동을 골라주세요','함께 담을 파트너의 활동','두 기록을 한 장에'][step-1]}</h2><p class="sub">${step===1?'내가 기록한 활동 중 하나를 선택해 주세요.':step===2?'파트너가 공유한 활동 중 하나를 선택해 주세요.':'두 활동에서 공통으로 확인할 수 있는 데이터만 담아요.'}</p>${step<3?rows.length?rows.map(r=>`<button class="row snap-record-choice ${r.id===active?'selected':''}" data-snap-pick="${esc(r.id)}" aria-pressed="${r.id===active}"><span class="grow"><strong>${esc(r.label)}</strong><small>${esc(r.date)}${r.seconds!=null?' · '+time(r.seconds):''}</small></span><span>${r.id===active?'✓':'○'}</span></button>`).join(''):`<div class="info">${step===1?'아직 저장한 활동이 없어요. 먼저 활동을 기록해 보세요.':'파트너가 공유한 활동이 아직 없어요. 파트너의 활동이 공유되면 여기서 선택할 수 있어요.'}</div>${step===1?btn('활동 기록하기','activity-select','secondary'):''}`:`<div class="share-card"><small>나 · ${esc(state.name||'지우')}</small><h3>${esc(record().label)}</h3><p>${esc(record().date)}</p><small>파트너 · 윤서</small><h3>${esc(peer().label)}</h3><p>${esc(peer().date)}</p></div><div class="snapshot-fields">${fields.filter(([k])=>available(k)).map(([k,l])=>`<label><input type="checkbox" data-snap-field="${k}" ${included.has(k)?'checked':''}>${l}</label>`).join('')}</div><p class="tiny">선택한 항목만 스냅샷에 표시돼요.</p>`}<div id="snapshot-status" class="tiny" role="status"></div><button class="primary" data-snap-next ${step<3?!rows.some(r=>r.id===active)?'disabled':'':!included.size?'disabled':''}>${step===3?'디자인하고 공유하기':'다음'}</button>`)}

  const record=()=>mineRecords().find(r=>r.id===mine);
  const peer=()=>partnerRecords().find(r=>r.id===partner);
  const time=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  const measure=(r,k)=>k==='time'?time(r.seconds):String(r.metrics[k]);
  const choice=(key,value,label,active)=>`<button type="button" data-snap-${key}="${value}" aria-pressed="${active}" class="${active?'selected':''}">${label}</button>`;
  // Schematic demo paths, not GPS tracks or a geographic map.
  const routes={
    mine:[[.15,.72],[.21,.61],[.18,.48],[.26,.35],[.36,.31],[.40,.18],[.54,.12],[.66,.22],[.79,.27],[.85,.43],[.79,.53],[.83,.67],[.69,.78],[.57,.71],[.48,.83],[.32,.79],[.23,.87],[.15,.72]],
    walk:[[.15,.72],[.23,.63],[.21,.48],[.29,.38],[.39,.34],[.43,.21],[.54,.16],[.64,.25],[.76,.30],[.81,.43],[.75,.54],[.79,.65],[.68,.74],[.57,.68],[.48,.79],[.33,.75],[.23,.83],[.15,.72]],
    run:[[.15,.72],[.11,.57],[.17,.38],[.31,.26],[.40,.18],[.54,.12],[.70,.14],[.89,.25],[.94,.46],[.86,.62],[.89,.80],[.71,.88],[.57,.71],[.48,.83],[.32,.79],[.23,.87],[.15,.72]]
  };
  function artwork(){
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=format==='story'?1920:1350;
    const c=canvas.getContext('2d'),h=canvas.height,story=format==='story',light=theme==='lilac'&&!sticker;
    const fg=light?'#353b38':'#faf8f0',accent=light?'#6d8073':'#b8cbbd',second=light?'#b69978':'#e3c8a4',muted=light?'#7c8178':'#d2d5ce';
    const text=(v,x,y,size=30,color=fg,weight=400,max=940,font='Arial')=>{c.fillStyle=color;c.font=`${weight} ${size}px ${font}, sans-serif`;c.fillText(v,x,y,max)};
    const line=(x,y,x2,y2,color,width=1)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke()};
    if(!sticker){
      c.fillStyle=light?'#f1efe7':'#25332f';c.fillRect(0,0,1080,h);
      if(theme==='photo'&&photo){
        const scale=Math.max(1080/photo.width,h/photo.height);
        c.drawImage(photo,(1080-photo.width*scale)/2,(h-photo.height*scale)*photoPosition/100,photo.width*scale,photo.height*scale);
        const fade=c.createLinearGradient(0,0,0,h);fade.addColorStop(0,'#15221c75');fade.addColorStop(.36,'#15221c30');fade.addColorStop(.62,'#15221c85');fade.addColorStop(1,'#15221cf0');c.fillStyle=fade;c.fillRect(0,0,1080,h);
      }
    }
    c.save();c.translate(74,64);c.scale(1.28,1.28);c.fillStyle=fg;
    for(const d of [
      'M12.9056 42.9941C8.32989 42.9941 3.75417 41.3679 0 38.9477L0.916389 36.1204C5.15836 39.2997 9.67996 41.1018 13.7984 41.1018C19.619 41.1018 23.0819 37.3193 23.0819 32.0235C23.0819 26.8632 20.1436 24.4429 13.409 21.5276C6.93678 18.7327 3.73334 15.6575 3.73334 9.93617C3.73334 3.93026 9.35494 0 16.5048 0C20.2936 0 24.152 1.04543 26.8979 2.21077L26.0479 5.30025C22.6478 2.91538 19.6731 1.80355 15.8189 1.80355C10.9772 1.80355 7.45218 4.42282 7.45218 9.25662C7.45218 13.6815 10.1314 15.7775 16.6673 18.7473C23.205 21.7171 26.798 25.0959 26.798 31.1501C26.798 38.1381 21.1164 42.9718 12.8931 42.9718L12.9056 42.9941Z',
      'M26.9533 42.238L46.9579 0.757396H51.86L51.3371 2.09684L57.743 42.238H53.8866L50.8142 23.3688H37.8056L28.7845 42.238H26.9533ZM38.6594 21.563L50.556 21.6213L47.9412 4.19426H47.3539L38.6594 21.563Z',
      'M68.6134 42.238L69.2029 0.757396H73.2944L72.6677 1.86339L72.1449 42.238H68.6134Z'
    ]){c.fill(new Path2D(d));}
    c.restore();
    text('A LITTLE FURTHER, TOGETHER',560,104,20,muted,400,450);
    text('In good company.',74,story?284:246,76,fg,400,930,'Georgia');
    text(caption,78,story?344:299,28,muted,400,920);
    const box={x:100,y:story?410:340,w:880,h:story?570:285};
    if(!sticker&&theme!=='photo'){
      c.save();c.beginPath();c.rect(50,box.y-30,980,box.h+60);c.clip();
      c.strokeStyle=light?'#d9ddd366':'#c3cbb010';c.lineWidth=2;
      for(let i=0;i<8;i++){c.beginPath();c.moveTo(-50,box.y+i*100-170);c.bezierCurveTo(220,box.y+i*80+200,610,box.y+i*65-220,1140,box.y+i*90+80);c.stroke()}
      c.restore();
    }
    const path=(points,color,dash=[])=>{
      c.save();c.beginPath();points.forEach(([x,y],i)=>{const px=box.x+x*box.w,py=box.y+y*box.h;i?c.lineTo(px,py):c.moveTo(px,py)});
      c.lineCap='round';c.lineJoin='round';c.setLineDash(dash);c.strokeStyle=theme==='photo'||sticker?'#15221c55':'transparent';c.lineWidth=13;c.stroke();c.strokeStyle=color;c.lineWidth=5;c.stroke();c.restore();
    };
    path(routes.mine,accent);path(routes[partner]||routes.walk,second,[10,9]);
    const start=routes.mine[0],sx=box.x+start[0]*box.w,sy=box.y+start[1]*box.h;
    c.fillStyle=fg;c.beginPath();c.arc(sx,sy,8,0,Math.PI*2);c.fill();text('START / FINISH',74,sy+5,14,muted,400,135);
    const legend=story?1040:666;
    line(76,legend-7,118,legend-7,accent,4);text(state.name||'지우',132,legend,22,fg,400,270);
    c.setLineDash([7,6]);line(380,legend-7,422,legend-7,second,4);c.setLineDash([]);text('윤서',436,legend,22);
    text('SYNCHRONIZED ROUTES',733,legend,17,muted);
    const rows=fields.filter(([k])=>included.has(k)),hero=rows[0],rest=rows.slice(1),base=story?1135:730;
    line(74,base-32,1006,base-32,light?'#9daba455':'#ffffff55');
    for(const [r,name,x,color] of [[record(),state.name||'지우',74,accent],[peer(),'윤서',570,second]]){
      text(name,x,base+12,28,fg,400,400);text(r.label,x,base+48,19,muted);
      text(measure(r,hero[0]),x-3,base+151,100,fg,400,410,'Georgia');text(`${hero[1]} · ${hero[2]}`,x,base+188,22,color);
      rest.forEach(([k,label,unit],i)=>{
        const y=base+246+i*(story?88:58);
        text(label,x,y,18,muted,400,145);text(measure(r,k),x+155,y+3,32,fg,400,170);text(unit,x+345,y,18,muted);
      });
    }
    line(532,base+2,532,base+200+rest.length*(story?88:58),light?'#9daba444':'#ffffff30');
    const dates=record().date===peer().date?record().date:`${record().date} / ${peer().date}`;
    line(74,h-128,1006,h-128,light?'#9daba455':'#ffffff44');text(dates,74,h-83,21,muted);
    text('OUR PACE. OUR PLACE.',74,h-43,18,muted);text('SAI RING · ACTIVITY SNAPSHOT',755,h-43,17,muted);
    return canvas;
  }
  function preview(){
    const img=document.getElementById('snapshot-preview');if(!img)return;
    img.src=artwork().toDataURL('image/png');
    img.alt=`${state.name||'지우'}와 윤서의 활동 스냅샷. 실선과 점선으로 표시한 활동 경로. ${fields.filter(([k])=>included.has(k)).map(([k,l,u])=>`${l}: ${measure(record(),k)} / ${measure(peer(),k)} ${u}`).join(', ')}`;
  }
  function status(message){const el=document.getElementById('snapshot-status');if(el)el.textContent=message}
  extra.content=function(id){
    if(id==='activity-snapshot-pick')return picker();
    if(id!=='activity-snapshot')return previous(id);
    if(!record()||!peer()){step=1;return picker()}
    syncFields();if(!included.size){step=3;return picker()}
    setTimeout(preview,0);
    return formPage(SAIWeek.header('COUPLE SNAPSHOT','','',true,{backAttrs:'data-snap-edit-selection',backLabel:'활동 선택으로 돌아가기',trendSuffix:false})+title('OUR ACTIVITY / SNAPSHOT','둘의 움직임을,<br>한 장에.','같은 길을 걸어도, 다른 곳에서 달려도.')+
      `<div class="snapshot-preview-wrap ${sticker?'is-sticker':''}"><img id="snapshot-preview" alt="커플 스냅샷 미리보기"><span>미리보기 · ${format==='story'?'1080 × 1920':'1080 × 1350'}</span></div>
      <section class="snapshot-controls" aria-label="스냅샷 편집">
      <div class="section-label"><span>01 / 디자인</span><span>우리다운 분위기</span></div>
      <div class="snapshot-choices">${[['lilac','PAPER / 아이보리'],['night','DUSK / 포레스트'],['photo','PHOTO / 사진']].map(([v,l])=>choice('theme',v,l,theme===v)).join('')}</div>
      ${!sticker?`<label class="snapshot-upload">우리의 사진 올리기<input id="snapshot-photo" type="file" accept="image/jpeg,image/png,image/webp"></label><p class="tiny">사진은 기기 안에서만 사용해요.${photo?' 다시 선택하면 사진이 바뀌어요.':' 사진 위에 두 사람의 경로와 기록을 얹어요.'}</p>${photo?`<label class="snapshot-field">사진 위치<input id="snapshot-photo-position" type="range" min="0" max="100" value="${photoPosition}"></label><button type="button" class="text-btn" data-snap-remove-photo>사진 지우기</button>`:''}`:''}
      <p class="tiny">실선은 나의 이동 경로, 점선은 파트너의 이동 경로를 나타내요.</p>
      <div class="snapshot-choices">${choice('format','story','스토리 9:16',format==='story')}${choice('format','feed','피드 4:5',format==='feed')}</div>
      <label class="snapshot-sticker"><input id="snapshot-sticker" type="checkbox" ${sticker?'checked':''}><span><b>배경 없이, 스티커로</b><small>사진 위에 붙이는 투명 PNG</small></span><span>↗</span></label>
      <div class="section-label"><span>02 / 둘의 기록</span></div>
      <p class="tiny">${esc(state.name||'지우')} · ${esc(record().label)} / 윤서 · ${esc(peer().label)}</p><button class="secondary" data-snap-edit-selection>활동·데이터 선택 변경하기</button>
      <label class="snapshot-field" for="snapshot-caption">우리의 한 줄<input id="snapshot-caption" maxlength="24" value="${esc(caption)}" placeholder="오늘을 기억할 한 줄"></label>
      </section><div id="snapshot-status" class="tiny" role="status" aria-live="polite"></div>
      <button class="primary" data-snap-export="save">이미지 저장하기 ↓</button>
      <button class="secondary" data-snap-export="share">공유하기 ↗</button>
      <p class="tiny center">저장한 이미지를 인스타그램 스토리나 피드에 올려보세요.</p>`);
  };
  document.addEventListener('click',async e=>{
    const open=e.target.closest('[data-snap-open]');
    if(open){back=['calendar','shared-records'].includes(current)?'calendar':'activity';useDemo=true;step=1;mine=mineRecords().some(r=>r.id===open.dataset.snapOpen)?open.dataset.snapOpen:'demo';partner='walk';go('activity-snapshot-pick');return}
    if(e.target.closest('[data-snap-demo]')){useDemo=true;mine='demo';partner='walk';step=1;render();return}
    const pick=e.target.closest('[data-snap-pick]');if(pick){const val=pick.dataset.snapPick;if(step===1)mine=val;else partner=val;document.querySelectorAll('[data-snap-pick]').forEach(btn=>{const sel=btn.dataset.snapPick===val;btn.classList.toggle('selected',sel);btn.setAttribute('aria-pressed',String(sel));const ind=btn.lastElementChild;if(ind)ind.textContent=sel?'✓':'○';});return}
    if(e.target.closest('[data-snap-prev]')){step=Math.max(1,step-1);render();return}
    if(e.target.closest('[data-snap-edit-selection]')){step=1;go('activity-snapshot-pick');return}
    if(e.target.closest('[data-snap-next]')){if(step===1&&!record()||step===2&&!peer())return;if(step<3){step++;if(step===3)syncFields();render()}else if(included.size)go('activity-snapshot');return}

    const t=e.target.closest('[data-snap-theme]'),f=e.target.closest('[data-snap-format]');
    if(e.target.closest('[data-snap-remove-photo]')){photo=null;theme='lilac';render();return}
    if(t){theme=t.dataset.snapTheme;render();return}
    if(f){format=f.dataset.snapFormat;document.querySelectorAll('[data-snap-format]').forEach(btn=>btn.classList.toggle('selected',btn.dataset.snapFormat===format));preview();return}
    const exp=e.target.closest('[data-snap-export]');if(!exp)return;
    if(theme==='photo'&&!photo&&!sticker){status('배경 사진을 먼저 선택해 주세요.');return}
    const buttons=[...document.querySelectorAll('[data-snap-export]')];buttons.forEach(b=>b.disabled=true);
    try{
      const blob=await new Promise(resolve=>artwork().toBlob(resolve,'image/png'));
      if(!blob)throw Error('image');
      const file=new File([blob],`sai-together-${format}${sticker?'-sticker':''}.png`,{type:'image/png'});
      if(exp.dataset.snapExport==='share'&&navigator.canShare?.({files:[file]})){
        await navigator.share({files:[file],title:'우리의 움직임 · sai'});status('공유 창으로 전달했어요.');
      }else{
        const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
        status(exp.dataset.snapExport==='share'?'이 브라우저는 이미지 공유를 지원하지 않아 PNG로 저장했어요.':'이미지를 저장했어요. 인스타그램에서 불러와 주세요.');
      }
    }catch(err){status(err.name==='AbortError'?'공유를 취소했어요.':'이미지를 만들지 못했어요. 다시 시도해 주세요.')}
    finally{buttons.forEach(b=>b.disabled=false)}
  });
  document.addEventListener('input',e=>{if(e.target.id==='snapshot-photo-position'){photoPosition=Number(e.target.value);preview()}if(e.target.id==='snapshot-caption'){caption=e.target.value;preview()}});
  document.addEventListener('change',async e=>{
    const el=e.target;
    if(el.id==='snapshot-sticker'){sticker=el.checked;render();return}
    if(el.id==='snapshot-mine'){mine=el.value;preview()}
    if(el.id==='snapshot-partner'){partner=el.value;preview()}
    if(el.dataset.snapField){
      if(!el.checked&&included.size===1){el.checked=true;status('데이터를 하나 이상 선택해 주세요.');return}
      el.checked?included.add(el.dataset.snapField):included.delete(el.dataset.snapField);status('');
      const nextBtn=document.querySelector('[data-snap-next]');if(nextBtn)nextBtn.disabled=!included.size;
      if(current!=='activity-snapshot-pick')preview();
    }
    if(el.id==='snapshot-photo'){
      const file=el.files[0];if(!file)return;
      if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>15*1024*1024){status('15MB 이하의 JPG, PNG, WebP 사진을 선택해 주세요.');return}
      const url=URL.createObjectURL(file);
      try{const image=new Image();image.src=url;await image.decode();photo=image;photoPosition=50;theme='photo';render();status('사진을 적용했어요.')}
      catch{status('사진을 읽을 수 없어요. 다른 사진을 선택해 주세요.')}
      finally{URL.revokeObjectURL(url)}
    }
  });
  screens.push(['activity-snapshot-pick','커플 활동 선택','04 / MY DAY','두 기록을 하나로','내 활동 → 파트너가 공유한 활동 → 표시 데이터 → 디자인·공유']);
  screens.push(['activity-snapshot','커플 스냅샷','04 / MY DAY','각자의 페이스를 한 장에','두 사람의 활동 선택, 디자인 3종, 표시 지표 선택 및 9:16·4:5 PNG 저장을 지원합니다.']);
  rebuildIndex();render();
})();
