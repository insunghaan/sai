"""V4 layout and visual language, V8 imagery and concise content."""
from pathlib import Path
import re,base64
root=Path(__file__).resolve().parent.parent
base=(root/'app.js').read_text()
v8=(root/'teaser-v8.js').read_text()
preview=v8[:v8.index('function landing()')]
calendar=re.search(r'<section class="landing-section calendar-showcase">[\s\S]*?</section>',base)[0]
calendar=re.sub(r'<ul>[\s\S]*?</ul>','',calendar)
calendar=re.sub(r'(<div class="calendar-copy">[\s\S]*?</h2>)<p>[\s\S]*?</p>',r'''\1<p>${t('작은 약속이 둘만의 달력으로.','小さな約束がふたりの暦に。')}</p>''',calendar,count=1)
calendar=calendar.replace('너와 내가 쌓이면,<br>우리만의 달력이 돼.','함께한 순간이<br>차곡차곡.').replace('あなたと私が重なると、<br>ふたりだけの暦になる。','ふたりの瞬間が、<br>少しずつ重なる。')
details=re.search(r'<section class="s5-details">[\s\S]*?</section>',v8)[0].replace('s5-details','landing-section v9-details')
visual=preview+'\nfunction v9Calendar(){return `'+calendar+'`}\nfunction v9Details(){return `'+details+'`}\n'+(root/'teaser-v9-layout.js').read_text()
for key,name in [('LAYERED','sai-rings-cartoon-v1.png'),('MORNING','sai-rings-morning-cartoon-v1.png'),('RINGS','sai-rings-realistic-v1.png'),('LOGO','sai-logo-v2.svg'),('SYMBOL','sai-symbol-v1.svg')]:
 visual=visual.replace('@@'+key+'@@',('data:image/svg+xml;base64,' if name.endswith('.svg') else 'data:image/png;base64,')+base64.b64encode((root/'assets'/name).read_bytes()).decode())
start=base.index('function landing()');end=base.index('function modal(',start)
js=base[:start]+visual+'\n'+base[end:]
js=js.replace('function bind(){','function bind(){bindVisual();').replace('href="pair.html"','href="pair-v2.html"').replace('데이트의 몸 기록','함께한 순간').replace('デートの体の記録','ふたりの瞬間')
js=js.replace('목업 체험임을 확인했습니다. 이메일은 저장·전송하지 않고, 선택한 응답만 이 브라우저에 저장합니다.','출시 소식을 이메일로 받아볼게요.').replace('モックアップ体験であることを確認しました。メールは保存・送信せず、選んだ回答のみこのブラウザに保存します。','リリースのお知らせをメールで受け取ります。')
phone_css=(root/'teaser-v5.css').read_text();phone_css=phone_css[phone_css.index('.s5-phone{'):phone_css.index('.s5-product{')]
css='\n'.join(x for x in (root/'style.css').read_text().splitlines() if not x.startswith('@import'))+'\n'+(root/'teaser-v3.css').read_text()+'\n'+(root/'teaser-v4.css').read_text()+'\n'+phone_css+'\n'+(root/'teaser-v9.css').read_text()
html='<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f9faf5"><meta name="description" content="내 하루에, 네가 쏙. 우리끼리 쓰는 스마트링 SAI."><title>SAI — 내 하루에, 네가 쏙 · Teaser v9</title><style>'+css+'</style></head><body data-entry="teaser"><div id="root"></div><div id="toast" role="status"></div><dialog id="modal"></dialog><script>'+js+'</script></body></html>'
(root/'teaser-v9.html').write_text(html)
print('Built teaser-v9.html:',len(html.encode()),'bytes, standalone')
