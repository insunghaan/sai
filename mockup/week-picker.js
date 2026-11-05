(() => {
  'use strict';
  const configs = new Map();
  const shift = (day, n) => {
    const d = new Date(day + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const monday = day => shift(day, -(new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7);
  const safe = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const KO_TITLES = {
    'MY SLEEP': '수면',
    'MY ACTIVITY': '활동',
    'MY HEART': '심박',
    'MY HEALTH': '건강 기록',
    'MY CYCLE': '나의 주기 기록',
    'MY DIARY': '나의 일기장',
    'DIARY': '익명의 일기',
    'YOUR DIARY': '공유받은 일기',
    'MY PROFILE': '나의 기본 정보',
    'MY RING': '링 관리',
    'MY PARTNER': '파트너 관리',
    'PARTNER': '파트너 연결',
    'SHARING': '공유 설정',
    'MY ACCOUNT': '계정 관리'
  };

  function rangeLabel(start, end) {
    const a = start.split('-').map(Number), b = end.split('-').map(Number);
    return a[0] !== b[0]
      ? `${a[0]}.${a[1]}.${a[2]} – ${b[0]}.${b[1]}.${b[2]}`
      : a[1] !== b[1]
        ? `${a[1]}월 ${a[2]}일 – ${b[1]}월 ${b[2]}일`
        : `${a[1]}월 ${a[2]}–${b[2]}일`;
  }

  function header(label, dayAttrs, trendAttrs, trend, options = {}) {
    const koLabel = KO_TITLES[label] || label;
    const displayLabel = `${koLabel}${trend && options.trendSuffix !== false ? ' · 추이' : ''}`;
    const hasBackToDay = Boolean(dayAttrs) && trend && options.trendSuffix !== false;
    return `<div class="record-header figma-sub-header figma-back-header">
      <div class="figma-sub-header-left">
        <button type="button" class="back" ${options.backAttrs || (trend && dayAttrs ? dayAttrs : 'data-go="today"')} aria-label="${options.backLabel || (trend ? '하루 기록으로 돌아가기' : '오늘로 돌아가기')}">←</button>
        <span class="figma-sub-header-title figma-header-title">${safe(displayLabel)}</span>
      </div>
      ${hasBackToDay
        ? `<button type="button" class="record-trend-link figma-sheet-link" ${dayAttrs}><span>오늘 기록 →</span></button>`
        : ''}
    </div>`;
  }

  function render(c) {
    configs.set(c.id, c);
    const start = monday(c.day), end = shift(start, 6);
    const clamp = d => d < c.min ? c.min : d > c.max ? c.max : d;
    return `<section class="week-picker figma-week-picker" data-week-picker="${safe(c.id)}">
      <div class="week-heading figma-week-heading">
        <label class="figma-week-range-label">
          <span>${rangeLabel(start, end)}</span>
          <input type="date" aria-label="${safe(c.label || '기록')} 날짜 선택" value="${c.day}" min="${c.min}" max="${c.max}" data-week-input>
        </label>
        <div class="figma-week-arrows">
          <button type="button" class="icon-btn" data-week-day="${clamp(shift(c.day, -7))}" ${start <= c.min ? 'disabled' : ''} aria-label="이전 주">‹</button>
          <button type="button" class="icon-btn" data-week-day="${clamp(shift(c.day, 7))}" ${end >= c.max ? 'disabled' : ''} aria-label="다음 주">›</button>
        </div>
      </div>
      <div class="week-days figma-week-days">
        ${Array.from({ length: 7 }, (_, i) => {
          const d = shift(start, i);
          const valid = d >= c.min && d <= c.max;
          const g = valid && c.getGauge ? c.getGauge(d) : null;
          const isSelected = d === c.day;
          return `<button type="button" data-week-day="${d}" ${valid ? '' : 'disabled'} class="week-day ${isSelected ? 'selected' : ''}" aria-pressed="${isSelected}" ${d === window.SAIPair?.TODAY ? 'aria-current="date"' : ''} aria-label="${d} · ${safe(g?.label || '기록')}">
            <small>${['월', '화', '수', '목', '금', '토', '일'][i]}</small>
            <span>${Number(d.slice(8))}</span>
          </button>`;
        }).join('')}
      </div>
    </section>`;
  }

  function select(el, day) {
    const root = el.closest('[data-week-picker]'), c = configs.get(root?.dataset.weekPicker);
    if (!c || !/^\d{4}-\d{2}-\d{2}$/.test(day) || day < c.min || day > c.max || shift(day, 0) !== day) return;
    c.onSelect(day);
  }

  document.addEventListener('click', e => {
    if (e.target.matches('[data-week-input]')) {
      try { e.target.showPicker?.(); } catch {}
      return;
    }
    const b = e.target.closest('[data-week-day]');
    if (b && !b.disabled) select(b, b.dataset.weekDay);
  });

  document.addEventListener('change', e => {
    if (e.target.matches('[data-week-input]')) select(e.target, e.target.value);
  });

  window.SAIWeek = { render, shift, header };
})();
