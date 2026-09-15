"""Generate an offline teaser; keep pair.html beside it for the app CTA."""
from pathlib import Path
root=Path(__file__).resolve().parent.parent
css='\n'.join(line for line in (root/'style.css').read_text().splitlines() if not line.startswith('@import'))
js=(root/'app.js').read_text()
page='''<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f7f8f3"><meta name="description" content="각자의 리듬이 우리의 일상이 되는 사이. 커플 스마트링과 리듬 캘린더, 심박 터치, 함께하는 작은 약속을 만나보세요."><title>사이 SAI — 각자의 리듬이 우리의 일상이 되는 사이</title><style>'''+css+'''</style></head><body data-entry="teaser"><div id="root"></div><div id="toast" role="status"></div><dialog id="modal"></dialog><script>'''+js+'''</script></body></html>'''
(root/'teaser.html').write_text(page)
print(f'Built teaser.html: {len(page.encode()):,} bytes (standalone, no network assets)')
