/* ==========================================================================
   SAI Figma Design System + QRing Android SDK 1.0.0.79 Live Bridge
   - Adds Figma Section 12 (로그인 · 계정 찾기: login, find-id, find-password, reset-password)
   - Applies Figma atmospheric backdrops (dusk, pairing, today-hero), official SAI® SVG wordmark,
     3D ring renders (Gold / Silver / Rose Gold), and floating dark-chocolate bottom nav labels
   - Connects QRing_Android_SDK_1.0.0.79 (window.QRingSDK) to ring pairing, ring-manage,
     ring-fit, record-status, charging-reminder, and ring-signal
   ========================================================================== */
(() => {
  'use strict';

  const extra = window.SAIExtras;
  if (!extra) return;

  const oldContent = extra.content;
  const oldDecorate = extra.decorate;

  /* ------------------------------------------------------------------------
     1. QRing Android SDK 1.0.0.79 Live Instance
     ------------------------------------------------------------------------ */
  const sdk = window.QRingSDK || null;
  let ringFinish = 'gold'; // 'gold' | 'silver' | 'rosegold'
  let simDockOpen = false;
  let lastBlePacket = 'BLE Idle · QRing_Android_SDK_1.0.0.79 Ready';
  let liveHr = 68;
  let liveSpo2 = 98;
  let liveStress = 31;
  let hardwareSignalSent = false;

  const RING_FINISH_ASSETS = {
    gold: { label: '골드', color: '#d8b467', src: 'assets/figma/ring-gold.png', cutout: 'assets/figma/ring-gold.png' },
    silver: { label: '실버', color: '#cfd4d8', src: 'assets/figma/ring-silver.png', cutout: 'assets/figma/ring-silver.png' },
    rosegold: { label: '티타늄 블랙', color: '#3b3735', src: 'assets/figma/ring-titanium.png', cutout: 'assets/figma/ring-titanium.png' }
  };

  if (sdk && typeof sdk.onLog === 'function') {
    sdk.onLog((entry) => {
      if (entry && entry.summary) {
        lastBlePacket = `[${entry.method || 'BLE'}] ${entry.summary}`;
        const logEl = document.getElementById('qring-sim-log');
        if (logEl) logEl.textContent = lastBlePacket;
      }
    });
  }

  /* ------------------------------------------------------------------------
     2. Auth State & Figma Section 12 Screens (로그인 · 계정 찾기)
     Nodes: 33:2235 (로그인), 33:2272 (아이디 찾기), 33:2305 (비밀번호 찾기),
            33:2338 (재설정 코드), 33:2383 (새 비밀번호)
     ------------------------------------------------------------------------ */
  const authState = {
    loginEmail: 'sumin@sai.io',
    loginPassword: '',
    findName: '수민',
    findPhone: '010-2410-1024',
    foundEmail: '',
    resetEmail: 'sumin@sai.io',
    resetCode: '123456',
    newPassword: '',
    newPasswordConfirm: '',
    authNotice: ''
  };

  function authHeader(backTarget = 'welcome') {
    return `<div class="top">
      <button class="back" data-go="${backTarget}" aria-label="뒤로">←</button>
      <span class="logo"><img src="assets/sai-logo-cream.png" alt="SAI" class="sai-wordmark"></span>
    </div>`;
  }

  function loginPage() {
    return `<section class="page" data-screen="login">
      ${authHeader('welcome')}
      <h2>다시 만나 반가워요</h2>
      <p class="sub">나를 알아가던 시간,<br>함께 쌓아온 순간을 이어가요.</p>
      <div class="figma-auth-fields">
        <div class="field">
          <label for="auth-login-email">아이디</label>
          <input id="auth-login-email" type="email" value="${esc(authState.loginEmail)}" placeholder="you@example.com">
        </div>
        <div class="field">
          <label for="auth-login-pw">비밀번호</label>
          <input id="auth-login-pw" type="password" value="${esc(authState.loginPassword)}" placeholder="••••••••">
        </div>
      </div>
      ${authState.authNotice ? `<p class="tiny" style="color:#f3e8d6;margin:6px 0">${esc(authState.authNotice)}</p>` : ''}
      <div class="push">
        <button class="primary" data-figma-auth="submit-login">로그인</button>
        <div class="auth-links">
          <button type="button" data-go="find-id">아이디 찾기</button>
          <button type="button" data-go="find-password">비밀번호 찾기</button>
        </div>
      </div>
    </section>`;
  }

  function findIdPage() {
    return `<section class="page" data-screen="find-id">
      ${authHeader('login')}
      <h2>아이디를<br>찾아드릴게요</h2>
      <p class="sub">가입할 때 등록한 이름과<br>휴대폰 번호를 입력해 주세요.</p>
      <div class="figma-auth-fields">
        <div class="field">
          <label for="auth-find-name">이름</label>
          <input id="auth-find-name" type="text" value="${esc(authState.findName)}" placeholder="예: 지우">
        </div>
        <div class="field">
          <label for="auth-find-phone">휴대폰 번호</label>
          <input id="auth-find-phone" type="tel" value="${esc(authState.findPhone)}" placeholder="010-1234-5678">
        </div>
      </div>
      ${authState.foundEmail ? `
        <div class="figma-ring-select-row" style="margin-top:8px">
          <span class="figma-radio-dot"><i></i></span>
          <div class="grow">
            <strong>${esc(authState.foundEmail)}</strong>
            <small>2026. 10. 가입 · SAI_11C1 연동 계정</small>
          </div>
        </div>
      ` : ''}
      <div class="push">
        <button class="primary" data-figma-auth="${authState.foundEmail ? 'go-login-with-found' : 'lookup-id'}">
          ${authState.foundEmail ? '이 계정으로 로그인' : '아이디 확인하기'}
        </button>
        <div class="auth-links">
          <button type="button" data-go="find-password">비밀번호 찾기</button>
          <button type="button" data-go="login">로그인</button>
        </div>
      </div>
    </section>`;
  }

  function findPasswordPage() {
    return `<section class="page" data-screen="find-password">
      ${authHeader('login')}
      <h2>비밀번호를<br>다시 설정해요</h2>
      <p class="sub">가입한 아이디(이메일)로<br>인증 번호 6자리를 보내드릴게요.</p>
      <div class="figma-auth-fields">
        <div class="field">
          <label for="auth-reset-email">아이디</label>
          <input id="auth-reset-email" type="email" value="${esc(authState.resetEmail)}" placeholder="you@example.com">
        </div>
        <div class="field">
          <label for="auth-reset-code">인증 번호 6자리</label>
          <input id="auth-reset-code" type="text" value="${esc(authState.resetCode)}" placeholder="123456" inputmode="numeric">
        </div>
      </div>
      <div class="push">
        <button class="primary" data-figma-auth="verify-reset">인증 확인 후 다음</button>
        <div class="auth-links">
          <button type="button" data-go="login">로그인으로 돌아가기</button>
        </div>
      </div>
    </section>`;
  }

  function resetPasswordPage() {
    return `<section class="page" data-screen="reset-password">
      ${authHeader('find-password')}
      <h2>새 비밀번호를<br>입력해 주세요</h2>
      <p class="sub">영문과 숫자를 포함해 8자 이상으로<br>안전하게 설정해 주세요.</p>
      <div class="figma-auth-fields">
        <div class="field">
          <label for="auth-new-pw">새 비밀번호</label>
          <input id="auth-new-pw" type="password" value="${esc(authState.newPassword)}" placeholder="새 비밀번호 8자 이상">
        </div>
        <div class="field">
          <label for="auth-new-pw2">새 비밀번호 확인</label>
          <input id="auth-new-pw2" type="password" value="${esc(authState.newPasswordConfirm)}" placeholder="한 번 더 입력해 주세요">
        </div>
      </div>
      ${authState.authNotice ? `<p class="tiny" style="color:#f3e8d6;margin:6px 0">${esc(authState.authNotice)}</p>` : ''}
      <div class="push">
        <button class="primary" data-figma-auth="complete-reset">비밀번호 변경 완료</button>
        <div class="auth-links">
          <button type="button" data-go="login">로그인으로 돌아가기</button>
        </div>
      </div>
    </section>`;
  }

  /* ------------------------------------------------------------------------
     3. Screen Metadata & URL vs. Figma Badge Classification
     ------------------------------------------------------------------------ */
  const FIGMA_AUTH_SCREENS = [
    ['login', '로그인', '11 / 로그인 · 계정 찾기', '다시 이어가는 나의 기록', 'Figma Section 12(33:2235)에 정의된 로그인 화면입니다. Warm Dusk 배경과 하단 Paper 시트 구조를 따릅니다.'],
    ['find-id', '아이디(이메일) 찾기', '11 / 로그인 · 계정 찾기', '가입 계정 확인', 'Figma Section 12(33:2272)에 정의된 아이디 찾기 화면입니다.'],
    ['find-password', '비밀번호 재설정 요청', '11 / 로그인 · 계정 찾기', '이메일 인증으로 재설정', 'Figma Section 12(33:2305, 33:2338)의 비밀번호 찾기 및 인증 화면입니다.'],
    ['reset-password', '새 비밀번호 설정', '11 / 로그인 · 계정 찾기', '안전한 새 비밀번호', 'Figma Section 12(33:2383)의 새 비밀번호 설정 및 완료 화면입니다.']
  ];

  FIGMA_AUTH_SCREENS.forEach((row) => {
    if (!screens.some((s) => s[0] === row[0])) {
      screens.push(row);
    }
  });

  // Screens newly added on the live planning URL that are not yet in the Figma file
  const URL_ADDED_SCREEN_IDS = new Set([
    'care', // 4-screen A/B comparison board
    'date', // 20s peak heart rate + proximity auto-record
    'account-manage',
    'ring-reset',
    'partner-disconnect',
    'account-delete',
    'account-deleted',
    'ring-fit',
    'record-status',
    'charging-reminder',
    'ring-signal'
  ]);

  const FIGMA_ONLY_SCREEN_IDS = new Set([
    'login',
    'find-id',
    'find-password',
    'reset-password'
  ]);

  const DUSK_BACKDROP_SCREENS = new Set([
    'welcome',
    'login',
    'find-id',
    'find-password',
    'reset-password',
    'invite'
  ]);

  const CHECKIN_BACKDROP_SCREENS = new Set([
    'checkin'
  ]);

  const PAIRING_BACKDROP_SCREENS = new Set([
    'ring',
    'ringpermission',
    'ringsearch',
    'ringfound',
    'ringconnecting',
    'ringhelp',
    'ringdone'
  ]);

  extra.content = function (id) {
    if (id === 'login') return loginPage();
    if (id === 'find-id') return findIdPage();
    if (id === 'find-password') return findPasswordPage();
    if (id === 'reset-password') return resetPasswordPage();
    return oldContent(id);
  };

  /* ------------------------------------------------------------------------
     4. DOM Decoration for Figma Design System & Live QRing SDK
     ------------------------------------------------------------------------ */
  function renderFinishSwitcher() {
    return `<div class="figma-ring-switcher" role="group" aria-label="링 컬러 마감 선택">
      ${Object.entries(RING_FINISH_ASSETS).map(([key, item]) => `
        <button type="button" class="${ringFinish === key ? 'active' : ''}" data-ring-finish="${key}">
          <i style="background:${item.color}"></i>${item.label}
        </button>
      `).join('')}
    </div>`;
  }

  function decorateLogosAndNav(root, backdropMode) {
    if (!root) return;
    const isLightLogo = backdropMode === 'dusk' || backdropMode === 'pairing' || backdropMode === 'today-hero' || backdropMode === 'checkin';
    const logoSrc = isLightLogo ? 'assets/sai-logo-cream.png' : 'assets/sai-logo-chocolate.png';

    root.querySelectorAll('.top .logo, .home-head .logo, .record-header .logo').forEach((el) => {
      el.innerHTML = `<img src="${logoSrc}" alt="SAI" class="sai-wordmark">`;
    });

    // Normalize back buttons to Figma ← arrow
    root.querySelectorAll('.top .back, .record-header .back').forEach((btn) => {
      if (btn.textContent.trim() === '‹') btn.textContent = '←';
    });

    // Normalize editorial row arrows to Figma → arrow
    root.querySelectorAll('.row .arrow').forEach((arrow) => {
      if (arrow.textContent.trim() === '↗') arrow.textContent = '→';
    });
  }

  function decorateSidebarBadges() {
    document.querySelectorAll('#screen-list .screen-link').forEach((btn) => {
      const target = btn.dataset.go;
      if (!target || btn.querySelector('.figma-badge')) return;
      if (URL_ADDED_SCREEN_IDS.has(target)) {
        btn.insertAdjacentHTML('beforeend', '<em class="figma-badge">URL 추가</em>');
      } else if (FIGMA_ONLY_SCREEN_IDS.has(target)) {
        btn.insertAdjacentHTML('beforeend', '<em class="figma-badge">FIGMA</em>');
      }
    });
  }

  function ensureSimDock() {
    const stage = document.querySelector('.stage');
    if (!stage || document.getElementById('qring-sim-dock')) return;
    const caption = stage.querySelector('.caption');
    const dock = document.createElement('section');
    dock.id = 'qring-sim-dock';
    dock.className = 'qring-sim-dock';
    if (caption) {
      caption.after(dock);
    } else {
      stage.appendChild(dock);
    }
    updateSimDock();
  }

  function updateSimDock() {
    const dock = document.getElementById('qring-sim-dock');
    if (!dock) return;
    const status = window.SAIRingManagement?.status?.() || {};
    const isConnected = Boolean(state.connected);
    const battery = status.battery ?? 82;
    dock.innerHTML = `
      <div class="qring-sim-head" data-qring-sim="toggle-dock">
        <strong><span class="qring-sim-dot"></span>SAI Ring · SAI_11C1 실시간 연동</strong>
        <span>${isConnected ? `SAI Ring (${RING_FINISH_ASSETS[ringFinish].label}) · ${battery}%` : 'BLE 대기 중'} ${simDockOpen ? '▴' : '▾'}</span>
      </div>
      ${simDockOpen ? `
        <div class="qring-sim-body">
          <div class="qring-sim-actions">
            <button type="button" data-qring-sim="measure-hr">실시간 심박 (${liveHr} bpm)</button>
            <button type="button" data-qring-sim="measure-spo2">혈중산소 (${liveSpo2}%)</button>
            <button type="button" data-qring-sim="measure-stress">스트레스 (${liveStress})</button>
            <button type="button" data-qring-sim="find-ring">링 찾기 진동/LED</button>
            <button type="button" data-qring-sim="sync-7d">7일 수면·활동 동기화</button>
            <button type="button" data-qring-sim="low-battery">취침 전 충전 알림 확인</button>
          </div>
          <div id="qring-sim-log" class="qring-sim-log">${esc(lastBlePacket)}</div>
        </div>
      ` : ''}
    `;
  }

  extra.decorate = function (id) {
    oldDecorate(id);

    const primaryDevice = app.closest('.device');
    let backdropMode = '';
    if (DUSK_BACKDROP_SCREENS.has(id)) backdropMode = 'dusk';
    else if (CHECKIN_BACKDROP_SCREENS.has(id)) backdropMode = 'checkin';
    else if (PAIRING_BACKDROP_SCREENS.has(id)) backdropMode = 'pairing';
    else if (id === 'today') backdropMode = 'today-hero';

    if (primaryDevice) {
      if (backdropMode) primaryDevice.setAttribute('data-figma-backdrop', backdropMode);
      else primaryDevice.removeAttribute('data-figma-backdrop');
    }

    decorateLogosAndNav(primaryDevice, backdropMode);

    // Also decorate peer/comparison devices if present
    document.querySelectorAll('.device, .care-board-phone').forEach((dev) => {
      if (dev !== primaryDevice) {
        let peerBackdrop = dev.getAttribute('data-figma-backdrop') || '';
        if (dev.querySelector('.home-head')) {
          peerBackdrop = 'today-hero';
          dev.setAttribute('data-figma-backdrop', 'today-hero');
        }
        decorateLogosAndNav(dev, peerBackdrop);
      }
    });

    // Welcome screen: use transparent 3D ring render
    if (id === 'welcome') {
      const heroImg = app.querySelector('.hero-ring img');
      if (heroImg) {
        heroImg.src = RING_FINISH_ASSETS[ringFinish].cutout;
      }
    }

    // Ring Pairing screens: use transparent cutout ring render on pairing backdrop
    if (PAIRING_BACKDROP_SCREENS.has(id)) {
      const heroRing = app.querySelector('.hero-ring');
      const heroImg = heroRing?.querySelector('img');
      if (heroImg) {
        heroImg.src = RING_FINISH_ASSETS[ringFinish].cutout;
      }
      if (id === 'ringsearch' && sdk) {
        lastBlePacket = '[BleScanner] startScan(serviceUuids=[FEE7, FFE0]) → R22_11C1 (BLE F1BE85F511C1) ⇒ SAI_11C1 RSSI -44dBm';
      } else if (id === 'ringconnecting' && sdk) {
        lastBlePacket = '[BleOperateManager] connectDirectly(F1:BE:85:F5:11:C1) → SAI_11C1 GATT_CONNECTED + BindSuccess';
      }
    }

    // Settings screen: add Legal Documents inside .figma-record-list
    if (id === 'settings') {
      const list = app.querySelector('.figma-record-list');
      if (list && !app.querySelector('[data-legal-open]')) {
        list.insertAdjacentHTML(
          'beforeend',
          `<button type="button" class="row" data-legal-open="terms">
            <span class="grow"><strong>SAI 서비스 이용약관</strong><small>주식회사 유비스랩 · 2026. 12. 15. 시행 전문 보기</small></span>
            <span class="arrow">→</span>
          </button>
          <button type="button" class="row" data-legal-open="privacy">
            <span class="grow"><strong>SAI 개인정보 처리방침</strong><small>민감정보(생체·건강·주기) 처리 및 보유기간 전문 보기</small></span>
            <span class="arrow">→</span>
          </button>`
        );
      }
    }

    // Account deleted screen: sync withdrawal to SAIStore
    if (id === 'account-deleted') {
      window.SAIStore?.withdrawMember?.(state.email || 'jiwoo@sai.kr', '앱 내 회원탈퇴 완료');
    }

    // Ring Manage screen: show selected 3D ring finish + live QRing SDK status card
    if (id === 'ring-manage') {
      const heroImg = app.querySelector('.ring-manage-hero img');
      if (heroImg) {
        heroImg.src = RING_FINISH_ASSETS[ringFinish].src;
        heroImg.style.borderRadius = '20px';
      }
      const hero = app.querySelector('.ring-manage-hero');
      if (hero && !app.querySelector('.figma-ring-switcher')) {
        hero.insertAdjacentHTML(
          'afterend',
          `<div style="margin:-8px 0 18px">${renderFinishSwitcher()}</div>`
        );
      }
    }

    // Ring Signal screen: allow testing live QRing FindDeviceReq vibration/LED signal alongside preview
    if (id === 'ring-signal') {
      const firstCard = app.querySelector('.sdk-card');
      if (firstCard && !firstCard.querySelector('[data-qring-sim="signal-hardware"]')) {
        firstCard.insertAdjacentHTML(
          'beforeend',
          `<button class="primary" data-qring-sim="signal-hardware" style="margin-top:10px">
            ${hardwareSignalSent ? '신호를 보냈어요 ✓' : '지금 신호 보내기 ↗'}
          </button>`
        );
      }
    }

    decorateSidebarBadges();
    ensureSimDock();
    updateSimDock();
  };

  /* ------------------------------------------------------------------------
     5. Official Legal Modal (Terms of Service & Privacy Policy)
     ------------------------------------------------------------------------ */
  window.openSAILegalModal = function (docKey = 'terms') {
    document.querySelector('.sai-legal-modal-backdrop')?.remove();
    const legal = window.SAILegalData || {};
    const isPrivacy = docKey === 'privacy' || docKey === 'health';
    const doc = isPrivacy ? legal.privacyPolicy : legal.termsOfService;
    const titleText = doc?.title || (isPrivacy ? 'SAI 개인정보 처리방침' : 'SAI 서비스 이용약관');
    const bodyText = doc?.fullText || '약관 전문을 불러오는 중입니다.';
    const modal = document.createElement('div');
    modal.className = 'sai-legal-modal-backdrop';
    modal.innerHTML = `
      <section class="sai-legal-modal" role="dialog" aria-modal="true" aria-label="${esc(titleText)}">
        <header class="sai-legal-modal-head">
          <div>
            <span class="eyebrow" style="display:block;font-size:11px">주식회사 유비스랩 · 시행일 ${esc(doc?.effectiveDate || '2026. 12. 15.')}</span>
            <h3>${esc(titleText)}</h3>
          </div>
          <button type="button" class="back" data-legal-close="1">닫기 ✕</button>
        </header>
        <div class="sai-legal-modal-body">${esc(bodyText)}</div>
        <footer class="sai-legal-modal-foot">
          <button type="button" class="secondary" style="width:auto;min-height:40px;padding:0 16px" data-legal-switch="${isPrivacy ? 'terms' : 'privacy'}">
            ${isPrivacy ? '서비스 이용약관 보기' : '개인정보 처리방침 보기'}
          </button>
          <button type="button" class="primary" style="width:auto;min-height:40px;padding:0 20px" data-legal-agree="${esc(docKey)}">
            내용 확인 및 동의
          </button>
        </footer>
      </section>
    `;
    document.body.appendChild(modal);
  };

  /* ------------------------------------------------------------------------
     6. Event Listeners for Figma Auth, Finish Switcher & QRing SDK Simulator
     ------------------------------------------------------------------------ */
  document.addEventListener('input', (e) => {
    const map = {
      'auth-login-email': 'loginEmail',
      'auth-login-pw': 'loginPassword',
      'auth-find-name': 'findName',
      'auth-find-phone': 'findPhone',
      'auth-reset-email': 'resetEmail',
      'auth-reset-code': 'resetCode',
      'auth-new-pw': 'newPassword',
      'auth-new-pw2': 'newPasswordConfirm'
    };
    const key = map[e.target.id];
    if (key) authState[key] = e.target.value;
  });

  document.addEventListener('click', (e) => {
    const legalOpen = e.target.closest('[data-legal-open]');
    if (legalOpen) {
      window.openSAILegalModal(legalOpen.dataset.legalOpen);
      return;
    }
    if (e.target.closest('[data-legal-close]') || e.target.classList.contains('sai-legal-modal-backdrop')) {
      document.querySelector('.sai-legal-modal-backdrop')?.remove();
      return;
    }
    const legalSwitch = e.target.closest('[data-legal-switch]');
    if (legalSwitch) {
      window.openSAILegalModal(legalSwitch.dataset.legalSwitch);
      return;
    }
    const legalAgree = e.target.closest('[data-legal-agree]');
    if (legalAgree) {
      const k = legalAgree.dataset.legalAgree;
      if (state.consent) {
        state.consent[k] = true;
        if (k === 'privacy') state.consent.health = true;
      }
      document.querySelector('.sai-legal-modal-backdrop')?.remove();
      render();
      return;
    }

    const socialBtn = e.target.closest('[data-figma-social]');
    if (socialBtn) {
      const provider = socialBtn.dataset.figmaSocial;
      const emailMap = {
        '카카오': 'jiwoo.kakao@sai.kr',
        '네이버': 'jiwoo.naver@sai.kr',
        'Google': 'jiwoo.google@sai.kr',
        'Apple': 'jiwoo.apple@sai.kr'
      };
      state.email = emailMap[provider] || 'jiwoo@sai.kr';
      if (!state.name) state.name = '지우';
      state.connected = true;
      state.checkinDone = true;
      window.SAIStore?.loginMember?.(state.email, provider);
      go('today');
      return;
    }

    const finishBtn = e.target.closest('[data-ring-finish]');
    if (finishBtn) {
      ringFinish = finishBtn.dataset.ringFinish;
      document.querySelectorAll('[data-ring-finish]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.ringFinish === ringFinish);
      });
      const heroImg = app.querySelector('.hero-ring img');
      if (heroImg && RING_FINISH_ASSETS[ringFinish]) {
        heroImg.src = RING_FINISH_ASSETS[ringFinish].cutout;
      }
      const manageImg = app.querySelector('.ring-manage-hero img');
      if (manageImg && RING_FINISH_ASSETS[ringFinish]) {
        manageImg.src = RING_FINISH_ASSETS[ringFinish].src;
      }
      updateSimDock();
      return;
    }

    const authBtn = e.target.closest('[data-figma-auth]');
    if (authBtn) {
      const act = authBtn.dataset.figmaAuth;
      authState.authNotice = '';
      if (act === 'submit-login') {
        if (!authState.loginEmail.includes('@')) {
          authState.authNotice = '이메일 주소를 확인해 주세요.';
          render();
          return;
        }
        state.email = authState.loginEmail;
        if (!state.name) state.name = '수민';
        state.connected = true;
        state.checkinDone = true;
        window.SAIStore?.loginMember?.(state.email, '이메일');
        go('today');
      } else if (act === 'lookup-id') {
        authState.foundEmail = 'sumin@sai.io';
        render();
      } else if (act === 'go-login-with-found') {
        authState.loginEmail = authState.foundEmail || 'sumin@sai.io';
        authState.foundEmail = '';
        go('login');
      } else if (act === 'verify-reset') {
        go('reset-password');
      } else if (act === 'complete-reset') {
        if ((authState.newPassword || '').length < 4) {
          authState.authNotice = '새 비밀번호를 4자 이상 입력해 주세요.';
          render();
          return;
        }
        authState.authNotice = '';
        state.email = authState.resetEmail;
        if (!state.name) state.name = '수민';
        state.connected = true;
        state.checkinDone = true;
        window.SAIStore?.loginMember?.(state.email, '비밀번호재설정');
        go('login');
      }
      return;
    }

    const simBtn = e.target.closest('[data-qring-sim]');
    if (simBtn) {
      const cmd = simBtn.dataset.qringSim;
      if (cmd === 'toggle-dock') {
        simDockOpen = !simDockOpen;
        updateSimDock();
        return;
      }
      if (cmd === 'measure-hr') {
        liveHr = 64 + Math.floor(Math.random() * 18);
        lastBlePacket = `[StartHeartRateReq 0x15] PPG Green LED Active → Manual HR = ${liveHr} bpm (status: SUCCESS)`;
      } else if (cmd === 'measure-spo2') {
        liveSpo2 = 96 + Math.floor(Math.random() * 4);
        lastBlePacket = `[StartBloodOxygenReq 0x16] Red+IR PPG Active → SpO2 = ${liveSpo2}% (status: SUCCESS)`;
      } else if (cmd === 'measure-stress') {
        liveStress = 24 + Math.floor(Math.random() * 25);
        lastBlePacket = `[StartPressureReq 0x37] HRV RMSSD 48ms → Stress Index = ${liveStress} (Rested)`;
      } else if (cmd === 'find-ring' || cmd === 'signal-hardware') {
        hardwareSignalSent = true;
        lastBlePacket = `[FindDeviceReq 0x09] Ring LED Pulse + Haptic Alert Triggered (SAI Ring-0415)`;
        if (cmd === 'signal-hardware') render();
      } else if (cmd === 'sync-7d') {
        window.SAIRingManagement?.sync?.();
        lastBlePacket = `[LargeDataHandler] syncSleepList + syncHeartRate + syncStepData (7 days synced)`;
        render();
      } else if (cmd === 'low-battery') {
        lastBlePacket = `[BatteryRsp 0x03] level=15%, charging=false → Bedtime Charging Reminder Triggered`;
        go('charging-reminder');
        return;
      }
      updateSimDock();
    }
  });

  // Trigger initial decoration after load
  rebuildIndex();
  render();
})();
