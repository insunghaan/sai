/* Ring management prototype: all device operations are simulated locally and synced with SAIStore. */
(() => {
  'use strict';
  const extra = SAIExtras, previous = extra.content;
  let hardwareFirmware = 'SAI_11C1', device = null, phase = 'idle', confirm = '', message = '', timer = null;
  const latest = 'SAI_11C1 (v1.0.2)';
  const refresh = () => { if (current === 'ring-manage') render(); };
  const ensure = () => {
    if (state.connected && !device) {
      device = {
        name: 'SAI_11C1',
        rawFirmware: 'R22_11C1',
        bleId: 'F1BE85F511C1',
        id: 'SAI_11C1 · BLE F1BE85F511C1',
        battery: 86,
        firmware: hardwareFirmware,
        synced: Date.now()
      };
    }
  };
  const button = (label, act, cls = 'btn primary', disabled = false) =>
    `<button class="${cls}" data-ring-manage="${act}" ${disabled ? 'disabled' : ''}>${label}</button>`;
  const clock = n => new Date(n).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  function page() {
    ensure();
    const connected = state.connected && !!device;
    const busy = ['scanning', 'connecting', 'updating'].includes(phase);
    const syncedMetrics = state.lastSyncedMetrics || {
      sleep: '7시간 24분 (86점)',
      heartRate: '68 bpm',
      hrv: '58 ms',
      spo2: '98%',
      temp: '36.5°C',
      steps: '6,842걸음'
    };
    return formPage(
      SAIWeek.header('MY RING', '', '', true, { backAttrs: 'data-go="settings"', backLabel: '나로 돌아가기', trendSuffix: false }) +
      `<div class="ring-manage-hero card">
        <div style="display:flex; align-items:center; gap:14px;">
          <img src="assets/figma/ring-gold.png" alt="SAI 링" style="width:64px; height:64px; object-fit:contain;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <strong style="font-size:18px;">${device ? device.name : '나의 링을 연결해 주세요'}</strong>
              <span class="sai-fw-badge">${connected ? '연결됨 · SAI_11C1' : device ? '연결 끊김' : '미연결'}</span>
            </div>
            ${device ? `<small style="display:block; margin-top:4px; color:var(--figma-muted);">원본 펌웨어: ${device.rawFirmware} · BLE 고유번호: ${device.bleId}</small>` : ''}
          </div>
        </div>
      </div>
      ${message ? `<div class="card emphasis" role="status" style="margin-top:10px;"><strong>${esc(message)}</strong></div>` : ''}
      ${device ? `
      <section class="ring-management-card card" style="margin-top:12px;">
        <div class="section-label" style="display:flex; justify-content:space-between;">
          <span>BATTERY &amp; HEALTH DATA SYNC</span>
          <span>${connected ? '실시간 연결 중' : '마지막 연결 상태'}</span>
        </div>
        <div style="display:flex; align-items:baseline; justify-content:space-between; margin:6px 0 8px;">
          <div class="ring-battery-value" style="font-size:32px; font-weight:600;">${device.battery}<span style="font-size:16px;">%</span></div>
          <span style="font-size:12px; color:var(--figma-muted);">마지막 동기화: ${clock(device.synced)}</span>
        </div>
        <progress class="ring-battery" max="100" value="${device.battery}" aria-label="배터리 ${device.battery}%" style="width:100%; height:8px;"></progress>
        <div class="sai-sync-metric-grid">
          <div class="sai-sync-metric-chip"><small>수면</small><strong>${syncedMetrics.sleep}</strong></div>
          <div class="sai-sync-metric-chip"><small>안정 심박 / HRV</small><strong>${syncedMetrics.heartRate} · ${syncedMetrics.hrv}</strong></div>
          <div class="sai-sync-metric-chip"><small>혈중산소 / 체온</small><strong>${syncedMetrics.spo2} · ${syncedMetrics.temp}</strong></div>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
          ${button('기기에서 건강데이터 지금 가져오기', 'sync', 'btn primary', !connected || busy)}
        </div>
      </section>
      <section class="ring-management-card card" style="margin-top:12px;">
        <h3>SAI 펌웨어 &amp; BLE 식별 정보</h3>
        <div class="stats-row" style="display:flex; justify-content:space-between; padding:6px 0;"><span>SAI 표시 펌웨어명</span><b>${device.name}</b></div>
        <div class="stats-row" style="display:flex; justify-content:space-between; padding:6px 0;"><span>R22 원본 펌웨어명</span><b>${device.rawFirmware}</b></div>
        <div class="stats-row" style="display:flex; justify-content:space-between; padding:6px 0;"><span>BLE 고유번호 (MAC)</span><b>${device.bleId}</b></div>
        <div class="stats-row" style="display:flex; justify-content:space-between; padding:6px 0;"><span>최신 펌웨어 빌드</span><b>${latest}</b></div>
        ${phase === 'updating'
          ? '<p class="info" role="status" style="margin-top:8px;">SAI_11C1 펌웨어 업데이트 중… 링을 가까이 두세요.</p><progress aria-label="펌웨어 업데이트 진행 중" style="width:100%;"></progress>'
          : device.firmware === latest
            ? '<p class="tiny" style="margin-top:8px; color:var(--figma-muted);">최신 SAI_11C1 펌웨어가 적용되어 있습니다.</p>'
            : '<p class="tiny" style="margin-top:8px; color:var(--figma-muted);">수면·HRV 정밀도를 높인 SAI_11C1 최신 빌드가 준비되어 있어요.</p>' + button('펌웨어 업데이트', 'update', 'btn secondary', !connected || busy)}
      </section>` : ''}
      <section class="ring-management-card card" style="margin-top:12px;">
        <h3>연결 관리</h3>
        ${phase === 'scanning'
          ? '<p role="status">가까운 SAI 링을 찾고 있어요… (BLE 스캔 중)</p>'
          : phase === 'connecting'
            ? '<p role="status">SAI_11C1 (BLE: F1BE85F511C1) 링에 연결하고 있어요…</p>'
            : phase === 'found'
              ? `<p class="tiny">연결할 SAI 링을 선택해 주세요.</p>
                 <div class="list" style="margin:10px 0;">
                   <button class="list-item" data-ring-manage="pair" data-ble="F1BE85F511C1" data-raw="R22_11C1">
                     <div><strong>SAI_11C1</strong><span>R22_11C1 · BLE 고유번호 F1BE85F511C1 · 신호 강함 (-44dBm)</span></div>
                     <span class="pill gold">연결 ›</span>
                   </button>
                   <button class="list-item" data-ring-manage="pair" data-ble="A4C138000428" data-raw="R22_0428">
                     <div><strong>SAI_0428</strong><span>R22_0428 · BLE 고유번호 A4C138000428 · 신호 양호 (-58dBm)</span></div>
                     <span class="pill">연결 ›</span>
                   </button>
                 </div>`
              : connected
                ? button('링 연결 해제', 'disconnect', 'btn secondary', busy)
                : device
                  ? button('SAI_11C1 다시 연결하기', 'reconnect', 'btn primary', busy)
                  : `<p class="tiny" style="margin-bottom:10px;">링을 충전 크래들에 올리거나 휴대폰 가까이에 두세요.</p>${button('SAI 링 검색하기', 'scan', 'btn primary', busy)}`}
        ${['scanning', 'found', 'connecting'].includes(phase) ? `<div style="margin-top:8px;">${button('취소', 'cancel-connect', 'btn ghost')}</div>` : ''}
      </section>
      ${device ? `
      <section class="ring-management-card card" style="margin-top:12px;">
        <h3>기기 초기화</h3>
        <p class="tiny" style="margin-bottom:10px; color:var(--figma-muted);">링 내부 캐시와 페어링 정보를 초기화합니다. 앱에 저장된 기록과 파트너 연결은 그대로 유지됩니다.</p>
        ${button('기기 초기화', 'reset', 'btn secondary', !connected || busy)}
      </section>` : ''}
      ${confirm ? `
      <section class="ring-management-confirm card emphasis" role="alertdialog" aria-labelledby="ring-confirm-title" style="margin-top:12px;">
        <h3 id="ring-confirm-title">${confirm === 'reset' ? 'SAI_11C1 링을 초기화할까요?' : 'SAI_11C1 연결을 해제할까요?'}</h3>
        <p style="font-size:13px; margin:8px 0 12px;">${confirm === 'reset' ? '아직 동기화하지 않은 링 내부 버퍼 데이터는 삭제됩니다. 앱에 저장된 기록과 파트너 연결은 유지됩니다.' : '실시간 심박·수면 데이터 수신이 일시 중단됩니다. 언제든 다시 연결할 수 있습니다.'}</p>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${button(confirm === 'reset' ? '초기화하고 연결 해제' : '연결 해제', 'confirm', 'btn primary')}
          ${button('취소', 'dismiss', 'btn secondary')}
        </div>
      </section>` : ''}`
    );
  }

  extra.content = function (id) {
    if (id === 'ring-manage') return page();
    return previous(id);
  };

  const later = (work) => {
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; work(); refresh(); }, 900);
  };

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-ring-manage]');
    if (!b || b.disabled || current !== 'ring-manage') return;
    const act = b.dataset.ringManage;
    const busy = ['scanning', 'connecting', 'updating'].includes(phase);
    if (busy && act !== 'cancel-connect') return;
    message = '';

    if (act === 'scan' && !device) {
      phase = 'scanning';
      later(() => { phase = 'found'; });
    }
    if (act === 'cancel-connect' && phase !== 'updating') {
      clearTimeout(timer);
      timer = null;
      phase = 'idle';
    }
    if ((act === 'pair' && phase === 'found') || (act === 'reconnect' && device && !state.connected)) {
      const bleId = b.dataset.ble || 'F1BE85F511C1';
      const rawFw = b.dataset.raw || 'R22_11C1';
      const saiName = 'SAI_' + bleId.slice(-4).toUpperCase();
      phase = 'connecting';
      later(() => {
        state.connected = true;
        state.ringName = saiName;
        state.ringBleId = bleId;
        state.ringRawFw = rawFw;
        device = {
          name: saiName,
          rawFirmware: rawFw,
          bleId: bleId,
          id: `${saiName} · BLE ${bleId}`,
          battery: 86,
          firmware: saiName,
          synced: Date.now()
        };
        if (window.SAIStore) {
          window.SAIStore.pairRingDevice({ bleUniqueId: bleId, modelPrefix: 'R22', battery: 86 });
        }
        phase = 'idle';
        message = `${saiName} (${rawFw} · BLE ${bleId}) 링을 연결하고 건강데이터를 동기화했어요.`;
      });
    }
    if (act === 'sync' && state.connected && device) {
      device.synced = Date.now();
      if (typeof window.triggerSAIHealthDataSync === 'function') {
        window.triggerSAIHealthDataSync('ring-manage');
      }
      message = `${device.name} 기기에서 최신 건강데이터(수면·심박·HRV·SpO2·체온·활동)를 가져왔어요.`;
    }
    if (act === 'update' && state.connected && device && device.firmware !== latest) {
      phase = 'updating';
      later(() => {
        hardwareFirmware = latest;
        device.firmware = latest;
        phase = 'idle';
        message = 'SAI_11C1 최신 펌웨어 업데이트를 완료했어요.';
      });
    }
    if (['disconnect', 'reset'].includes(act) && state.connected && device) {
      confirm = act;
      refresh();
      requestAnimationFrame(() => document.querySelector('.ring-management-confirm')?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
      return;
    }
    if (act === 'dismiss') confirm = '';
    if (act === 'confirm' && confirm && state.connected && device) {
      state.connected = false;
      if (confirm === 'reset') {
        device = null;
        message = '기기를 초기화했어요. SAI 링 검색하기로 다시 연결할 수 있어요.';
      } else {
        message = 'SAI_11C1 링 연결을 해제했어요.';
      }
      confirm = '';
      phase = 'idle';
    }
    refresh();
  });

  window.SAIRingManagement = {
    sync() {
      ensure();
      if (!state.connected || !device) return false;
      device.synced = Date.now();
      return true;
    },
    reset() {
      clearTimeout(timer);
      timer = null;
      state.connected = false;
      device = null;
      phase = 'idle';
      confirm = '';
      message = '';
    },
    status: () => { ensure(); return device ? { ...device } : null; },
    ready: () => state.connected && !['scanning', 'connecting', 'updating'].includes(phase)
  };
  screens.push(['ring-manage', '링 관리', '07 / PERSONAL RECORDS', '링 관리 (SAI_11C1)', 'SAI_11C1 (R22_11C1 · BLE F1BE85F511C1) 배터리, 건강데이터 가져오기, 펌웨어, 연결 해제 및 초기화를 관리합니다.']);
  rebuildIndex();
  render();
})();
