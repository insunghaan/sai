"""Image-led standalone teaser. Retains local survey flow; preserves v4."""
from pathlib import Path
import base64
root=Path(__file__).resolve().parent.parent
js=(root/'app.js').read_text()
start=js.index('function landing()');end=js.index('function modal(',start)
visual=(root/'teaser-v5.js').read_text()
for key,name in [('LAYERED','sai-rings-layered-v1.png'),('MORNING','sai-morning-v1.png'),('RINGS','sai-rings-realistic-v1.png')]:
 visual=visual.replace('@@'+key+'@@','data:image/png;base64,'+base64.b64encode((root/'assets'/name).read_bytes()).decode())
js=js[:start]+visual+'\n'+js[end:]
js=js.replace('function bind(){','function bind(){bindVisual();').replace('href="pair.html"','href="pair-v2.html"').replace('데이트의 몸 기록','함께한 순간').replace('デートの体の記録','ふたりの瞬間')
css='\n'.join(x for x in (root/'style.css').read_text().splitlines() if not x.startswith('@import'))+'\n'+(root/'teaser-v5.css').read_text()
html='<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#374c3c"><meta name="description" content="우리 사이, 조금 더 가까이. 나를 알아가고 너를 이해하는 커플 스마트링 SAI."><title>SAI — 우리 사이, 조금 더 가까이 · Teaser v5</title><style>'+css+'</style></head><body data-entry="teaser"><div id="root"></div><div id="toast" role="status"></div><dialog id="modal"></dialog><script>'+js+'</script></body></html>'
(root/'teaser-v5.html').write_text(html)
print('Built teaser-v5.html:',len(html.encode()),'bytes, standalone')
