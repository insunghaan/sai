/* ==========================================================================
   SAI Admin Console Controller (admin.js)
   - Split-Screen Admin Login (Left Visual + Right ID/Password)
   - Friendly Korean Copy & 20,480-User Virtual Journey Map
   - Live Sync with Mobile App via window.SAIStore
   ========================================================================== */
(() => {
  'use strict';

  const Store = window.SAIStore;
  if (!Store) return;

  let currentTab = 'overview';
  let selectedJourneyIdx = 0;
  let selectedPmapNodeId = 'ring';
  let selectedPmapEdgeId = null;
  let pmapCategoryFilter = 'all';
  let journeyPeriod = '30d';
  let journeySegment = 'all';
  let journeyTableSort = 'sessions';
  let memberPage = 1;
  let memberSearch = '';
  let memberStatus = 'ALL';
  let coupleStatusFilter = 'ALL';
  let coupleSearchQuery = '';
  let orderStatusFilter = 'ALL';
  let orderSearchQuery = '';

  const TAB_META = {
    overview: {
      eyebrow: 'OVERVIEW',
      title: '전체 요약',
      desc: '핵심 지표와 우선 개선 과제를 한눈에 확인합니다.'
    },
    journey: {
      eyebrow: 'USER JOURNEY',
      title: '유저 여정 맵',
      desc: '화면별 체류 시간, 이동 경로, 이탈 구간을 분석합니다.'
    },
    members: {
      eyebrow: 'MEMBERS',
      title: '회원 관리',
      desc: '가입 채널·이탈 사유 분석 및 회원 상태를 관리합니다.'
    },
    devices: {
      eyebrow: 'SMART RING',
      title: '스마트링 · 컬러 현황',
      desc: '컬러별 착용 비중·재고 및 블루투스 연결 상태를 관리합니다.'
    },
    orders: {
      eyebrow: 'ORDERS & SHIPPING',
      title: '주문 · 배송 관리',
      desc: '쇼핑몰 주문 수집, 사이징 키트, 본품 송장 및 배송을 관리합니다.'
    },
    couples: {
      eyebrow: 'COUPLES & SHARING',
      title: '커플 · 공유 현황',
      desc: '커플 연결 단계별 분포와 건강 기록 공유 현황을 관리합니다.'
    },
    support: {
      eyebrow: 'SETTINGS & SUPPORT',
      title: '앱 설정 · 1:1 문의',
      desc: '모바일 앱 주요 설정과 고객 문의를 관리합니다.'
    }
  };

  function showToast(msg) {
    const el = document.getElementById('admin-toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      el.hidden = true;
    }, 3200);
  }

  /* ------------------------------------------------------------------------
     1. ADMIN LOGIN CONTROLLER
     ------------------------------------------------------------------------ */
  function setLoggedInState(isLoggedIn) {
    const loginScreen = document.getElementById('admin-login-screen');
    const consoleShell = document.getElementById('admin-console-shell');
    if (!loginScreen || !consoleShell) return;

    if (isLoggedIn) {
      loginScreen.hidden = true;
      consoleShell.hidden = false;
      switchTab(currentTab);
    } else {
      consoleShell.hidden = true;
      loginScreen.hidden = false;
    }
  }

  function initLoginEvents() {
    const form = document.getElementById('admin-login-form');
    const idInput = document.getElementById('admin-login-id');
    const pwInput = document.getElementById('admin-login-pw');
    const errEl = document.getElementById('admin-login-error');
    const toggleBtn = document.getElementById('btn-toggle-pw');
    const logoutBtn = document.getElementById('btn-Admin-Logout');

    if (toggleBtn && pwInput) {
      toggleBtn.addEventListener('click', () => {
        const isPw = pwInput.type === 'password';
        pwInput.type = isPw ? 'text' : 'password';
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const idVal = (idInput?.value || '').trim();
        const pwVal = (pwInput?.value || '').trim();
        if (!idVal || !pwVal) {
          if (errEl) {
            errEl.textContent = '아이디와 비밀번호를 모두 입력해 주세요.';
            errEl.hidden = false;
          }
          return;
        }
        if (errEl) errEl.hidden = true;

        if (Store.loginAdminOnTestServer) {
          const authRes = await Store.loginAdminOnTestServer(idVal, pwVal);
          if (!authRes.ok) {
            if (errEl) {
              errEl.textContent = authRes.error || authRes.message || '운영자 계정 인증에 실패했습니다. (admin@sai.io / sai2026admin!)';
              errEl.hidden = false;
            }
            return;
          } else if (!authRes.standalone) {
            await Store.fetchTestFlightPhase1Overview();
          }
        }

        if (location.hash === '' || location.hash === '#login') {
          history.replaceState(null, '', '#dashboard');
        }
        setLoggedInState(true);
        const tfState = Store.getTestFlightPhase1State ? Store.getTestFlightPhase1State() : null;
        if (tfState && tfState.adminSession) {
          showToast('서버 운영자 인증 완료 (읽기 전용 1단계 테스트 조회 권한)');
        } else {
          showToast('SAI 통합 운영 어드민 콘솔에 로그인되었습니다.');
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (Store.logoutAdminOnTestServer) {
          Store.logoutAdminOnTestServer();
        }
        history.replaceState(null, '', '#login');
        setLoggedInState(false);
      });
    }

    // Verify existing server operator session before entering dashboard; do NOT allow unauthenticated URL hash bypass
    const hash = (location.hash || '').replace('#', '');
    if (['overview', 'journey', 'members', 'devices', 'orders', 'couples', 'support'].includes(hash)) {
      if (TAB_META[hash]) currentTab = hash;
    } else if (hash === 'commerce') {
      currentTab = 'orders';
    }
    setLoggedInState(false);
    if (Store.verifyAdminSessionOnTestServer) {
      Store.verifyAdminSessionOnTestServer().then(async (sessionRes) => {
        if (sessionRes && sessionRes.ok) {
          if (!sessionRes.standalone) {
            await Store.fetchTestFlightPhase1Overview();
          }
          setLoggedInState(true);
        }
      });
    }
  }

  /* ------------------------------------------------------------------------
     2. TAB NAVIGATION
     ------------------------------------------------------------------------ */
  function switchTab(tabKey) {
    if (!TAB_META[tabKey]) return;
    currentTab = tabKey;

    document.querySelectorAll('.sidebar-nav .nav-item').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.tab === tabKey);
    });

    document.querySelectorAll('.admin-view').forEach((sec) => {
      sec.classList.toggle('is-active', sec.dataset.view === tabKey);
    });

    const meta = TAB_META[tabKey];
    const eyebrow = document.getElementById('topbar-eyebrow');
    const title = document.getElementById('topbar-title');
    const desc = document.getElementById('topbar-desc');
    if (eyebrow) eyebrow.textContent = meta.eyebrow;
    if (title) title.textContent = meta.title;
    if (desc) desc.textContent = meta.desc;

    renderAll();
  }

  /* ------------------------------------------------------------------------
     3. RENDER FUNCTIONS
     ------------------------------------------------------------------------ */
  function renderSidebarAndKpis() {
    const stats = Store.getDashboardStats();
    const appSettings = Store.getAppSettings ? Store.getAppSettings() : {};
    const commerce = Store.getCommerceAnalytics ? Store.getCommerceAnalytics() : null;

    const setTxt = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };

    setTxt('nav-count-members', stats.totalMembers.toLocaleString());
    setTxt('nav-count-devices', stats.connectedRings.toLocaleString());
    if (commerce && commerce.summary) {
      setTxt('nav-count-orders', `${commerce.summary.newOrders}건`);
    }
    setTxt('nav-count-couples', `${stats.pairedCouples.toLocaleString()}쌍`);
    setTxt('nav-count-support', String(stats.openInquiries));

    setTxt(
      'sidebar-active-member',
      `전체동의 ${appSettings.showSelectAllTerms !== false ? 'ON' : 'OFF'} · ${appSettings.ringBlePrefix || 'SAI_'}XXXX · 아침 ${appSettings.morningCheckinTime || '08:00'}`
    );

    setTxt('kpi-total-members', `${stats.totalMembers.toLocaleString()}명`);
    setTxt(
      'kpi-active-members',
      `활성 ${stats.activeMembers.toLocaleString()}명 · 오늘 신규 +${stats.todaySignups}명`
    );
    setTxt('kpi-connected-rings', `${stats.connectedRings.toLocaleString()}대`);
    setTxt(
      'kpi-ring-rate',
      `착용률 ${stats.ringPairingRate}% · 평균 배터리 ${stats.avgBattery}%`
    );
    setTxt('kpi-paired-couples', `${stats.pairedCouples.toLocaleString()}커플`);
    setTxt(
      'kpi-couple-rate',
      `총 ${stats.pairedMembers.toLocaleString()}명 연결 (${stats.coupleRate}%)`
    );
    setTxt('kpi-daily-syncs', `${stats.dailyHealthSyncs.toLocaleString()}건`);
  }

  function renderOverview() {
    const analytics = Store.getEnterpriseAnalytics();
    const appSettings = Store.getAppSettings ? Store.getAppSettings() : {};

    // 1. Actionable Insights TOP 3 (제작자가 지금 해결해야 할 개선점)
    const insightsEl = document.getElementById('overview-action-insights');
    if (insightsEl && analytics.actionableInsights) {
      insightsEl.innerHTML = analytics.actionableInsights
        .map((item) => {
          const sevCls =
            item.severity === 'warning' || item.severity === 'high'
              ? 'is-high'
              : item.severity === 'caution' || item.severity === 'medium'
              ? 'is-medium'
              : 'is-good';
          return `
            <article class="insight-action-card ${sevCls}">
              <div class="insight-card-top">
                <span class="insight-badge ${sevCls}">${item.badge}</span>
                <strong class="insight-metric">${item.screen}</strong>
              </div>
              <h3 class="insight-title">${item.title}</h3>
              <p class="insight-problem"><strong>원인:</strong> ${item.cause}</p>
              <p class="insight-rec"><strong>조치:</strong> ${item.solution}</p>
              <div class="insight-card-foot">
                ${
                  item.primaryGotoTab === 'journey' && item.primaryNodeId
                    ? `<button type="button" class="btn-soft" data-jump-pmap-node="${item.primaryNodeId}">${item.primaryActionLabel}</button>`
                    : `<button type="button" class="btn-soft" data-goto-tab="${item.primaryGotoTab}">${item.primaryActionLabel}</button>`
                }
                ${
                  item.secondaryGotoTab
                    ? `<button type="button" class="btn-outline" style="height:32px;padding:0 11px;font-size:12px;" data-goto-tab="${item.secondaryGotoTab}">${item.secondaryActionLabel}</button>`
                    : ''
                }
              </div>
            </article>
          `;
        })
        .join('');
    }

    // 2. Weekly Growth SVG Chart
    const growthEl = document.getElementById('chart-weekly-growth');
    if (growthEl) {
      const { labels, totalUsers, activeRings } = analytics.weeklyGrowth;
      const w = 520;
      const h = 210;
      const padL = 44;
      const padR = 18;
      const padT = 20;
      const padB = 34;
      const maxVal = 22000;
      const x = (i) => padL + (i * (w - padL - padR)) / (labels.length - 1);
      const y = (v) => padT + (1 - v / maxVal) * (h - padT - padB);

      const userPts = totalUsers.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
      const ringPts = activeRings.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

      growthEl.innerHTML = `
        <svg viewBox="0 0 ${w} ${h}" role="img" aria-label="주간 회원 및 스마트링 증가 그래프">
          <defs>
            <linearGradient id="adminGrowthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#D96B27" stop-opacity="0.22"/>
              <stop offset="100%" stop-color="#D96B27" stop-opacity="0.0"/>
            </linearGradient>
          </defs>
          ${[5000, 10000, 15000, 20000]
            .map(
              (v) => `
            <line x1="${padL}" x2="${w - padR}" y1="${y(v)}" y2="${y(v)}" stroke="#EAE3D8" stroke-dasharray="3 3"/>
            <text x="${padL - 8}" y="${y(v) + 4}" text-anchor="end" font-size="10.5" fill="#8C8077">${v / 10000}만명</text>
          `
            )
            .join('')}
          <polygon points="${padL},${h - padB} ${userPts} ${x(labels.length - 1)},${h - padB}" fill="url(#adminGrowthGrad)"/>
          <polyline points="${userPts}" fill="none" stroke="#D96B27" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
          <polyline points="${ringPts}" fill="none" stroke="#1D1815" stroke-width="2.2" stroke-dasharray="5 4" stroke-linecap="round"/>
          ${totalUsers
            .map(
              (v, i) =>
                i % 2 === 0 || i === labels.length - 1
                  ? `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="#D96B27" stroke="#FFFFFF" stroke-width="1.5"/>
                     <text x="${x(i)}" y="${h - 10}" text-anchor="middle" font-size="10.5" fill="#8C8077">${labels[i]}</text>`
                  : ''
            )
            .join('')}
        </svg>
      `;
    }

    // 3. Hourly Sync Bar Chart
    const hourlyEl = document.getElementById('chart-hourly-syncs');
    if (hourlyEl) {
      const { labels, values } = analytics.hourlySyncs;
      const w = 520;
      const h = 210;
      const padL = 44;
      const padR = 16;
      const padT = 20;
      const padB = 34;
      const maxVal = 30000;
      const step = (w - padL - padR) / labels.length;

      hourlyEl.innerHTML = `
        <svg viewBox="0 0 ${w} ${h}" role="img" aria-label="시간대별 앱 방문 및 기록 확인 흐름">
          ${[10000, 20000, 30000]
            .map((v) => {
              const yPos = padT + (1 - v / maxVal) * (h - padT - padB);
              return `<line x1="${padL}" x2="${w - padR}" y1="${yPos}" y2="${yPos}" stroke="#EAE3D8" stroke-dasharray="3 3"/>
                      <text x="${padL - 8}" y="${yPos + 4}" text-anchor="end" font-size="10.5" fill="#8C8077">${v / 10000}만건</text>`;
            })
            .join('')}
          ${values
            .map((v, i) => {
              const bh = Math.max(8, (v / maxVal) * (h - padT - padB));
              const bx = padL + i * step + step * 0.22;
              const bw = step * 0.56;
              const by = h - padB - bh;
              const isPeak = v >= 18000;
              return `
                <rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="6" fill="${isPeak ? '#D96B27' : '#D5C7B4'}"/>
                <text x="${(bx + bw / 2).toFixed(1)}" y="${h - 10}" text-anchor="middle" font-size="10.5" fill="#8C8077">${labels[i]}</text>
              `;
            })
            .join('')}
        </svg>
      `;
    }

    // 4. Current App Settings Snapshot (#overview-settings-summary)
    const settingsSumEl = document.getElementById('overview-settings-summary');
    if (settingsSumEl) {
      const scopeLabel =
        appSettings.defaultCoupleShareScope === 'mood_sleep'
          ? '기분·수면만 공유'
          : '4개 항목 전체';
      settingsSumEl.innerHTML = `
        <div class="friendly-log-item">
          <div class="friendly-log-main">
            <strong>온보딩 약관 · 링 연결</strong>
            <p>전체 동의: <b>${appSettings.showSelectAllTerms !== false ? 'ON' : 'OFF'}</b> · 링 건너뛰기: <b>${appSettings.allowSkipRingPairing !== false ? '허용' : '필수'}</b></p>
          </div>
          <span class="badge-status is-active">온보딩</span>
        </div>
        <div class="friendly-log-item">
          <div class="friendly-log-main">
            <strong>스마트링 BLE · 도움말</strong>
            <p>표시명: <code>${appSettings.ringBlePrefix || 'SAI_'}XXXX</code> · 도움말 노출: <b>${appSettings.ringHelpDelaySec ?? 4}초</b></p>
          </div>
          <span class="badge-status is-active">스마트링</span>
        </div>
        <div class="friendly-log-item">
          <div class="friendly-log-main">
            <strong>아침 체크인 · 커플 공유</strong>
            <p>알림: <b>${appSettings.morningCheckinTime || '08:00'}</b> · 기본 공유: <b>${scopeLabel}</b></p>
          </div>
          <span class="badge-status is-active">커플·케어</span>
        </div>
      `;
    }

    // 5. Health Summary Tiles & Finish Bars
    const tilesEl = document.getElementById('overview-health-tiles');
    if (tilesEl) {
      const c = analytics.cohortHealth;
      tilesEl.innerHTML = `
        <div class="health-tile"><small>평균 수면 시간</small><strong>${c.avgSleepHours}</strong></div>
        <div class="health-tile"><small>평균 수면 점수</small><strong>${c.avgSleepScore}점</strong></div>
        <div class="health-tile"><small>평균 안정 심박</small><strong>${c.avgRestingHr}</strong></div>
        <div class="health-tile"><small>평균 심박변이도</small><strong>${c.avgHrv}</strong></div>
        <div class="health-tile"><small>평균 혈중 산소</small><strong>${c.avgSpo2}</strong></div>
        <div class="health-tile"><small>하루 평균 걸음</small><strong>${c.avgSteps}</strong></div>
      `;
    }

    const finishEl = document.getElementById('overview-finish-bars');
    if (finishEl) {
      finishEl.innerHTML = analytics.finishBreakdown
        .map(
          (f) => `
          <div class="finish-row">
            <div class="finish-row-head">
              <strong>${f.finish}</strong>
              <span>${f.count.toLocaleString()}대 (${f.ratio})</span>
            </div>
            <div class="finish-track">
              <div class="finish-fill" style="width:${f.ratio}"></div>
            </div>
          </div>
        `
        )
        .join('');
    }
  }

  function renderProductFlowMap() {
    const canvas = document.getElementById('product-flow-canvas');
    const inspector = document.getElementById('product-flow-inspector');
    const totalEl = document.getElementById('pmap-total-transitions');
    const kpiStrip = document.getElementById('journey-kpi-strip');
    const dateBadge = document.getElementById('journey-date-range-badge');
    const tableBody = document.getElementById('journey-behavior-table-body');
    if (!canvas || !inspector) return;

    const graph = Store.getProductFlowGraph({
      period: journeyPeriod,
      segment: journeySegment
    });
    if (!graph) return;

    const meta = graph.periodMeta;

    document.querySelectorAll('[data-journey-period]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.journeyPeriod === journeyPeriod);
    });

    if (dateBadge && meta) {
      dateBadge.textContent = `조회 기간: ${meta.dateRange} · 대상: ${meta.segmentLabel}`;
    }

    if (totalEl) {
      totalEl.textContent = `${graph.totalTransitions.toLocaleString()}회`;
    }

    // 1. Render 4 GA4 + Clarity Behavior KPI Cards
    if (kpiStrip && meta) {
      kpiStrip.innerHTML = `
        <article class="kpi-card">
          <span class="kpi-label">총 탐색 세션</span>
          <strong class="kpi-value">${meta.totalSessions.toLocaleString()} 세션</strong>
          <p class="kpi-sub">회원 ${meta.uniqueUsers.toLocaleString()}명 · ${meta.topEntryText}</p>
        </article>
        <article class="kpi-card">
          <span class="kpi-label">최장 체류 화면</span>
          <strong class="kpi-value">${meta.topDwellScreen}</strong>
          <p class="kpi-sub">${meta.topDwellSub}</p>
        </article>
        <article class="kpi-card">
          <span class="kpi-label">빠른 뒤로가기 (Quick Back)</span>
          <strong class="kpi-value" style="color:#B42318;">${meta.avgQuickBackRate} (${meta.totalQuickBacks.toLocaleString()}회)</strong>
          <p class="kpi-sub">주요 구간: #ring (14.2%) · #together (11.8%)</p>
        </article>
        <article class="kpi-card">
          <span class="kpi-label">반복 연타 (Rage Tap)</span>
          <strong class="kpi-value" style="color:#B54708;">${meta.avgRageTapRate} (${meta.totalRageTaps.toLocaleString()}회)</strong>
          <p class="kpi-sub">주요 구간: #ring (11.4%) · #signup (5.8%)</p>
        </article>
      `;
    }

    document.querySelectorAll('[data-pmap-filter]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.pmapFilter === pmapCategoryFilter);
    });

    const W = 1200;
    const H = 540;
    const NODE_W = 152;
    const NODE_H = 104;
    const colX = [16, 214, 412, 610, 808, 1008];
    const maxUsers = Math.max(...graph.nodes.map((n) => n.users), 1);
    const maxEdgeCount = meta?.maxEdgeCount || Math.max(...graph.edges.map((e) => e.count), 1);

    const posMap = new Map();
    graph.nodes.forEach((n) => {
      const x = colX[n.col] ?? 16;
      const y = Math.round(18 + n.row * 190);
      posMap.set(n.id, { ...n, x, y, cx: x + NODE_W / 2, cy: y + NODE_H / 2 });
    });

    const selNode = posMap.get(selectedPmapNodeId) || posMap.get('ring') || posMap.get('today');
    const selEdge = selectedPmapEdgeId
      ? graph.edges.find((e) => e.id === selectedPmapEdgeId) || null
      : null;

    const isEdgeRelevant = (e) => {
      if (pmapCategoryFilter === 'friction') {
        return Boolean(e.isFriction || e.isDashed || e.from === 'ring' || e.to === 'ringhelp');
      }
      if (pmapCategoryFilter !== 'all' && e.category !== pmapCategoryFilter) return false;
      if (selEdge) return e.id === selEdge.id;
      if (selNode) return e.from === selNode.id || e.to === selNode.id;
      return true;
    };

    const isNodeRelevant = (n) => {
      if (pmapCategoryFilter === 'friction') {
        return n.clarityStatus === 'warning' || n.clarityStatus === 'caution';
      }
      if (pmapCategoryFilter !== 'all') {
        const connectedInCat = graph.edges.some(
          (e) => e.category === pmapCategoryFilter && (e.from === n.id || e.to === n.id)
        );
        if (!connectedInCat && n.category !== pmapCategoryFilter) return false;
      }
      if (selEdge) return n.id === selEdge.from || n.id === selEdge.to;
      return true;
    };

    const colorForEdge = (e) => {
      if (e.isFriction) return '#C93B2B';
      if (e.category === 'onboarding') return '#D96B27';
      if (e.category === 'health') return '#B85D29';
      if (e.category === 'couple') return '#C44D34';
      return '#8C7A6B';
    };

    const svgPaths = [];
    const pillItems = [];

    graph.edges.forEach((edge, idx) => {
      const from = posMap.get(edge.from);
      const to = posMap.get(edge.to);
      if (!from || !to) return;

      // Line thickness proportional to period-scaled user transition count (2.6px .. 19px)
      const strokeW = (2.6 + Math.pow(edge.count / maxEdgeCount, 0.85) * 16.4).toFixed(1);
      const strokeColor = colorForEdge(edge);
      const relevant = isEdgeRelevant(edge);
      const highlighted =
        (pmapCategoryFilter === 'friction' && relevant) ||
        (selEdge && selEdge.id === edge.id) ||
        (!selEdge && selNode && (edge.from === selNode.id || eEquals(edge, selNode.id)) && relevant);

      function eEquals(ed, id) {
        return ed.from === id || ed.to === id;
      }

      let pathD = '';
      let pillX = 0;
      let pillY = 0;

      if (from.col === to.col) {
        const isDown = to.y > from.y;
        const xAnchor = isDown ? from.x + 42 : from.x + NODE_W - 38;
        const y1 = isDown ? from.y + NODE_H : from.y;
        const y2 = isDown ? to.y : to.y + NODE_H;
        const curveOut = isDown ? -26 : 26;
        pathD = `M ${xAnchor} ${y1} C ${xAnchor + curveOut} ${(y1 + y2) / 2}, ${xAnchor + curveOut} ${(y1 + y2) / 2}, ${xAnchor} ${y2}`;
        pillX = xAnchor + (isDown ? -32 : 34);
        pillY = (y1 + y2) / 2;
      } else {
        const outOffset = ((idx % 3) - 1) * 10;
        const inOffset = (((idx + 1) % 3) - 1) * 10;
        const x1 = from.x + NODE_W;
        const y1 = from.cy + outOffset;
        const x2 = to.x;
        const y2 = to.cy + inOffset;
        const dx = Math.max(36, (x2 - x1) * 0.48);
        pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

        const t = from.col + 1 === to.col ? 0.5 : 0.46;
        const mt = 1 - t;
        const cx1 = x1 + dx;
        const cy1 = y1;
        const cx2 = x2 - dx;
        const cy2 = y2;
        pillX =
          mt * mt * mt * x1 +
          3 * mt * mt * t * cx1 +
          3 * mt * t * t * cx2 +
          t * t * t * x2;
        pillY =
          mt * mt * mt * y1 +
          3 * mt * mt * t * cy1 +
          3 * mt * t * t * cy2 +
          t * t * t * y2;
      }

      const stateCls = highlighted ? 'is-highlighted' : !relevant ? 'is-dimmed' : '';
      const dashAttr = edge.isDashed ? 'stroke-dasharray="6 5"' : '';

      svgPaths.push(`
        <g class="pmap-edge-group ${stateCls}" data-pmap-edge="${edge.id}">
          <path d="${pathD}" fill="none" stroke="transparent" stroke-width="22" />
          <path
            class="pmap-edge-ribbon"
            d="${pathD}"
            fill="none"
            stroke="${strokeColor}"
            stroke-width="${strokeW}"
            stroke-opacity="${highlighted ? '0.88' : '0.42'}"
            stroke-linecap="round"
            ${dashAttr}
          />
          ${
            highlighted && !edge.isDashed
              ? `<path class="pmap-edge-flow" d="${pathD}" fill="none" stroke="#FFF9F2" stroke-width="${Math.max(2, Number(strokeW) * 0.26).toFixed(1)}" stroke-dasharray="6 12" stroke-linecap="round" />`
              : ''
          }
        </g>
      `);

      pillItems.push(`
        <button
          type="button"
          class="pmap-edge-pill ${stateCls}"
          style="left:${pillX.toFixed(1)}px;top:${pillY.toFixed(1)}px;"
          data-pmap-edge="${edge.id}"
          title="${edge.label}: ${edge.count.toLocaleString()}명 (${edge.rate})"
        >
          ${edge.count.toLocaleString()}명<em>${edge.rate}</em>
        </button>
      `);
    });

    const nodeCards = graph.nodes.map((n) => {
      const p = posMap.get(n.id);
      const isSel = selNode && selNode.id === n.id && !selEdge;
      const isEndOfEdge = selEdge && (selEdge.from === n.id || selEdge.to === n.id);
      const relevant = isNodeRelevant(n);
      const volPct = Math.min(100, Math.max(18, Math.round((n.users / maxUsers) * 100)));
      const dropPct = Math.min(45, Math.max(6, Math.round(n.dropOffPct + n.quickBackPct * 0.6)));
      const hasFriction = n.clarityStatus === 'warning';

      const cls = [
        'pmap-node',
        hasFriction ? 'has-friction' : '',
        isSel || isEndOfEdge ? 'is-selected' : '',
        !relevant ? 'is-dimmed' : ''
      ]
        .filter(Boolean)
        .join(' ');

      const clarityTagCls =
        n.clarityStatus === 'warning'
          ? 'is-warning'
          : n.clarityStatus === 'caution'
          ? 'is-caution'
          : 'is-good';

      return `
        <div
          class="${cls}"
          style="left:${p.x}px;top:${p.y}px;"
          data-pmap-node="${n.id}"
          role="button"
          tabindex="0"
        >
          <div class="pmap-ga-vol-bar" title="방문 규모 ${volPct}% · 이탈/뒤로가기 ${n.quickBackRate}">
            <div class="pmap-ga-drop-fill" style="height:${dropPct}%"></div>
            <div class="pmap-ga-vol-fill" style="height:${Math.max(12, volPct - dropPct)}%"></div>
          </div>
          <div class="pmap-node-top">
            <span class="pmap-node-hash">${n.hash}</span>
            <span class="pmap-node-dwell">체류 ${n.stayTime}</span>
          </div>
          <div>
            <div class="pmap-node-title">${n.title}</div>
            <div class="pmap-node-desc">${n.sub}</div>
          </div>
          <div class="pmap-node-foot">
            <strong>${n.users.toLocaleString()}명</strong>
            <span class="pmap-node-clarity-tag ${clarityTagCls}">
              ${n.clarityStatus === 'warning' ? `헤맴 ${n.quickBackRate}` : n.clarityStatus === 'caution' ? `고민 ${n.quickBackRate}` : `전환 양호`}
            </span>
          </div>
        </div>
      `;
    });

    canvas.innerHTML = `
      <svg class="pmap-svg-layer" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="GA4 및 Clarity 화면 간 이동 연결선 그래프">
        ${svgPaths.join('')}
      </svg>
      ${pillItems.join('')}
      ${nodeCards.join('')}
    `;

    // 3. Render 3-Panel GA4 Next-Destination + Clarity Friction & Touch Hotspot Inspector
    const targetNode = selEdge ? posMap.get(selEdge.from) || selNode : selNode;
    const incomingEdges = graph.edges
      .filter((e) => e.to === targetNode.id)
      .sort((a, b) => b.count - a.count);
    const outgoingEdges = graph.edges
      .filter((e) => e.from === targetNode.id)
      .sort((a, b) => b.count - a.count);

    const renderEdgeRow = (e, dir) => {
      const peerNode = posMap.get(dir === 'in' ? e.from : e.to);
      const barPct = Math.min(100, Math.max(10, Math.round((e.count / maxEdgeCount) * 100)));
      return `
        <div class="pmap-io-item" data-pmap-edge="${e.id}">
          <div class="pmap-io-item-top">
            <strong>${dir === 'in' ? `← 이전: ${peerNode?.hash || e.from} (${peerNode?.title || ''})` : `→ 다음: ${peerNode?.hash || e.to} (${peerNode?.title || ''})`}</strong>
            <b>${e.count.toLocaleString()}명 (${e.rate})</b>
          </div>
          <div class="pmap-io-item-sub">${e.label}</div>
          <div class="pmap-io-bar-track">
            <div class="pmap-io-bar-fill" style="width:${barPct}%"></div>
          </div>
        </div>
      `;
    };

    const isAlertQb = targetNode.quickBackPct >= 8.0;
    const isAlertRt = targetNode.rageTapPct >= 5.0;

    inspector.innerHTML = `
      <div class="pmap-inspector-grid">
        <!-- Panel 1: GA4 Next & Previous Screen Flow -->
        <div class="pmap-io-col">
          <div class="pmap-io-col-head">
            <span>다음 이동 경로</span>
            <strong>이탈률 ${targetNode.dropOffRate}</strong>
          </div>
          <div class="pmap-io-list">
            ${
              outgoingEdges.length
                ? outgoingEdges.map((e) => renderEdgeRow(e, 'out')).join('')
                : `<div class="pmap-io-item"><div class="pmap-io-item-sub">마지막 화면 또는 하단 탭바 자유 이동 구간입니다.</div></div>`
            }
            ${
              incomingEdges.length
                ? `<div style="margin-top:4px;font-size:11px;font-weight:700;color:#8C8077;">이전 유입 경로 (${incomingEdges.length}개)</div>` +
                  incomingEdges.slice(0, 2).map((e) => renderEdgeRow(e, 'in')).join('')
                : ''
            }
          </div>
        </div>

        <!-- Panel 2: Microsoft Clarity Friction & Hesitation Diagnosis -->
        <div class="pmap-center-card">
          <div>
            <div class="pmap-center-top">
              <span class="pmap-node-hash">
                ${targetNode.hash} · ${targetNode.stageLabel}
              </span>
              <a href="index.html${targetNode.hash}" class="btn-primary-sm" style="text-decoration:none;display:inline-flex;align-items:center;height:30px;font-size:11px;">앱 화면 열기 ↗</a>
            </div>
            <h3>${targetNode.title} <small style="font-size:12px;font-weight:600;color:#D96B27;">(체류 ${targetNode.stayTime})</small></h3>
            <p style="margin:4px 0 0;font-size:12px;color:#6E6359;">${targetNode.sub}</p>
          </div>

          <div class="pmap-clarity-grid">
            <div class="pmap-clarity-box ${isAlertQb ? 'is-alert' : ''}">
              <small>빠른 뒤로가기</small>
              <strong>${targetNode.quickBackRate}</strong>
            </div>
            <div class="pmap-clarity-box ${isAlertRt ? 'is-alert' : ''}">
              <small>반복 연타</small>
              <strong>${targetNode.rageTapRate}</strong>
            </div>
            <div class="pmap-clarity-box">
              <small>빈 공간 터치</small>
              <strong>${targetNode.deadTapRate}</strong>
            </div>
            <div class="pmap-clarity-box">
              <small>망설임 시간</small>
              <strong style="font-size:12px;">${targetNode.hesitationTime}</strong>
            </div>
          </div>

          <div class="pmap-fix-box">
            <strong>이탈 원인 · 개선 조치</strong>
            ${targetNode.lostReason}<br>
            <span style="color:#D96B27;font-weight:600;">✓ 조치:</span> ${targetNode.uxFixTip}
          </div>
        </div>

        <!-- Panel 3: Clarity Touch Heatmap / Hotspot Ranking -->
        <div class="pmap-io-col">
          <div class="pmap-io-col-head">
            <span>주요 터치 영역</span>
            <strong>${targetNode.sessions.toLocaleString()} 세션</strong>
          </div>
          <div class="pmap-hotspot-list">
            ${(targetNode.hotspots || [])
              .map(
                (h, idx) => `
                <div class="pmap-hotspot-item">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span class="pmap-hotspot-rank ${h.type === 'rage' ? 'is-rage' : h.type === 'dead' ? 'is-dead' : ''}">${idx + 1}</span>
                    <div>
                      <strong style="display:block;color:#1D1815;">${h.label}</strong>
                      <small style="color:#8C8077;">${
                        h.type === 'rage'
                          ? '⚠️ 반복 연타 감지'
                          : h.type === 'dead'
                          ? '반응 없는 영역 터치'
                          : '정상 클릭'
                      }</small>
                    </div>
                  </div>
                  <strong style="color:${h.type === 'rage' ? '#B42318' : '#D96B27'};">${h.share}</strong>
                </div>
              `
              )
              .join('')}
          </div>
          <div class="pmap-center-metrics" style="margin-top:auto;">
            <div class="pmap-center-metric">
              <small>방문 회원</small>
              <strong>${targetNode.users.toLocaleString()}명</strong>
            </div>
            <div class="pmap-center-metric">
              <small>총 세션</small>
              <strong>${targetNode.sessions.toLocaleString()}회</strong>
            </div>
            <div class="pmap-center-metric">
              <small>이탈률</small>
              <strong>${targetNode.dropOffRate}</strong>
            </div>
          </div>
        </div>
      </div>
    `;

    // 4. Render Screen-by-Screen Behavior & Clarity Friction Matrix Table
    if (tableBody) {
      const sortedNodes = [...graph.nodes].sort((a, b) => {
        if (journeyTableSort === 'dwell') return b.dwellSec - a.dwellSec;
        if (journeyTableSort === 'friction') {
          return b.quickBackPct + b.rageTapPct - (a.quickBackPct + a.rageTapPct);
        }
        if (journeyTableSort === 'dropoff') return b.dropOffPct - a.dropOffPct;
        return b.sessions - a.sessions;
      });

      tableBody.innerHTML = sortedNodes
        .map((n) => {
          const outs = graph.edges
            .filter((e) => e.from === n.id)
            .sort((a, b) => b.count - a.count);
          const nextHtml = outs.length
            ? outs
                .slice(0, 2)
                .map((e) => {
                  const toNode = posMap.get(e.to);
                  return `<span class="next-dest-chip">${toNode?.hash || e.to} ${toNode?.title?.split('·')[0] || ''} <em>${e.rate} (${e.count.toLocaleString()}명)</em></span>`;
                })
                .join('')
            : `<span style="color:#8C8077;font-size:12px;">여정 최종 도착 / 탭 자유 이동</span>`;

          const statusCls =
            n.clarityStatus === 'warning'
              ? 'is-warning'
              : n.clarityStatus === 'caution'
              ? 'is-caution'
              : 'is-good';
          const statusLabel =
            n.clarityStatus === 'warning'
              ? '⚠️ 이탈 주의'
              : n.clarityStatus === 'caution'
              ? '잠시 고민'
              : '✓ 원활';

          return `
            <tr data-pmap-node="${n.id}" style="cursor:pointer;${n.id === targetNode.id ? 'background:#FAF5EC;' : ''}">
              <td>
                <strong>${n.title}</strong><br>
                <small style="color:#D96B27;font-weight:700;">${n.hash}</small> <small style="color:#6E6359;">· ${n.sub}</small>
              </td>
              <td>
                <strong>${n.sessions.toLocaleString()} 세션</strong><br>
                <small style="color:#8C8077;">회원 ${n.users.toLocaleString()}명</small>
              </td>
              <td>
                <strong style="font-size:14px;color:${n.dwellSec >= 130 ? '#D96B27' : '#1D1815'};">${n.stayTime}</strong><br>
                <small style="color:#8C8077;">${n.hesitationTime}</small>
              </td>
              <td>
                <div class="next-dest-wrap">${nextHtml}</div>
              </td>
              <td>
                <strong style="color:${n.quickBackPct >= 8 ? '#B42318' : '#1D1815'};">${n.quickBackRate}</strong>
              </td>
              <td>
                <strong style="color:${n.rageTapPct >= 5 ? '#B54708' : '#1D1815'};">${n.rageTapRate}</strong>
              </td>
              <td>
                <strong>${n.dropOffRate}</strong>
              </td>
              <td>
                <span class="clarity-status-pill ${statusCls}">${statusLabel}</span>
              </td>
            </tr>
          `;
        })
        .join('');
    }
  }

  function renderJourneyMap() {
    renderProductFlowMap();
  }

  function renderMembersTab() {
    const analytics = Store.getEnterpriseAnalytics();

    // 1. Signup Channel Breakdown (#members-provider-breakdown)
    const providerEl = document.getElementById('members-provider-breakdown');
    if (providerEl && analytics.providerBreakdown) {
      providerEl.innerHTML = analytics.providerBreakdown
        .map(
          (p) => `
          <div class="finish-bar-row">
            <div class="finish-bar-top">
              <span><strong>${p.label}</strong> · <small style="color:#6E6359;">${p.note}</small></span>
              <strong>${p.count.toLocaleString()}명 (${p.ratio})</strong>
            </div>
            <div class="finish-bar-track">
              <div class="finish-bar-fill" style="width:${p.pct}%"></div>
            </div>
          </div>
        `
        )
        .join('');
    }

    // 2. Churn Reasons & Retention Fixes (#members-churn-breakdown)
    const churnEl = document.getElementById('members-churn-breakdown');
    if (churnEl && analytics.churnReasons) {
      churnEl.innerHTML = analytics.churnReasons
        .map(
          (c) => `
          <div class="finish-bar-row">
            <div class="finish-bar-top">
              <span><strong>${c.reason}</strong></span>
              <strong style="color:#B42318;">${c.count.toLocaleString()}명 (${c.ratio})</strong>
            </div>
            <div class="finish-bar-track">
              <div class="finish-bar-fill is-unlinked" style="width:${c.pct}%"></div>
            </div>
            <small style="color:#2A6F4E;font-weight:600;font-size:11.5px;">✓ 개선 대책: ${c.fix}</small>
          </div>
        `
        )
        .join('');
    }

    // 3. Full-Width Member Directory Table (SELECTED MEMBER DETAIL 삭제 완료)
    const pageData = Store.getVirtualMembersPage({
      page: memberPage,
      pageSize: 12,
      search: memberSearch,
      status: memberStatus
    });

    const tbody = document.getElementById('members-table-body');
    const pageInfo = document.getElementById('members-page-info');
    if (tbody) {
      tbody.innerHTML = pageData.items
        .map((m) => {
          const isAct = m.status === 'ACTIVE';
          const ringColorLabel =
            m.ring?.finish === 'Gold'
              ? '18K 골드'
              : m.ring?.finish === 'Silver'
              ? '퓨어 실버'
              : m.ring?.finish === 'Rose Gold'
              ? '로즈골드'
              : '18K 골드';
          return `
            <tr>
              <td>
                <strong>${m.name}</strong><br>
                <small style="color:#8C8077">${m.id}</small>
              </td>
              <td>
                <span>${m.providerLabel}</span><br>
                <small style="color:#8C8077">${m.email}</small>
              </td>
              <td>${m.gender} · ${m.age}세 (${m.height}cm/${m.weight}kg)</td>
              <td>
                ${
                  m.ring?.connected
                    ? `<span class="badge-ring">${m.ring.firmwareName}</span> <small style="color:#6E6359;font-weight:600;">${ringColorLabel}</small> <small style="color:#8C8077">(${m.ring.battery}%)</small>`
                    : `<span style="color:#8C8077">미연결 (배송/연결 대기)</span>`
                }
              </td>
              <td>${m.partner?.paired ? `${m.partner.partnerName} (${m.partner.inviteCode})` : '단독 이용 / 미연결'}</td>
              <td>
                <span class="badge-status ${isAct ? 'is-active' : 'is-withdrawn'}">
                  ${isAct ? '이용 중' : '탈퇴 완료'}
                </span>
              </td>
              <td>
                ${
                  isAct
                    ? `<button type="button" class="btn-outline" style="height:30px;padding:0 10px;font-size:11.5px;" data-withdraw-member="${m.id}">탈퇴 처리</button>`
                    : `<button type="button" class="btn-soft" style="height:30px;padding:0 10px;font-size:11.5px;" data-restore-member="${m.id}">계정 복구</button>`
                }
              </td>
            </tr>
          `;
        })
        .join('');
    }

    if (pageInfo) {
      const start = (pageData.page - 1) * pageData.pageSize + 1;
      const end = Math.min(pageData.totalItems, start + pageData.items.length - 1);
      pageInfo.textContent = `전체 ${pageData.totalItems.toLocaleString()}명 중 ${start.toLocaleString()}–${end.toLocaleString()}번째 회원 표시 (${pageData.page}/${pageData.totalPages} 페이지)`;
    }
  }

  function renderDevicesTab() {
    const db = Store.load();
    const analytics = Store.getEnterpriseAnalytics();
    const bleInput = document.getElementById('fw-ble-input');
    const idInfo = Store.parseHardwareIdentity(bleInput?.value || 'F1BE85F511C1', 'R22');

    const legEl = document.getElementById('preview-legacy-name');
    const saiEl = document.getElementById('preview-sai-name');
    if (legEl) legEl.textContent = idInfo.legacyFwName;
    if (saiEl) saiEl.textContent = idInfo.saiName;

    // 1. Ring Color Usage Breakdown Grid (#devices-color-usage-grid)
    const colorGridEl = document.getElementById('devices-color-usage-grid');
    if (colorGridEl && analytics.finishBreakdown) {
      colorGridEl.innerHTML = analytics.finishBreakdown
        .map((f) => {
          const stockCls = f.stockTone === 'caution' ? 'is-caution' : 'is-good';
          return `
            <div class="ring-color-card">
              <div class="ring-color-card-head">
                <div class="ring-color-identity">
                  <span class="ring-swatch-circle" style="background:${f.swatch};"></span>
                  <div>
                    <strong>${f.finish}</strong>
                    <small>${f.popularSizes}</small>
                  </div>
                </div>
                <span class="clarity-status-pill ${stockCls}">${f.stockBadge}</span>
              </div>

              <div class="ring-color-numbers">
                <strong>${f.count.toLocaleString()}대 착용 중</strong>
                <span>전체 비중 <b>${f.ratio}</b></span>
              </div>

              <div class="finish-bar-track" style="height:9px;">
                <div class="finish-bar-fill" style="width:${f.pct}%;background:${f.swatch};"></div>
              </div>

              <div class="ring-color-meta-list">
                <div><span>커플/착용 선호</span><strong>${f.couplePref}</strong></div>
                <div><span>활성 연결 상태</span><strong>${f.activeRate}</strong></div>
              </div>
            </div>
          `;
        })
        .join('');
    }

    // 2. Pairing Friction Diagnostics (#devices-pairing-diagnostics)
    const diagEl = document.getElementById('devices-pairing-diagnostics');
    if (diagEl && analytics.pairingDiagnostics) {
      diagEl.innerHTML = analytics.pairingDiagnostics
        .map(
          (d) => `
          <div class="friendly-log-item">
            <div class="friendly-log-main">
              <strong>${d.issue} <span style="color:#B42318;font-weight:700;">(${d.share} · ${d.count})</span></strong>
              <p>✓ 해결 가이드: ${d.action}</p>
            </div>
          </div>
        `
        )
        .join('');
    }

    const verEl = document.getElementById('devices-version-breakdown');
    if (verEl) {
      verEl.innerHTML = analytics.firmwareBreakdown
        .map(
          (f) => `
          <div class="finish-row">
            <div class="finish-row-head">
              <strong>${f.version}</strong>
              <span>${f.count.toLocaleString()}대 (${f.ratio})</span>
            </div>
            <div class="finish-track">
              <div class="finish-fill" style="width:${f.ratio}"></div>
            </div>
          </div>
        `
        )
        .join('');
    }

    const tbody = document.getElementById('devices-table-body');
    if (tbody) {
      tbody.innerHTML = db.devices
        .map(
          (d) => `
          <tr>
            <td><span class="badge-ring">${d.saiName}</span></td>
            <td><code>${d.legacyFwName}</code></td>
            <td><code>${d.bleId}</code></td>
            <td>${d.finish} · ${d.size}호</td>
            <td><strong>${d.battery}%</strong></td>
            <td>${d.ownerName ? `${d.ownerName} (${d.ownerId})` : '연결 대기 중'}</td>
            <td>${d.lastSyncAt}</td>
            <td>
              <span class="badge-status ${d.status === 'PAIRED' ? 'is-active' : ''}">
                ${d.status === 'PAIRED' ? '착용·연결됨' : '대기 기기'}
              </span>
            </td>
          </tr>
        `
        )
        .join('');
    }
  }

  function renderOrdersTab() {
    if (!Store.getCommerceAnalytics) return;
    const commerce = Store.getCommerceAnalytics({
      status: orderStatusFilter,
      search: orderSearchQuery
    });
    if (!commerce) return;

    document.querySelectorAll('[data-order-status-filter]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.orderStatusFilter === orderStatusFilter);
    });

    const kpiStrip = document.getElementById('orders-kpi-strip');
    if (kpiStrip && commerce.summary) {
      const s = commerce.summary;
      kpiStrip.innerHTML = `
        <article class="kpi-card">
          <span class="kpi-label">신규 주문 · 출고 대기</span>
          <strong class="kpi-value" style="color:#D96B27;">${s.newOrders}건</strong>
          <p class="kpi-sub">자사몰 · 선물하기 · 스마트스토어</p>
        </article>
        <article class="kpi-card">
          <span class="kpi-label">사이징 키트 · 호수 대기</span>
          <strong class="kpi-value">${s.sizingKitWaiting}건</strong>
          <p class="kpi-sub">호수 확정 시 본품 자동 출고</p>
        </article>
        <article class="kpi-card">
          <span class="kpi-label">본품 배송 중</span>
          <strong class="kpi-value">${s.shippingNow}건</strong>
          <p class="kpi-sub">송장 연동 · 시리얼 사전 매핑</p>
        </article>
        <article class="kpi-card">
          <span class="kpi-label">월간 배송 완료 · 앱 연결률</span>
          <strong class="kpi-value" style="color:#1F6A44;">${s.deliveredMonth.toLocaleString()}건 (${s.deliveryToAppRate})</strong>
          <p class="kpi-sub">수령 후 24시간 내 페어링 비율</p>
        </article>
      `;
    }

    const chEl = document.getElementById('orders-channel-breakdown');
    if (chEl && commerce.channels) {
      chEl.innerHTML = commerce.channels
        .map(
          (ch) => `
          <div class="friendly-log-item">
            <div class="friendly-log-main">
              <strong>${ch.name} · <span style="color:#D96B27;">${ch.share}</span> (${ch.ordersToday})</strong>
              <p>${ch.note}</p>
            </div>
            <span class="badge-status is-active">${ch.status}</span>
          </div>
        `
        )
        .join('');
    }

    const tbody = document.getElementById('orders-table-body');
    if (tbody && commerce.orders) {
      tbody.innerHTML = commerce.orders
        .map((o) => {
          const pillCls =
            o.status === 'DELIVERED'
              ? 'is-good'
              : o.status === 'SHIPPING'
              ? 'is-partial'
              : o.status === 'SIZING_KIT'
              ? 'is-caution'
              : 'is-warning';

          let actionBtns = '';
          if (o.status === 'NEW_ORDER') {
            actionBtns = `
              <button type="button" class="btn-primary-sm" data-change-order-status="${o.id}" data-next-order-status="SHIPPING">본품 출고</button>
              <button type="button" class="btn-soft" data-change-order-status="${o.id}" data-next-order-status="SIZING_KIT">키트 발송</button>
            `;
          } else if (o.status === 'SIZING_KIT') {
            actionBtns = `
              <button type="button" class="btn-primary-sm" data-change-order-status="${o.id}" data-next-order-status="SHIPPING">호수 확정 · 출고</button>
            `;
          } else if (o.status === 'SHIPPING') {
            actionBtns = `
              <button type="button" class="btn-soft" data-change-order-status="${o.id}" data-next-order-status="DELIVERED">배송 완료</button>
            `;
          } else {
            actionBtns = `
              <span style="font-size:12px;color:#1F6A44;font-weight:700;">✓ 출고·연결 완료</span>
            `;
          }

          return `
            <tr>
              <td>
                <strong>${o.id}</strong><br>
                <small style="color:#8C8077;">${o.orderedAt}</small>
              </td>
              <td>
                <strong>${o.channel}</strong>
              </td>
              <td>
                <strong>${o.buyerName}</strong><br>
                <small style="color:#8C8077;">${o.buyerPhone}</small>
              </td>
              <td>
                <strong>${o.productName}</strong><br>
                <small style="color:#D96B27;font-weight:600;">${o.colorSpec}</small>
              </td>
              <td>
                <span class="badge-ring">${o.assignedBle}</span><br>
                <small style="color:#6E6359;">${o.courier} · ${o.trackingNo}</small>
              </td>
              <td>
                <span class="clarity-status-pill ${pillCls}">${o.statusLabel}</span>
                <small style="display:block;color:#6E6359;margin-top:4px;">${o.appPaired}</small>
              </td>
              <td>
                <div class="table-actions">${actionBtns}</div>
              </td>
            </tr>
          `;
        })
        .join('');
    }
  }

  function renderCouplesAndHealthTab() {
    const member = Store.getActiveMember();
    const kpiStrip = document.getElementById('couples-status-kpi-strip');
    const breakdownPanel = document.getElementById('couple-status-breakdown-panel');
    const healthPanel = document.getElementById('health-control-panel');
    const tableBody = document.getElementById('couples-status-table-body');

    const analytics = Store.getCoupleStatusAnalytics({
      status: coupleStatusFilter,
      search: coupleSearchQuery
    });

    document.querySelectorAll('[data-couple-status-filter]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.coupleStatusFilter === coupleStatusFilter);
    });

    if (kpiStrip && analytics) {
      const s = analytics.summary;
      kpiStrip.innerHTML = `
        <article class="kpi-card">
          <span class="kpi-label">연결 완료 커플</span>
          <strong class="kpi-value">${s.totalActiveCouples.toLocaleString()}쌍 <small style="font-size:14px;font-weight:600;color:#6E6359;">(${s.totalActiveCoupleMembers.toLocaleString()}명)</small></strong>
          <p class="kpi-sub">전체의 71.5% · 평균 ${s.avgDurationDays}일 · 공유율 ${s.morningShareRate}</p>
        </article>
        <article class="kpi-card">
          <span class="kpi-label">초대 수락 대기</span>
          <strong class="kpi-value" style="color:#B54708;">${s.invitePendingMembers.toLocaleString()}명 <small style="font-size:14px;font-weight:600;color:#6E6359;">(9.0%)</small></strong>
          <p class="kpi-sub">24시간 내 수락 전환율 ${s.inviteAcceptRate24h}</p>
        </article>
        <article class="kpi-card">
          <span class="kpi-label">선택 항목 공유</span>
          <strong class="kpi-value">${s.partialShareCouples.toLocaleString()}쌍 <small style="font-size:14px;font-weight:600;color:#6E6359;">(6.1%)</small></strong>
          <p class="kpi-sub">기분·심박 공유 (수면·주기 비공개)</p>
        </article>
        <article class="kpi-card">
          <span class="kpi-label">단독 이용 · 연결 해제</span>
          <strong class="kpi-value">${s.soloOrUnlinkedMembers.toLocaleString()}명 <small style="font-size:14px;font-weight:600;color:#6E6359;">(13.5%)</small></strong>
          <p class="kpi-sub">단독 ${s.soloOnlyMembers.toLocaleString()}명 · 해제 ${s.unlinkedRestMembers.toLocaleString()}명</p>
        </article>
      `;
    }

    if (breakdownPanel && analytics) {
      breakdownPanel.innerHTML = `
        <div class="couple-status-stack">
          ${analytics.statusGroups
            .map((g) => {
              const isSelected = coupleStatusFilter === g.key;
              return `
                <div
                  class="couple-status-row-card ${isSelected ? 'is-selected' : ''}"
                  data-couple-status-filter="${g.key}"
                  role="button"
                  tabindex="0"
                >
                  <div class="couple-status-row-top">
                    <div class="couple-status-title-group">
                      <span class="couple-status-dot is-${g.tone}"></span>
                      <strong>${g.label}</strong>
                    </div>
                    <div class="couple-status-numbers">
                      <b>${g.countText}</b>
                      <span>${g.rate}</span>
                    </div>
                  </div>
                  <div class="finish-bar-track" style="height:8px;margin:7px 0;">
                    <div class="finish-bar-fill is-${g.tone}" style="width:${g.pct}%"></div>
                  </div>
                  <p class="couple-status-desc">${g.desc}</p>
                </div>
              `;
            })
            .join('')}
        </div>
      `;
    }

    if (healthPanel && analytics) {
      const ext = member.healthSync?.externalHealth || {};
      healthPanel.innerHTML = `
        <div class="finish-bar-section" style="margin-bottom:18px;">
          ${analytics.sharingBreakdown
            .map(
              (item) => `
              <div class="finish-bar-row">
                <div class="finish-bar-top">
                  <span>${item.label}</span>
                  <strong>${item.pairs} (${item.rate})</strong>
                </div>
                <div class="finish-bar-track">
                  <div class="finish-bar-fill" style="width:${item.pct}%"></div>
                </div>
              </div>
            `
            )
            .join('')}
        </div>

        <div class="friendly-log-list" style="margin-bottom:14px;">
          ${[
            ['appleHealth', 'Apple 건강 (68.4%)', ext.appleHealth],
            ['googleHealthConnect', '헬스 커넥트 (10.4%)', ext.googleHealthConnect],
            ['samsungHealth', '삼성 헬스 (21.2%)', ext.samsungHealth]
          ]
            .map(
              ([key, label, on]) => `
              <div class="friendly-log-item" style="align-items:center;">
                <div class="friendly-log-main">
                  <strong>${label}</strong>
                  <p>${on ? '자동 동기화 ON' : '자동 동기화 OFF'}</p>
                </div>
                <button type="button" class="btn-soft" data-toggle-ext="${key}">
                  ${on ? '연동 끄기' : '연동 켜기'}
                </button>
              </div>
            `
            )
            .join('')}
        </div>
        <button type="button" class="btn-dark-full" id="btn-sync-member-health">최신 건강 데이터 일괄 동기화</button>
      `;
    }

    if (tableBody && analytics) {
      tableBody.innerHTML = analytics.records
        .map((r) => {
          const pillCls =
            r.status === 'CONNECTED'
              ? 'is-good'
              : r.status === 'PENDING'
              ? 'is-caution'
              : r.status === 'PARTIAL'
              ? 'is-partial'
              : 'is-warning';

          const statusIcon =
            r.status === 'CONNECTED'
              ? '♥'
              : r.status === 'PENDING'
              ? '⏳'
              : r.status === 'PARTIAL'
              ? '🔒'
              : '○';

          const allMetrics = ['수면', '심박', '기분', '주기'];
          const chipsHtml = allMetrics
            .map((mName) => {
              const isOn = r.sharedItems.includes(mName);
              return `<span class="couple-metric-chip ${isOn ? 'is-on' : 'is-off'}">${isOn ? '✓ ' : ''}${mName}</span>`;
            })
            .join('');

          let actionBtns = '';
          if (r.status === 'PENDING') {
            actionBtns = `
              <button type="button" class="btn-primary-sm" data-change-couple-status="${r.id}" data-next-status="CONNECTED">수락 처리</button>
              <button type="button" class="btn-soft" data-change-couple-status="${r.id}" data-next-status="PENDING">리마인드</button>
            `;
          } else if (r.status === 'CONNECTED') {
            actionBtns = `
              <button type="button" class="btn-soft" data-change-couple-status="${r.id}" data-next-status="PARTIAL">선택 공유</button>
              <button type="button" class="btn-danger-sm" data-change-couple-status="${r.id}" data-next-status="UNLINKED">연결 해제</button>
            `;
          } else if (r.status === 'PARTIAL') {
            actionBtns = `
              <button type="button" class="btn-primary-sm" data-change-couple-status="${r.id}" data-next-status="CONNECTED">전체 공유</button>
              <button type="button" class="btn-danger-sm" data-change-couple-status="${r.id}" data-next-status="UNLINKED">연결 해제</button>
            `;
          } else {
            actionBtns = `
              <button type="button" class="btn-primary-sm" data-change-couple-status="${r.id}" data-next-status="CONNECTED">재연결</button>
              <button type="button" class="btn-soft" data-change-couple-status="${r.id}" data-next-status="PENDING">코드 발송</button>
            `;
          }

          return `
            <tr>
              <td>
                <span class="clarity-status-pill ${pillCls}">
                  ${statusIcon} ${r.statusLabel}
                </span>
              </td>
              <td>
                <strong>${r.memberName}</strong>
                <div style="margin-top:3px;">
                  <span class="ring-chip">${r.memberRing}</span>
                  <small style="color:#8C8278;margin-left:4px;">${r.memberEmail}</small>
                </div>
              </td>
              <td>
                <strong>${r.partnerName}</strong>
                <div style="margin-top:3px;">
                  ${r.partnerRing && r.partnerRing !== '-' ? `<span class="ring-chip">${r.partnerRing}</span>` : ''}
                  ${r.partnerEmail && r.partnerEmail !== '-' ? `<small style="color:#8C8278;margin-left:4px;">${r.partnerEmail}</small>` : ''}
                </div>
              </td>
              <td>
                <strong style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${r.inviteCode}</strong>
                <small style="display:block;color:#6E6359;margin-top:2px;">${r.durationText}</small>
              </td>
              <td>
                <div class="couple-metric-chip-row">${chipsHtml}</div>
                <small style="display:block;color:#6E6359;margin-top:4px;">${r.sharedNote}</small>
              </td>
              <td>
                <span style="font-size:12.5px;color:#3E3731;font-weight:500;">${r.lastActivity}</span>
              </td>
              <td>
                <div class="table-actions">${actionBtns}</div>
              </td>
            </tr>
          `;
        })
        .join('');
    }
  }

  function renderSupportTab() {
    const db = Store.load();
    const appSettings = Store.getAppSettings ? Store.getAppSettings() : {};

    const updatedBadge = document.getElementById('app-settings-updated-badge');
    if (updatedBadge && appSettings.updatedAt) {
      updatedBadge.textContent = `최근 설정 반영: ${appSettings.updatedAt}`;
    }

    const setChk = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.checked = Boolean(val);
    };
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el && val !== undefined) el.value = String(val);
    };

    setChk('set-show-select-all', appSettings.showSelectAllTerms !== false);
    setChk('set-allow-skip-ring', appSettings.allowSkipRingPairing !== false);
    setChk('set-require-age14', appSettings.requireAge14Check !== false);
    setVal('set-ring-prefix', appSettings.ringBlePrefix || 'SAI_');
    setVal('set-ring-help-delay', appSettings.ringHelpDelaySec ?? 4);
    setVal('set-auto-sync', appSettings.autoSyncInterval || '15m');
    setVal('set-morning-time', appSettings.morningCheckinTime || '08:00');
    setVal('set-couple-scope', appSettings.defaultCoupleShareScope || 'all_4');
    setVal('set-breath-sec', appSettings.togetherBreathSec || '24');

    const listEl = document.getElementById('support-inquiry-list');
    if (!listEl) return;

    listEl.innerHTML = db.inquiries
      .map(
        (inq) => `
        <div class="inquiry-card">
          <div class="inquiry-head">
            <span>${inq.category} · ${inq.memberName} (${inq.email})</span>
            <span class="badge-status ${inq.status === 'ANSWERED' ? 'is-active' : ''}">
              ${inq.status === 'ANSWERED' ? '답변 완료' : '답변 대기'}
            </span>
          </div>
          <h3>${inq.subject}</h3>
          <p>${inq.content}</p>
          ${
            inq.status !== 'ANSWERED'
              ? `<div><button type="button" class="btn-primary-sm" data-answer-inq="${inq.id}">답변 등록</button></div>`
              : `<small style="color:#2A6F4E;font-weight:600;">✓ 답변 완료</small>`
          }
        </div>
      `
      )
      .join('');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderTestFlightPhase1Panels() {
    const overviewMount = document.getElementById('testflight-phase1-panel');
    const devicesMount = document.getElementById('devices-testflight-phase1-panel');
    if (!overviewMount && !devicesMount) return;

    const tfState = Store.getTestFlightPhase1State ? Store.getTestFlightPhase1State() : null;
    const overview = tfState && tfState.overview ? tfState.overview : null;
    const isConnected = Boolean(tfState && tfState.connected && overview);

    if (!isConnected) {
      const offlineHtml = `
        <article class="surface-card testflight-phase1-card is-offline">
          <div class="card-header">
            <div>
              <div class="tf-badge-row">
                <span class="tf-pill is-warn">로컬 테스트 서버 미연결</span>
                <span class="tf-pill is-muted">대상: http://127.0.0.1:8787</span>
              </div>
              <h2>TestFlight 1단계 최소 연동 (읽기 전용 조회)</h2>
              <p>로컬 테스트 서버(<code>node testflight-local-server.js</code>) 실행 후 운영자 계정으로 로그인하면 실제 iOS 테스트 계정·링 등록·명시적 동의 체크인 1건을 조회합니다.</p>
            </div>
            <button type="button" class="btn-soft" data-refresh-testflight-phase1="true">연결 재시도</button>
          </div>
          ${
            tfState && tfState.lastError
              ? `<p class="tf-error-line">서버 응답 상태: ${escapeHtml(tfState.lastError)}</p>`
              : ''
          }
        </article>
      `;
      if (overviewMount) overviewMount.innerHTML = offlineHtml;
      if (devicesMount) devicesMount.innerHTML = offlineHtml;
      return;
    }

    const accounts = Array.isArray(overview.testAccounts) ? overview.testAccounts : [];
    const devices = Array.isArray(overview.registeredDevices) ? overview.registeredDevices : [];
    const checkins = Array.isArray(overview.consentedTestCheckins) ? overview.consentedTestCheckins : [];
    const secModel = overview.securityModel || {};

    const deviceRowsHtml = devices.length
      ? devices
          .map(
            (d) => `
          <tr>
            <td>
              <strong>${escapeHtml(d.displayModelName || '-')}</strong>
              <div><small>원본 광고명: <code>${escapeHtml(d.rawAdvertisedName || '-')}</code> (R10/R22 호환)</small></div>
            </td>
            <td><code>${escapeHtml(d.accountEmail || '-')}</code></td>
            <td>
              <div><strong>BLE MAC(클라이언트 보고):</strong> <code>${escapeHtml(d.reportedMacAddress || '-')}</code></div>
              <div><small>iOS CBPeripheral UUID(분리 저장): <code>${escapeHtml(d.localPeripheralUUID || '-')}</code></small></div>
            </td>
            <td>${escapeHtml(d.firmwareVersion || '-')} · ${escapeHtml(d.batteryText || '-')}</td>
            <td>
              <span class="tf-pill is-caution">${escapeHtml(d.verificationLabel || '제한된 테스트 연결 · 클라이언트 BLE 보고')}</span>
              <div><small>소유권 증명: 불가 (SDK 서명 미지원) · 해제 시 초기화: 안 함</small></div>
            </td>
            <td><small>${escapeHtml(d.registeredAt || '-')}</small></td>
          </tr>
        `
          )
          .join('')
      : `
        <tr>
          <td colspan="6" class="tf-empty-cell">
            아직 등록된 테스트 링이 없습니다. iOS 앱에서 <strong>실제 테스트 계정 로그인 → 링 BLE 연결 → 제한된 테스트 연결 등록</strong>을 실행하세요.
          </td>
        </tr>
      `;

    const checkinRowsHtml = checkins.length
      ? checkins
          .map((c) => {
            const consent = c.consentDisclosure || {};
            return `
            <tr>
              <td><code>${escapeHtml(c.accountEmail || '-')}</code></td>
              <td><strong>${escapeHtml(c.mood || '-')}</strong></td>
              <td>${escapeHtml(c.note || '(메모 없음)')}</td>
              <td>
                <div><small><strong>고지된 전송 값:</strong> ${escapeHtml(consent.displayedValueSummary || '-')}</small></div>
                <div><small><strong>저장 위치:</strong> ${escapeHtml(consent.displayedStorageLocation || '-')}</small></div>
                <div><small><strong>목적:</strong> ${escapeHtml(consent.displayedPurpose || '-')}</small></div>
                <div><small><strong>보관 기간:</strong> ${escapeHtml(consent.displayedRetentionPeriod || '-')}</small></div>
              </td>
              <td>
                <span class="tf-pill is-good">사용자 명시적 선택 전송 완료</span>
                <div><small>previewConsents 미사용 · 실제 센서값 미포함</small></div>
              </td>
              <td><small>${escapeHtml(c.createdAt || '-')}</small></td>
            </tr>
          `;
          })
          .join('')
      : `
        <tr>
          <td colspan="6" class="tf-empty-cell">
            아직 전송된 테스트 체크인이 없습니다. iOS 앱 체크인 화면에서 전송할 값·저장 위치·목적·보관 기간 확인 후 <strong>명시적 전송 선택</strong>을 실행하세요.
          </td>
        </tr>
      `;

    const accountsSummaryHtml = accounts
      .map(
        (acc) => `
        <div class="tf-account-chip">
          <div>
            <strong>${escapeHtml(acc.displayName)}</strong>
            <code>${escapeHtml(acc.email)}</code>
          </div>
          <div class="tf-account-chip-meta">
            <span>최근 로그인: ${escapeHtml(acc.lastLoginAt || '대기 중')}</span>
            <span>링 등록: ${acc.registeredDevice ? escapeHtml(acc.registeredDevice.displayModelName) : '미등록'}</span>
            <span>동의 체크인: ${acc.latestTestCheckin ? escapeHtml(acc.latestTestCheckin.mood) : '미전송'}</span>
          </div>
        </div>
      `
      )
      .join('');

    const panelHtml = `
      <article class="surface-card testflight-phase1-card">
        <div class="card-header">
          <div>
            <div class="tf-badge-row">
              <span class="tf-pill is-good">로컬 테스트 서버 연동됨 (127.0.0.1:8787)</span>
              <span class="tf-pill is-info">운영자 권한: 읽기 전용 (READ_ONLY_PHASE1_OPERATOR)</span>
              <span class="tf-pill is-caution">기기 검증 수준: 제한된 테스트 연결 (클라이언트 BLE 보고)</span>
            </div>
            <h2>iOS TestFlight 1단계 최소 연동 실시간 조회 (실제 테스트 계정 전용 · 시뮬레이션과 분리)</h2>
            <p>${escapeHtml(
              secModel.deviceOwnershipNote ||
                'QCBandSDK.framework는 기기 암호화 서명(Challenge-Response)을 지원하지 않으므로 MAC+nonce로 소유권을 증명하지 않으며 제한된 테스트 연결로만 표시합니다.'
            )}</p>
          </div>
          <button type="button" class="btn-soft" data-refresh-testflight-phase1="true">서버 새로고침</button>
        </div>

        <div class="tf-account-strip">
          ${accountsSummaryHtml}
        </div>

        <div class="tf-table-section">
          <h3>1. 등록된 스마트링 (제한된 테스트 연결 · R10/R22 호환 유지 · 해제 시 공장초기화 안 함)</h3>
          <div class="table-wrap">
            <table class="clean-table">
              <thead>
                <tr>
                  <th>앱 표시명 / 원본 광고명</th>
                  <th>테스트 계정</th>
                  <th>식별자 분리 (BLE MAC vs CBPeripheral UUID)</th>
                  <th>펌웨어 · 배터리</th>
                  <th>연결 검증 상태</th>
                  <th>서버 등록 시각</th>
                </tr>
              </thead>
              <tbody>${deviceRowsHtml}</tbody>
            </table>
          </div>
        </div>

        <div class="tf-table-section">
          <h3>2. 명시적 동의 테스트 체크인 1건 (직접 입력 데이터 · 실제 센서 자동 업로드 제외)</h3>
          <div class="table-wrap">
            <table class="clean-table">
              <thead>
                <tr>
                  <th>테스트 계정</th>
                  <th>컨디션 (mood)</th>
                  <th>직접 입력 메모 (note)</th>
                  <th>전송 전 사용자에게 고지·확인된 항목 (값·저장위치·목적·보관기간)</th>
                  <th>동의 검증</th>
                  <th>수신 시각</th>
                </tr>
              </thead>
              <tbody>${checkinRowsHtml}</tbody>
            </table>
          </div>
        </div>

        <div class="tf-scope-footer">
          <span><strong>1단계 제외 범위(미연동):</strong> 원격 앱 설정 제어 · 커플 연결 · 쇼핑몰 주문/배송 · 실제 링 센서 데이터(수면·심박·SpO2·걸음) 업로드 · 데모/오프라인 로그인 세션</span>
        </div>
      </article>
    `;

    if (overviewMount) overviewMount.innerHTML = panelHtml;
    if (devicesMount) devicesMount.innerHTML = panelHtml;
  }

  function renderAll() {
    renderTestFlightPhase1Panels();
    renderSidebarAndKpis();
    renderOverview();
    renderJourneyMap();
    renderMembersTab();
    renderDevicesTab();
    renderOrdersTab();
    renderCouplesAndHealthTab();
    renderSupportTab();
  }

  /* ------------------------------------------------------------------------
     4. GLOBAL INTERACTION HANDLERS
     ------------------------------------------------------------------------ */
  function initDashboardEvents() {
    document.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('.sidebar-nav .nav-item');
      if (tabBtn) {
        switchTab(tabBtn.dataset.tab);
        return;
      }

      const gotoBtn = e.target.closest('[data-goto-tab]');
      if (gotoBtn) {
        switchTab(gotoBtn.dataset.gotoTab);
        return;
      }

      const jumpJourney = e.target.closest('[data-jump-journey]');
      if (jumpJourney) {
        selectedJourneyIdx = Number(jumpJourney.dataset.jumpJourney) || 0;
        switchTab('journey');
        return;
      }

      const jumpPmapNode = e.target.closest('[data-jump-pmap-node]');
      if (jumpPmapNode) {
        selectedPmapNodeId = jumpPmapNode.dataset.jumpPmapNode || 'today';
        selectedPmapEdgeId = null;
        switchTab('journey');
        return;
      }

      const pmapNode = e.target.closest('[data-pmap-node]');
      if (pmapNode) {
        selectedPmapNodeId = pmapNode.dataset.pmapNode || 'today';
        selectedPmapEdgeId = null;
        renderProductFlowMap();
        return;
      }

      const pmapEdge = e.target.closest('[data-pmap-edge]');
      if (pmapEdge) {
        const edgeId = pmapEdge.dataset.pmapEdge;
        selectedPmapEdgeId = selectedPmapEdgeId === edgeId ? null : edgeId;
        renderProductFlowMap();
        return;
      }

      const pmapFilter = e.target.closest('[data-pmap-filter]');
      if (pmapFilter) {
        pmapCategoryFilter = pmapFilter.dataset.pmapFilter || 'all';
        selectedPmapEdgeId = null;
        renderProductFlowMap();
        return;
      }

      const periodBtn = e.target.closest('[data-journey-period]');
      if (periodBtn) {
        journeyPeriod = periodBtn.dataset.journeyPeriod || '7d';
        renderJourneyMap();
        showToast(`분석 기간을 변경하여 최초 진입부터 화면별 체류·다음 이동·헤맴 지표를 새로 계산했어요.`);
        return;
      }

      if (e.target.closest('#btn-simulate-flow')) {
        const samplePaths = [
          ['welcome', 'signup', 48],
          ['signup', 'name', 45],
          ['name', 'ring', 42],
          ['ring', 'checkin', 38],
          ['checkin', 'today', 38],
          ['today', 'sleep', 29],
          ['today', 'together', 34],
          ['together', 'morning', 27],
          ['morning', 'calendar', 24]
        ];
        samplePaths.forEach(([f, t, c]) => Store.recordScreenTransition(f, t, c));
        renderAll();
        showToast('실시간 회원 화면 이동이 반영되어 연결선 카운팅과 선 굵기가 업데이트되었어요.');
        return;
      }

      const withdrawBtn = e.target.closest('[data-withdraw-member]');
      if (withdrawBtn) {
        Store.withdrawMember(withdrawBtn.dataset.withdrawMember);
        renderAll();
        showToast('회원 탈퇴 및 개인 건강 기록 즉시 삭제가 완료되었어요.');
        return;
      }

      const restoreBtn = e.target.closest('[data-restore-member]');
      if (restoreBtn) {
        Store.restoreMember(restoreBtn.dataset.restoreMember);
        renderAll();
        showToast('회원 계정을 다시 이용 중 상태로 복구했어요.');
        return;
      }

      const extBtn = e.target.closest('[data-toggle-ext]');
      if (extBtn) {
        const m = Store.getActiveMember();
        Store.toggleExternalHealth(m.id, extBtn.dataset.toggleExt);
        renderAll();
        showToast('외부 건강 앱 연동 설정을 변경했어요.');
        return;
      }

      const ansBtn = e.target.closest('[data-answer-inq]');
      if (ansBtn) {
        Store.answerInquiry(ansBtn.dataset.answerInq);
        renderAll();
        showToast('회원 문의에 친절한 안내 답변을 보냈어요.');
        return;
      }

      if (e.target.closest('[data-refresh-testflight-phase1]')) {
        if (Store.fetchTestFlightPhase1Overview) {
          Store.fetchTestFlightPhase1Overview().then((res) => {
            renderTestFlightPhase1Panels();
            if (res && res.ok) {
              showToast('로컬 테스트 서버(127.0.0.1:8787)에서 1단계 테스트 데이터를 새로 불러왔어요.');
            } else {
              showToast('로컬 테스트 서버에 연결할 수 없거나 운영자 재인증이 필요합니다.');
            }
          });
        }
        return;
      }

      if (e.target.closest('#btn-Quick-Sync') || e.target.closest('#btn-sync-member-health')) {
        if (Store.fetchTestFlightPhase1Overview) {
          Store.fetchTestFlightPhase1Overview().then(() => {
            renderTestFlightPhase1Panels();
          });
        }
        const m = Store.getActiveMember();
        Store.syncHealthDataFromRing(m.id);
        renderAll();
        showToast('1단계 로컬 테스트 서버 조회 및 시뮬레이션 데이터를 동기화했어요.');
        return;
      }

      if (e.target.closest('#btn-Reset-Seed')) {
        Store.resetToDefault();
        renderAll();
        showToast('운영 센터 데이터를 처음 상태로 깔끔하게 되돌렸어요.');
        return;
      }

      if (e.target.closest('#btn-members-prev')) {
        if (memberPage > 1) {
          memberPage--;
          renderMembersTab();
        }
        return;
      }

      if (e.target.closest('#btn-members-next')) {
        memberPage++;
        renderMembersTab();
        return;
      }

      if (e.target.closest('#btn-register-standby-ring')) {
        const bleVal = document.getElementById('fw-ble-input')?.value || 'F1BE85F511C1';
        const finishVal = document.getElementById('fw-finish-select')?.value || 'Gold';
        const dev = Store.registerDevice({ bleId: bleVal, finish: finishVal });
        renderAll();
        showToast(`${dev.saiName} (${finishVal}) 스마트링을 출고 기기 목록에 등록했어요.`);
        return;
      }

      const orderFilterBtn = e.target.closest('[data-order-status-filter]');
      if (orderFilterBtn) {
        orderStatusFilter = orderFilterBtn.dataset.orderStatusFilter || 'ALL';
        renderOrdersTab();
        return;
      }

      const orderActionBtn = e.target.closest('[data-change-order-status]');
      if (orderActionBtn && Store.updateOrderStatus) {
        const ordId = orderActionBtn.dataset.changeOrderStatus;
        const nextSt = orderActionBtn.dataset.nextOrderStatus || 'SHIPPING';
        const updated = Store.updateOrderStatus(ordId, nextSt);
        renderAll();
        showToast(`주문(${ordId})을 [${updated.statusLabel}] 상태로 처리했어요.`);
        return;
      }

      const coupleFilterBtn = e.target.closest('[data-couple-status-filter]');
      if (coupleFilterBtn) {
        const nextFilter = coupleFilterBtn.dataset.coupleStatusFilter || 'ALL';
        const isRowCard = coupleFilterBtn.classList.contains('couple-status-row-card');
        coupleStatusFilter = isRowCard && coupleStatusFilter === nextFilter ? 'ALL' : nextFilter;
        renderCouplesAndHealthTab();
        return;
      }

      const coupleActionBtn = e.target.closest('[data-change-couple-status]');
      if (coupleActionBtn) {
        const recordId = coupleActionBtn.dataset.changeCoupleStatus;
        const nextStatus = coupleActionBtn.dataset.nextStatus || 'CONNECTED';
        const updated = Store.updateCoupleRecordStatus(recordId, nextStatus);
        renderAll();
        showToast(`해당 커플의 연결 현황을 [${updated.statusLabel}] 상태로 변경했어요.`);
        return;
      }
    });

    // Search & filter inputs
    const searchInput = document.getElementById('member-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        memberSearch = e.target.value;
        memberPage = 1;
        renderMembersTab();
      });
    }

    const orderSearchInput = document.getElementById('order-search-input');
    if (orderSearchInput) {
      orderSearchInput.addEventListener('input', (e) => {
        orderSearchQuery = e.target.value;
        renderOrdersTab();
      });
    }

    const coupleSearchInput = document.getElementById('couple-search-input');
    if (coupleSearchInput) {
      coupleSearchInput.addEventListener('input', (e) => {
        coupleSearchQuery = e.target.value;
        renderCouplesAndHealthTab();
      });
    }

    const statusSelect = document.getElementById('member-status-filter');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        memberStatus = e.target.value;
        memberPage = 1;
        renderMembersTab();
      });
    }

    const journeySegmentSelect = document.getElementById('journey-segment-select');
    if (journeySegmentSelect) {
      journeySegmentSelect.addEventListener('change', (e) => {
        journeySegment = e.target.value || 'all';
        renderJourneyMap();
        showToast('선택한 회원 그룹 기준으로 화면 탐색 경로와 헤맴 지표를 다시 불러왔어요.');
      });
    }

    const journeyTableSortSelect = document.getElementById('journey-table-sort');
    if (journeyTableSortSelect) {
      journeyTableSortSelect.addEventListener('change', (e) => {
        journeyTableSort = e.target.value || 'sessions';
        renderProductFlowMap();
      });
    }

    const fwInput = document.getElementById('fw-ble-input');
    if (fwInput) {
      fwInput.addEventListener('input', () => {
        renderDevicesTab();
      });
    }

    const createOrderForm = document.getElementById('form-create-order');
    if (createOrderForm && Store.createCommerceOrder) {
      createOrderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const channel = document.getElementById('ord-channel-select')?.value || '자사 공식몰';
        const productName = document.getElementById('ord-package-select')?.value || 'SAI 커플 링 패키지 (2개입)';
        const buyerName = document.getElementById('ord-buyer-name')?.value?.trim() || '신규 구매자';
        const buyerPhone = document.getElementById('ord-buyer-phone')?.value?.trim() || '010-5820-1194';
        const colorSpec = document.getElementById('ord-color-spec')?.value || '18K 골드 (11호) + 퓨어 실버 (17호)';
        const sizingMode = document.getElementById('ord-sizing-mode')?.value || 'direct';
        const created = Store.createCommerceOrder({
          channel,
          buyerName,
          buyerPhone,
          productName,
          colorSpec,
          needSizingKit: sizingMode === 'kit'
        });
        renderAll();
        showToast(`${created.buyerName} 님의 주문(${created.id})이 접수되어 목록 상단에 추가되었어요.`);
      });
    }

    const appSettingsForm = document.getElementById('form-app-settings');
    if (appSettingsForm && Store.updateAppSettings) {
      appSettingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        Store.updateAppSettings({
          showSelectAllTerms: Boolean(document.getElementById('set-show-select-all')?.checked),
          allowSkipRingPairing: Boolean(document.getElementById('set-allow-skip-ring')?.checked),
          requireAge14Check: Boolean(document.getElementById('set-require-age14')?.checked),
          ringBlePrefix: document.getElementById('set-ring-prefix')?.value || 'SAI_',
          ringHelpDelaySec: Number(document.getElementById('set-ring-help-delay')?.value ?? 4),
          autoSyncInterval: document.getElementById('set-auto-sync')?.value || '15m',
          morningCheckinTime: document.getElementById('set-morning-time')?.value || '08:00',
          defaultCoupleShareScope: document.getElementById('set-couple-scope')?.value || 'all_4',
          togetherBreathSec: document.getElementById('set-breath-sec')?.value || '24'
        });
        renderAll();
        showToast('변경한 앱 기능·온보딩·알림 설정이 저장되어 즉시 반영되었어요.');
      });
    }

    window.addEventListener('sai-store-updated', () => {
      renderAll();
    });

    window.addEventListener('sai-testflight-updated', () => {
      renderTestFlightPhase1Panels();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initLoginEvents();
    initDashboardEvents();
  });
})();
