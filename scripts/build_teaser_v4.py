"""Build the independent, offline SAI teaser v4. Preserve teaser.html and app sources."""
from pathlib import Path
import base64
root=Path(__file__).resolve().parent.parent
css='\n'.join(x for x in (root/'style.css').read_text().splitlines() if not x.startswith('@import'))+'\n'+(root/'teaser-v3.css').read_text()+'\n'+(root/'teaser-v4.css').read_text()
js=(root/'app.js').read_text().replace('landing teaser-v2','landing teaser-v2 teaser-v3')
ring_image=base64.b64encode((root/'assets/sai-rings-layered-v1.png').read_bytes()).decode()
ring='<img class="ring-photo layered-photo" src="data:image/png;base64,'+ring_image+'" width="1254" height="1254" alt="" decoding="async"><span class="art-spark" aria-hidden="true">✳</span><span class="art-spark tiny" aria-hidden="true">✧</span><span class="ring-tag" aria-hidden="true">you &amp; me.</span>'

js=js.replace('<div class="large-ring"></div><div class="large-ring second"></div>',ring)
manifesto='''<section class="sai-manifesto"><span class="eyebrow">A LITTLE CLOSER, EVERY DAY.</span><p>Two rings. Our little world.</p><span>${t('매일의 “잘 잤어?”가, 조금 더 다정해지는 방법.','毎日の「よく眠れた？」が、少しやさしくなる方法。')}</span><div class="mascot-pair" aria-hidden="true"><div class="blob"><i class="leaf"></i></div><b>♡</b><div class="blob peach"><i class="leaf"></i></div></div></section>'''
needle='<section class="landing-section"><div class="section-title"><span class="eyebrow">A SMALL CHOICE'
js=js.replace(needle,manifesto+needle)
garden='''<section class="sai-garden"><div><span class="eyebrow">LITTLE THINGS GROW TOGETHER</span><h2>${t('너도 잘 자고, 나도 잘 자면.<br>우리 정원에 꽃이 피어.','あなたも、私もよく眠れたら。<br>ふたりの庭に花が咲く。')}</h2><p>${t('각자의 수면 목표를 채운 날, 함께 피우는 꽃 한 송이.<br>사소한 하루도 우리끼리는 꽤 특별하니까.','それぞれの睡眠目標を満たした日に、一緒に咲かせる一輪。<br>何気ない一日も、ふたりなら少し特別。')}</p><button class="feature-interest" data-action="signup" data-interest="garden">${t('우리도 정원을 가꾸고 싶어요','ふたりで庭を育てたい')} ↗</button></div><div class="garden-illustration" aria-hidden="true"><span class="garden-stalk"><i>✿</i></span><span class="garden-stalk"><i>✿</i></span><span class="garden-stalk"><i>✾</i></span><span class="garden-stalk"><i>✿</i></span></div></section>'''
js=js.replace('<section class="landing-section pricing">',garden+'<section class="landing-section pricing">')
js=js.replace('실버와 샴페인 커플 스마트링 콘셉트','얇은 주얼리 반지와 스마트링을 레이어드한 두 사람의 손 · 스타일링 콘셉트').replace('シルバーとシャンパンのペアスマートリングコンセプト','細いジュエリーリングとスマートリングを重ねたふたりの手・スタイリングイメージ')
# Label the new design while keeping the existing KR/JP behavior and local survey.
page='''<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f9faf5"><meta name="description" content="매일의 잘 잤어가 조금 더 다정해지는 방법. 사이 SAI 커플 스마트링과 둘만의 작은 일상을 만나보세요."><title>사이 SAI — 둘만의 작은 세계 · Teaser v4</title><style>'''+css+'''</style></head><body data-entry="teaser"><div id="root"></div><div id="toast" role="status"></div><dialog id="modal"></dialog><script>'''+js+'''</script></body></html>'''
(root/'teaser-v4.html').write_text(page)
print(f'Built teaser-v4.html: {len(page.encode()):,} bytes (offline; existing teaser preserved)')
