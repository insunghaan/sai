// ============================================================================
// SAI — Apple Swift Charts Engine (Catmull-Rom Spline, Animated Path Draw,
//       Staggered Bar/Capsule Motion, Pulsing Halo & Interactive Scrubber)
// ============================================================================
(function () {
  function catmullRomToBezier(points, tension = 0.22) {
    if (!points || points.length === 0) return '';
    if (points.length === 1) return `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
    let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
      const cp1y = p1[1] + (p2[1] - p0[1]) * tension;
      const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
      const cp2y = p2[1] - (p3[1] - p1[1]) * tension;
      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  }

  let uidCounter = 1;
  const nextId = (prefix) => `swift-${prefix}-${uidCounter++}`;

  // 1. Apple Swift Charts — Smooth Area + Line Chart with Average RuleMark & Motion
  function areaLineChart(opts = {}) {
    const values = opts.values || [64, 68, 66, 71, 69, 74, 72];
    const labels = opts.labels || [];
    const unit = opts.unit || '';
    const color = opts.color || '#E86D13';
    const avgLabel = opts.avgLabel || '평균';
    const height = opts.height || 138;
    const width = 320;
    const padL = 12, padR = 12, padT = 22, padB = labels.length ? 26 : 14;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const minV = opts.min !== undefined ? opts.min : Math.min(...values);
    const maxV = opts.max !== undefined ? opts.max : Math.max(...values);
    const span = Math.max(maxV - minV, 1);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    const pts = values.map((v, i) => {
      const x = padL + (i / Math.max(values.length - 1, 1)) * plotW;
      const y = padT + (1 - (v - minV) / span) * plotH;
      return [x, y, v, labels[i] || `${i + 1}`];
    });

    const linePath = catmullRomToBezier(pts);
    const first = pts[0];
    const last = pts[pts.length - 1];
    const areaPath = `${linePath} L ${last[0].toFixed(1)} ${(padT + plotH).toFixed(1)} L ${first[0].toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;
    const avgY = padT + (1 - (avg - minV) / span) * plotH;
    const gradId = nextId('area');

    let secondaryLineSvg = '';
    if (Array.isArray(opts.secondaryValues) && opts.secondaryValues.length) {
      const sPts = opts.secondaryValues.map((v, i) => {
        const x = padL + (i / Math.max(opts.secondaryValues.length - 1, 1)) * plotW;
        const y = padT + (1 - (v - minV) / span) * plotH;
        return [x, y];
      });
      const sPath = catmullRomToBezier(sPts);
      secondaryLineSvg = `<path class="swift-line-anim" pathLength="1" d="${sPath}" fill="none" stroke="${opts.secondaryColor || '#30231B'}" stroke-width="2.2" stroke-dasharray="4 3" stroke-linecap="round"/>`;
    }

    let bandSvg = '';
    if (Array.isArray(opts.band) && opts.band.length === values.length) {
      const topPts = opts.band.map((b, i) => `${(padL + (i / Math.max(values.length - 1, 1)) * plotW).toFixed(1)},${(padT + (1 - (b[1] - minV) / span) * plotH).toFixed(1)}`).join(' ');
      const botPts = [...opts.band].reverse().map((b, idx) => {
        const i = values.length - 1 - idx;
        return `${(padL + (i / Math.max(values.length - 1, 1)) * plotW).toFixed(1)},${(padT + (1 - (b[0] - minV) / span) * plotH).toFixed(1)}`;
      }).join(' ');
      bandSvg = `<polygon class="swift-area-anim" points="${topPts} ${botPts}" fill="#E6D6BE" fill-opacity="0.55"/>`;
    }

    const gridLines = [0.15, 0.5, 0.85].map(r => {
      const gy = (padT + r * plotH).toFixed(1);
      return `<line x1="${padL}" y1="${gy}" x2="${width - padR}" y2="${gy}" stroke="#30231B" stroke-opacity="0.06" stroke-width="1"/>`;
    }).join('');

    const dots = pts.map(([x, y, v, lbl], i) => {
      const isLast = i === pts.length - 1;
      const isMax = v === Math.max(...values);
      const delay = (0.18 + i * 0.045).toFixed(2);
      return `<g class="swift-point-group ${isLast ? 'is-active' : ''}" data-swift-x="${x.toFixed(1)}" data-swift-y="${y.toFixed(1)}" data-swift-val="${Number.isInteger(v) ? v : Number(v).toFixed(1)}${unit}" data-swift-label="${lbl}">
        <circle class="swift-hit-target" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12" fill="transparent"/>
        ${isLast ? `<circle class="swift-live-halo" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="${color}" fill-opacity="0.22"/>` : ''}
        <circle class="swift-dot" style="animation-delay:${delay}s" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${isLast ? 4.5 : (isMax ? 3.5 : 2.5)}" fill="${isLast ? color : '#FEF8EF'}" stroke="${color}" stroke-width="${isLast ? 2.5 : 1.8}"/>
      </g>`;
    }).join('');

    const xLabels = labels.length ? labels.map((l, i) => {
      const x = padL + (i / Math.max(labels.length - 1, 1)) * plotW;
      return `<text x="${x.toFixed(1)}" y="${height - 6}" text-anchor="middle" fill="#796C60" font-size="10" font-weight="500">${l}</text>`;
    }).join('') : '';

    return `<svg class="chart figma-svg-chart swift-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${opts.ariaLabel || '트렌드 차트'}">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.30"/>
          <stop offset="75%" stop-color="${color}" stop-opacity="0.06"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      ${gridLines}
      ${bandSvg}
      <line x1="${padL}" y1="${avgY.toFixed(1)}" x2="${width - padR}" y2="${avgY.toFixed(1)}" stroke="#796C60" stroke-opacity="0.45" stroke-width="1" stroke-dasharray="3 3"/>
      <text x="${width - padR}" y="${Math.max(12, avgY - 5).toFixed(1)}" text-anchor="end" fill="#796C60" font-size="9.5" font-weight="600">${avgLabel} ${Number.isInteger(avg) ? avg : avg.toFixed(1)}${unit}</text>
      <path class="swift-area-anim" d="${areaPath}" fill="url(#${gradId})"/>
      ${secondaryLineSvg}
      <path class="swift-line-anim" pathLength="1" d="${linePath}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}
      <g class="swift-active-pill" transform="translate(${Math.min(width - 78, Math.max(8, last[0] - 32)).toFixed(1)}, ${Math.max(2, last[1] - 24).toFixed(1)})">
        <rect width="64" height="18" rx="9" fill="#30231B" fill-opacity="0.88"/>
        <text class="swift-readout-text" x="32" y="12.5" text-anchor="middle" fill="#FEF8EF" font-size="10" font-weight="600">${Number.isInteger(last[2]) ? last[2] : Number(last[2]).toFixed(1)}${unit}</text>
      </g>
      ${xLabels}
    </svg>`;
  }

  // 2. Apple Health Heart Rate Range Capsule + Smooth Trend Spline Chart
  function heartRangeChart(values = [], opts = {}) {
    const series = values.length ? values : [61, 59, 57, 56, 56, 58, 64, 74, 79, 71, 68, 69, 73, 67, 66, 70, 76, 84, 96, 78, 69, 65, 63, 62];
    const width = 320, height = 138;
    const padL = 12, padR = 12, padT = 18, padB = 24;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const minV = Math.min(...series) - 6;
    const maxV = Math.max(...series) + 8;
    const span = Math.max(maxV - minV, 1);
    const gradId = nextId('hr');

    const pts = series.map((v, i) => {
      const x = padL + (i / Math.max(series.length - 1, 1)) * plotW;
      const y = padT + (1 - (v - minV) / span) * plotH;
      return [x, y, v];
    });

    const capsules = pts.filter((_, i) => i % 2 === 0).map(([x, y, v], idx) => {
      const spread = (idx % 3 === 1 ? 9 : 6);
      const yTop = Math.max(padT + 2, y - spread);
      const yBot = Math.min(padT + plotH - 2, y + spread);
      const h = Math.max(6, yBot - yTop);
      const delay = (idx * 0.035).toFixed(2);
      return `<rect class="swift-bar-anim" style="animation-delay:${delay}s" x="${(x - 3).toFixed(1)}" y="${yTop.toFixed(1)}" width="6" height="${h.toFixed(1)}" rx="3" fill="#E86D13" fill-opacity="0.22"/>`;
    }).join('');

    const linePath = catmullRomToBezier(pts);
    const areaPath = `${linePath} L ${pts[pts.length - 1][0].toFixed(1)} ${(padT + plotH).toFixed(1)} L ${pts[0][0].toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;
    const last = pts[pts.length - 1];
    const timeLabels = [['00시', 0], ['06시', 0.25], ['12시', 0.5], ['18시', 0.75], ['지금', 1]];

    const pointTargets = pts.filter((_, i) => i % 3 === 0 || i === pts.length - 1).map(([x, y, v], idx) => {
      const isLast = x === last[0] && y === last[1];
      const delay = (0.18 + idx * 0.045).toFixed(2);
      return `<g class="swift-point-group ${isLast ? 'is-active' : ''}" data-swift-x="${x.toFixed(1)}" data-swift-y="${y.toFixed(1)}" data-swift-val="${v} bpm" data-swift-label="${idx * 3}시">
        <circle class="swift-hit-target" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11" fill="transparent"/>
        ${isLast ? `<circle class="swift-live-halo" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9.5" fill="#E86D13" fill-opacity="0.24"/>` : ''}
        <circle class="swift-dot" style="animation-delay:${delay}s" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${isLast ? 4.5 : 2.5}" fill="${isLast ? '#E86D13' : '#FEF8EF'}" stroke="#E86D13" stroke-width="${isLast ? 2.5 : 1.6}"/>
      </g>`;
    }).join('');

    return `<svg class="chart figma-svg-chart swift-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Apple Swift 심박 추이 그래프">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#E86D13" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#E86D13" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <line x1="${padL}" y1="${(padT + plotH * 0.25).toFixed(1)}" x2="${width - padR}" y2="${(padT + plotH * 0.25).toFixed(1)}" stroke="#30231B" stroke-opacity="0.06"/>
      <line x1="${padL}" y1="${(padT + plotH * 0.65).toFixed(1)}" x2="${width - padR}" y2="${(padT + plotH * 0.65).toFixed(1)}" stroke="#30231B" stroke-opacity="0.06"/>
      ${capsules}
      <path class="swift-area-anim" d="${areaPath}" fill="url(#${gradId})"/>
      <path class="swift-line-anim" pathLength="1" d="${linePath}" fill="none" stroke="#E86D13" stroke-width="2.5" stroke-linecap="round"/>
      ${pointTargets}
      <g class="swift-active-pill" transform="translate(${Math.min(width - 80, last[0] - 36).toFixed(1)}, ${Math.max(2, last[1] - 25).toFixed(1)})">
        <rect width="70" height="18" rx="9" fill="#30231B" fill-opacity="0.90"/>
        <text class="swift-readout-text" x="35" y="12.5" text-anchor="middle" fill="#FEF8EF" font-size="10" font-weight="600">${last[2]} bpm</text>
      </g>
      ${timeLabels.map(([t, r]) => `<text x="${(padL + r * plotW).toFixed(1)}" y="${height - 5}" text-anchor="${r === 0 ? 'start' : r === 1 ? 'end' : 'middle'}" fill="#796C60" font-size="10" font-weight="500">${t}</text>`).join('')}
    </svg>`;
  }

  // 3. Apple Swift Charts — Rounded Capsule Bar Chart with Goal RuleMark & Staggered Rise
  function barChart(opts = {}) {
    const values = opts.values || [6240, 8120, 7340, 5420, 4890, 9120, 6780];
    const labels = opts.labels || ['월', '화', '수', '목', '금', '토', '일'];
    const goal = opts.goal || 8000;
    const activeIndex = opts.activeIndex !== undefined ? opts.activeIndex : 3;
    const width = 320, height = 140;
    const padL = 14, padR = 14, padT = 22, padB = 24;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const maxV = Math.max(...values, goal) * 1.1;
    const gradActive = nextId('bar-act');
    const gradMuted = nextId('bar-mut');

    const goalY = padT + (1 - goal / maxV) * plotH;
    const slotW = plotW / values.length;
    const barW = Math.min(20, slotW * 0.52);

    const bars = values.map((v, i) => {
      const cx = padL + slotW * i + slotW / 2;
      const bh = Math.max(8, (v / maxV) * plotH);
      const y = padT + plotH - bh;
      const isAct = i === activeIndex;
      const hit = v >= goal;
      const delay = (i * 0.055).toFixed(2);
      return `<g class="swift-point-group" data-swift-val="${v.toLocaleString()} 걸음" data-swift-label="${labels[i] || ''}요일">
        <rect x="${(cx - barW / 2).toFixed(1)}" y="${padT}" width="${barW.toFixed(1)}" height="${plotH}" rx="${(barW / 2).toFixed(1)}" fill="#30231B" fill-opacity="0.035"/>
        <rect class="swift-bar-anim" style="animation-delay:${delay}s" x="${(cx - barW / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" rx="${(barW / 2).toFixed(1)}" fill="url(#${isAct || hit ? gradActive : gradMuted})"/>
        <text x="${cx.toFixed(1)}" y="${height - 6}" text-anchor="middle" fill="${isAct ? '#30231B' : '#796C60'}" font-size="10.5" font-weight="${isAct ? '700' : '500'}">${labels[i] || ''}</text>
      </g>`;
    }).join('');

    return `<svg class="chart figma-svg-chart swift-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="주간 활동 막대 차트">
      <defs>
        <linearGradient id="${gradActive}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#E86D13"/>
          <stop offset="100%" stop-color="#9D4200"/>
        </linearGradient>
        <linearGradient id="${gradMuted}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#C7B69E"/>
          <stop offset="100%" stop-color="#A5927B"/>
        </linearGradient>
      </defs>
      <line x1="${padL}" y1="${goalY.toFixed(1)}" x2="${width - padR}" y2="${goalY.toFixed(1)}" stroke="#E86D13" stroke-opacity="0.55" stroke-width="1.2" stroke-dasharray="4 3"/>
      <text x="${width - padR}" y="${Math.max(12, goalY - 5).toFixed(1)}" text-anchor="end" fill="#9D4200" font-size="9.5" font-weight="600">목표 ${goal.toLocaleString()}</text>
      ${bars}
    </svg>`;
  }

  // 4. Apple Health Sleep Stages Hypnogram (Connected Pill Ribbon + Staggered Stage Motion)
  function sleepStagesChart() {
    const stages = [
      [0, 32, 1, '코어 수면'], [32, 74, 0, '깊은 수면'], [74, 114, 1, '코어 수면'],
      [114, 148, 2, 'REM 수면'], [148, 186, 1, '코어 수면'], [186, 224, 0, '깊은 수면'],
      [224, 236, 3, '일시 깸'], [236, 272, 2, 'REM 수면'], [272, 304, 1, '코어 수면']
    ];
    const rowY = [78, 54, 30, 10]; // 0:깊은, 1:코어, 2:REM, 3:깸
    const rowColors = ['#30231B', '#9D4200', '#E86D13', '#C7B69E'];
    const rowNames = ['깊은', '코어', 'REM', '깸'];

    const connectors = stages.slice(0, -1).map((s, i) => {
      const next = stages[i + 1];
      const x = 36 + s[1] * 0.88;
      const y1 = rowY[s[2]] + 7;
      const y2 = rowY[next[2]] + 7;
      return `<line x1="${x.toFixed(1)}" y1="${Math.min(y1, y2)}" x2="${x.toFixed(1)}" y2="${Math.max(y1, y2)}" stroke="#C7B69E" stroke-opacity="0.55" stroke-width="1.5"/>`;
    }).join('');

    const pills = stages.map(([x1, x2, st, label], idx) => {
      const sx = 36 + x1 * 0.88;
      const sw = Math.max(8, (x2 - x1) * 0.88);
      const sy = rowY[st];
      const delay = (idx * 0.05).toFixed(2);
      return `<rect class="swift-stage-anim swift-point-group" style="animation-delay:${delay}s" data-swift-val="${label}" data-swift-label="수면 단계" x="${sx.toFixed(1)}" y="${sy}" width="${sw.toFixed(1)}" height="14" rx="7" fill="${rowColors[st]}"/>`;
    }).join('');

    const yAxis = rowNames.map((n, i) => `<text x="4" y="${rowY[i] + 10.5}" fill="#796C60" font-size="9.5" font-weight="600">${n}</text>
      <line x1="34" y1="${rowY[i] + 7}" x2="306" y2="${rowY[i] + 7}" stroke="#30231B" stroke-opacity="0.05" stroke-dasharray="2 3"/>`).join('');

    return `<svg class="chart figma-svg-chart swift-chart" viewBox="0 0 320 118" role="img" aria-label="Apple Health 수면 단계 타임라인">
      ${yAxis}
      ${connectors}
      ${pills}
      <text x="36" y="112" fill="#796C60" font-size="10" font-weight="500">00:12</text>
      <text x="126" y="112" fill="#796C60" font-size="10" font-weight="500">03:00</text>
      <text x="216" y="112" fill="#796C60" font-size="10" font-weight="500">06:00</text>
      <text x="304" y="112" text-anchor="end" fill="#796C60" font-size="10" font-weight="500">07:58</text>
    </svg>`;
  }

  // Interactive Point Scrubber + Universal Oura-Grade Chart Motion Enhancer
  function enhanceAllChartsWithMotion(root = document) {
    const svgs = root.querySelectorAll(
      'svg.chart, svg.swift-chart, svg.heart-chart, svg.hd-chart, svg.moment-live-chart, .health-card-chart svg, .health-card-gauge svg'
    );
    svgs.forEach((svg) => {
      if (svg.dataset.motionEnhanced === '1') return;
      svg.dataset.motionEnhanced = '1';

      // 1. Line & Stroke Paths / Polylines -> Smooth Oura-like stroke draw
      const lines = svg.querySelectorAll('path, polyline');
      lines.forEach((el) => {
        const fill = (el.getAttribute('fill') || '').toLowerCase();
        const stroke = el.getAttribute('stroke');
        const cls = el.getAttribute('class') || '';
        const isGaugeTrack = el.closest('.health-card-gauge') && el === el.parentElement.querySelector('path:first-of-type');
        if (isGaugeTrack) return;

        if (
          cls.includes('swift-line-anim') ||
          cls.includes('heart-line') ||
          cls.includes('heart-peer-line') ||
          cls.includes('moment-live-line') ||
          (stroke && stroke !== 'none' && (!fill || fill === 'none' || fill === 'transparent'))
        ) {
          if (!el.hasAttribute('pathLength')) el.setAttribute('pathLength', '1');
          el.classList.add('sai-chart-stroke-draw');
        } else if (
          cls.includes('swift-area-anim') ||
          cls.includes('heart-area') ||
          cls.includes('heart-band') ||
          cls.includes('moment-live-area') ||
          (fill && fill !== 'none' && fill !== 'transparent')
        ) {
          el.classList.add('sai-chart-area-reveal');
        }
      });

      // 2. Polygons (Area fills / Confidence bands)
      svg.querySelectorAll('polygon').forEach((poly) => {
        poly.classList.add('sai-chart-area-reveal');
      });

      // 3. Bars, Capsules & Range lines -> Staggered spring rise
      const bars = svg.querySelectorAll(
        'rect.swift-bar-anim, rect.heart-bar, rect.heart-stage, line.heart-range, .health-card-chart rect'
      );
      bars.forEach((bar, i) => {
        bar.style.setProperty('--bar-i', String(i));
        bar.classList.add('sai-chart-bar-grow');
      });

      // 4. Data Dots -> Staggered calm pop-in
      const dots = svg.querySelectorAll(
        'circle.swift-dot, circle.heart-dot, circle.moment-live-dot, svg.hd-chart circle, svg.night-chart circle, svg.trend-chart circle, .health-card-chart circle'
      );
      dots.forEach((dot, i) => {
        if (dot.classList.contains('swift-hit-target') || dot.classList.contains('swift-live-halo')) return;
        dot.style.setProperty('--dot-i', String(i));
        dot.classList.add('sai-chart-dot-pop');
      });
    });

    // 5. HTML-based Bar / Progress / Ring Gauges
    root.querySelectorAll('.care-week-values > div > i, .hd-bars i, .figma-sleep-stage-bar span, .figma-step-progress-bar span, .figma-cycle-phase-bar span').forEach((el, i) => {
      if (el.dataset.motionEnhanced === '1') return;
      el.dataset.motionEnhanced = '1';
      el.style.setProperty('--seg-i', String(i % 8));
      el.classList.add('sai-html-bar-anim');
    });
  }

  function bindInteractiveScrubber() {
    if (window.__saiSwiftScrubberBound) return;
    window.__saiSwiftScrubberBound = true;
    const handlePoint = (e) => {
      const pt = e.target.closest?.('.swift-point-group');
      if (!pt) return;
      const val = pt.getAttribute('data-swift-val');
      if (!val) return;
      const svg = pt.closest('svg');
      const card = pt.closest('.swift-chart-card');
      if (svg) {
        svg.querySelectorAll('.swift-point-group.is-active').forEach((g) => g.classList.remove('is-active'));
        pt.classList.add('is-active');
        const readout = svg.querySelector('.swift-readout-text');
        if (readout) readout.textContent = val;
        const activePill = svg.querySelector('.swift-active-pill');
        const px = parseFloat(pt.getAttribute('data-swift-x'));
        const py = parseFloat(pt.getAttribute('data-swift-y'));
        if (activePill && !Number.isNaN(px) && !Number.isNaN(py)) {
          const tx = Math.min(240, Math.max(8, px - 34)).toFixed(1);
          const ty = Math.max(2, py - 24).toFixed(1);
          activePill.setAttribute('transform', `translate(${tx}, ${ty})`);
        }
      }
      if (card) {
        const pill = card.querySelector('.swift-chart-pill');
        if (pill) pill.textContent = val;
      }
    };
    document.addEventListener('mouseover', handlePoint);
    document.addEventListener('click', handlePoint);

    // Sync .is-checked class on .check-row in-place without page refresh
    document.addEventListener('change', (e) => {
      const input = e.target;
      if (!(input instanceof HTMLInputElement)) return;
      const row = input.closest('.check-row');
      if (!row) return;
      if (input.type === 'radio' && input.name) {
        document.querySelectorAll(`input[type="radio"][name="${input.name}"]`).forEach((r) => {
          r.closest('.check-row')?.classList.toggle('is-checked', r.checked);
        });
      } else if (input.type === 'checkbox') {
        row.classList.toggle('is-checked', input.checked);
      }
    });

    const observeTargets = () => {
      enhanceAllChartsWithMotion(document);
      const observer = new MutationObserver(() => {
        enhanceAllChartsWithMotion(document);
      });
      observer.observe(document.body, { childList: true, subtree: true });
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', observeTargets, { once: true });
    } else {
      observeTargets();
    }
  }

  bindInteractiveScrubber();

  window.SAISwiftCharts = {
    areaLineChart,
    lineAreaChart: areaLineChart,
    heartRangeChart,
    barChart,
    sleepStagesChart
  };
})();
