"""Build two synchronized phone previews into a single offline HTML file."""
from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent
css=(root/'pair.css').read_text()+'\n'+(root/'pair-health-v2.css').read_text()
model=(root/'pair-model.js').read_text()
app=(root/'pair-app.js').read_text()
a=app.index('function health()');b=app.index('function settings()',a)
app=app[:a]+(root/'pair-health-v2.js').read_text()+'\n'+app[b:]
app=app.replace('function bind(){','function bind(){bindHealth();')
app=app.replace("['calendar','calendar',t('리듬 달력','リズム暦')]","['health','chart',t('내 데이터','自分のデータ')],['calendar','calendar',t('리듬 달력','リズム暦')]")
app=app.replace("home:'<path", "chart:'<path d=\"M4 3v17h17M8 15v-4m5 4V6m5 9v-6\"/>',home:'<path")
app=app.replace("if(msg.reset){tab=", "if(msg.reset){healthMetric='sleep';healthPeriod=7;healthDay=M.TODAY;tab=")
for old,new in [('데이트의 몸 기록','함께한 순간'),('데이트 몸 기록','함께한 순간'),('데이트를 몸의 기억으로.','함께한 순간을, 우리만의 기록으로.'),('デートの体の記録','ふたりの瞬間'),('デートを体の記憶に。','ふたりの瞬間を、思い出の記録に。')]:app=app.replace(old,new)
app=app.replace('<section class="card checkin">','<button class="calendar-entry health-entry" data-tab="health"><span>↗</span><div><small>MY RHYTHM / MY DATA</small><h3>${t("내 기록을 조금 더 자세히","自分の記録をもっと詳しく")}</h3><p>${t("수면 · 심박 · 활동, 7일과 30일의 변화","睡眠・心拍・活動、7日と30日の変化")}</p></div><b>↗</b></button><section class="card checkin">')

host=(root/'pair-host.js').read_text().replace('sai-pair-v1','sai-pair-v2').replace('데이트 기록','함께한 순간').replace('デート記録','ふたりの瞬間')
host_css=(root/'pair-host.css').read_text()
inner='<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>사이 커플 앱 v2</title><style>'+css+'</style></head><body><div id="root"></div><div id="toast" role="status"></div><dialog id="dialog"></dialog><script>'+model+'</script><script>'+app+'</script></body></html>'
payload=json.dumps(inner,ensure_ascii=False).replace('<','\\u003c')
def tr(ko,ja,tag='span',attrs=''):
 return f'<{tag} data-ko="{ko}" data-ja="{ja}" {attrs}>{ko}</{tag}>'
scenarios=[('calendar','데이트 정하기','デートを決める'),('care','배려 주고받기','気づかい'),('pulse','심박 터치','心拍タッチ'),('breathe','함께 호흡','一緒に呼吸'),('walk','같이 걷기','一緒に歩く'),('date','함께한 순간','ふたりの瞬間'),('garden','수면 정원','睡眠ガーデン'),('rhythm','편한 시간','都合のいい時間')]
outer='''<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#ecefe5"><title>사이 SAI v2 — 나의 기록과 둘의 일상</title><style>'''+host_css+'''</style></head><body data-active="sumin"><header class="host-header"><a class="host-logo" href="index.html">sai<span>.</span></a><div class="host-brand-copy">TWO RINGS.<br>ONE LITTLE WORLD.</div><nav class="host-links">'''+tr('티저 보기 ↗','ティザーを見る ↗','a','href="teaser-v4.html"')+tr('기존 모바일 ↗','以前のモバイル ↗','a','href="mobile-single.html"')+'''<button id="reset-top" aria-label="체험 초기화">↺</button><button id="host-language">KR / JP</button></nav></header><section class="host-intro"><small>OUR RHYTHMS, SIDE BY SIDE</small>'''+tr('나의 작은 선택이, 너의 하루에 닿도록.','わたしの小さな選択が、あなたの一日に届く。','h1')+tr('두 사람의 화면을 직접 눌러보세요. 한쪽에서 시작하고, 다른 쪽에서 함께 완성해요.','ふたりの画面を操作してみて。一方で始めて、もう一方で一緒に完成させます。','p')+'''</section><nav class="scenario-nav" aria-label="시연할 기능">'''+''.join(tr(ko,ja,'button',f'data-scenario="{k}"') for k,ko,ja in scenarios)+'''</nav><p class="scenario-guide" id="scenario-guide">아래 화면에서 자유롭게 체험하거나, 위에서 시연할 기능을 골라보세요.</p><nav class="mobile-switch" aria-label="체험할 사람"><button data-phone="sumin" class="selected" aria-pressed="true">🌱 '''+tr('수민의 화면','スミンの画面')+'''<i class="count" data-count="sumin" hidden></i></button><button data-phone="jiwoo" aria-pressed="false">🍑 '''+tr('지우의 화면','ジウの画面')+'''<i class="count" data-count="jiwoo" hidden></i></button></nav><main class="dual-stage">'''
for i,who in enumerate(['sumin','jiwoo']):
 if i==1:
  outer+='''<aside class="connection"><div class="connection-symbol">◯<span>◯</span></div><div class="connection-line"></div><small>CONNECTED, HERE.</small><p id="connection-status">'''+tr('각자의 화면, 함께하는 변화.','それぞれの画面、一緒の変化。')+'''</p><span class="shared-count" id="shared-count"></span>'''+tr('체험 처음부터 ↺','体験を最初から ↺','button','id="reset-demo"')+'''</aside>'''
 outer+=f'<section class="phone-column {who}" aria-label="'+('수민의 화면' if who=='sumin' else '지우의 화면')+'"><div class="person-label"><span class="'+('peach' if who=='jiwoo' else '')+'">'+('🌱' if who=='sumin' else '🍑')+'</span>'+tr('수민의 화면' if who=='sumin' else '지우의 화면','スミンの画面' if who=='sumin' else 'ジウの画面','strong')+tr('내 선택을 시작해요' if who=='sumin' else '함께 반응해요','自分の選択を始める' if who=='sumin' else '一緒に反応する','small')+f'<i class="count" data-count="{who}" hidden></i></div><div class="phone-frame"><div class="phone-glass"><div class="island"></div><iframe id="{who}-frame" title="'+('수민의 앱' if who=='sumin' else '지우의 앱')+'"></iframe><div class="home-line"></div></div></div></section>'
outer+='</main><footer class="host-footer">'+tr('SAI CONCEPT · 모든 생체 데이터는 예시입니다. 반응은 이 파일의 두 화면 사이에서만 공유되며 외부로 전송되지 않습니다.','SAI CONCEPT · 生体データはすべてサンプルです。反応はこのファイルの2画面間だけで共有し、外部送信しません。')+'</footer><dialog id="reset-dialog">'+tr('처음부터 다시 체험할까요?','最初から体験しますか？','h2')+tr('이 두 화면에서 만든 약속, 기록, 공유 설정을 초기화합니다. 기존 PC 목업의 기록은 유지됩니다.','この2画面の約束・記録・共有設定をリセットします。以前のPCモックの記録は保持されます。','p')+'<div class="dialog-actions">'+tr('돌아가기','戻る','button','id="reset-cancel"')+tr('초기화하기','リセット','button','id="reset-confirm"')+'</div></dialog><script type="application/json" id="phone-document">'+payload+'</script><script>'+model+'</script><script>'+host+'</script></body></html>'
for name in ['pair-v2.html','mobile-v2.html']:
 (root/name).write_text(outer)
 print(f'Built {name}: {len(outer.encode()):,} bytes (standalone, offline, two synchronized views)')
