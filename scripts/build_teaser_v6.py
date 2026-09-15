"""Image-led standalone teaser. Retains local survey flow; preserves v5."""
from pathlib import Path
import base64
root=Path(__file__).resolve().parent.parent
js=(root/'app.js').read_text()
start=js.index('function landing()');end=js.index('function modal(',start)
visual=(root/'teaser-v6.js').read_text()
for key,name in [('LAYERED','sai-rings-layered-v1.png'),('MORNING','sai-separate-mornings-v1.png'),('RINGS','sai-rings-realistic-v1.png'),('LOGO','sai-logo-v1.svg'),('SYMBOL','sai-symbol-v1.svg')]:
 visual=visual.replace('@@'+key+'@@',('data:image/svg+xml;base64,' if name.endswith('.svg') else 'data:image/png;base64,')+base64.b64encode((root/'assets'/name).read_bytes()).decode())
js=js[:start]+visual+'\n'+js[end:]
js=js.replace('function bind(){','function bind(){bindVisual();').replace('href="pair.html"','href="pair-v2.html"').replace('데이트의 몸 기록','함께한 순간').replace('デートの体の記録','ふたりの瞬間')
css='\n'.join(x for x in (root/'style.css').read_text().splitlines() if not x.startswith('@import'))+'\n'+(root/'teaser-v5.css').read_text()+'\n'+(root/'teaser-v6.css').read_text()
html='<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#eaf0d7"><meta name="description" content="내 하루에, 네가 쏙. 나를 알아가고 너를 이해하는 커플 스마트링 SAI."><title>SAI — 내 하루에, 네가 쏙 · Teaser v6</title><style>'+css+'</style></head><body data-entry="teaser"><div id="root"></div><div id="toast" role="status"></div><dialog id="modal"></dialog><script>'+js+'</script></body></html>'
(root/'teaser-v6.html').write_text(html)
print('Built teaser-v6.html:',len(html.encode()),'bytes, standalone')
