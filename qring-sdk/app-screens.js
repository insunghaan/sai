/**
 * QRing Android SDK v1.0.0.79 — Material Design 3 App Screens & Interactive Controllers
 * Mirrors every Activity and sub-screen of QRingSample (SDKSample)
 */
window.QRingUI = (() => {
  const SDK = window.QRingSDK;

  // UI & Navigation State
  const uiState = {
    currentScreen: 'home',
    screenStack: [],
    lang: 'ko', // 'ko' | 'en'
    inAppLogCollapsed: false,
    selectedDayOffset: 0, // 0 = Today .. 6 = 6 days ago
    rangeStartOffset: 2,
    rangeEndOffset: 0,

    // Per-screen interactive results
    lastStepScore: null,
    lastStepAge: 28,
    lastChartPoints: [],
    lastChartLabel: '',
    rriBlockIndices: [],
    rriSyncedSlots: [],

    // Batch Sync 7-Day Task Chain state
    batchSync: {
      running: false,
      progress: 0,
      currentTask: '',
      completedSteps: []
    },

    // Camera viewfinder counter
    photosTaken: 0,
    lastPhotoTime: null,

    // Wear Calibration (RevisionActivity) step: 1 or 2
    calibrationStep: 1,

    // OTA & Resource Update state
    otaSelectedFile: 'QRing_V3.02.85_prod.bin',
    otaForceUpdate: false,
    otaProgress: 0,
    otaStageText: 'Idle',
    otaRunning: false,

    resSelectedFile: 'ring_ui_icons_v2.bin',
    resProgress: 0,
    resStatusText: 'Idle',
    resRunning: false,

    // Device Bind Scanner state
    scanning: false,
    scanFilterName: '',
    scanSortRssi: true,
    discoveredDevices: [...SDK.NearbyDevices]
  };

  let sportIntervalId = null;
  let rtHrIntervalId = null;
  let ppgAnimationId = null;
  let audioCtx = null;
  let snackbarTimeout = null;

  // Bilingual helper
  function t(ko, en) {
    return uiState.lang === 'ko' ? ko : en;
  }

  // M3 Snackbar Toast
  function toast(message) {
    const el = document.getElementById('m3-snackbar');
    const textEl = document.getElementById('m3-snackbar-text');
    if (!el || !textEl) return;
    textEl.textContent = message;
    el.classList.add('show');
    if (snackbarTimeout) clearTimeout(snackbarTimeout);
    snackbarTimeout = setTimeout(() => {
      el.classList.remove('show');
    }, 3200);
  }

  // M3 Dialog Controller
  function showDialog({ icon = 'info', title, html, actions = [] }) {
    const scrim = document.getElementById('m3-dialog-scrim');
    const iconEl = document.getElementById('m3-dialog-icon-sym');
    const titleEl = document.getElementById('m3-dialog-title');
    const contentEl = document.getElementById('m3-dialog-content');
    const actionsEl = document.getElementById('m3-dialog-actions');
    if (!scrim) return;

    iconEl.textContent = icon;
    titleEl.textContent = title;
    contentEl.innerHTML = html;
    actionsEl.innerHTML = '';

    actions.forEach(act => {
      const btn = document.createElement('button');
      btn.className = `m3-btn ${act.variant || 'text'}`;
      btn.textContent = act.label;
      btn.onclick = () => {
        if (act.onClick) {
          const shouldClose = act.onClick();
          if (shouldClose !== false) closeDialog();
        } else {
          closeDialog();
        }
      };
      actionsEl.appendChild(btn);
    });

    scrim.classList.remove('hidden');
  }

  function closeDialog() {
    const scrim = document.getElementById('m3-dialog-scrim');
    if (scrim) scrim.classList.add('hidden');
  }

  // Screen Navigation Router
  function navigateTo(screenId, pushStack = true) {
    stopPpgOscilloscope();
    if (pushStack && uiState.currentScreen !== screenId) {
      uiState.screenStack.push(uiState.currentScreen);
    }
    uiState.currentScreen = screenId;
    render();
    const vp = document.getElementById('app-viewport');
    if (vp) vp.scrollTop = 0;
  }

  function goBack() {
    stopPpgOscilloscope();
    if (uiState.screenStack.length > 0) {
      uiState.currentScreen = uiState.screenStack.pop();
    } else {
      uiState.currentScreen = 'home';
    }
    render();
  }

  function setLanguage(lang) {
    uiState.lang = lang;
    render();
    if (window.QRingHardware && window.QRingHardware.render) {
      window.QRingHardware.render();
    }
  }

  // Reusable M3 Switch HTML builder
  function m3SwitchHtml(id, checked, onchangeAttr = '') {
    return `
      <label class="m3-switch">
        <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} ${onchangeAttr}>
        <span class="m3-switch-track">
          <span class="m3-switch-thumb material-symbols-rounded">check</span>
        </span>
      </label>
    `;
  }

  // Day Selector Bar (Today / Specific Day / Day Range) used across Health Activities
  function dayQueryControlsHtml(metricKey) {
    const history = SDK.getAllHistory();
    const options = history.map(d =>
      `<option value="${d.dayOffset}" ${uiState.selectedDayOffset === d.dayOffset ? 'selected' : ''}>
        ${d.dayOffset === 0 ? t('오늘', 'Today') : `-${d.dayOffset}d`} (${d.dateStr})
      </option>`
    ).join('');

    return `
      <div class="m3-card outlined">
        <div class="m3-card-header">
          <div class="m3-card-title">
            <span class="material-symbols-rounded" style="font-size:18px;color:var(--md-sys-color-primary)">calendar_month</span>
            ${t('데이터 조회 (오늘 / 특정일 / 기간 범위)', 'Data Query (Today / Specific Day / Day Range)')}
          </div>
        </div>
        <div class="btn-grid-2">
          <div class="m3-field-group">
            <label class="m3-field-label">${t('날짜 오프셋 선택 (0~6일 전)', 'Select Day Offset (0..6)')}</label>
            <select class="m3-select" onchange="QRingUI.onSelectDayOffset(this.value, '${metricKey}')">
              ${options}
            </select>
          </div>
          <div class="m3-field-group">
            <label class="m3-field-label">${t('빠른 조회 명령', 'Quick Query Commands')}</label>
            <div class="btn-grid-3">
              <button class="m3-btn filled sm" onclick="QRingUI.queryMetricData('${metricKey}', 'today')">${t('오늘', 'Today')}</button>
              <button class="m3-btn tonal sm" onclick="QRingUI.queryMetricData('${metricKey}', 'specific')">${t('특정일', 'Day')}</button>
              <button class="m3-btn outlined sm" onclick="QRingUI.queryMetricData('${metricKey}', 'range')">${t('범위(3일)', 'Range')}</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Canvas 2D Chart Renderer (Supports bar, line, dual-line BP/SpO2, and sleep stages)
  function drawChart(canvasId, { type = 'line', points = [], points2 = [], color = '#4355B9', color2 = '#006B5E', minY = null, maxY = null, unit = '' }) {
    requestAnimationFrame(() => {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 340;
      const height = rect.height || 150;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
      const textColor = isDark ? '#C6C5D0' : '#46464F';

      const padL = 34, padR = 12, padT = 14, padB = 22;
      const plotW = width - padL - padR;
      const plotH = height - padT - padB;

      // Grid lines
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      for (let i = 0; i <= 3; i++) {
        const y = padT + (plotH / 3) * i;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(width - padR, y);
        ctx.stroke();
      }

      if (!points || points.length === 0) {
        ctx.fillStyle = textColor;
        ctx.font = '12px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t('데이터 없음 — 조회 버튼을 눌러 동기화하세요', 'No data — click Query to sync'), width / 2, height / 2);
        return;
      }

      if (type === 'sleep') {
        // Sleep stage timeline: 1=Deep, 2=Light, 3=Awake, 4=REM
        const stageColors = { 1: '#3F51B5', 2: '#00ACC1', 3: '#FF9800', 4: '#8E24AA' };
        const stageNames = { 1: 'Deep', 2: 'Light', 3: 'Awake', 4: 'REM' };
        const totalDur = points.reduce((acc, s) => acc + s.duration, 0) || 1;
        let curX = padL;
        points.forEach(seg => {
          const segW = Math.max(2, (seg.duration / totalDur) * plotW);
          const stageLevel = seg.type === 3 ? 0.15 : seg.type === 4 ? 0.4 : seg.type === 2 ? 0.65 : 0.9;
          const barY = padT + plotH * (1 - stageLevel);
          const barH = plotH * stageLevel;
          ctx.fillStyle = stageColors[seg.type] || color;
          ctx.fillRect(curX, barY, segW - 1, barH);
          curX += segW;
        });
        ctx.fillStyle = textColor;
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'left';
        Object.keys(stageNames).forEach((k, idx) => {
          ctx.fillStyle = stageColors[k];
          ctx.fillRect(padL + idx * 70, height - 14, 8, 8);
          ctx.fillStyle = textColor;
          ctx.fillText(stageNames[k], padL + idx * 70 + 12, height - 6);
        });
        return;
      }

      const validVals = points.filter(v => v > 0);
      const validVals2 = points2.filter(v => v > 0);
      const allValid = [...validVals, ...validVals2];
      const computedMin = minY !== null ? minY : (allValid.length ? Math.floor(Math.min(...allValid) * 0.9) : 0);
      const computedMax = maxY !== null ? maxY : (allValid.length ? Math.ceil(Math.max(...allValid) * 1.08) : 100);
      const range = Math.max(1, computedMax - computedMin);

      // Y-axis labels
      ctx.fillStyle = textColor;
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${computedMax}`, padL - 4, padT + 8);
      ctx.fillText(`${Math.round((computedMax + computedMin) / 2)}`, padL - 4, padT + plotH / 2 + 3);
      ctx.fillText(`${computedMin}`, padL - 4, padT + plotH);

      // X-axis time labels
      ctx.textAlign = 'center';
      ctx.fillText('00:00', padL + 14, height - 5);
      ctx.fillText('12:00', padL + plotW / 2, height - 5);
      ctx.fillText('23:59', width - padR - 14, height - 5);

      const n = points.length;
      if (type === 'bar') {
        const barW = Math.max(2, plotW / n - 1.2);
        points.forEach((v, i) => {
          if (v <= 0) return;
          const x = padL + (i / n) * plotW;
          const norm = Math.max(0, Math.min(1, (v - computedMin) / range));
          const h = Math.max(2, norm * plotH);
          ctx.fillStyle = color;
          ctx.fillRect(x, padT + plotH - h, barW, h);
        });
      } else {
        // Line chart
        const drawSeries = (arr, strokeCol, fillAlpha) => {
          ctx.beginPath();
          let started = false;
          arr.forEach((v, i) => {
            if (v <= 0) return;
            const x = padL + (i / Math.max(1, n - 1)) * plotW;
            const norm = Math.max(0, Math.min(1, (v - computedMin) / range));
            const y = padT + plotH - norm * plotH;
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else {
              ctx.lineTo(x, y);
            }
          });
          ctx.strokeStyle = strokeCol;
          ctx.lineWidth = 2.2;
          ctx.stroke();

          // Dots
          arr.forEach((v, i) => {
            if (v <= 0) return;
            const x = padL + (i / Math.max(1, n - 1)) * plotW;
            const norm = Math.max(0, Math.min(1, (v - computedMin) / range));
            const y = padT + plotH - norm * plotH;
            ctx.fillStyle = strokeCol;
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
          });
        };

        drawSeries(points, color);
        if (points2 && points2.length) {
          drawSeries(points2, color2);
        }
      }
    });
  }

  // Real-Time 60fps PPG & XYZ Accelerometer Oscilloscope (Heart Rate Green PPG / SpO2 Red+IR PPG)
  function startPpgOscilloscope(canvasId, mode = 'hr') {
    stopPpgOscilloscope();
    let phase = 0;
    const renderWave = () => {
      const canvas = document.getElementById(canvasId);
      const st = SDK.getState();
      const isRunning = mode === 'hr' ? st.activeSession.hrPpgStreaming : st.activeSession.spo2PpgStreaming;
      if (!canvas || !isRunning) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 340;
      const height = rect.height || 150;
      if (canvas.width !== width * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#090D16';
      ctx.fillRect(0, 0, width, height);

      // Subtle oscilloscope grid
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 28) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += 28) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      const bpm = st.liveSensors.heartRate || 74;
      const freq = (bpm / 60) * 0.11;
      phase += freq;

      // Primary PPG wave (Green for HR, Red for SpO2)
      ctx.beginPath();
      ctx.strokeStyle = mode === 'hr' ? '#00FF66' : '#FF3355';
      ctx.lineWidth = 2;
      for (let x = 0; x < width; x++) {
        const tVal = phase + x * 0.06;
        // Dicrotic notch PPG waveform synthesis
        const pulse = Math.pow(Math.max(0, Math.sin(tVal)), 3) + 0.35 * Math.pow(Math.max(0, Math.sin(tVal - 0.9)), 2);
        const y = height * 0.55 - pulse * (height * 0.36);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Secondary IR wave for SpO2 or X/Y/Z motion trace
      ctx.beginPath();
      ctx.strokeStyle = mode === 'hr' ? '#38BDF8' : '#F59E0B';
      ctx.lineWidth = 1.4;
      for (let x = 0; x < width; x++) {
        const tVal = phase * 0.9 + x * 0.05;
        const y = height * 0.82 - Math.sin(tVal) * 10 - Math.cos(tVal * 2.3) * 5;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#E2F1FF';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(
        mode === 'hr'
          ? `GREEN PPG: ${Math.round(14200 + Math.sin(phase) * 980)} | ACC X:12 Y:-4 Z:980 mg (${bpm} bpm)`
          : `RED PPG: ${Math.round(22100 + Math.sin(phase) * 1100)} | IR PPG: ${Math.round(24800 + Math.cos(phase) * 1250)} (${st.liveSensors.spo2}%)`,
        8, 14
      );
      ctx.restore();
      ppgAnimationId = requestAnimationFrame(renderWave);
    };
    ppgAnimationId = requestAnimationFrame(renderWave);
  }

  function stopPpgOscilloscope() {
    if (ppgAnimationId) {
      cancelAnimationFrame(ppgAnimationId);
      ppgAnimationId = null;
    }
  }

  // WebAudio Synthesizer for playing imported Ring Audio Recordings (WAV / PCM)
  function playSimulatedRecording(recId) {
    const st = SDK.getState();
    const rec = st.recordings.find(r => r.id === recId);
    if (!rec) return;
    if (!rec.importedLocal) {
      toast(t('먼저 디바이스에서 로컬로 파일을 가져오기(Import) 해주세요', 'Please import the recording to local storage first'));
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!audioCtx) audioCtx = new AudioContextClass();
      const now = audioCtx.currentTime;
      const notes = rec.notesFreq || [440, 523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.22);
        gain.gain.setValueAtTime(0.16, now + idx * 0.22);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (idx + 1) * 0.21);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.22);
        osc.stop(now + (idx + 1) * 0.22);
      });
      SDK.appendLog('RSP', `AudioTrack.play("${rec.localPath}")`, 'PCM_16KHZ_16BIT', `Playing ${rec.localFormat.toUpperCase()} audio (${rec.durationSec}s, 16kHz Mono)`);
      toast(`${t('오디오 재생 중', 'Playing audio')}: ${rec.fileName}.${rec.localFormat}`);
    } catch (e) {
      toast('Audio playback initialized');
    }
  }

  // Generate synthetic WAV/PCM file download
  function downloadRecordingFile(recId) {
    const st = SDK.getState();
    const rec = st.recordings.find(r => r.id === recId);
    if (!rec || !rec.importedLocal) return;
    const ext = rec.localFormat || 'wav';
    const sampleRate = 16000;
    const numSamples = sampleRate * 2; // 2 sec sample
    const pcmBytes = new Int16Array(numSamples);
    const freq = (rec.notesFreq && rec.notesFreq[0]) || 440;
    for (let i = 0; i < numSamples; i++) {
      pcmBytes[i] = Math.round(Math.sin((2 * Math.PI * freq * i) / sampleRate) * 12000);
    }

    let blob;
    if (ext === 'wav') {
      const buffer = new ArrayBuffer(44 + pcmBytes.byteLength);
      const view = new DataView(buffer);
      const writeStr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
      writeStr(0, 'RIFF');
      view.setUint32(4, 36 + pcmBytes.byteLength, true);
      writeStr(8, 'WAVE');
      writeStr(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, 1, true); // Mono
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeStr(36, 'data');
      view.setUint32(40, pcmBytes.byteLength, true);
      new Int16Array(buffer, 44).set(pcmBytes);
      blob = new Blob([buffer], { type: 'audio/wav' });
    } else {
      blob = new Blob([pcmBytes.buffer], { type: 'application/octet-stream' });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rec.fileName}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    SDK.appendLog('RSP', `exportRecording("${rec.fileName}.${ext}")`, 'FILE_EXPORT', `Exported ${rec.fileName}.${ext} (${blob.size} bytes)`);
    toast(`${t('파일 내보내기 완료', 'Exported')}: ${rec.fileName}.${ext}`);
  }

  // ==========================================================================
  // SCREEN RENDERERS (Part A: Screens 1..14)
  // ==========================================================================

  // 1. HomeActivity
  function renderHomeScreen() {
    const st = SDK.getState();
    const modules = [
      { id: 'health', icon: 'vital_signs', title: t('1. 건강 측정 및 설정 (Health Settings)', '1. Health Settings & Metrics'), sub: t('일괄 동기화, 걸음수, 수면, 운동, 심박/RRI, 혈압, 혈중산소, HRV, 스트레스, 체온, 혈당, 감정', '7-Day Batch Sync, Steps, Sleep, Sport, HR/RRI, BP, SpO2, HRV, Stress, Temp, Glucose, Emotion') },
      { id: 'target_profile', icon: 'person_check', title: t('2. 목표 및 사용자 프로필 (Target & Profile)', '2. Target & User Profile'), sub: t('일일 목표(걸음/칼로리/거리/수면), 12/24시간제, 신체 프로필, Phone ID(6B)', 'Daily Goals, 12h/24h Time Format, User Profile, 6-Byte Phone ID') },
      { id: 'display', icon: 'brightness_6', title: t('3. 디스플레이 설정 (Display Settings)', '3. Display Settings'), sub: t('밝기(1~5), 시계 표시, 화면 회전, 스타일, 켜짐 시간, 워치페이스가 변경, 손바닥 켜기', 'Brightness, Clock, Orientation, Style, Timeout, Dial Index, Palm Turn-On') },
      { id: 'touch_gesture', icon: 'touch_app', title: t('4. 터치 및 제스처 설정 (Touch & Gesture)', '4. Touch & Gesture Control'), sub: t('터치/제스처/RT11 제어, 앱 모드(0~10: 비디오/음악/타스비흐/카메라/연인교감 등)', 'Touch/Gesture/RT11, AppType 0..10 (Video, Music, Tasbih, Camera, Lover Touch)') },
      { id: 'device', icon: 'settings_remote', title: t('5. 디바이스 제어 및 교정 (Device Control)', '5. Device Control & Calibration'), sub: t('섭씨/화씨, 절전모드, 원격 카메라 촬영, 착용 교정(2단계), 종료/재부팅/초기화', '°C/°F, Battery Saving, Remote Camera, 2-Step Wear Calibration, Shutdown/Reboot/Reset') },
      { id: 'notifications', icon: 'notifications_active', title: t('6. 알림 및 스마트 리마인더 (Notifications)', '6. Notifications & Smart Reminders'), sub: t('음수(8슬롯)/오래앉기/알람(10개), 방해금지(DND), 전화/메시지 푸시, ANCS, 커스텀 LED/진동', 'Drink/Sedentary/Alarms, DND, Call/Msg Push, ANCS, Event Notify 0..9, Custom Light/Vib') },
      { id: 'advanced', icon: 'memory', title: t('7. 고급 기능 및 녹음 파일 (Advanced & Audio)', '7. Advanced Features & Recordings'), sub: t('AGPS, Intell, 무슬림 예배(Tasbih), 원클릭 측정, 링 오디오 녹음(WAV/PCM) 가져오기', 'AGPS, Intell, Muslim Tasbih, One-Click Measure, Ring PCM/WAV Audio Import') },
      { id: 'ota', icon: 'system_update', title: t('8. 펌웨어 업그레이드 (OTA DFU)', '8. Firmware Upgrade (OTA)'), sub: t('DfuHandle Nordic DFU 업그레이드 (Type 1→2→3→4 진행률 및 강제 업데이트)', 'DfuHandle Firmware Upgrade with Type 1->2->3->4 callbacks & Force mode') },
      { id: 'resource', icon: 'folder_zip', title: t('9. 리소스 업데이트 (Resource Update)', '9. Resource Update'), sub: t('FileHandle 디바이스 리소스 목록 조회 및 UI 아이콘/리소스 바이너리 전송', 'FileHandle query resource names & push binary resource packages') },
      { id: 'debug', icon: 'bug_report', title: t('10. 디버그 및 SDK 로그 파일 (SdkLog)', '10. Debug & SDK Log Files'), sub: t('콘솔/단일 파일 로그 수집 독립 스위치, 로그 비우기, 스냅샷(.log) 내보내기', 'Independent Console & Single-File log switches, Clear logs, Export .log snapshot') }
    ];

    return `
      <!-- Device Connection & Status Hero Card -->
      <div class="m3-card primary-tonal">
        <div class="m3-card-header">
          <div>
            <div style="font-size:11px;font-weight:600;opacity:0.85">QCWares / QRing Android SDK v1.0.0.79</div>
            <div style="font-size:18px;font-weight:700;margin-top:2px;display:flex;align-items:center;gap:6px">
              <span class="material-symbols-rounded" style="font-size:20px">${st.connected ? 'bluetooth_connected' : 'bluetooth_disabled'}</span>
              ${st.deviceName}
            </div>
            <div style="font-size:11.5px;font-family:var(--md-sys-typescale-mono);opacity:0.9">
              MAC: ${st.deviceAddress} | FW: ${st.firmwareVersion} | HW: ${st.hardwareVersion}
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:22px;font-weight:700">${st.batteryValue}%</div>
            <div style="font-size:11px">${st.isCharging ? t('⚡ 충전 중', '⚡ Charging') : t('배터리 정상', 'Battery OK')}</div>
          </div>
        </div>

        <div class="kv-grid" style="margin-top:4px">
          <div class="kv-box" style="background:rgba(255,255,255,0.22);border:none">
            <div class="kv-label">${t('연결 / 페어링 상태', 'BLE / Bond Status')}</div>
            <div class="kv-val">${st.connected ? 'CONNECTED' : 'DISCONNECTED'} / ${st.bonded ? 'BONDED' : 'NONE'}</div>
          </div>
          <div class="kv-box" style="background:rgba(255,255,255,0.22);border:none">
            <div class="kv-label">${t('실시간 센서 요약', 'Live Ring Sensors')}</div>
            <div class="kv-val">♥ ${st.liveSensors.heartRate} bpm | SpO₂ ${st.liveSensors.spo2}%</div>
          </div>
        </div>

        <div class="btn-grid-3" style="margin-top:4px">
          <button class="m3-btn filled sm" onclick="QRingUI.navigateTo('bind')">
            <span class="material-symbols-rounded" style="font-size:16px">radar</span>
            ${t('스캔/바인딩', 'Scan/Bind')}
          </button>
          <button class="m3-btn tonal sm" onclick="QRingSDK.connectDirectly()">
            <span class="material-symbols-rounded" style="font-size:16px">sync</span>
            ${t('재연결', 'Reconnect')}
          </button>
          <button class="m3-btn outlined sm" style="background:var(--md-sys-color-surface)" onclick="QRingSDK.disconnect()">
            <span class="material-symbols-rounded" style="font-size:16px">link_off</span>
            ${t('연결해제', 'Disconnect')}
          </button>
          <button class="m3-btn tonal sm" onclick="QRingSDK.bleCreateBond()">
            <span class="material-symbols-rounded" style="font-size:16px">bluetooth_drive</span>
            ${t('BT 페어링', 'BT Pair')}
          </button>
          <button class="m3-btn tonal sm" onclick="QRingSDK.findDevice()">
            <span class="material-symbols-rounded" style="font-size:16px">vibration</span>
            ${t('링 찾기', 'Find Ring')}
          </button>
          <button class="m3-btn error sm" onclick="QRingSDK.unBindDevice()">
            <span class="material-symbols-rounded" style="font-size:16px">delete_forever</span>
            ${t('바인딩 해제', 'Unbind')}
          </button>
        </div>
      </div>

      <!-- Quick One-Click Measurement Banner -->
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">
              <span class="material-symbols-rounded" style="color:var(--md-sys-color-primary)">bolt</span>
              ${t('원클릭 통합 건강 측정 (OneKeyCheck)', 'One-Click Health Measurement')}
            </div>
            <div class="m3-card-subtitle">${t('심박수 · 혈압 · 혈중산소 · 스트레스 동시 측정 (AppStartOneKeyCheckReq)', 'Simultaneously measure HR, BP, SpO2 & Stress')}</div>
          </div>
          <button class="m3-btn ${st.activeSession.oneKeyMeasureActive ? 'error' : 'filled'} sm" onclick="QRingUI.toggleOneKeyMeasurement()">
            <span class="material-symbols-rounded" style="font-size:16px">${st.activeSession.oneKeyMeasureActive ? 'stop_circle' : 'play_arrow'}</span>
            ${st.activeSession.oneKeyMeasureActive ? t('측정 중지', 'Stop') : t('원클릭 측정', 'Measure Now')}
          </button>
        </div>
      </div>

      <!-- All 10 SDK Feature Categories (Matching HomeActivity.kt) -->
      <div class="m3-nav-list">
        ${modules.map(m => `
          <div class="m3-list-item" onclick="QRingUI.navigateTo('${m.id}')">
            <div class="m3-list-item-leading">
              <div class="m3-list-icon">
                <span class="material-symbols-rounded">${m.icon}</span>
              </div>
              <div class="m3-list-text">
                <div class="m3-list-title">${m.title}</div>
                <div class="m3-list-supporting">${m.sub}</div>
              </div>
            </div>
            <span class="material-symbols-rounded" style="color:var(--md-sys-color-outline)">chevron_right</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 2. DeviceBindActivity (BLE Scan, Filter, Sort by RSSI, Connect)
  function renderBindScreen() {
    const st = SDK.getState();
    let list = [...uiState.discoveredDevices];
    if (uiState.scanFilterName.trim()) {
      const q = uiState.scanFilterName.trim().toLowerCase();
      list = list.filter(d => d.name.toLowerCase().includes(q) || d.mac.toLowerCase().includes(q));
    }
    if (uiState.scanSortRssi) {
      list.sort((a, b) => b.rssi - a.rssi);
    }

    return `
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('BLE 스캐너 (BleScannerHelper)', 'BLE Device Scanner (BleScannerHelper)')}</div>
            <div class="m3-card-subtitle">${t('주변 스마트링을 검색하고 신호 강도(RSSI) 순으로 정렬하여 연결합니다.', 'Scan nearby QRing devices, filter by name/MAC, and connectDirectly(mac).')}</div>
          </div>
          <button class="m3-btn ${uiState.scanning ? 'error' : 'filled'} sm" onclick="QRingUI.toggleBleScan()">
            <span class="material-symbols-rounded" style="font-size:16px">${uiState.scanning ? 'stop' : 'radar'}</span>
            ${uiState.scanning ? t('스캔 중지', 'Stop Scan') : t('재스캔', 'Start Scan')}
          </button>
        </div>

        <div class="btn-grid-2">
          <div class="m3-field-group">
            <label class="m3-field-label">${t('이름 / MAC 필터', 'Filter by Name or MAC')}</label>
            <input class="m3-input" type="text" placeholder="e.g. QRing, R90..." value="${uiState.scanFilterName}" oninput="QRingUI.onFilterScan(this.value)">
          </div>
          <div class="m3-field-group" style="justify-content:flex-end">
            <div style="display:flex;align-items:center;justify-content:space-between;height:38px">
              <span style="font-size:12.5px;font-weight:500">${t('RSSI 신호강도 정렬', 'Sort by RSSI')}</span>
              ${m3SwitchHtml('sw-rssi-sort', uiState.scanSortRssi, 'onchange="QRingUI.toggleScanSort(this.checked)"')}
            </div>
          </div>
        </div>
      </div>

      <div class="m3-nav-list">
        ${list.map(dev => {
          const isCurrent = st.connected && st.deviceAddress === dev.mac;
          return `
            <div class="m3-list-item" onclick="QRingUI.selectDeviceToConnect('${dev.mac}', '${dev.name}')">
              <div class="m3-list-item-leading">
                <div class="m3-list-icon" style="${isCurrent ? 'background:var(--md-sys-color-primary);color:var(--md-sys-color-on-primary)' : ''}">
                  <span class="material-symbols-rounded">${dev.hasScreen ? 'watch' : 'trip_origin'}</span>
                </div>
                <div class="m3-list-text">
                  <div class="m3-list-title">
                    ${dev.name}
                    ${isCurrent ? `<span class="m3-chip selected" style="height:20px;font-size:10px;padding:0 6px;margin-left:6px">CONNECTED</span>` : ''}
                  </div>
                  <div class="m3-list-supporting" style="font-family:var(--md-sys-typescale-mono)">
                    ${dev.mac} | FW: ${dev.fwVer} | ${dev.hasScreen ? 'OLED Display' : 'Screenless'}
                  </div>
                </div>
              </div>
              <div style="text-align:right;font-family:var(--md-sys-typescale-mono);font-size:12px;font-weight:600;color:var(--md-sys-color-primary)">
                ${dev.rssi} dBm
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // 3. HealthSettingsActivity (Batch Sync 7-Day Task Chain + 11 Health Sub-Pages)
  function renderHealthHubScreen() {
    const bs = uiState.batchSync;
    const subPages = [
      { id: 'steps', icon: 'footprint', title: t('걸음수 및 활동 점수 (Steps & Activity Score)', 'Steps & Activity Score'), sub: 'syncTodaySteps, syncStepsByOffset, ActivityScoreUtils' },
      { id: 'sleep', icon: 'bedtime', title: t('수면 분석 및 수면 점수 (Sleep & Stages)', 'Sleep Analysis & Sleep Score'), sub: 'syncSleepList, SleepScore, SleepEfficiency, Deep/Light/REM' },
      { id: 'sport', icon: 'directions_run', title: t('운동 기록 및 실시간 운동 (Sport Mode)', 'Sport Records & Live Workout'), sub: 'PhoneSportReq, DeviceSportNotifyListener(0x78), syncSportPlus' },
      { id: 'heart_rate', icon: 'favorite', title: t('심박수 · PPG 파형 · RRI (Heart Rate & RRI)', 'Heart Rate, Raw PPG & RRI'), sub: 'HeartRateSettingReq, HrPpg, RRI Block Sync, Real-time 2s HR' },
      { id: 'blood_pressure', icon: 'bloodtype', title: t('혈압 측정 및 설정 (Blood Pressure)', 'Blood Pressure (SBP / DBP)'), sub: 'BloodPressureSettingReq, ReadBpRsp, Start/Stop Manual BP' },
      { id: 'blood_oxygen', icon: 'spo2', title: t('혈중산소 및 Red/IR PPG (Blood Oxygen SpO₂)', 'Blood Oxygen (SpO₂) & Raw PPG'), sub: 'BloodOxygenSettingReq, SpO2 Raw PPG, syncBloodOxygenWithCallback' },
      { id: 'hrv', icon: 'monitor_heart', title: t('심박변이도 (HRV Variability)', 'Heart Rate Variability (HRV)'), sub: 'HrvSettingReq, syncHrvWithCallback, Manual HRV Measure' },
      { id: 'pressure', icon: 'psychology', title: t('스트레스 / 압력 (Pressure & Interval)', 'Stress / Pressure & Interval Dialog'), sub: 'PressureSettingReq (15/20/30/60m), syncPressureWithCallback' },
      { id: 'temperature', icon: 'device_thermostat', title: t('피부 온도 (Skin Temperature)', 'Skin Temperature'), sub: 'TemperatureSettingReq, FileHandle.startObtainTemperatureOnce(0)' },
      { id: 'sugar_lipids', icon: 'water_drop', title: t('혈당 및 지질 (Blood Glucose & Lipids)', 'Sugar & Lipids (Blood Glucose)'), sub: 'SugarLipidsSettingReq, BloodSugarLipidsRsp (mmol/L)' },
      { id: 'emotion', icon: 'mood', title: t('감정 상태 모니터링 (Emotion 0..10)', 'Emotion Monitoring (Status 0..10)'), sub: 'EmotionSettingReq, syncEmotionWithCallback (Calm/Stressed/Excited)' },
      { id: 'smart_reminder', icon: 'local_drink', title: t('음수 및 오래앉기 리마인더 (Drink & Sedentary)', 'Drink Water & Sedentary Reminders'), sub: 'DrinkWaterReq (8 slots), SedentaryReminderReq' }
    ];

    return `
      <!-- 7-Day Batch Sync Task Chain Card (HealthSettingsActivity.startBatchSyncData) -->
      <div class="m3-card primary-tonal">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">
              <span class="material-symbols-rounded">cloud_sync</span>
              ${t('7일 전체 건강 데이터 일괄 동기화 (Task Chain)', 'Batch Sync 7-Day Health Data (Serial Task Chain)')}
            </div>
            <div class="m3-card-subtitle" style="color:inherit;opacity:0.85">
              ${t('BLE 큐 충돌 방지를 위해 Steps → Sleep → HR → BP → SpO₂ → HRV → Stress → Temp → Sport 순차 동기화', 'Serial queue: Steps -> Sleep -> HR -> BP -> SpO2 -> HRV -> Stress -> Temp -> Sport')}
            </div>
          </div>
          <button class="m3-btn filled sm" ${bs.running ? 'disabled' : ''} onclick="QRingUI.startBatchSync7Days()">
            <span class="material-symbols-rounded" style="font-size:16px">sync</span>
            ${bs.running ? t('동기화 중...', 'Syncing...') : t('일괄 동기화 시작', 'Start Batch Sync')}
          </button>
        </div>

        <div class="m3-progress-track">
          <div class="m3-progress-fill" style="width:${bs.progress}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11.5px;font-family:var(--md-sys-typescale-mono)">
          <span>${bs.currentTask || t('대기 중 (Ready)', 'Ready to sync 7 days')}</span>
          <span>${bs.progress}%</span>
        </div>
      </div>

      <!-- 12 Health Sub-Modules List -->
      <div class="m3-nav-list">
        ${subPages.map(p => `
          <div class="m3-list-item" onclick="QRingUI.navigateTo('${p.id}')">
            <div class="m3-list-item-leading">
              <div class="m3-list-icon">
                <span class="material-symbols-rounded">${p.icon}</span>
              </div>
              <div class="m3-list-text">
                <div class="m3-list-title">${p.title}</div>
                <div class="m3-list-supporting">${p.sub}</div>
              </div>
            </div>
            <span class="material-symbols-rounded" style="color:var(--md-sys-color-outline)">chevron_right</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 4. StepsActivity
  function renderStepsScreen() {
    const st = SDK.getState();
    const dayData = SDK.getHistory(uiState.selectedDayOffset);
    const stepsObj = uiState.selectedDayOffset === 0
      ? { totalSteps: st.liveSensors.todaySteps, calorie: st.liveSensors.todayCalorie, distance: st.liveSensors.todayDistance, details: dayData.steps.details }
      : dayData.steps;

    const score = uiState.lastStepScore !== null
      ? uiState.lastStepScore
      : SDK.ActivityScoreUtils.calculateActivityScore(stepsObj.totalSteps, uiState.lastStepAge);

    setTimeout(() => {
      drawChart('chart-steps', {
        type: 'bar',
        points: stepsObj.details,
        color: '#4355B9',
        minY: 0
      });
    }, 20);

    return `
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('걸음수 및 활동 점수 (StepsActivity)', 'Steps & Activity Score (StepsActivity)')}</div>
            <div class="m3-card-subtitle">${t('15분 단위 96슬롯 걸음수 분포 및 연령 기반 활동 점수 계산', '96 15-minute slots per day & ActivityScoreUtils')}</div>
          </div>
          <span class="m3-chip selected">${dayData.dateStr}</span>
        </div>

        <div class="metric-hero">
          <span class="metric-value">${stepsObj.totalSteps.toLocaleString()}</span>
          <span class="metric-unit">steps</span>
          <span style="margin-left:auto;font-size:13px;font-weight:600;color:var(--md-sys-color-tertiary)">
            ${t('활동 점수', 'Activity Score')}: ${score}/100 (${t('만', 'Age')} ${uiState.lastStepAge})
          </span>
        </div>

        <div class="kv-grid">
          <div class="kv-box">
            <div class="kv-label">${t('소모 칼로리 (Calorie)', 'Burned Calories')}</div>
            <div class="kv-val">${stepsObj.calorie} kcal</div>
          </div>
          <div class="kv-box">
            <div class="kv-label">${t('이동 거리 (Distance)', 'Walk Distance')}</div>
            <div class="kv-val">${(stepsObj.distance / 1000).toFixed(2)} km (${stepsObj.distance} m)</div>
          </div>
        </div>

        <div class="btn-grid-2">
          <button class="m3-btn filled sm" onclick="QRingUI.syncTodaySteps()">
            <span class="material-symbols-rounded" style="font-size:16px">footprint</span>
            ${t('오늘 걸음수 동기화', 'Sync Today Steps')}
          </button>
          <button class="m3-btn tonal sm" onclick="QRingUI.openActivityScoreDialog()">
            <span class="material-symbols-rounded" style="font-size:16px">calculate</span>
            ${t('활동 점수 계산 (나이 입력)', 'Get Activity Score')}
          </button>
        </div>
      </div>

      ${dayQueryControlsHtml('steps')}

      <div class="m3-card">
        <div class="m3-card-title">${t('24시간(15분 간격 96슬롯) 걸음수 그래프', '24-Hour (96 x 15-min Slots) Steps Distribution')}</div>
        <div class="chart-container">
          <canvas id="chart-steps" class="chart-canvas"></canvas>
        </div>
      </div>
    `;
  }

  // 5. SleepActivity
  function renderSleepScreen() {
    const dayData = SDK.getHistory(uiState.selectedDayOffset);
    const sl = dayData.sleep;
    const totalHrs = Math.floor(sl.totalDuration / 60);
    const totalMins = sl.totalDuration % 60;

    setTimeout(() => {
      drawChart('chart-sleep', {
        type: 'sleep',
        points: sl.stages
      });
    }, 20);

    return `
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('수면 단계 및 수면 점수 (SleepActivity)', 'Sleep Stages & Sleep Score (SleepActivity)')}</div>
            <div class="m3-card-subtitle">${t('LargeDataHandler.syncSleepList + SleepScore & SleepEfficiency', 'LargeDataHandler.syncSleepList + SleepScore & SleepEfficiency')}</div>
          </div>
          <span class="m3-chip selected">${dayData.dateStr}</span>
        </div>

        <div class="metric-hero">
          <span class="metric-value">${totalHrs}h ${totalMins}m</span>
          <span class="metric-unit">${sl.sleepTimeStr} ~ ${sl.wakeTimeStr}</span>
        </div>

        <div class="kv-grid">
          <div class="kv-box">
            <div class="kv-label">${t('수면 점수 / 효율', 'Sleep Score / Efficiency')}</div>
            <div class="kv-val">${sl.score} pts / ${sl.efficiency}%</div>
          </div>
          <div class="kv-box">
            <div class="kv-label">${t('깊은 수면 / 얕은 수면', 'Deep / Light Sleep')}</div>
            <div class="kv-val">${sl.deepMin}m / ${sl.lightMin}m</div>
          </div>
          <div class="kv-box">
            <div class="kv-label">${t('REM 수면 / 깸(Awake)', 'REM / Awake Duration')}</div>
            <div class="kv-val">${sl.remMin}m / ${sl.awakeMin}m</div>
          </div>
          <div class="kv-box">
            <div class="kv-label">${t('프로토콜 응답 모델', 'Protocol Model')}</div>
            <div class="kv-val">SleepNewProtoResp</div>
          </div>
        </div>
      </div>

      ${dayQueryControlsHtml('sleep')}

      <div class="m3-card">
        <div class="m3-card-title">${t('수면 단계 타임라인 (Deep / Light / REM / Awake)', 'Sleep Stage Hypnogram')}</div>
        <div class="chart-container">
          <canvas id="chart-sleep" class="chart-canvas"></canvas>
        </div>
      </div>
    `;
  }

  // 6. SportRecordActivity (App-Started Sport Mode + <60s Stop Confirm + 0x78 Live Stream + History)
  function renderSportScreen() {
    const st = SDK.getState();
    const sp = st.activeSession;
    const dayData = SDK.getHistory(uiState.selectedDayOffset);
    const catalogOptions = SDK.SportTypeCatalog.map(item =>
      `<option value="${item.code}" ${sp.sportType === item.code ? 'selected' : ''}>
        [${item.code}] ${uiState.lang === 'ko' ? item.ko : item.name} (${item.name})
      </option>`
    ).join('');

    return `
      <div class="m3-card ${sp.sportActive ? 'primary-tonal' : ''}">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">
              <span class="material-symbols-rounded">${sp.sportActive ? 'timer' : 'fitness_center'}</span>
              ${t('앱 연동 실시간 운동 제어 (PhoneSportReq & 0x78)', 'App-Started Live Workout (PhoneSportReq & 0x78)')}
            </div>
            <div class="m3-card-subtitle" style="color:inherit;opacity:0.85">
              ${t('운동 시작 시 심박 LED가 점등되며 0x78 리스너로 실시간 스트리밍됩니다. 60초 미만 종료 시 확인 다이얼로그가 표시됩니다.', 'Streams live HR/steps/calories via DeviceSportNotifyListener(0x78). Shows <60s stop confirmation dialog.')}
            </div>
          </div>
        </div>

        <div class="m3-field-group">
          <label class="m3-field-label">${t('운동 종목 선택 (SportTypeConstants 4..238)', 'Select Sport Type (SportTypeConstants)')}</label>
          <select class="m3-select" onchange="QRingUI.onSelectSportType(this.value)" ${sp.sportActive ? 'disabled' : ''}>
            ${catalogOptions}
          </select>
        </div>

        <div class="kv-grid">
          <div class="kv-box">
            <div class="kv-label">${t('운동 시간 / 상태', 'Duration / Status')}</div>
            <div class="kv-val">${sp.sportDurationSec}s (${sp.sportActive ? (sp.sportPaused ? 'PAUSED' : 'RUNNING') : 'IDLE'})</div>
          </div>
          <div class="kv-box">
            <div class="kv-label">${t('실시간 심박수 (0x78)', 'Live Sport HR (0x78)')}</div>
            <div class="kv-val">♥ ${sp.sportActive ? st.liveSensors.heartRate : '--'} bpm</div>
          </div>
          <div class="kv-box">
            <div class="kv-label">${t('운동 걸음수 / 거리', 'Workout Steps / Distance')}</div>
            <div class="kv-val">${sp.sportSteps} steps / ${sp.sportDistance} m</div>
          </div>
          <div class="kv-box">
            <div class="kv-label">${t('운동 칼로리', 'Workout Calories')}</div>
            <div class="kv-val">${sp.sportCalories} kcal</div>
          </div>
        </div>

        <div class="btn-grid-3">
          <button class="m3-btn filled sm" ${sp.sportActive ? 'disabled' : ''} onclick="QRingUI.startSportSession()">
            <span class="material-symbols-rounded" style="font-size:16px">play_arrow</span>
            ${t('운동 시작 (Start)', 'Start Sport')}
          </button>
          <button class="m3-btn error sm" ${!sp.sportActive ? 'disabled' : ''} onclick="QRingUI.requestStopSportSession()">
            <span class="material-symbols-rounded" style="font-size:16px">stop</span>
            ${t('운동 종료 (Stop)', 'Stop Sport')}
          </button>
          <button class="m3-btn tonal sm" onclick="QRingUI.syncSportRecords()">
            <span class="material-symbols-rounded" style="font-size:16px">sync</span>
            ${t('운동 기록 동기화', 'Sync Sport')}
          </button>
        </div>
      </div>

      <div class="m3-card">
        <div class="m3-card-title">${t('동기화된 운동 요약 리스트 (SportPlusEntity)', 'Synced Workout Summaries (SportPlusEntity)')}</div>
        <div class="m3-nav-list">
          ${dayData.sports.map(rec => `
            <div class="m3-list-item" style="cursor:default">
              <div class="m3-list-item-leading">
                <div class="m3-list-icon"><span class="material-symbols-rounded">directions_run</span></div>
                <div class="m3-list-text">
                  <div class="m3-list-title">${rec.sportName} (Type ${rec.sportType})</div>
                  <div class="m3-list-supporting">
                    ${Math.round(rec.duration / 60)} min | ${rec.steps} steps | ${(rec.distance / 1000).toFixed(2)} km | ${rec.calories} kcal | HR ${rec.hrMin}~${rec.hrMax} (avg ${rec.hrAvg})
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 7. HeartRateActivity (Settings + Raw PPG + RRI Block Sync + 24h Chart + Single/Real-time 2s HR)
  function renderHeartRateScreen() {
    const st = SDK.getState();
    const hrCfg = st.settings.heartRate;
    const dayData = SDK.getHistory(uiState.selectedDayOffset);

    setTimeout(() => {
      drawChart('chart-hr', {
        type: 'line',
        points: dayData.heartRate,
        color: '#E11D48',
        minY: 45,
        maxY: 165
      });
      if (st.activeSession.hrPpgStreaming) {
        startPpgOscilloscope('canvas-hr-ppg', 'hr');
      }
    }, 20);

    return `
      <!-- HR Settings & Manual/Real-Time Measurement -->
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('심박수 설정 및 실시간 측정 (HeartRateActivity)', 'Heart Rate Settings & Live Measurement')}</div>
            <div class="m3-card-subtitle">${t('주기적 심박 측정 간격 및 단일 / 2초 주기 연속 실시간 측정', 'Scheduled interval, Single Measure & 2-sec continuous polling')}</div>
          </div>
          <div style="font-size:22px;font-weight:700;color:#E11D48">♥ ${st.liveSensors.heartRate} bpm</div>
        </div>

        <div class="kv-grid">
          <div class="kv-box">
            <div class="kv-label">${t('자동 측정 활성화', 'Auto HR Enable')}</div>
            <div class="kv-val">${hrCfg.isEnable ? 'ENABLED' : 'DISABLED'}</div>
          </div>
          <div class="kv-box">
            <div class="kv-label">${t('측정 간격 (Interval)', 'Measure Interval')}</div>
            <div class="kv-val">${hrCfg.interval} min (High >${hrCfg.highReminder})</div>
          </div>
        </div>

        <div class="btn-grid-2">
          <div class="m3-field-group">
            <label class="m3-field-label">${t('심박 측정 간격(분)', 'HR Interval (min)')}</label>
            <select id="sel-hr-interval" class="m3-select">
              ${[5, 10, 15, 30, 60].map(v => `<option value="${v}" ${hrCfg.interval === v ? 'selected' : ''}>${v} min</option>`).join('')}
            </select>
          </div>
          <div class="m3-field-group">
            <label class="m3-field-label">${t('설정 읽기/쓰기/개폐', 'Settings Commands')}</label>
            <div class="btn-grid-2">
              <button class="m3-btn tonal sm" onclick="QRingUI.hrSettingAction('read')">Read</button>
              <button class="m3-btn filled sm" onclick="QRingUI.hrSettingAction('write')">Write</button>
            </div>
          </div>
        </div>

        <div class="btn-grid-2">
          <button class="m3-btn outlined sm" onclick="QRingUI.hrSettingAction('open')">Open Setting</button>
          <button class="m3-btn outlined sm" onclick="QRingUI.hrSettingAction('close')">Close Setting</button>
        </div>

        <div class="btn-grid-2" style="margin-top:4px">
          <button class="m3-btn ${st.activeSession.singleHrMeasuring ? 'error' : 'filled'} sm" onclick="QRingUI.toggleSingleHrMeasure()">
            <span class="material-symbols-rounded" style="font-size:16px">${st.activeSession.singleHrMeasuring ? 'stop' : 'play_arrow'}</span>
            ${st.activeSession.singleHrMeasuring ? t('단일 측정 중지', 'Stop Measure') : t('단일 심박 측정', 'Start Measure')}
          </button>
          <button class="m3-btn ${st.activeSession.realTimeHrActive ? 'error' : 'tonal'} sm" onclick="QRingUI.toggleRealTimeHr()">
            <span class="material-symbols-rounded" style="font-size:16px">vital_signs</span>
            ${st.activeSession.realTimeHrActive ? t('실시간(2초) 중지', 'Stop Real-Time HR') : t('실시간(2초) 연속 심박', 'Start Real-Time HR')}
          </button>
        </div>
      </div>

      <!-- Raw Green PPG & Accelerometer Oscilloscope -->
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('원시 PPG 광학 파형 스트리밍 (StartHeartRatePpgReq)', 'Raw Green PPG & XYZ Accelerometer Stream')}</div>
            <div class="m3-card-subtitle">${t('Green PPG 광학 센서 원시 데이터 및 3축 가속도계 실시간 오실로스코프', 'Live Green PPG pulse wave + 3-axis motion artifact waveform')}</div>
          </div>
          <button class="m3-btn ${st.activeSession.hrPpgStreaming ? 'error' : 'filled'} sm" onclick="QRingUI.toggleHrPpgStream()">
            ${st.activeSession.hrPpgStreaming ? t('PPG 중지', 'Stop HR PPG') : t('PPG 시작', 'Start HR PPG')}
          </button>
        </div>
        <div class="chart-container" style="padding:4px;background:#090D16">
          <canvas id="canvas-hr-ppg" class="chart-canvas" style="height:125px"></canvas>
        </div>
      </div>

      <!-- RRI (RR-Interval) Monitoring & Block Sync (Section 6.4) -->
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('RRI(심박 박동간격) 블록 동기화 (Section 6.4)', 'RRI (RR-Interval) Monitoring & Block Sync')}</div>
            <div class="m3-card-subtitle">Status: ${st.settings.rri.isEnable ? 'OPEN' : 'CLOSED'} | RRI = ${st.liveSensors.rriMs} ms</div>
          </div>
        </div>
        <div class="btn-grid-2">
          <button class="m3-btn tonal sm" onclick="QRingUI.rriAction('open')">Open RRI</button>
          <button class="m3-btn outlined sm" onclick="QRingUI.rriAction('close')">Close RRI</button>
          <button class="m3-btn filled sm" onclick="QRingUI.rriAction('index')">RRI Block Index</button>
          <button class="m3-btn filled sm" onclick="QRingUI.rriAction('block')">Sync RRI Block</button>
        </div>
        ${uiState.rriSyncedSlots.length ? `
          <div style="font-size:11.5px;font-family:var(--md-sys-typescale-mono);padding:8px;background:var(--md-sys-color-surface-container);border-radius:8px">
            ${uiState.rriSyncedSlots.map(s => `<div>• Block #${s.index} (${s.timeRange}): [${s.samples.join('ms, ')}ms]</div>`).join('')}
          </div>
        ` : ''}
      </div>

      ${dayQueryControlsHtml('heart_rate')}

      <div class="m3-card">
        <div class="m3-card-title">${t('24시간 심박수 추이 그래프 (BPM)', '24-Hour Heart Rate Trend (BPM)')}</div>
        <div class="chart-container">
          <canvas id="chart-hr" class="chart-canvas"></canvas>
        </div>
      </div>
    `;
  }

  // 8. BloodPressureActivity
  function renderBloodPressureScreen() {
    const st = SDK.getState();
    const bpCfg = st.settings.bloodPressure;
    const dayData = SDK.getHistory(uiState.selectedDayOffset);

    setTimeout(() => {
      drawChart('chart-bp', {
        type: 'line',
        points: dayData.bloodPressure.map(p => p.sbp),
        points2: dayData.bloodPressure.map(p => p.dbp),
        color: '#DC2626',
        color2: '#2563EB',
        minY: 50,
        maxY: 160
      });
    }, 20);

    return `
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('혈압 설정 및 수동 측정 (BloodPressureActivity)', 'Blood Pressure Settings & Manual Measure')}</div>
            <div class="m3-card-subtitle">${t('수축기(SBP) 및 이완기(DBP) 혈압 모니터링', 'Systolic (SBP) & Diastolic (DBP) Blood Pressure')}</div>
          </div>
          <span class="m3-chip selected">${bpCfg.isEnable ? 'Auto ON' : 'Auto OFF'}</span>
        </div>

        <div class="metric-hero">
          <span class="metric-value">${st.liveSensors.sbp} / ${st.liveSensors.dbp}</span>
          <span class="metric-unit">mmHg (SBP / DBP)</span>
        </div>

        <div class="btn-grid-2">
          <button class="m3-btn tonal sm" onclick="QRingUI.genericMetricSetting('bloodPressure', 'BloodPressureSettingReq', 'read')">Settings Read</button>
          <button class="m3-btn tonal sm" onclick="QRingUI.genericMetricSetting('bloodPressure', 'BloodPressureSettingReq', 'write')">Settings Write</button>
          <button class="m3-btn outlined sm" onclick="QRingUI.genericMetricSetting('bloodPressure', 'BloodPressureSettingReq', 'open')">Open Setting</button>
          <button class="m3-btn outlined sm" onclick="QRingUI.genericMetricSetting('bloodPressure', 'BloodPressureSettingReq', 'close')">Close Setting</button>
        </div>

        <button class="m3-btn ${st.activeSession.manualBpMeasuring ? 'error' : 'filled'} sm" onclick="QRingUI.toggleManualMeasure('manualBpMeasuring', 'BP', 1)">
          <span class="material-symbols-rounded" style="font-size:16px">${st.activeSession.manualBpMeasuring ? 'stop' : 'play_arrow'}</span>
          ${st.activeSession.manualBpMeasuring ? t('수동 혈압 측정 중지', 'Stop Manual BP Measure') : t('수동 혈압 측정 시작', 'Start Manual BP Measure')}
        </button>
      </div>

      ${dayQueryControlsHtml('blood_pressure')}

      <div class="m3-card">
        <div class="m3-card-title">${t('24시간 수축기(적색) / 이완기(청색) 혈압 그래프', '24-Hour SBP (Red) & DBP (Blue) Chart')}</div>
        <div class="chart-container">
          <canvas id="chart-bp" class="chart-canvas"></canvas>
        </div>
      </div>
    `;
  }

  // 9. BloodOxygenActivity
  function renderBloodOxygenScreen() {
    const st = SDK.getState();
    const cfg = st.settings.bloodOxygen;
    const dayData = SDK.getHistory(uiState.selectedDayOffset);

    setTimeout(() => {
      drawChart('chart-spo2', {
        type: 'line',
        points: dayData.spo2.map(p => p.max),
        points2: dayData.spo2.map(p => p.min),
        color: '#0284C7',
        color2: '#38BDF8',
        minY: 88,
        maxY: 100
      });
      if (st.activeSession.spo2PpgStreaming) {
        startPpgOscilloscope('canvas-spo2-ppg', 'spo2');
      }
    }, 20);

    return `
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('혈중산소 포화도 (BloodOxygenActivity)', 'Blood Oxygen Saturation (SpO₂)')}</div>
            <div class="m3-card-subtitle">${t('시간별 최소/최대 SpO₂ 동기화 및 수동 측정', 'Hourly Min/Max SpO2 & Manual Measurement')}</div>
          </div>
          <span class="m3-chip selected">${cfg.isEnable ? 'Auto ON' : 'Auto OFF'}</span>
        </div>

        <div class="metric-hero">
          <span class="metric-value">${st.liveSensors.spo2}%</span>
          <span class="metric-unit">SpO₂ (Normal 95~100%)</span>
        </div>

        <div class="btn-grid-2">
          <button class="m3-btn tonal sm" onclick="QRingUI.genericMetricSetting('bloodOxygen', 'BloodOxygenSettingReq', 'read')">Settings Read</button>
          <button class="m3-btn tonal sm" onclick="QRingUI.genericMetricSetting('bloodOxygen', 'BloodOxygenSettingReq', 'write')">Settings Write</button>
          <button class="m3-btn outlined sm" onclick="QRingUI.genericMetricSetting('bloodOxygen', 'BloodOxygenSettingReq', 'open')">Open Setting</button>
          <button class="m3-btn outlined sm" onclick="QRingUI.genericMetricSetting('bloodOxygen', 'BloodOxygenSettingReq', 'close')">Close Setting</button>
        </div>

        <div class="btn-grid-2">
          <button class="m3-btn ${st.activeSession.manualSpo2Measuring ? 'error' : 'filled'} sm" onclick="QRingUI.toggleManualMeasure('manualSpo2Measuring', 'SpO2', 3)">
            ${st.activeSession.manualSpo2Measuring ? t('SpO₂ 측정 중지', 'Stop SpO₂ Measure') : t('수동 SpO₂ 측정', 'Start SpO₂ Measure')}
          </button>
          <button class="m3-btn ${st.activeSession.spo2PpgStreaming ? 'error' : 'tonal'} sm" onclick="QRingUI.toggleSpo2PpgStream()">
            ${st.activeSession.spo2PpgStreaming ? t('원시 PPG 중지', 'Stop SpO₂ PPG') : t('Red/IR 원시 PPG', 'Start SpO₂ Raw PPG')}
          </button>
        </div>
      </div>

      <div class="m3-card">
        <div class="m3-card-title">${t('Red & IR 적외선 광학 원시 파형 (StartBloodOxygenPpg)', 'Red & Infrared Raw PPG Oscilloscope')}</div>
        <div class="chart-container" style="padding:4px;background:#090D16">
          <canvas id="canvas-spo2-ppg" class="chart-canvas" style="height:115px"></canvas>
        </div>
      </div>

      ${dayQueryControlsHtml('blood_oxygen')}

      <div class="m3-card">
        <div class="m3-card-title">${t('24시간 혈중산소 최대/최소 추이 (%)', '24-Hour Hourly Max/Min SpO₂ (%)')}</div>
        <div class="chart-container">
          <canvas id="chart-spo2" class="chart-canvas"></canvas>
        </div>
      </div>
    `;
  }

  // 10. HrvActivity
  function renderHrvScreen() {
    const st = SDK.getState();
    const cfg = st.settings.hrv;
    const dayData = SDK.getHistory(uiState.selectedDayOffset);

    setTimeout(() => {
      drawChart('chart-hrv', {
        type: 'line',
        points: dayData.hrv,
        color: '#0D9488',
        minY: 20,
        maxY: 110
      });
    }, 20);

    return `
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('심박변이도 설정 및 측정 (HrvActivity)', 'Heart Rate Variability (HrvActivity)')}</div>
            <div class="m3-card-subtitle">${t('자율신경계 활성도 및 회복 지수 모니터링 (30분 간격 48슬롯)', '48 half-hour slots per day & Manual HRV test')}</div>
          </div>
          <span class="m3-chip selected">${cfg.isEnable ? 'Auto ON' : 'Auto OFF'}</span>
        </div>

        <div class="metric-hero">
          <span class="metric-value">${st.liveSensors.hrv}</span>
          <span class="metric-unit">ms (RMSSD)</span>
        </div>

        <div class="btn-grid-2">
          <button class="m3-btn tonal sm" onclick="QRingUI.genericMetricSetting('hrv', 'HrvSettingReq', 'read')">Settings Read</button>
          <button class="m3-btn tonal sm" onclick="QRingUI.genericMetricSetting('hrv', 'HrvSettingReq', 'write')">Settings Write</button>
          <button class="m3-btn outlined sm" onclick="QRingUI.genericMetricSetting('hrv', 'HrvSettingReq', 'open')">Open Setting</button>
          <button class="m3-btn outlined sm" onclick="QRingUI.genericMetricSetting('hrv', 'HrvSettingReq', 'close')">Close Setting</button>
        </div>

        <button class="m3-btn ${st.activeSession.manualHrvMeasuring ? 'error' : 'filled'} sm" onclick="QRingUI.toggleManualMeasure('manualHrvMeasuring', 'HRV', 4)">
          ${st.activeSession.manualHrvMeasuring ? t('수동 HRV 측정 중지', 'Stop Manual HRV') : t('수동 HRV 측정 시작', 'Start Manual HRV')}
        </button>
      </div>

      ${dayQueryControlsHtml('hrv')}

      <div class="m3-card">
        <div class="m3-card-title">${t('24시간 심박변이도(HRV) 추이 그래프 (ms)', '24-Hour HRV Trend (ms)')}</div>
        <div class="chart-container">
          <canvas id="chart-hrv" class="chart-canvas"></canvas>
        </div>
      </div>
    `;
  }

  // 11. PressureActivity (Includes PressureSettingDialog with 15/20/30/60m selector)
  function renderPressureScreen() {
    const st = SDK.getState();
    const cfg = st.settings.pressure;
    const dayData = SDK.getHistory(uiState.selectedDayOffset);

    setTimeout(() => {
      drawChart('chart-pressure', {
        type: 'bar',
        points: dayData.pressure,
        color: '#7C3AED',
        minY: 0,
        maxY: 100
      });
    }, 20);

    return `
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('스트레스 / 압력 설정 (PressureActivity)', 'Stress / Pressure Monitoring (PressureActivity)')}</div>
            <div class="m3-card-subtitle">${t('Settings Write 클릭 시 M3 간격 설정 다이얼로그(15/20/30/60분)가 열립니다.', 'Click Settings Write to open PressureSettingDialog (15/20/30/60 min).')}</div>
          </div>
          <span class="m3-chip selected">${cfg.isEnable ? `ON (${cfg.interval}m)` : 'OFF'}</span>
        </div>

        <div class="metric-hero">
          <span class="metric-value">${st.liveSensors.pressure}</span>
          <span class="metric-unit">/ 100 (${st.liveSensors.pressure < 40 ? t('이완', 'Relaxed') : st.liveSensors.pressure < 70 ? t('보통', 'Normal') : t('높음', 'High Stress')})</span>
        </div>

        <div class="btn-grid-2">
          <button class="m3-btn tonal sm" onclick="QRingUI.genericMetricSetting('pressure', 'PressureSettingReq', 'read')">Settings Read</button>
          <button class="m3-btn filled sm" onclick="QRingUI.openPressureSettingDialog()">Settings Write (Dialog)</button>
          <button class="m3-btn outlined sm" onclick="QRingUI.genericMetricSetting('pressure', 'PressureSettingReq', 'open')">Open Setting</button>
          <button class="m3-btn outlined sm" onclick="QRingUI.genericMetricSetting('pressure', 'PressureSettingReq', 'close')">Close Setting</button>
        </div>

        <button class="m3-btn ${st.activeSession.manualPressureMeasuring ? 'error' : 'filled'} sm" onclick="QRingUI.toggleManualMeasure('manualPressureMeasuring', 'Pressure', 5)">
          ${st.activeSession.manualPressureMeasuring ? t('수동 스트레스 측정 중지', 'Stop Manual Pressure') : t('수동 스트레스 측정 시작', 'Start Manual Pressure')}
        </button>
      </div>

      ${dayQueryControlsHtml('pressure')}

      <div class="m3-card">
        <div class="m3-card-title">${t('24시간 스트레스 지수 분포 (48슬롯)', '24-Hour Stress Index Distribution')}</div>
        <div class="chart-container">
          <canvas id="chart-pressure" class="chart-canvas"></canvas>
        </div>
      </div>
    `;
  }

  // 12. TemperatureActivity
  function renderTemperatureScreen() {
    const st = SDK.getState();
    const cfg = st.settings.temperature;
    const dayData = SDK.getHistory(uiState.selectedDayOffset);

    setTimeout(() => {
      drawChart('chart-temp', {
        type: 'line',
        points: dayData.temperature,
        color: '#EA580C',
        minY: 35,
        maxY: 38
      });
    }, 20);

    return `
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('피부 온도 모니터링 (TemperatureActivity)', 'Skin Temperature (TemperatureActivity)')}</div>
            <div class="m3-card-subtitle">${t('TemperatureSettingReq 및 FileHandle.startObtainTemperatureOnce(0)', 'Scheduled & Manual Temperature Sync')}</div>
          </div>
          <span class="m3-chip selected">${cfg.isEnable ? 'Auto ON' : 'Auto OFF'}</span>
        </div>

        <div class="metric-hero">
          <span class="metric-value">${st.liveSensors.temperature.toFixed(1)}</span>
          <span class="metric-unit">${st.settings.device.degreeCelsius ? '°C' : '°F'}</span>
        </div>

        <div class="btn-grid-2">
          <button class="m3-btn tonal sm" onclick="QRingUI.genericMetricSetting('temperature', 'TemperatureSettingReq', 'read')">Settings Read</button>
          <button class="m3-btn tonal sm" onclick="QRingUI.genericMetricSetting('temperature', 'TemperatureSettingReq', 'write')">Settings Write</button>
          <button class="m3-btn outlined sm" onclick="QRingUI.genericMetricSetting('temperature', 'TemperatureSettingReq', 'open')">Open Setting</button>
          <button class="m3-btn outlined sm" onclick="QRingUI.genericMetricSetting('temperature', 'TemperatureSettingReq', 'close')">Close Setting</button>
        </div>

        <button class="m3-btn filled sm" onclick="QRingUI.syncManualTemperatureOnce()">
          <span class="material-symbols-rounded" style="font-size:16px">thermostat</span>
          ${t('수동 체온 데이터 즉시 동기화 (startObtainTemperatureOnce)', 'Sync Manual Temperature (startObtainTemperatureOnce)')}
        </button>
      </div>

      ${dayQueryControlsHtml('temperature')}

      <div class="m3-card">
        <div class="m3-card-title">${t('24시간 피부 온도 그래프 (°C)', '24-Hour Skin Temperature Chart (°C)')}</div>
        <div class="chart-container">
          <canvas id="chart-temp" class="chart-canvas"></canvas>
        </div>
      </div>
    `;
  }

  // 13. SugarLipidsActivity
  function renderSugarLipidsScreen() {
    const st = SDK.getState();
    const cfg = st.settings.sugarLipids;
    return `
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('혈당 및 지질 설정 (SugarLipidsActivity)', 'Blood Glucose & Lipids (SugarLipidsActivity)')}</div>
            <div class="m3-card-subtitle">${t('SugarLipidsSettingReq (0x3A) 자동 모니터링 제어', 'Non-invasive Blood Glucose & Lipids estimation')}</div>
          </div>
          <span class="m3-chip selected">${cfg.isEnable ? 'ENABLED' : 'DISABLED'}</span>
        </div>

        <div class="metric-hero">
          <span class="metric-value">${st.liveSensors.bloodGlucose.toFixed(1)}</span>
          <span class="metric-unit">mmol/L (Interval: ${cfg.interval}m)</span>
        </div>

        <div class="m3-field-group">
          <label class="m3-field-label">${t('자동 측정 스위치', 'Auto Monitoring Enable')}</label>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span>${t('혈당/지질 주기적 측정 활성화', 'Enable periodic Sugar & Lipids monitoring')}</span>
            ${m3SwitchHtml('sw-sugar-enable', cfg.isEnable)}
          </div>
        </div>

        <div class="btn-grid-2">
          <button class="m3-btn tonal sm" onclick="QRingUI.sugarLipidsAction('get')">Get SugarLipids Setting</button>
          <button class="m3-btn filled sm" onclick="QRingUI.sugarLipidsAction('set')">Set SugarLipids Setting</button>
        </div>
      </div>
    `;
  }

  // 14. EmotionActivity (Section 6.6: Emotion 0..10 decoding)
  function renderEmotionScreen() {
    const st = SDK.getState();
    const cfg = st.settings.emotion;
    const dayData = SDK.getHistory(uiState.selectedDayOffset);
    const curEm = SDK.EmotionMap[st.liveSensors.emotion] || SDK.EmotionMap[1];

    setTimeout(() => {
      drawChart('chart-emotion', {
        type: 'bar',
        points: dayData.emotion,
        color: curEm.color,
        minY: 0,
        maxY: 10
      });
    }, 20);

    return `
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('감정 상태 모니터링 (EmotionActivity 0..10)', 'Emotion Status Monitoring (0..10)')}</div>
            <div class="m3-card-subtitle">${t('EmotionSettingReq 및 시간별 감정 코드(0~10) 디코딩', 'Hourly Emotion Code (0..10) decoding via syncEmotionWithCallback')}</div>
          </div>
          <span class="m3-chip selected">${cfg.isEnable ? 'OPEN' : 'CLOSED'}</span>
        </div>

        <div class="metric-hero">
          <span class="metric-value" style="color:${curEm.color}">[${st.liveSensors.emotion}] ${uiState.lang === 'ko' ? curEm.ko : curEm.label}</span>
        </div>

        <div class="btn-grid-3">
          <button class="m3-btn tonal sm" onclick="QRingUI.emotionSettingAction('read')">Read Setting</button>
          <button class="m3-btn filled sm" onclick="QRingUI.emotionSettingAction('open')">Open Emotion</button>
          <button class="m3-btn outlined sm" onclick="QRingUI.emotionSettingAction('close')">Close Emotion</button>
        </div>
      </div>

      ${dayQueryControlsHtml('emotion')}

      <div class="m3-card">
        <div class="m3-card-title">${t('24시간 감정 코드 타임라인 (0: 미착용 ~ 10: 부정적)', '24-Hour Emotion Code Timeline (0..10)')}</div>
        <div class="chart-container">
          <canvas id="chart-emotion" class="chart-canvas"></canvas>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
          ${Object.entries(SDK.EmotionMap).map(([code, info]) =>
            `<span class="m3-chip" style="height:22px;font-size:10.5px;border-color:${info.color}">
              <b style="color:${info.color}">${code}</b>: ${uiState.lang === 'ko' ? info.ko : info.label}
            </span>`
          ).join('')}
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // SCREEN RENDERERS (Part B: Screens 15..27)
  // ==========================================================================

  // 15. TargetAndProfileActivity
  function renderTargetProfileScreen() {
    const st = SDK.getState();
    const tg = st.settings.target;
    const tf = st.settings.timeFormat;
    const pf = st.settings.profile;
    const pid = st.settings.phoneId;

    return `
      <!-- 1. Daily Target Settings -->
      <div class="m3-card">
        <div class="m3-card-title">
          <span class="material-symbols-rounded" style="color:var(--md-sys-color-primary)">flag</span>
          ${t('1. 일일 활동 목표 (TargetSettingReq)', '1. Daily Activity Goals (TargetSettingReq)')}
        </div>
        <div class="btn-grid-2">
          <div class="m3-field-group">
            <label class="m3-field-label">${t('목표 걸음수 (Steps)', 'Target Steps')}</label>
            <input id="inp-tg-steps" class="m3-input" type="number" value="${tg.steps}">
          </div>
          <div class="m3-field-group">
            <label class="m3-field-label">${t('목표 칼로리 (kcal)', 'Target Calorie (kcal)')}</label>
            <input id="inp-tg-cal" class="m3-input" type="number" value="${tg.calorie}">
          </div>
          <div class="m3-field-group">
            <label class="m3-field-label">${t('목표 거리 (m)', 'Target Distance (m)')}</label>
            <input id="inp-tg-dist" class="m3-input" type="number" value="${tg.distance}">
          </div>
          <div class="m3-field-group">
            <label class="m3-field-label">${t('운동/수면 목표(분)', 'Sport / Sleep (min)')}</label>
            <div class="btn-grid-2">
              <input id="inp-tg-sport" class="m3-input" type="number" value="${tg.sportMinute}" title="Sport min">
              <input id="inp-tg-sleep" class="m3-input" type="number" value="${tg.sleepMinute}" title="Sleep min">
            </div>
          </div>
        </div>
        <div class="btn-grid-2">
          <button class="m3-btn tonal sm" onclick="QRingUI.targetProfileAction('getTarget')">Get Target</button>
          <button class="m3-btn filled sm" onclick="QRingUI.targetProfileAction('setTarget')">Set Target</button>
        </div>
      </div>

      <!-- 2. Time Format (12h / 24h) -->
      <div class="m3-card">
        <div class="m3-card-header">
          <div class="m3-card-title">
            <span class="material-symbols-rounded" style="color:var(--md-sys-color-primary)">schedule</span>
            ${t('2. 시간 표시 형식 (TimeFormatReq)', '2. Time Format (12h / 24h)')}
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:12px;font-weight:600">${tf.is24Hour ? '24-Hour' : '12-Hour'}</span>
            ${m3SwitchHtml('sw-tf-24h', tf.is24Hour)}
          </div>
        </div>
        <div class="btn-grid-2">
          <button class="m3-btn tonal sm" onclick="QRingUI.targetProfileAction('getTimeFormat')">Get Time Format</button>
          <button class="m3-btn filled sm" onclick="QRingUI.targetProfileAction('setTimeFormat')">Set Time Format</button>
        </div>
      </div>

      <!-- 3. User Profile -->
      <div class="m3-card">
        <div class="m3-card-title">
          <span class="material-symbols-rounded" style="color:var(--md-sys-color-primary)">badge</span>
          ${t('3. 사용자 신체 프로필 (UserBeanReq)', '3. User Physical Profile (UserBeanReq)')}
        </div>
        <div class="btn-grid-2">
          <div class="m3-field-group">
            <label class="m3-field-label">${t('성별 (Sex)', 'Sex (1=Male, 2=Female)')}</label>
            <select id="inp-pf-sex" class="m3-select">
              <option value="1" ${pf.sex === 1 ? 'selected' : ''}>1 - Male</option>
              <option value="2" ${pf.sex === 2 ? 'selected' : ''}>2 - Female</option>
            </select>
          </div>
          <div class="m3-field-group">
            <label class="m3-field-label">${t('나이 (Age)', 'Age')}</label>
            <input id="inp-pf-age" class="m3-input" type="number" value="${pf.age}">
          </div>
          <div class="m3-field-group">
            <label class="m3-field-label">${t('신장 (cm) / 체중 (kg)', 'Height (cm) / Weight (kg)')}</label>
            <div class="btn-grid-2">
              <input id="inp-pf-height" class="m3-input" type="number" value="${pf.height}">
              <input id="inp-pf-weight" class="m3-input" type="number" value="${pf.weight}">
            </div>
          </div>
          <div class="m3-field-group">
            <label class="m3-field-label">${t('보폭(cm) / 심박경고(bpm)', 'StepLen(cm) / HR Warn')}</label>
            <div class="btn-grid-2">
              <input id="inp-pf-steplen" class="m3-input" type="number" value="${pf.stepLength}">
              <input id="inp-pf-warn" class="m3-input" type="number" value="${pf.rateWarn}">
            </div>
          </div>
        </div>
        <div class="btn-grid-2">
          <button class="m3-btn tonal sm" onclick="QRingUI.targetProfileAction('getProfile')">Get User Profile</button>
          <button class="m3-btn filled sm" onclick="QRingUI.targetProfileAction('setProfile')">Set User Profile</button>
        </div>
      </div>

      <!-- 4. Phone ID (6-byte identifier) -->
      <div class="m3-card">
        <div class="m3-card-title">
          <span class="material-symbols-rounded" style="color:var(--md-sys-color-primary)">smartphone</span>
          ${t('4. 휴대폰 고유 식별자 (PhoneIdReq — 6 Bytes)', '4. Phone Identifier (PhoneIdReq — 6 Bytes)')}
        </div>
        <input id="inp-phone-id" class="m3-input" type="text" maxlength="6" value="${pid.idString}">
        <div class="btn-grid-2">
          <button class="m3-btn tonal sm" onclick="QRingUI.targetProfileAction('getPhoneId')">Get Phone ID</button>
          <button class="m3-btn filled sm" onclick="QRingUI.targetProfileAction('setPhoneId')">Set Phone ID</button>
        </div>
      </div>
    `;
  }

  // 16. DisplayActivity
  function renderDisplayScreen() {
    const st = SDK.getState();
    const d = st.settings.display;
    const maxDial = st.capabilities.mMaxWatchFace || 6;

    return `
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('링 미니 OLED 디스플레이 제어 (DisplayActivity)', 'Ring OLED Display Settings (DisplayActivity)')}</div>
            <div class="m3-card-subtitle">${t('변경 즉시 좌측 가상 스마트링 OLED 화면에 반영됩니다.', 'Changes immediately reflect on the Virtual Smart Ring OLED screen.')}</div>
          </div>
        </div>

        <!-- 1. Brightness 1..5 -->
        <div class="m3-slider-row">
          <div class="m3-slider-header">
            <span>1. ${t('화면 밝기 (Brightness 1~5)', 'Display Brightness (1..5)')}</span>
            <span id="lbl-disp-bright">${d.brightness} / ${d.maxBrightness}</span>
          </div>
          <input id="inp-disp-bright" class="m3-slider" type="range" min="1" max="5" value="${d.brightness}" oninput="document.getElementById('lbl-disp-bright').textContent=this.value+' / 5'">
          <div class="btn-grid-2">
            <button class="m3-btn tonal sm" onclick="QRingUI.displayAction('getBrightness')">Get Brightness</button>
            <button class="m3-btn filled sm" onclick="QRingUI.displayAction('setBrightness')">Set Brightness</button>
          </div>
        </div>

        <hr style="border:none;border-top:1px solid var(--md-sys-color-outline-variant)">

        <!-- 2. Display Clock & 3. Orientation -->
        <div class="btn-grid-2">
          <div class="kv-box">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span class="kv-label">${t('시계 화면 표시 (Clock)', 'Display Clock')}</span>
              ${m3SwitchHtml('sw-disp-clock', d.clockEnabled)}
            </div>
            <div class="btn-grid-2">
              <button class="m3-btn tonal xs" onclick="QRingUI.displayAction('getClock')">Get</button>
              <button class="m3-btn filled xs" onclick="QRingUI.displayAction('setClock')">Set</button>
            </div>
          </div>

          <div class="kv-box">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span class="kv-label">${t('화면 180° 회전 (Flip)', 'Upside-Down Orientation')}</span>
              ${m3SwitchHtml('sw-disp-orient', d.orientation === 1)}
            </div>
            <div class="btn-grid-2">
              <button class="m3-btn tonal xs" onclick="QRingUI.displayAction('getOrientation')">Get</button>
              <button class="m3-btn filled xs" onclick="QRingUI.displayAction('setOrientation')">Set</button>
            </div>
          </div>
        </div>

        <!-- 4. Display Style, 5. Screen Timeout, 6. Watch Face Index -->
        <div class="btn-grid-3">
          <div class="m3-field-group">
            <label class="m3-field-label">${t('스타일 (Style)', 'Display Style')}</label>
            <select id="inp-disp-style" class="m3-select">
              ${[0, 1, 2, 3].map(s => `<option value="${s}" ${d.style === s ? 'selected' : ''}>Style #${s}</option>`).join('')}
            </select>
            <div class="btn-grid-2">
              <button class="m3-btn tonal xs" onclick="QRingUI.displayAction('getStyle')">Get</button>
              <button class="m3-btn filled xs" onclick="QRingUI.displayAction('setStyle')">Set</button>
            </div>
          </div>

          <div class="m3-field-group">
            <label class="m3-field-label">${t('켜짐 시간(초)', 'Screen Time (s)')}</label>
            <select id="inp-disp-time" class="m3-select">
              ${[5, 8, 10, 15, 30].map(s => `<option value="${s}" ${d.displayTimeSec === s ? 'selected' : ''}>${s}s</option>`).join('')}
            </select>
            <div class="btn-grid-2">
              <button class="m3-btn tonal xs" onclick="QRingUI.displayAction('getTime')">Get</button>
              <button class="m3-btn filled xs" onclick="QRingUI.displayAction('setTime')">Set</button>
            </div>
          </div>

          <div class="m3-field-group">
            <label class="m3-field-label">${t('워치페이스(Dial)', 'Dial Index')}</label>
            <select id="inp-disp-dial" class="m3-select">
              ${Array.from({ length: maxDial }, (_, i) => `<option value="${i}" ${d.dialIndex === i ? 'selected' : ''}>Dial #${i}</option>`).join('')}
            </select>
            <div class="btn-grid-2">
              <button class="m3-btn tonal xs" onclick="QRingUI.displayAction('getDial')">Get</button>
              <button class="m3-btn filled xs" onclick="QRingUI.displayAction('setDial')">Set</button>
            </div>
          </div>
        </div>

        <!-- 7. Palm Screen -->
        <div class="kv-box">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:13px;font-weight:600">${t('손바닥/손목 들어 화면 켜기 (Palm Screen)', 'Palm / Wrist Turn-On Screen')}</div>
              <div style="font-size:11px;color:var(--md-sys-color-on-surface-variant)">Hand: ${d.leftHand ? 'Left Hand' : 'Right Hand'}</div>
            </div>
            ${m3SwitchHtml('sw-disp-palm', d.palmScreen)}
          </div>
          <div class="btn-grid-2" style="margin-top:8px">
            <button class="m3-btn tonal sm" onclick="QRingUI.displayAction('getPalm')">Get Palm Screen</button>
            <button class="m3-btn filled sm" onclick="QRingUI.displayAction('setPalm')">Set Palm Screen</button>
          </div>
        </div>
      </div>
    `;
  }

  // 17. TouchGestureActivity (Section 10: AA, BB, CC, DD, EE protocol fields)
  function renderTouchGestureScreen() {
    const st = SDK.getState();
    const tg = st.settings.touchGesture;
    const cap = st.capabilities;

    return `
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('터치 및 제스처 프로토콜 설정 (TouchGestureActivity)', 'Touch & Gesture Protocol (Section 10)')}</div>
            <div class="m3-card-subtitle">
              Capabilities: supportTouch=<b>${cap.supportTouch}</b>, supportGesture=<b>${cap.supportGesture}</b>
            </div>
          </div>
        </div>

        <div class="btn-grid-2">
          <div class="m3-field-group">
            <label class="m3-field-label">BB: ${t('기능 타입 (Function Type)', 'Function Type (BB)')}</label>
            <select id="inp-tg-func" class="m3-select">
              <option value="1" ${tg.functionType === 1 ? 'selected' : ''}>1 - Gesture Control</option>
              <option value="2" ${tg.functionType === 2 ? 'selected' : ''}>2 - Touch Control</option>
              <option value="3" ${tg.functionType === 3 ? 'selected' : ''}>3 - RT11 Touch Chip</option>
            </select>
          </div>
          <div class="m3-field-group">
            <label class="m3-field-label">${t('활성화 스위치 (Enable)', 'Enable Touch/Gesture')}</label>
            <div style="display:flex;align-items:center;justify-content:space-between;height:38px">
              <span>${tg.enabled ? 'ENABLED' : 'DISABLED'}</span>
              ${m3SwitchHtml('sw-tg-enable', tg.enabled)}
            </div>
          </div>
        </div>

        <div class="m3-field-group">
          <label class="m3-field-label">CC: ${t('연동 앱 모드 (AppType 0..10)', 'Target Application Mode (CC: 0..10)')}</label>
          <select id="inp-tg-apptype" class="m3-select">
            ${SDK.TouchAppTypeCatalog.map(item =>
              `<option value="${item.code}" ${tg.appType === item.code ? 'selected' : ''}>
                [${item.code}] ${uiState.lang === 'ko' ? item.ko : item.name} (${item.name})
              </option>`
            ).join('')}
          </select>
        </div>

        <div class="btn-grid-3">
          <div class="m3-field-group">
            <label class="m3-field-label">DD: ${t('제스처 감도(1~10)', 'Strength (1..10)')}</label>
            <input id="inp-tg-str" class="m3-input" type="number" min="1" max="10" value="${tg.gestureStrength}">
          </div>
          <div class="m3-field-group">
            <label class="m3-field-label">DD: ${t('터치 슬립(1~5분)', 'Sleep Time (1..5m)')}</label>
            <input id="inp-tg-sleepm" class="m3-input" type="number" min="1" max="5" value="${tg.touchSleepMinutes}">
          </div>
          <div class="m3-field-group">
            <label class="m3-field-label">EE: ${t('RT11 칩 상태', 'RT11 Chip State')}</label>
            <select id="inp-tg-rt11" class="m3-select">
              <option value="0" ${tg.rt11State === 0 ? 'selected' : ''}>0 - Awake</option>
              <option value="1" ${tg.rt11State === 1 ? 'selected' : ''}>1 - Sleeping</option>
            </select>
          </div>
        </div>

        <div class="btn-grid-2">
          <button class="m3-btn tonal sm" onclick="QRingUI.touchGestureAction('read')">Read Touch/Gesture</button>
          <button class="m3-btn filled sm" onclick="QRingUI.touchGestureAction('write')">Set Touch/Gesture</button>
        </div>

        <div class="kv-box" style="background:var(--md-sys-color-secondary-container);color:var(--md-sys-color-on-secondary-container)">
          <div style="font-size:12px;font-weight:600">💡 ${t('시뮬레이션 팁', 'Interactive Simulation Tip')}</div>
          <div style="font-size:11.5px;margin-top:2px">
            ${t('AppType을 [3] 무슬림 타스비흐, [5] 카메라 촬영, 또는 [10] 연인 교감(SAI)으로 설정한 뒤 좌측 스마트링을 클릭(터치)해 보세요!', 'Set AppType to [3] Muslim Tasbih, [5] Take Photo, or [10] Lover Interaction, then click the Virtual Smart Ring on the left!')}
          </div>
        </div>
      </div>
    `;
  }

  // 18. DeviceActivity (Degree Switch, Battery Saving, Camera Control, Wear Calibration, High-Risk Ops)
  function renderDeviceScreen() {
    const st = SDK.getState();
    const dev = st.settings.device;
    const camActive = st.activeSession.cameraControlActive;

    return `
      <!-- Temperature Unit & Battery Saving -->
      <div class="m3-card">
        <div class="m3-card-title">${t('1. 온도 단위 및 절전 모드 (DeviceActivity)', '1. Degree Unit & Battery Saving')}</div>
        <div class="btn-grid-2">
          <div class="kv-box">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span class="kv-label">${t('섭씨(°C) 표시', 'Celsius (°C)')}</span>
              ${m3SwitchHtml('sw-dev-deg', dev.degreeCelsius)}
            </div>
            <div class="btn-grid-2">
              <button class="m3-btn tonal xs" onclick="QRingUI.deviceAction('getDegree')">Get</button>
              <button class="m3-btn filled xs" onclick="QRingUI.deviceAction('setDegree')">Set</button>
            </div>
          </div>

          <div class="kv-box">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span class="kv-label">${t('배터리 절전모드', 'Battery Saving')}</span>
              ${m3SwitchHtml('sw-dev-save', dev.batterySaving)}
            </div>
            <div class="btn-grid-2">
              <button class="m3-btn tonal xs" onclick="QRingUI.deviceAction('getSaving')">Get</button>
              <button class="m3-btn filled xs" onclick="QRingUI.deviceAction('setSaving')">Set</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Remote Camera Control (Section 13.2) -->
      <div class="m3-card ${camActive ? 'primary-tonal' : ''}">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">
              <span class="material-symbols-rounded">photo_camera</span>
              ${t('2. 원격 카메라 촬영 제어 (CameraReq 0x02)', '2. Remote Camera Control (CameraReq 0x02)')}
            </div>
            <div class="m3-card-subtitle" style="color:inherit;opacity:0.85">
              ${t('카메라 모드를 켠 상태에서 좌측 스마트링을 터치하면 CameraNotifyRsp(ACTION_TAKE_PHOTO) 셔터가 작동합니다.', 'Start Camera Control, then tap the Virtual Ring on the left to trigger CameraNotifyRsp shutter!')}
            </div>
          </div>
        </div>

        <div style="height:110px;border-radius:12px;background:#0F172A;color:#F8FAFC;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden;border:1px solid rgba(255,255,255,0.15)" id="camera-viewfinder">
          <span class="material-symbols-rounded" style="font-size:32px;opacity:0.8">${camActive ? 'center_focus_strong' : 'videocam_off'}</span>
          <div style="font-size:12px;font-weight:600;margin-top:4px">
            ${camActive ? t('카메라 뷰파인더 활성 — 링을 탭하여 촬영하세요!', 'Camera Viewfinder Active — Tap Ring to Shoot!') : t('카메라 제어 대기 중 (Camera Idle)', 'Camera Control Inactive')}
          </div>
          <div style="font-size:11px;font-family:var(--md-sys-typescale-mono);opacity:0.8;margin-top:2px">
            Photos Taken: ${uiState.photosTaken} ${uiState.lastPhotoTime ? `(Last: ${uiState.lastPhotoTime})` : ''}
          </div>
        </div>

        <div class="btn-grid-3">
          <button class="m3-btn filled sm" ${camActive ? 'disabled' : ''} onclick="QRingUI.cameraAction('start')">Start Camera</button>
          <button class="m3-btn error sm" ${!camActive ? 'disabled' : ''} onclick="QRingUI.cameraAction('stop')">Stop Camera</button>
          <button class="m3-btn tonal sm" onclick="QRingSDK.simulateRingTap()">
            <span class="material-symbols-rounded" style="font-size:16px">touch_app</span>
            ${t('링 터치 촬영', 'Tap Ring Shutter')}
          </button>
        </div>
      </div>

      <!-- 3. Wear Calibration (Opens RevisionActivity) -->
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('3. 착용 방향 2단계 교정 (RevisionActivity)', '3. 2-Step Wear Calibration (RevisionActivity)')}</div>
            <div class="m3-card-subtitle">${t('왼손/오른손 선택 후 제자리 교정(WearCalibrationReq)을 수행합니다.', 'Select Left/Right hand and perform in-place sensor calibration.')}</div>
          </div>
          <button class="m3-btn filled sm" onclick="QRingUI.navigateTo('revision')">
            ${t('착용 교정 열기', 'Wear Calibration')}
          </button>
        </div>
      </div>

      <!-- 4. High-Risk Device Operations (Section 7.2: Require Confirmation Dialog) -->
      <div class="m3-card outlined" style="border-color:var(--md-sys-color-error)">
        <div class="m3-card-title" style="color:var(--md-sys-color-error)">
          <span class="material-symbols-rounded">warning</span>
          ${t('4. 고위험 전원/초기화 제어 (확인 다이얼로그 필수)', '4. High-Risk Power & Reset Operations')}
        </div>
        <div class="btn-grid-3">
          <button class="m3-btn error sm" onclick="QRingUI.confirmHighRiskDeviceOp('shutdown')">Shut Down</button>
          <button class="m3-btn error sm" onclick="QRingUI.confirmHighRiskDeviceOp('reboot')">Reboot</button>
          <button class="m3-btn error sm" onclick="QRingUI.confirmHighRiskDeviceOp('reset')">Factory Reset</button>
        </div>
      </div>
    `;
  }

  // 19. RevisionActivity (2-Step Wear Calibration)
  function renderRevisionScreen() {
    const st = SDK.getState();
    const step = uiState.calibrationStep;

    return `
      <div class="m3-card">
        <div class="m3-card-title">
          <span class="material-symbols-rounded" style="color:var(--md-sys-color-primary)">compass_calibration</span>
          ${t('착용 교정 마법사 (RevisionActivity — WearCalibrationReq)', 'Wear Calibration Wizard (RevisionActivity)')}
        </div>
        <div class="m3-card-subtitle">
          ${step === 1
            ? t('1단계: 반지를 착용한 손(왼손/오른손)을 선택하고 Start Calibration을 누르세요.', 'Step 1: Select which hand wears the ring (Left/Right) and start calibration.')
            : t('2단계: 손등을 위로 향하고 정지 상태를 유지한 뒤 Complete Calibration을 누르세요.', 'Step 2: Keep your hand still in position and complete calibration.')}
        </div>

        <div class="kv-grid">
          <div class="kv-box" style="cursor:pointer;border-color:${st.wearHand === 'left' ? 'var(--md-sys-color-primary)' : ''}" onclick="QRingUI.selectWearHand('left')">
            <div class="kv-label">Option 1</div>
            <div class="kv-val">🤚 ${t('왼손 착용 (Left Hand)', 'Left Hand')} ${st.wearHand === 'left' ? '✓' : ''}</div>
          </div>
          <div class="kv-box" style="cursor:pointer;border-color:${st.wearHand === 'right' ? 'var(--md-sys-color-primary)' : ''}" onclick="QRingUI.selectWearHand('right')">
            <div class="kv-label">Option 2</div>
            <div class="kv-val">✋ ${t('오른손 착용 (Right Hand)', 'Right Hand')} ${st.wearHand === 'right' ? '✓' : ''}</div>
          </div>
        </div>

        <div class="btn-grid-2">
          <button class="m3-btn ${step === 1 ? 'filled' : 'tonal'} sm" onclick="QRingUI.runCalibrationStep(1)">
            1. Start Calibration (Step 1)
          </button>
          <button class="m3-btn ${step === 2 ? 'filled' : 'tonal'} sm" onclick="QRingUI.runCalibrationStep(2)">
            2. In-Place Complete (Step 2)
          </button>
        </div>
      </div>
    `;
  }

  // 20. NotificationAndReminderActivity
  function renderNotificationsScreen() {
    const st = SDK.getState();
    const nf = st.settings.notifications;

    return `
      <!-- 1. Smart Reminder & Message Notification Sub-Screen Links -->
      <div class="m3-nav-list">
        <div class="m3-list-item" onclick="QRingUI.navigateTo('smart_reminder')">
          <div class="m3-list-item-leading">
            <div class="m3-list-icon"><span class="material-symbols-rounded">alarm_on</span></div>
            <div class="m3-list-text">
              <div class="m3-list-title">${t('스마트 리마인더 (음수 8슬롯 · 오래앉기 · 알람 10개)', 'Smart Reminders (Drink 8-Slot, Sedentary, 10 Alarms)')}</div>
              <div class="m3-list-supporting">SmartReminderActivity -> DrinkWater / Sedentary / AlarmList</div>
            </div>
          </div>
          <span class="material-symbols-rounded">chevron_right</span>
        </div>

        <div class="m3-list-item" onclick="QRingUI.navigateTo('message_push')">
          <div class="m3-list-item-leading">
            <div class="m3-list-icon"><span class="material-symbols-rounded">chat</span></div>
            <div class="m3-list-text">
              <div class="m3-list-title">${t('메시지 알림 푸시 시뮬레이터 (MessagePushUtil)', 'Message Notification Push Simulator')}</div>
              <div class="m3-list-supporting">WeChat, WhatsApp, SMS, Line, Instagram, KakaoTalk -> PushMsgUintReq</div>
            </div>
          </div>
          <span class="material-symbols-rounded">chevron_right</span>
        </div>
      </div>

      <!-- 2. Do Not Disturb (DND) & Incoming Call Reminder -->
      <div class="m3-card">
        <div class="m3-card-title">${t('방해금지(DND) 및 전화/음악 알림 설정', 'Do Not Disturb (DND), Call & Music Switches')}</div>
        <div class="btn-grid-2">
          <div class="kv-box">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span class="kv-label">${t('방해금지 (DND)', 'Do Not Disturb')}</span>
              ${m3SwitchHtml('sw-nf-dnd', nf.dnd.enable, 'onchange="QRingUI.notifAction(\'setDnd\', this.checked)"')}
            </div>
            <div class="kv-val" style="font-size:11px;margin-top:4px">${nf.dnd.startHour}:00 ~ ${nf.dnd.endHour}:00</div>
          </div>
          <div class="kv-box">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span class="kv-label">${t('전화 수신 알림', 'Incoming Call Alert')}</span>
              ${m3SwitchHtml('sw-nf-call', nf.callReminder, 'onchange="QRingUI.notifAction(\'setCall\', this.checked)"')}
            </div>
            <div class="btn-grid-2" style="margin-top:6px">
              <button class="m3-btn filled xs" onclick="QRingSDK.MessagePushUtil.pushIncomingCall()">Ring Call</button>
              <button class="m3-btn tonal xs" onclick="QRingSDK.MessagePushUtil.pushCallAction()">Hang Up</button>
            </div>
          </div>
        </div>

        <div class="btn-grid-2">
          <button class="m3-btn tonal sm" onclick="QRingUI.notifAction('getMusic')">Get Music Switch (${nf.musicSwitch ? 'ON' : 'OFF'})</button>
          <button class="m3-btn outlined sm" onclick="QRingUI.notifAction('setMusic')">Toggle Music Switch</button>
        </div>
      </div>

      <!-- 3. ANCS (Apple/System Notification Center Service) -->
      <div class="m3-card">
        <div class="m3-card-title">${t('ANCS 앱별 알림 스위치 및 바인딩', 'ANCS App Switches & Binding')}</div>
        <div class="m3-chip-group">
          ${Object.entries(nf.ancsApps).map(([k, v]) =>
            `<span class="m3-chip ${v ? 'selected' : ''}" onclick="QRingUI.toggleAncsApp('${k}')">${k}: ${v ? 'ON' : 'OFF'}</span>`
          ).join('')}
        </div>
        <div class="btn-grid-3">
          <button class="m3-btn tonal sm" onclick="QRingUI.notifAction('getAncs')">Get ANCS</button>
          <button class="m3-btn filled sm" onclick="QRingUI.notifAction('setAncs')">Set ANCS</button>
          <button class="m3-btn outlined sm" onclick="QRingUI.notifAction('bindAncs')">Bind ANCS</button>
        </div>
      </div>

      <!-- 4. Notification Event Notify (0..9) + Custom Light & Vibration (Section 9.4) -->
      <div class="m3-card">
        <div class="m3-card-title">${t('커스텀 이벤트 · LED 조명 · 진동 알림 (Section 9.4)', 'Notification Event (0..9), Custom Light & Vibration')}</div>
        <div class="m3-field-group">
          <label class="m3-field-label">NotificationEventNotifyReq (eventType 0..9)</label>
          <div style="display:flex;gap:8px">
            <select id="sel-nf-event" class="m3-select" style="flex:1">
              <option value="0">0 - Turn off light</option>
              <option value="1" selected>1 - Green light stays on for 3s</option>
              <option value="2">2 - Red light stays on for 3s</option>
              <option value="3">3 - Vibrate once</option>
              <option value="4">4 - Green light + Vibrate once</option>
              <option value="5">5 - Red light + Vibrate once</option>
              <option value="6">6 - Green light flashes 3s</option>
              <option value="7">7 - Red light flashes 3s</option>
              <option value="8">8 - Green light flashes 3s + Vibrate</option>
              <option value="9">9 - Red light flashes 3s + Vibrate</option>
            </select>
            <button class="m3-btn filled sm" onclick="QRingUI.notifAction('sendEvent')">Trigger Event</button>
          </div>
        </div>

        <div class="btn-grid-2">
          <button class="m3-btn tonal sm" onclick="QRingUI.notifAction('customLight')">
            <span class="material-symbols-rounded" style="font-size:16px">flare</span>
            Custom Light Notify
          </button>
          <button class="m3-btn tonal sm" onclick="QRingUI.notifAction('customVib')">
            <span class="material-symbols-rounded" style="font-size:16px">vibration</span>
            Custom Vibration Notify
          </button>
        </div>
      </div>
    `;
  }

  // 21. SmartReminderActivity (Drink Water 8 slots + Sedentary + 10 Alarms)
  function renderSmartReminderScreen() {
    const st = SDK.getState();
    const nf = st.settings.notifications;
    const sed = nf.sedentary;

    return `
      <!-- Drink Water 8 Slots -->
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('1. 음수 리마인더 8슬롯 (DrinkWaterActivity)', '1. Drink Water Reminder (8 Independent Slots)')}</div>
            <div class="m3-card-subtitle">DrinkWaterReq(index 0..7) — Max 8 schedules</div>
          </div>
          <button class="m3-btn tonal sm" onclick="QRingUI.smartReminderAction('readDrink')">Read 8 Slots</button>
        </div>
        <div class="btn-grid-2">
          ${nf.drinkSlots.slice(0, 4).map(slot => `
            <div class="kv-box" style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <div class="kv-label">Slot #${slot.index} (${slot.interval}m)</div>
                <div class="kv-val">${slot.startHour}:00~${slot.endHour}:00</div>
              </div>
              ${m3SwitchHtml(`sw-drink-${slot.index}`, slot.enable, `onchange="QRingUI.toggleDrinkSlot(${slot.index}, this.checked)"`)}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Sedentary Reminder -->
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('2. 오래앉기 리마인더 (SedentaryReminderActivity)', '2. Sedentary Reminder (SedentaryReminderReq)')}</div>
            <div class="m3-card-subtitle">${sed.startHour}:00 ~ ${sed.endHour}:00 (Interval: ${sed.interval} min)</div>
          </div>
          ${m3SwitchHtml('sw-sed-enable', sed.enable, 'onchange="QRingUI.smartReminderAction(\'writeSedentary\', this.checked)"')}
        </div>
        <div class="btn-grid-2">
          <button class="m3-btn tonal sm" onclick="QRingUI.smartReminderAction('readSedentary')">Read Sedentary</button>
          <button class="m3-btn filled sm" onclick="QRingUI.smartReminderAction('writeSedentary', true)">Save Sedentary</button>
        </div>
      </div>

      <!-- Alarm List (Up to 10) -->
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('3. 스마트링 알람 리스트 (최대 10개)', '3. Ring Alarm List (Max 10 Alarms)')}</div>
            <div class="m3-card-subtitle">AlarmReq — Active alarms: ${nf.alarms.length} / 10</div>
          </div>
          <button class="m3-btn filled sm" onclick="QRingUI.smartReminderAction('addAlarm')">+ Add Alarm</button>
        </div>
        <div class="m3-nav-list">
          ${nf.alarms.map((al, idx) => `
            <div class="m3-list-item" style="cursor:default">
              <div class="m3-list-item-leading">
                <div class="m3-list-icon"><span class="material-symbols-rounded">alarm</span></div>
                <div class="m3-list-text">
                  <div class="m3-list-title">${String(al.hour).padStart(2, '0')}:${String(al.minute).padStart(2, '0')} — ${al.title}</div>
                  <div class="m3-list-supporting">Index #${al.index}</div>
                </div>
              </div>
              ${m3SwitchHtml(`sw-alarm-${idx}`, al.enable, `onchange="QRingUI.toggleAlarm(${idx}, this.checked)"`)}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 22. MessageNotificationActivity (MessagePushUtil Simulator)
  function renderMessagePushScreen() {
    const st = SDK.getState();
    const nf = st.settings.notifications;

    return `
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('메시지 알림 푸시 시뮬레이터 (MessagePushUtil)', 'MessagePushUtil Notification Simulator')}</div>
            <div class="m3-card-subtitle">${t('패키지명을 프로토콜 타입(0x01~0x0E)으로 자동 매핑하여 링으로 전송합니다.', 'Maps Android package name to PushMsgUintReq type (0x01..0x0E).')}</div>
          </div>
          ${m3SwitchHtml('sw-msg-master', nf.messageNotification, 'onchange="QRingUI.toggleMsgMaster(this.checked)"')}
        </div>

        <div class="m3-field-group">
          <label class="m3-field-label">${t('앱 패키지 선택 (App Package)', 'Select Source App Package')}</label>
          <select id="sel-msg-pkg" class="m3-select">
            <option value="com.tencent.mm">WeChat (com.tencent.mm -> 0x03)</option>
            <option value="com.whatsapp">WhatsApp (com.whatsapp -> 0x06)</option>
            <option value="com.android.mms">SMS (com.android.mms -> 0x01)</option>
            <option value="jp.naver.line.android">LINE (jp.naver.line.android -> 0x09)</option>
            <option value="com.instagram.android">Instagram (com.instagram.android -> 0x0B)</option>
            <option value="com.facebook.katana">Facebook (com.facebook.katana -> 0x05)</option>
            <option value="com.kakao.talk">KakaoTalk / Other (com.kakao.talk -> 0x0E)</option>
          </select>
        </div>

        <div class="btn-grid-2">
          <div class="m3-field-group">
            <label class="m3-field-label">${t('발신자 / 제목 (Title)', 'Notification Title')}</label>
            <input id="inp-msg-title" class="m3-input" type="text" value="Alice Kim">
          </div>
          <div class="m3-field-group">
            <label class="m3-field-label">${t('메시지 본문 (Content)', 'Message Content')}</label>
            <input id="inp-msg-body" class="m3-input" type="text" value="Meeting starts in 5 minutes!">
          </div>
        </div>

        <button class="m3-btn filled sm" onclick="QRingUI.sendSimulatedAppNotification()">
          <span class="material-symbols-rounded" style="font-size:16px">send</span>
          ${t('링으로 알림 푸시 전송 (pushNotification)', 'Push Notification to Ring')}
        </button>
      </div>
    `;
  }

  // 23. AdvancedSettingActivity
  function renderAdvancedScreen() {
    const st = SDK.getState();
    const adv = st.settings.advanced;
    const dayData = SDK.getHistory(0);

    return `
      <!-- Recording Files Entry Card -->
      <div class="m3-list-item" onclick="QRingUI.navigateTo('recording')" style="background:var(--md-sys-color-primary-container);color:var(--md-sys-color-on-primary-container)">
        <div class="m3-list-item-leading">
          <div class="m3-list-icon" style="background:var(--md-sys-color-primary);color:var(--md-sys-color-on-primary)">
            <span class="material-symbols-rounded">mic</span>
          </div>
          <div class="m3-list-text">
            <div class="m3-list-title" style="font-weight:700">${t('링 오디오 녹음 파일 관리 (RecordingActivity)', 'Ring Audio Recording Files (WAV / PCM Import)')}</div>
            <div class="m3-list-supporting" style="color:inherit;opacity:0.85">RecordingPcmImportManager — Sync, Import WAV/PCM, Play & Export (${st.recordings.length} files)</div>
          </div>
        </div>
        <span class="material-symbols-rounded">chevron_right</span>
      </div>

      <!-- Muslim Praise (Tasbih) Counter & 24h Sync -->
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('1. 무슬림 타스비흐 예배 카운터 (Muslim Tasbih)', '1. Muslim Praise Counter (Tasbih)')}</div>
            <div class="m3-card-subtitle">Live Count: <b>${st.liveSensors.tasbihCount}</b> / Target: <b>${adv.muslim.target}</b></div>
          </div>
          <span class="m3-chip selected">${adv.muslim.open ? 'OPEN' : 'CLOSED'}</span>
        </div>
        <div class="btn-grid-3">
          <button class="m3-btn tonal sm" onclick="QRingUI.advancedAction('openMuslim')">Open Muslim</button>
          <button class="m3-btn tonal sm" onclick="QRingUI.advancedAction('setMuslimTarget')">Set Target (33)</button>
          <button class="m3-btn filled sm" onclick="QRingUI.advancedAction('syncMuslim24h')">Sync 24h Data</button>
        </div>
        <div style="font-size:11px;font-family:var(--md-sys-typescale-mono);color:var(--md-sys-color-on-surface-variant)">
          Today 24h Hourly Counts: [${dayData.muslim24h.filter(v => v > 0).join(', ')}]
        </div>
      </div>

      <!-- AGPS, Intell, Device Support, Personalization, Contacts -->
      <div class="m3-card">
        <div class="m3-card-title">${t('2. AGPS · Intell · 기능 비트맵 · 연락처 동기화', '2. AGPS, Intell, Support Bitmap & Contacts')}</div>
        <div class="btn-grid-2">
          <button class="m3-btn tonal sm" onclick="QRingUI.advancedAction('getAgps')">Get AGPS (${adv.agpsEnabled ? 'ON' : 'OFF'})</button>
          <button class="m3-btn outlined sm" onclick="QRingUI.advancedAction('setAgps')">Set AGPS</button>
          <button class="m3-btn tonal sm" onclick="QRingUI.advancedAction('getIntell')">Get Intell (${adv.intellMinutes}m)</button>
          <button class="m3-btn outlined sm" onclick="QRingUI.advancedAction('setIntell')">Set Intell</button>
          <button class="m3-btn filled sm" onclick="QRingUI.advancedAction('getSupport')">Get Device Support</button>
          <button class="m3-btn tonal sm" onclick="QRingUI.advancedAction('getPersonalization')">Get Personalization</button>
        </div>
        <button class="m3-btn filled sm" onclick="QRingUI.advancedAction('syncContacts')">
          <span class="material-symbols-rounded" style="font-size:16px">contacts</span>
          ${t('비상 연락처 동기화 (Sync Contacts)', 'Sync Emergency Contacts')} (${adv.contactsSynced.length} contacts)
        </button>
      </div>

      <!-- One-Click Measurement & Default Values Switch -->
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('3. 원클릭 측정 및 기본값 스위치', '3. One-Click Measurement & Default Values Switch')}</div>
            <div class="m3-card-subtitle">AppStartOneKeyCheckReq & DefaultValuesSwitch (${adv.oneClickDefaultValuesSwitch ? 'ON' : 'OFF'})</div>
          </div>
          ${m3SwitchHtml('sw-adv-defval', adv.oneClickDefaultValuesSwitch, 'onchange="QRingUI.advancedAction(\'toggleDefVal\', this.checked)"')}
        </div>
        <button class="m3-btn ${st.activeSession.oneKeyMeasureActive ? 'error' : 'filled'} sm" onclick="QRingUI.toggleOneKeyMeasurement()">
          ${st.activeSession.oneKeyMeasureActive ? t('원클릭 측정 중지', 'Stop One-Click Measure') : t('원클릭 측정 시작', 'Start One-Click Measure')}
        </button>
      </div>
    `;
  }

  // 24. RecordingActivity (Section 13.5: WAV/PCM Import, Play, Export, Delete)
  function renderRecordingScreen() {
    const st = SDK.getState();
    const adv = st.settings.advanced;

    return `
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('링 녹음 파일 관리 (RecordingPcmImportManager)', 'Ring Audio Recordings (RecordingPcmImportManager)')}</div>
            <div class="m3-card-subtitle">${t('16kHz 16-bit Mono PCM 원시 오디오를 WAV 또는 PCM으로 가져와 재생/내보내기 합니다.', 'Import 16kHz 16-bit Mono ring recordings as WAV or PCM, play via WebAudio, or export.')}</div>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <div class="m3-chip-group">
            <span class="m3-chip ${adv.recordingExportFormat === 'wav' ? 'selected' : ''}" onclick="QRingUI.setRecordingFormat('wav')">WAV (RIFF Header)</span>
            <span class="m3-chip ${adv.recordingExportFormat === 'pcm' ? 'selected' : ''}" onclick="QRingUI.setRecordingFormat('pcm')">Raw PCM (.pcm)</span>
          </div>
          <div style="display:flex;gap:6px">
            <button class="m3-btn tonal sm" onclick="QRingUI.recordingAction('refresh')">Refresh</button>
            <button class="m3-btn filled sm" onclick="QRingUI.recordingAction('importAll')">Import All</button>
            <button class="m3-btn outlined sm" onclick="QRingSDK.triggerDeviceNotify(QRingSDK.DeviceNotifyType.TYPE_RECORD_FILE_COUNT)">+ Sim New Rec</button>
          </div>
        </div>
      </div>

      <div class="m3-nav-list">
        ${st.recordings.map(rec => `
          <div class="m3-card" style="padding:12px">
            <div class="m3-card-header">
              <div>
                <div class="m3-card-title">
                  <span class="material-symbols-rounded" style="color:var(--md-sys-color-primary)">graphic_eq</span>
                  ${rec.fileName} ${rec.localFormat ? `<span class="m3-chip selected" style="height:20px;font-size:10px">.${rec.localFormat.toUpperCase()}</span>` : ''}
                </div>
                <div class="m3-card-subtitle" style="font-family:var(--md-sys-typescale-mono)">
                  ${rec.createdAt} | ${rec.durationSec}s | ${(rec.sourceSizeBytes / 1024).toFixed(1)} KB | 16kHz Mono
                </div>
              </div>
              <div style="font-size:11px;font-weight:600;color:var(--md-sys-color-primary)">
                ${rec.onDevice ? 'Ring✓' : ''} ${rec.importedLocal ? 'Local✓' : ''}
              </div>
            </div>

            ${rec.importing || rec.importProgress > 0 ? `
              <div class="m3-progress-track">
                <div class="m3-progress-fill" style="width:${rec.importProgress}%"></div>
              </div>
            ` : ''}

            <div class="btn-row-wrap">
              <button class="m3-btn filled xs" onclick="QRingUI.importSingleRecording('${rec.id}')">
                Import (${adv.recordingExportFormat.toUpperCase()})
              </button>
              <button class="m3-btn tonal xs" ${!rec.importedLocal ? 'disabled' : ''} onclick="QRingUI.playSimulatedRecording('${rec.id}')">
                ▶ Play Audio
              </button>
              <button class="m3-btn outlined xs" ${!rec.importedLocal ? 'disabled' : ''} onclick="QRingUI.downloadRecordingFile('${rec.id}')">
                ⬇ Export File
              </button>
              <button class="m3-btn error xs" onclick="QRingUI.deleteRecording('${rec.id}')">
                Delete
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 25. OtaActivity (Firmware Upgrade via DfuHandle)
  function renderOtaScreen() {
    const st = SDK.getState();
    return `
      <div class="m3-card">
        <div class="m3-card-header">
          <div>
            <div class="m3-card-title">${t('펌웨어 업그레이드 (OtaActivity — DfuHandle)', 'Firmware Upgrade (OtaActivity — DfuHandle)')}</div>
            <div class="m3-card-subtitle">Current Firmware: <b>${st.firmwareVersion}</b> | Hardware: <b>${st.hardwareVersion}</b></div>
          </div>
        </div>

        <div class="m3-field-group">
          <label class="m3-field-label">${t('업그레이드할 펌웨어 바이너리(.bin) 선택', 'Select Firmware Package (.bin)')}</label>
          <select class="m3-select" onchange="QRingUI.onSelectOtaFile(this.value)">
            <option value="QRing_V3.02.85_prod.bin" ${uiState.otaSelectedFile === 'QRing_V3.02.85_prod.bin' ? 'selected' : ''}>QRing_V3.02.85_prod.bin (Recommended Release)</option>
            <option value="QRing_V3.03.00_beta.bin" ${uiState.otaSelectedFile === 'QRing_V3.03.00_beta.bin' ? 'selected' : ''}>QRing_V3.03.00_beta.bin (PPG Algorithm v2)</option>
          </select>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:12.5px">${t('버전 체크 무시하고 강제 업데이트 (Force Update)', 'Force Update (Bypass Version Check)')}</span>
          ${m3SwitchHtml('sw-ota-force', uiState.otaForceUpdate)}
        </div>

        <div class="m3-progress-track">
          <div class="m3-progress-fill" style="width:${uiState.otaProgress}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11.5px;font-family:var(--md-sys-typescale-mono)">
          <span>${uiState.otaStageText}</span>
          <span>${uiState.otaProgress}%</span>
        </div>

        <div class="btn-grid-2">
          <button class="m3-btn filled sm" ${uiState.otaRunning ? 'disabled' : ''} onclick="QRingUI.startOtaUpgrade()">
            <span class="material-symbols-rounded" style="font-size:16px">system_update</span>
            Start Upgrading
          </button>
          <button class="m3-btn error sm" ${!uiState.otaRunning ? 'disabled' : ''} onclick="QRingUI.stopOtaUpgrade()">
            Stop Upgrading
          </button>
        </div>
      </div>
    `;
  }

  // 26. ResourceUpdateActivity (FileHandle)
  function renderResourceScreen() {
    const st = SDK.getState();
    return `
      <div class="m3-card">
        <div class="m3-card-title">${t('디바이스 리소스 업데이트 (ResourceUpdateActivity)', 'Device Resource Update (FileHandle)')}</div>
        <div class="m3-card-subtitle">
          Device Resource Names: <code>[${st.deviceResources.join(', ')}]</code>
        </div>

        <div class="m3-field-group">
          <label class="m3-field-label">${t('전송할 리소스 파일 선택', 'Select Resource Binary')}</label>
          <select class="m3-select" onchange="QRingUI.onSelectResourceFile(this.value)">
            <option value="ring_ui_icons_v2.bin">ring_ui_icons_v2.bin (OLED Watchface Icons)</option>
            <option value="font_cjk_compact.bin">font_cjk_compact.bin (CJK Font Pack)</option>
            <option value="tasbih_anim_v1.bin">tasbih_anim_v1.bin (Tasbih Animation Pack)</option>
          </select>
        </div>

        <div class="m3-progress-track">
          <div class="m3-progress-fill" style="width:${uiState.resProgress}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11.5px;font-family:var(--md-sys-typescale-mono)">
          <span>${uiState.resStatusText}</span>
          <span>${uiState.resProgress}%</span>
        </div>

        <div class="btn-grid-2">
          <button class="m3-btn tonal sm" onclick="QRingUI.queryResourceNames()">Get Resource Names</button>
          <button class="m3-btn filled sm" ${uiState.resRunning ? 'disabled' : ''} onclick="QRingUI.startResourceUpdate()">Update Resource to Device</button>
        </div>
      </div>
    `;
  }

  // 27. DebugSettingsActivity & LogFilesActivity (Section 15: SdkLog)
  function renderDebugScreen() {
    const st = SDK.getState();
    const dbg = st.settings.debug;
    const fileLines = SDK.SdkLog.getFileLogLines();

    return `
      <div class="m3-card">
        <div class="m3-card-title">
          <span class="material-symbols-rounded" style="color:var(--md-sys-color-primary)">terminal</span>
          ${t('SDK 로그 제어 및 단일 파일 수집 (SdkLog — Section 15)', 'SDK Log Management (DebugSettingsActivity & LogFilesActivity)')}
        </div>
        <div class="m3-card-subtitle">
          ${t('콘솔 출력 스위치와 파일 수집 스위치는 서로 독립적으로 동작합니다.', 'Console log switch and single-file log collection switch operate independently.')}
        </div>

        <div class="kv-box" style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:13px;font-weight:600">1. Print Log (Console Logcat)</div>
            <div style="font-size:11px;color:var(--md-sys-color-on-surface-variant)">SdkLog.setConsoleLogEnabled(Boolean)</div>
          </div>
          ${m3SwitchHtml('sw-dbg-console', dbg.consoleLogEnabled, 'onchange="QRingSDK.SdkLog.setConsoleLogEnabled(this.checked)"')}
        </div>

        <div class="kv-box" style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:13px;font-weight:600">2. Collect log information to a file</div>
            <div style="font-size:11px;color:var(--md-sys-color-on-surface-variant)">SdkLog.setFileLogEnabled(Boolean)</div>
          </div>
          ${m3SwitchHtml('sw-dbg-file', dbg.fileLogEnabled, 'onchange="QRingSDK.SdkLog.setFileLogEnabled(this.checked)"')}
        </div>

        <div class="kv-box">
          <div class="kv-label">Single Log File Path (SdkLog.getLogFilePath())</div>
          <div class="kv-val" style="font-size:11px;word-break:break-all">${dbg.logFilePath}</div>
          <div style="font-size:11px;margin-top:4px;color:var(--md-sys-color-primary)">Collected Lines: ${fileLines.length} lines</div>
        </div>

        <div class="btn-grid-2">
          <button class="m3-btn error sm" onclick="QRingUI.confirmClearSdkLogs()">
            <span class="material-symbols-rounded" style="font-size:16px">delete_sweep</span>
            Clear file (Confirm)
          </button>
          <button class="m3-btn filled sm" onclick="QRingUI.exportSdkLogSnapshot()">
            <span class="material-symbols-rounded" style="font-size:16px">ios_share</span>
            Export file (.log Snapshot)
          </button>
        </div>
      </div>

      <div class="m3-card">
        <div class="m3-card-title">${t('단일 로그 파일(sdk.log) 실시간 미리보기', 'Single Log File (sdk.log) Live Preview')}</div>
        <div style="background:#0B0F19;color:#A7F3D0;font-family:var(--md-sys-typescale-mono);font-size:10.5px;padding:10px;border-radius:8px;max-height:180px;overflow-y:auto;line-height:1.45">
          ${fileLines.slice(0, 30).map(l => `<div>${l}</div>`).join('') || '<div>[Empty sdk.log]</div>'}
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // INTERACTIVE SDK ACTION HANDLERS
  // ==========================================================================

  // 1. BLE Scanner & Bind actions
  function toggleBleScan() {
    if (!SDK.getState().systemBluetoothEnabled) {
      SDK.checkBleReady('BleScannerHelper.scanDevice');
      return;
    }
    uiState.scanning = !uiState.scanning;
    if (uiState.scanning) {
      SDK.appendLog('REQ', 'BleScannerHelper.getInstance().scanDevice(context, uuid, ScanWrapperCallback)', 'BLE_SCAN_START', 'Scanning nearby QRing smart rings...');
      setTimeout(() => {
        uiState.scanning = false;
        SDK.appendLog('RSP', 'ScanWrapperCallback.onScanFinish()', 'BLE_SCAN_DONE', `Discovered ${uiState.discoveredDevices.length} QRing devices`);
        render();
      }, 1600);
    } else {
      SDK.appendLog('REQ', 'BleScannerHelper.getInstance().stopScan()', 'BLE_SCAN_STOP', 'Stopped BLE scan');
    }
    render();
  }

  function selectDeviceToConnect(mac, name) {
    SDK.connectDirectly(mac, name);
    toast(`${t('디바이스 연결 요청', 'Connecting to')} ${name} (${mac})`);
    setTimeout(() => navigateTo('home', false), 550);
  }

  // 2. 7-Day Batch Sync Task Chain (Section 5.1)
  function startBatchSync7Days() {
    if (!SDK.checkBleReady('HealthSettingsActivity.startBatchSyncData')) return;
    if (uiState.batchSync.running) return;

    const steps = [
      { name: '1/9 Today Steps (ReadDetailSportDataReq)', pct: 12 },
      { name: '2/9 7-Day Detailed Steps (dayOffset 0..6)', pct: 24 },
      { name: '3/9 7-Day Sleep Stages (LargeDataHandler.syncSleepList)', pct: 36 },
      { name: '4/9 7-Day Heart Rate (syncHeartRateData)', pct: 48 },
      { name: '5/9 7-Day Blood Pressure (ReadBpRsp)', pct: 60 },
      { name: '6/9 7-Day Blood Oxygen SpO2 (syncBloodOxygenWithCallback)', pct: 72 },
      { name: '7/9 7-Day HRV (syncHrvWithCallback)', pct: 82 },
      { name: '8/9 7-Day Pressure & Skin Temperature', pct: 92 },
      { name: '9/9 7-Day Workout Summaries (syncSportPlus)', pct: 100 }
    ];

    uiState.batchSync.running = true;
    uiState.batchSync.progress = 0;
    SDK.appendLog('BATCH', 'startBatchSyncData(7 Days)', 'TASK_CHAIN_START', 'Starting serial 9-stage 7-day health data synchronization...');
    render();

    steps.forEach((step, idx) => {
      setTimeout(() => {
        if (!SDK.getState().connected) {
          uiState.batchSync.running = false;
          render();
          return;
        }
        uiState.batchSync.progress = step.pct;
        uiState.batchSync.currentTask = step.name;
        SDK.appendLog('BATCH', `TaskChain Step ${step.name}`, `5A 43 0${idx + 1} 07`, `Synced 7 days for ${step.name} -> RESULT_OK`);
        if (idx === steps.length - 1) {
          uiState.batchSync.running = false;
          uiState.batchSync.currentTask = t('✓ 7일 전체 건강 데이터 동기화 완료!', '✓ All 7-Day Health Metrics Synced!');
          toast(t('7일 전체 건강 데이터 일괄 동기화가 완료되었습니다!', '7-Day Batch Health Sync Completed!'));
        }
        render();
      }, (idx + 1) * 280);
    });
  }

  // 3. Steps & Activity Score
  function syncTodaySteps() {
    SDK.executeCommand('CommandHandle.executeReqCmd(SimpleKeyReq(Constants.CMD_GET_STEP_TODAY))', SDK.Constants.CMD_GET_STEP_TODAY, [0x00], () => {
      const s = SDK.getState().liveSensors;
      return {
        rspClass: 'SportTotalakelRsp',
        rspBytes: [0x07, (s.todaySteps >> 8) & 0xFF, s.todaySteps & 0xFF],
        summary: `TotalSteps=${s.todaySteps}, Calorie=${s.todayCalorie} kcal, Distance=${s.todayDistance} m`
      };
    });
  }

  function openActivityScoreDialog() {
    showDialog({
      icon: 'calculate',
      title: t('활동 점수 계산 (ActivityScoreUtils)', 'Calculate Activity Score'),
      html: `
        <div class="m3-field-group">
          <label class="m3-field-label">${t('사용자 나이 입력 (Age)', 'Enter User Age')}</label>
          <input id="dlg-inp-age" class="m3-input" type="number" min="5" max="100" value="${uiState.lastStepAge}">
        </div>
      `,
      actions: [
        { label: t('취소', 'Cancel'), variant: 'text' },
        {
          label: t('점수 계산', 'Calculate'),
          variant: 'filled',
          onClick: () => {
            const ageVal = parseInt(document.getElementById('dlg-inp-age').value, 10) || 28;
            uiState.lastStepAge = ageVal;
            const steps = SDK.getState().liveSensors.todaySteps;
            uiState.lastStepScore = SDK.ActivityScoreUtils.calculateActivityScore(steps, ageVal);
            SDK.appendLog('RSP', `ActivityScoreUtils.calculateActivityScore(steps=${steps}, age=${ageVal})`, 'LOCAL_CALC', `Activity Score = ${uiState.lastStepScore}/100`);
            toast(`${t('활동 점수', 'Activity Score')}: ${uiState.lastStepScore} / 100`);
            render();
          }
        }
      ]
    });
  }

  // Generic Day/Range Query across all Health screens
  function onSelectDayOffset(val, metricKey) {
    uiState.selectedDayOffset = parseInt(val, 10) || 0;
    queryMetricData(metricKey, 'specific');
  }

  function queryMetricData(metricKey, mode) {
    if (mode === 'today') uiState.selectedDayOffset = 0;
    const dayOff = uiState.selectedDayOffset;
    const dayObj = SDK.getHistory(dayOff);
    const label = mode === 'range' ? `DayRange(0..2)` : `dayOffset=${dayOff} (${dayObj.dateStr})`;

    SDK.executeCommand(`Sync ${metricKey.toUpperCase()} [${label}]`, 0x43, [dayOff, mode === 'range' ? 0x03 : 0x01], () => ({
      rspClass: `Sync${metricKey.toUpperCase()}Callback`,
      rspBytes: [0x43, dayOff, 0x00],
      summary: `Synced ${metricKey} data for ${label} -> ${dayObj.dateStr}`
    }));
    render();
  }

  // 4. App-Started Sport Session & <60s Stop Confirmation Dialog (Section 13.1)
  function onSelectSportType(val) {
    SDK.getState().activeSession.sportType = parseInt(val, 10) || 4;
  }

  function startSportSession() {
    const st = SDK.getState();
    const sp = st.activeSession;
    const sportItem = SDK.SportTypeCatalog.find(s => s.code === sp.sportType) || SDK.SportTypeCatalog[0];

    SDK.executeCommand(`PhoneSportReq.getSportInstance(status=1, sportType=${sp.sportType})`, 0x77, [0x01, sp.sportType], () => {
      sp.sportActive = true;
      sp.sportPaused = false;
      sp.sportDurationSec = 0;
      sp.sportSteps = 0;
      sp.sportDistance = 0;
      sp.sportCalories = 0;
      SDK.pulseHardware({ led: 'green', vibrateMs: 400, oledMode: 'HR' });

      if (sportIntervalId) clearInterval(sportIntervalId);
      sportIntervalId = setInterval(() => {
        if (!st.connected || !sp.sportActive) {
          clearInterval(sportIntervalId);
          return;
        }
        sp.sportDurationSec += 2;
        sp.sportSteps += 5;
        sp.sportDistance += 4;
        sp.sportCalories = Math.max(1, Math.round(sp.sportDurationSec * 0.14));
        st.liveSensors.heartRate = Math.min(168, Math.max(108, st.liveSensors.heartRate + (Math.random() > 0.45 ? 2 : -1)));
        SDK.appendLog('NOTIFY', `DeviceSportNotifyListener.onDataResponse(0x78)`, `5A 78 ${sp.sportType.toString(16)} ${(sp.sportDurationSec & 0xFF).toString(16)}`, `Sport=${sportItem.name} | Time=${sp.sportDurationSec}s | HR=${st.liveSensors.heartRate} bpm | Steps=${sp.sportSteps} | Cal=${sp.sportCalories} kcal`);
        if (uiState.currentScreen === 'sport') render();
        SDK.emitStateChange();
      }, 2000);

      return {
        rspClass: 'PhoneSportRsp',
        rspBytes: [0x77, 0x01, 0x00],
        summary: `Started workout: [${sp.sportType}] ${sportItem.name}; 0x78 listener active`
      };
    });
  }

  function requestStopSportSession() {
    const sp = SDK.getState().activeSession;
    if (!sp.sportActive) return;

    if (sp.sportDurationSec < 60) {
      showDialog({
        icon: 'timer_off',
        title: t('운동 시간 1분 미만 확인', 'Workout Under 60 Seconds'),
        html: t(
          `현재 운동 시간이 <b>${sp.sportDurationSec}초</b>로 60초 미만입니다. 1분 미만의 운동은 링에 저장되지 않을 수 있습니다. 정말 종료하시겠습니까?`,
          `Current workout duration is <b>${sp.sportDurationSec}s</b> (< 60s). Workouts under 1 minute may not be saved by the ring. Stop anyway?`
        ),
        actions: [
          { label: t('계속 운동', 'Keep Exercising'), variant: 'text' },
          { label: t('종료 확인', 'Confirm Stop'), variant: 'error', onClick: () => finalizeStopSport() }
        ]
      });
    } else {
      finalizeStopSport();
    }
  }

  function finalizeStopSport() {
    const sp = SDK.getState().activeSession;
    if (sportIntervalId) clearInterval(sportIntervalId);
    SDK.executeCommand(`PhoneSportReq.getSportInstance(status=4, sportType=${sp.sportType})`, 0x77, [0x04, sp.sportType], () => {
      sp.sportActive = false;
      return {
        rspClass: 'PhoneSportRsp(STOP)',
        rspBytes: [0x77, 0x04, 0x00],
        summary: `Workout stopped at ${sp.sportDurationSec}s; syncing SportPlus summary...`
      };
    });
  }

  function syncSportRecords() {
    SDK.executeCommand('LargeDataHandler.getInstance().syncSportPlus(0)', 0x44, [0x00], () => ({
      rspClass: 'SportPlusHandleCallback',
      rspBytes: [0x44, 0x02, 0x00],
      summary: `Synced ${SDK.getHistory(0).sports.length} SportPlusEntity workout summaries`
    }));
  }

  // 5. Heart Rate, PPG & RRI
  function hrSettingAction(action) {
    const cfg = SDK.getState().settings.heartRate;
    const selEl = document.getElementById('sel-hr-interval');
    if (selEl && action === 'write') cfg.interval = parseInt(selEl.value, 10) || 30;
    if (action === 'open') cfg.isEnable = true;
    if (action === 'close') cfg.isEnable = false;

    SDK.executeCommand(`HeartRateSettingReq.${action}()`, SDK.Constants.CMD_SETTING_HR, [cfg.isEnable ? 1 : 0, cfg.interval], () => ({
      rspClass: 'HeartRateSettingRsp',
      rspBytes: [0x16, cfg.isEnable ? 1 : 0, cfg.interval],
      summary: `HeartRateSetting: isEnable=${cfg.isEnable}, interval=${cfg.interval} min`
    }));
  }

  function toggleSingleHrMeasure() {
    const sess = SDK.getState().activeSession;
    sess.singleHrMeasuring = !sess.singleHrMeasuring;
    SDK.executeCommand(`StartHeartRateReq.getSimpleReq(${sess.singleHrMeasuring})`, SDK.Constants.CMD_MANUAL_HR, [sess.singleHrMeasuring ? 1 : 0], () => {
      if (sess.singleHrMeasuring) SDK.pulseHardware({ led: 'green', vibrateMs: 250, oledMode: 'HR' });
      return {
        rspClass: 'StartHeartRateRsp',
        rspBytes: [0x1E, sess.singleHrMeasuring ? 1 : 0, SDK.getState().liveSensors.heartRate],
        summary: sess.singleHrMeasuring ? `Single HR measurement started -> ${SDK.getState().liveSensors.heartRate} bpm` : 'Single HR measurement stopped'
      };
    });
  }

  function toggleRealTimeHr() {
    const st = SDK.getState();
    const sess = st.activeSession;
    sess.realTimeHrActive = !sess.realTimeHrActive;
    if (sess.realTimeHrActive) {
      SDK.pulseHardware({ led: 'green', vibrateMs: 200, oledMode: 'HR' });
      SDK.appendLog('REQ', 'StartHeartRateReq.getRealtimeHeartRate(1) [Start]', '5A 1E 01 01', 'Started continuous real-time HR with 2-second keep-alive(status=2)');
      if (rtHrIntervalId) clearInterval(rtHrIntervalId);
      rtHrIntervalId = setInterval(() => {
        if (!st.connected || !sess.realTimeHrActive) {
          clearInterval(rtHrIntervalId);
          return;
        }
        SDK.appendLog('NOTIFY', 'StartHeartRateReq.getRealtimeHeartRate(2) [Continue]', `5A 1E 02 ${st.liveSensors.heartRate.toString(16)}`, `Real-Time HR = ${st.liveSensors.heartRate} bpm`);
      }, 2000);
    } else {
      if (rtHrIntervalId) clearInterval(rtHrIntervalId);
      SDK.appendLog('REQ', 'StartHeartRateReq.getRealtimeHeartRate(3) [Stop]', '5A 1E 03 00', 'Stopped continuous real-time HR polling');
    }
    render();
  }

  function toggleHrPpgStream() {
    const sess = SDK.getState().activeSession;
    sess.hrPpgStreaming = !sess.hrPpgStreaming;
    SDK.executeCommand(`StartHeartRatePpgReq(${sess.hrPpgStreaming})`, 0x31, [sess.hrPpgStreaming ? 1 : 0], () => {
      if (sess.hrPpgStreaming) {
        SDK.pulseHardware({ led: 'green', vibrateMs: 200 });
        startPpgOscilloscope('canvas-hr-ppg', 'hr');
      } else {
        stopPpgOscilloscope();
      }
      return {
        rspClass: 'HrPpgCallback',
        rspBytes: [0x31, sess.hrPpgStreaming ? 1 : 0],
        summary: sess.hrPpgStreaming ? 'Streaming raw Green PPG + XYZ Accelerometer @ 60fps' : 'Stopped raw HR PPG stream'
      };
    });
  }

  function toggleSpo2PpgStream() {
    const sess = SDK.getState().activeSession;
    sess.spo2PpgStreaming = !sess.spo2PpgStreaming;
    SDK.executeCommand(`StartBloodOxygenPpgReq(${sess.spo2PpgStreaming})`, 0x32, [sess.spo2PpgStreaming ? 1 : 0], () => {
      if (sess.spo2PpgStreaming) {
        SDK.pulseHardware({ led: 'red', vibrateMs: 200 });
        startPpgOscilloscope('canvas-spo2-ppg', 'spo2');
      } else {
        stopPpgOscilloscope();
      }
      return {
        rspClass: 'Spo2PpgCallback',
        rspBytes: [0x32, sess.spo2PpgStreaming ? 1 : 0],
        summary: sess.spo2PpgStreaming ? 'Streaming raw Red & Infrared PPG + XYZ @ 60fps' : 'Stopped raw SpO2 PPG stream'
      };
    });
  }

  function rriAction(act) {
    const st = SDK.getState();
    if (act === 'open' || act === 'close') {
      st.settings.rri.isEnable = act === 'open';
      SDK.executeCommand(`RriSettingReq(${st.settings.rri.isEnable})`, 0x37, [st.settings.rri.isEnable ? 1 : 0], () => ({
        rspClass: 'RriSettingRsp',
        rspBytes: [0x37, st.settings.rri.isEnable ? 1 : 0],
        summary: `RRI monitoring ${st.settings.rri.isEnable ? 'OPENED' : 'CLOSED'}`
      }));
    } else if (act === 'index') {
      uiState.rriBlockIndices = st.rriBlocks.map(b => b.index);
      SDK.executeCommand('LargeDataHandler.syncRriBlockIndexList(0)', 0x48, [0x00], () => ({
        rspClass: 'RriBlockIndexCallback',
        rspBytes: [0x48, 0x00, 0x01, 0x02],
        summary: `Available RRI Block Indices: [${uiState.rriBlockIndices.join(', ')}]`
      }));
    } else if (act === 'block') {
      uiState.rriSyncedSlots = [...st.rriBlocks];
      SDK.executeCommand('LargeDataHandler.syncRriBlockData(indices=[0,1,2])', 0x49, [0x00, 0x01, 0x02], () => ({
        rspClass: 'RriBlockDataCallback',
        rspBytes: [0x49, 0x03, 0x03, 0x34],
        summary: `Synced ${uiState.rriSyncedSlots.length} RRI blocks (latest RRI=${st.liveSensors.rriMs} ms)`
      }));
    }
  }

  // 6. Generic Metric Settings & Manual Measurements
  function genericMetricSetting(settingKey, reqClassName, action) {
    const cfg = SDK.getState().settings[settingKey];
    if (action === 'open' || action === 'write') cfg.isEnable = true;
    if (action === 'close') cfg.isEnable = false;

    SDK.executeCommand(`${reqClassName}.${action}()`, 0x35, [cfg.isEnable ? 1 : 0, cfg.interval || 30], () => ({
      rspClass: `${reqClassName.replace('Req', 'Rsp')}`,
      rspBytes: [0x35, cfg.isEnable ? 1 : 0],
      summary: `${settingKey}: isEnable=${cfg.isEnable}${cfg.interval ? ', interval=' + cfg.interval + 'm' : ''}`
    }));
  }

  function toggleManualMeasure(flagKey, label, typeCode) {
    const sess = SDK.getState().activeSession;
    sess[flagKey] = !sess[flagKey];
    SDK.executeCommand(`ManualMeasureReq(type=${label}, start=${sess[flagKey]})`, 0x69, [typeCode, sess[flagKey] ? 1 : 0], () => {
      if (sess[flagKey]) SDK.pulseHardware({ led: typeCode === 3 ? 'red' : 'green', vibrateMs: 250 });
      return {
        rspClass: `Manual${label}Rsp`,
        rspBytes: [0x69, typeCode, sess[flagKey] ? 1 : 0],
        summary: sess[flagKey] ? `Manual ${label} measurement started` : `Manual ${label} measurement stopped`
      };
    });
  }

  // PressureSettingDialog (Section 6.5: 15, 20, 30, 60 min interval selector)
  function openPressureSettingDialog() {
    const cfg = SDK.getState().settings.pressure;
    showDialog({
      icon: 'psychology',
      title: t('스트레스 측정 간격 설정 (PressureSettingDialog)', 'Pressure Setting Dialog'),
      html: `
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span>${t('자동 스트레스 모니터링 활성화', 'Enable Pressure Monitoring')}</span>
            <input type="checkbox" id="dlg-pr-enable" ${cfg.isEnable ? 'checked' : ''} style="width:18px;height:18px">
          </div>
          <div class="m3-field-group">
            <label class="m3-field-label">${t('측정 간격 선택 (15 / 20 / 30 / 60분)', 'Measurement Interval (min)')}</label>
            <select id="dlg-pr-interval" class="m3-select">
              ${[15, 20, 30, 60].map(v => `<option value="${v}" ${cfg.interval === v ? 'selected' : ''}>${v} minutes</option>`).join('')}
            </select>
          </div>
        </div>
      `,
      actions: [
        { label: t('취소', 'Cancel'), variant: 'text' },
        {
          label: t('저장 (Write)', 'Save'),
          variant: 'filled',
          onClick: () => {
            cfg.isEnable = document.getElementById('dlg-pr-enable').checked;
            cfg.interval = parseInt(document.getElementById('dlg-pr-interval').value, 10) || 30;
            SDK.executeCommand(`PressureSettingReq.getWriteInstance(enable=${cfg.isEnable}, interval=${cfg.interval})`, 0x36, [cfg.isEnable ? 1 : 0, cfg.interval], () => ({
              rspClass: 'PressureSettingRsp',
              rspBytes: [0x36, cfg.isEnable ? 1 : 0, cfg.interval],
              summary: `Updated Pressure Setting: isEnable=${cfg.isEnable}, interval=${cfg.interval} min`
            }));
          }
        }
      ]
    });
  }

  function syncManualTemperatureOnce() {
    SDK.executeCommand('FileHandle.getInstance().startObtainTemperatureOnce(0)', 0x39, [0x00], () => ({
      rspClass: 'ITemperatureCallback',
      rspBytes: [0x39, 0x01, 0x6D],
      summary: `Synced manual temperature records -> Latest=${SDK.getState().liveSensors.temperature.toFixed(1)} °C`
    }));
  }

  function sugarLipidsAction(act) {
    const cfg = SDK.getState().settings.sugarLipids;
    if (act === 'set') {
      const el = document.getElementById('sw-sugar-enable');
      if (el) cfg.isEnable = el.checked;
    }
    SDK.executeCommand(`SugarLipidsSettingReq.${act}(enable=${cfg.isEnable})`, 0x3A, [cfg.isEnable ? 1 : 0, cfg.interval], () => ({
      rspClass: 'SugarLipidsSettingRsp',
      rspBytes: [0x3A, cfg.isEnable ? 1 : 0],
      summary: `SugarLipids isEnable=${cfg.isEnable}, BloodGlucose=${SDK.getState().liveSensors.bloodGlucose} mmol/L`
    }));
  }

  function emotionSettingAction(act) {
    const cfg = SDK.getState().settings.emotion;
    if (act === 'open') cfg.isEnable = true;
    if (act === 'close') cfg.isEnable = false;
    SDK.executeCommand(`EmotionSettingReq.${act}()`, 0x3B, [cfg.isEnable ? 1 : 0], () => ({
      rspClass: 'EmotionSettingRsp',
      rspBytes: [0x3B, cfg.isEnable ? 1 : 0],
      summary: `Emotion monitoring: isEnable=${cfg.isEnable}`
    }));
  }

  // 7. Target & Profile
  function targetProfileAction(act) {
    const st = SDK.getState();
    if (act === 'setTarget') {
      st.settings.target.steps = parseInt(document.getElementById('inp-tg-steps').value, 10) || 8000;
      st.settings.target.calorie = parseInt(document.getElementById('inp-tg-cal').value, 10) || 350;
      st.settings.target.distance = parseInt(document.getElementById('inp-tg-dist').value, 10) || 5000;
      st.settings.target.sportMinute = parseInt(document.getElementById('inp-tg-sport').value, 10) || 30;
      st.settings.target.sleepMinute = parseInt(document.getElementById('inp-tg-sleep').value, 10) || 480;
    } else if (act === 'setTimeFormat') {
      st.settings.timeFormat.is24Hour = document.getElementById('sw-tf-24h').checked;
    } else if (act === 'setProfile') {
      st.settings.profile.sex = parseInt(document.getElementById('inp-pf-sex').value, 10) || 1;
      st.settings.profile.age = parseInt(document.getElementById('inp-pf-age').value, 10) || 28;
      st.settings.profile.height = parseInt(document.getElementById('inp-pf-height').value, 10) || 175;
      st.settings.profile.weight = parseInt(document.getElementById('inp-pf-weight').value, 10) || 68;
      st.settings.profile.stepLength = parseInt(document.getElementById('inp-pf-steplen').value, 10) || 72;
      st.settings.profile.rateWarn = parseInt(document.getElementById('inp-pf-warn').value, 10) || 165;
    } else if (act === 'setPhoneId') {
      st.settings.phoneId.idString = (document.getElementById('inp-phone-id').value || 'QR9081').slice(0, 6);
    }

    SDK.executeCommand(`TargetAndProfile.${act}()`, 0x21, [0x01], () => ({
      rspClass: `${act}Rsp`,
      rspBytes: [0x21, 0x00],
      summary: `Executed ${act} successfully -> ${JSON.stringify(
        act.includes('Target') ? st.settings.target :
        act.includes('Time') ? st.settings.timeFormat :
        act.includes('Profile') ? st.settings.profile : st.settings.phoneId
      )}`
    }));
  }

  // 8. Display Settings
  function displayAction(act) {
    const d = SDK.getState().settings.display;
    if (act === 'setBrightness') d.brightness = parseInt(document.getElementById('inp-disp-bright').value, 10) || 4;
    if (act === 'setClock') d.clockEnabled = document.getElementById('sw-disp-clock').checked;
    if (act === 'setOrientation') d.orientation = document.getElementById('sw-disp-orient').checked ? 1 : 0;
    if (act === 'setStyle') d.style = parseInt(document.getElementById('inp-disp-style').value, 10) || 0;
    if (act === 'setTime') d.displayTimeSec = parseInt(document.getElementById('inp-disp-time').value, 10) || 8;
    if (act === 'setDial') d.dialIndex = parseInt(document.getElementById('inp-disp-dial').value, 10) || 0;
    if (act === 'setPalm') d.palmScreen = document.getElementById('sw-disp-palm').checked;

    SDK.executeCommand(`DisplayActivity.${act}()`, 0x28, [d.brightness, d.orientation, d.dialIndex], () => ({
      rspClass: 'DisplaySettingRsp',
      rspBytes: [0x28, d.brightness, d.orientation],
      summary: `Display updated: brightness=${d.brightness}/5, clock=${d.clockEnabled}, orient=${d.orientation}, style=${d.style}, time=${d.displayTimeSec}s, dial=#${d.dialIndex}, palm=${d.palmScreen}`
    }));
  }

  // 9. Touch & Gesture Settings (Section 10)
  function touchGestureAction(act) {
    const st = SDK.getState();
    const tg = st.settings.touchGesture;
    if (!st.capabilities.supportTouch && !st.capabilities.supportGesture) {
      toast(t('현재 디바이스 기능 비트맵에서 Touch/Gesture가 비활성화되어 있습니다.', 'Device does not support Touch/Gesture in capability bitmap!'));
      SDK.appendLog('ERROR', `TouchGestureReq.${act}()`, '--', 'Blocked: supportTouch=false && supportGesture=false');
      return;
    }

    if (act === 'write') {
      tg.functionType = parseInt(document.getElementById('inp-tg-func').value, 10) || 2;
      tg.enabled = document.getElementById('sw-tg-enable').checked;
      tg.appType = parseInt(document.getElementById('inp-tg-apptype').value, 10) || 0;
      tg.gestureStrength = parseInt(document.getElementById('inp-tg-str').value, 10) || 6;
      tg.touchSleepMinutes = parseInt(document.getElementById('inp-tg-sleepm').value, 10) || 3;
      tg.rt11State = parseInt(document.getElementById('inp-tg-rt11').value, 10) || 0;
    }

    const appName = (SDK.TouchAppTypeCatalog.find(a => a.code === tg.appType) || {}).name || 'None';
    SDK.executeCommand(`TouchGestureReq(AA=${act === 'read' ? 1 : 2}, BB=${tg.functionType}, CC=${tg.appType})`, 0x3D, [act === 'read' ? 1 : 2, tg.functionType, tg.enabled ? 1 : 0, tg.appType], () => ({
      rspClass: 'TouchGestureRsp',
      rspBytes: [0x3D, tg.functionType, tg.enabled ? 1 : 0, tg.appType, tg.gestureStrength],
      summary: `Touch/Gesture [${act.toUpperCase()}]: BB=${tg.functionType}, Enable=${tg.enabled}, CC=${tg.appType} (${appName}), Strength=${tg.gestureStrength}, Sleep=${tg.touchSleepMinutes}m`
    }));
  }

  // 10. Device Control, Camera, Wear Calibration, High-Risk Ops
  function deviceAction(act) {
    const dev = SDK.getState().settings.device;
    if (act === 'setDegree') dev.degreeCelsius = document.getElementById('sw-dev-deg').checked;
    if (act === 'setSaving') dev.batterySaving = document.getElementById('sw-dev-save').checked;

    SDK.executeCommand(`DeviceActivity.${act}()`, 0x2B, [dev.degreeCelsius ? 0 : 1, dev.batterySaving ? 1 : 0], () => ({
      rspClass: 'DeviceSettingRsp',
      rspBytes: [0x2B, 0x00],
      summary: `Device Setting: Celsius=${dev.degreeCelsius}, BatterySaving=${dev.batterySaving}`
    }));
  }

  function cameraAction(mode) {
    const sess = SDK.getState().activeSession;
    const isStart = mode === 'start';
    SDK.executeCommand(`CameraReq(${isStart ? 'ACTION_INTO_CAMARA_UI=1' : 'ACTION_FINISH_CAMARA_UI=0'})`, SDK.Constants.CMD_TAKING_PICTURE, [isStart ? 1 : 0], () => {
      sess.cameraControlActive = isStart;
      if (isStart) SDK.pulseHardware({ oledMode: 'CAMERA', vibrateMs: 150 });
      return {
        rspClass: 'CameraRsp',
        rspBytes: [0x02, isStart ? 1 : 0],
        summary: isStart ? 'Ring entered Remote Camera Shutter mode (tap ring to shoot)' : 'Ring exited Remote Camera Shutter mode'
      };
    });
  }

  function selectWearHand(hand) {
    SDK.getState().wearHand = hand;
    SDK.getState().settings.display.leftHand = hand === 'left';
    render();
  }

  function runCalibrationStep(step) {
    uiState.calibrationStep = step;
    const handByte = SDK.getState().wearHand === 'left' ? 1 : 2;
    SDK.executeCommand(`WearCalibrationReq(step=${step}, hand=${SDK.getState().wearHand})`, 0x2F, [step, handByte], () => {
      SDK.pulseHardware({ led: 'green', vibrateMs: 300 });
      if (step === 1) uiState.calibrationStep = 2;
      else toast(t('착용 방향 2단계 교정이 성공적으로 완료되었습니다!', '2-Step Wear Calibration Completed!'));
      return {
        rspClass: 'WearCalibrationRsp',
        rspBytes: [0x2F, step, 0x00],
        summary: `Wear calibration Step ${step} (${SDK.getState().wearHand} hand) -> status=SUCCESS(0)`
      };
    });
  }

  function confirmHighRiskDeviceOp(opType) {
    const labels = {
      shutdown: { title: 'Shut Down Device', ko: '스마트링 전원을 완전히 종료하시겠습니까?', en: 'Are you sure you want to shut down the smart ring?' },
      reboot: { title: 'Reboot Device', ko: '스마트링을 재부팅하시겠습니까?', en: 'Are you sure you want to reboot the smart ring?' },
      reset: { title: 'Restore Factory Settings', ko: '공장 초기화를 실행하시겠습니까? 링 내부의 모든 기록이 초기화됩니다.', en: 'Restore factory settings? All data on the ring will be erased.' }
    };
    const info = labels[opType];
    showDialog({
      icon: 'warning',
      title: info.title,
      html: t(info.ko, info.en),
      actions: [
        { label: t('취소', 'Cancel'), variant: 'text' },
        {
          label: info.title,
          variant: 'error',
          onClick: () => {
            SDK.executeCommand(`HighRiskCommand.${opType.toUpperCase()}()`, 0x08, [opType === 'shutdown' ? 1 : opType === 'reboot' ? 2 : 3], () => {
              if (opType === 'shutdown') {
                setTimeout(() => SDK.disconnect(), 250);
              }
              return {
                rspClass: 'SystemPowerRsp',
                rspBytes: [0x08, 0x00],
                summary: `Executed ${info.title} command on ring`
              };
            });
          }
        }
      ]
    });
  }

  // 11. Notifications, Smart Reminders & Message Push
  function notifAction(act, val) {
    const nf = SDK.getState().settings.notifications;
    if (act === 'setDnd') nf.dnd.enable = !!val;
    if (act === 'setCall') nf.callReminder = !!val;
    if (act === 'setMusic') nf.musicSwitch = !nf.musicSwitch;

    if (act === 'sendEvent') {
      const evType = parseInt(document.getElementById('sel-nf-event').value, 10) || 1;
      const useRed = [2, 5, 7, 9].includes(evType);
      const useGreen = [1, 4, 6, 8].includes(evType);
      const useVib = [3, 4, 5, 8, 9].includes(evType);
      SDK.executeCommand(`NotificationEventNotifyReq(eventType=${evType})`, 0x74, [evType], () => {
        SDK.pulseHardware({ led: useRed ? 'red' : useGreen ? 'green' : null, vibrateMs: useVib ? 800 : 0 });
        return {
          rspClass: 'NotificationEventNotifyRsp',
          rspBytes: [0x74, evType, 0x00],
          summary: `Triggered NotificationEventNotifyReq(eventType=${evType})`
        };
      });
      return;
    }

    if (act === 'customLight') {
      SDK.executeCommand('CustomLightNotifyReq(color=GREEN_RED_FLASH, duration=3s)', 0x75, [0x03, 0x03, 0x02], () => {
        SDK.pulseHardware({ led: 'green', vibrateMs: 0 });
        return {
          rspClass: 'CustomLightNotifyRsp',
          rspBytes: [0x75, 0x00],
          summary: 'Custom LED Light Notification flashed on ring'
        };
      });
      return;
    }

    if (act === 'customVib') {
      SDK.executeCommand('CustomVibrationNotifyReq(cycles=3, strength=85%)', 0x76, [0x03, 0x55], () => {
        SDK.pulseHardware({ vibrateMs: 1100 });
        return {
          rspClass: 'CustomVibrationNotifyRsp',
          rspBytes: [0x76, 0x00],
          summary: 'Custom Vibration Notification executed on ring'
        };
      });
      return;
    }

    SDK.executeCommand(`NotificationSetting.${act}()`, 0x71, [0x01], () => ({
      rspClass: 'NotificationSettingRsp',
      rspBytes: [0x71, 0x00],
      summary: `Notification action [${act}] completed`
    }));
  }

  function toggleAncsApp(appKey) {
    const apps = SDK.getState().settings.notifications.ancsApps;
    apps[appKey] = !apps[appKey];
    render();
  }

  function smartReminderAction(act, val) {
    const nf = SDK.getState().settings.notifications;
    if (act === 'writeSedentary') nf.sedentary.enable = !!val;
    if (act === 'addAlarm') {
      if (nf.alarms.length >= 10) {
        toast(t('알람은 최대 10개까지만 추가할 수 있습니다.', 'Maximum 10 alarms allowed'));
        return;
      }
      nf.alarms.push({
        index: nf.alarms.length,
        enable: true,
        hour: 9 + nf.alarms.length,
        minute: 15,
        repeatMask: 0x7F,
        title: `Alarm #${nf.alarms.length + 1}`
      });
    }
    SDK.executeCommand(`SmartReminder.${act}()`, 0x26, [0x01], () => ({
      rspClass: 'SmartReminderRsp',
      rspBytes: [0x26, 0x00],
      summary: `SmartReminder [${act}] synced with ring`
    }));
  }

  function toggleDrinkSlot(idx, checked) {
    const slot = SDK.getState().settings.notifications.drinkSlots[idx];
    if (slot) slot.enable = !!checked;
    SDK.executeCommand(`DrinkWaterReq.writeSlot(index=${idx}, enable=${checked})`, 0x27, [idx, checked ? 1 : 0], () => ({
      rspClass: 'DrinkWaterRsp',
      rspBytes: [0x27, idx, 0x00],
      summary: `Drink Water Slot #${idx} enable=${checked}`
    }));
  }

  function toggleAlarm(idx, checked) {
    const al = SDK.getState().settings.notifications.alarms[idx];
    if (al) al.enable = !!checked;
    SDK.executeCommand(`AlarmReq.write(index=${idx}, enable=${checked})`, 0x25, [idx, checked ? 1 : 0], () => ({
      rspClass: 'AlarmRsp',
      rspBytes: [0x25, idx, 0x00],
      summary: `Alarm #${idx} (${al ? al.title : ''}) enable=${checked}`
    }));
  }

  function toggleMsgMaster(checked) {
    SDK.getState().settings.notifications.messageNotification = !!checked;
    render();
  }

  function sendSimulatedAppNotification() {
    const pkg = document.getElementById('sel-msg-pkg').value;
    const title = document.getElementById('inp-msg-title').value;
    const body = document.getElementById('inp-msg-body').value;
    const ok = SDK.MessagePushUtil.pushNotification(pkg, title, body);
    if (ok) {
      toast(`${t('푸시 전송 완료', 'Pushed to Ring')}: [${pkg}] ${title}`);
    } else {
      toast(t('전송 무시됨 (스위치 꺼짐, DND 시간대, 또는 미연결)', 'Push ignored (Switch OFF, DND active, or Disconnected)'));
    }
  }

  // 12. Advanced Settings, One-Click Measure & Audio Recordings
  function toggleOneKeyMeasurement() {
    const st = SDK.getState();
    const sess = st.activeSession;
    sess.oneKeyMeasureActive = !sess.oneKeyMeasureActive;

    SDK.executeCommand(`AppStartOneKeyCheckReq(${sess.oneKeyMeasureActive})`, 0x6A, [sess.oneKeyMeasureActive ? 1 : 0], () => {
      if (sess.oneKeyMeasureActive) {
        SDK.pulseHardware({ led: 'green', vibrateMs: 500, oledMode: 'HR' });
        setTimeout(() => {
          if (!sess.oneKeyMeasureActive) return;
          sess.oneKeyMeasureActive = false;
          const s = st.liveSensors;
          SDK.appendLog('NOTIFY', 'OneKeyCheckCompleteRsp', '5A 6A 00 4A 76 4E 62', `One-Click Result: HR=${s.heartRate} bpm, BP=${s.sbp}/${s.dbp} mmHg, SpO2=${s.spo2}%, Stress=${s.pressure}`);
          toast(`One-Click Complete: ♥${s.heartRate}bpm | BP ${s.sbp}/${s.dbp} | SpO₂ ${s.spo2}%`);
          render();
        }, 2800);
      }
      return {
        rspClass: 'AppStartOneKeyCheckRsp',
        rspBytes: [0x6A, sess.oneKeyMeasureActive ? 1 : 0],
        summary: sess.oneKeyMeasureActive ? 'Started One-Click Measurement (HR + BP + SpO2 + Stress)...' : 'Stopped One-Click Measurement'
      };
    });
  }

  function advancedAction(act, val) {
    const st = SDK.getState();
    const adv = st.settings.advanced;
    if (act === 'openMuslim') adv.muslim.open = !adv.muslim.open;
    if (act === 'setMuslimTarget') adv.muslim.target = 33;
    if (act === 'setAgps') adv.agpsEnabled = !adv.agpsEnabled;
    if (act === 'setIntell') adv.intellMinutes = adv.intellMinutes === 3 ? 5 : 3;
    if (act === 'toggleDefVal') adv.oneClickDefaultValuesSwitch = !!val;

    SDK.executeCommand(`AdvancedSetting.${act}()`, 0x3C, [0x01], () => ({
      rspClass: `${act}Rsp`,
      rspBytes: [0x3C, 0x00],
      summary: `Executed AdvancedSetting.${act}() -> OK`
    }));
  }

  function setRecordingFormat(fmt) {
    SDK.getState().settings.advanced.recordingExportFormat = fmt;
    render();
  }

  function recordingAction(act) {
    const st = SDK.getState();
    if (act === 'refresh') {
      SDK.executeCommand('LargeDataHandler.syncRecordFileList()', 0xD0, [0x00], () => ({
        rspClass: 'RecordFileListCallback',
        rspBytes: [0xD0, st.recordings.length],
        summary: `Synced ${st.recordings.length} audio recording entries from ring flash`
      }));
    } else if (act === 'importAll') {
      st.recordings.forEach((r, idx) => {
        setTimeout(() => importSingleRecording(r.id), idx * 400);
      });
    }
  }

  function importSingleRecording(recId) {
    if (!SDK.checkBleReady('RecordingPcmImportManager.importRecording')) return;
    const st = SDK.getState();
    const rec = st.recordings.find(r => r.id === recId);
    if (!rec || rec.importing) return;

    const fmt = st.settings.advanced.recordingExportFormat;
    rec.importing = true;
    rec.importProgress = 15;
    SDK.appendLog('REQ', `RecordingPcmImportManager.startImport("${rec.fileName}", format="${fmt}")`, '5A D2 01', `Importing 16kHz 16-bit Mono PCM packets from ring...`);
    render();

    const timer = setInterval(() => {
      rec.importProgress = Math.min(100, rec.importProgress + 30);
      if (rec.importProgress >= 100) {
        clearInterval(timer);
        rec.importing = false;
        rec.importedLocal = true;
        rec.localFormat = fmt;
        rec.localPath = `/storage/emulated/0/Android/data/com.qcwireless.qring/files/recordings/${rec.fileName}.${fmt}`;
        SDK.appendLog('RSP', `RecordingPcmImportManager.onComplete("${rec.fileName}.${fmt}")`, '5A D2 64 00', `Saved to ${rec.localPath}`);
        toast(`${t('오디오 가져오기 완료', 'Imported')}: ${rec.fileName}.${fmt}`);
      }
      render();
    }, 220);
  }

  function deleteRecording(recId) {
    const st = SDK.getState();
    const idx = st.recordings.findIndex(r => r.id === recId);
    if (idx === -1) return;
    const removed = st.recordings.splice(idx, 1)[0];
    SDK.appendLog('REQ', `deleteRecordFile("${removed.fileName}")`, '5A D3 01', `Deleted ${removed.fileName} from device & local storage`);
    render();
  }

  // 13. OTA Firmware Upgrade (Section 14.1: Type 1 -> 2 -> 3 -> 4)
  function onSelectOtaFile(val) {
    uiState.otaSelectedFile = val;
  }

  function startOtaUpgrade() {
    if (!SDK.checkBleReady('DfuHandle.startUpgrade')) return;
    if (uiState.otaRunning) return;
    uiState.otaRunning = true;
    uiState.otaProgress = 0;

    const stages = [
      { pct: 15, stage: 'Type 1: Device Preparation & DFU Bootloader Entry' },
      { pct: 45, stage: 'Type 2: Firmware Packet Transmission (Block #1..#128)' },
      { pct: 78, stage: 'Type 2: Firmware Packet Transmission (Block #129..#256)' },
      { pct: 92, stage: 'Type 3: Post-Transmission CRC32 Verification' },
      { pct: 100, stage: 'Type 4: Upgrade Complete — Ring Rebooting into New Firmware' }
    ];

    SDK.appendLog('REQ', `DfuHandle.start("${uiState.otaSelectedFile}")`, 'DFU_INIT', 'Starting Nordic/QCWares DFU firmware upgrade...');
    render();

    stages.forEach((stItem, idx) => {
      setTimeout(() => {
        if (!uiState.otaRunning) return;
        uiState.otaProgress = stItem.pct;
        uiState.otaStageText = stItem.stage;
        SDK.appendLog('NOTIFY', `IDfuCallback.onProgress(${stItem.pct}%)`, `DFU_STAGE_${idx + 1}`, stItem.stage);
        if (stItem.pct === 100) {
          uiState.otaRunning = false;
          SDK.getState().firmwareVersion = uiState.otaSelectedFile.includes('3.03') ? 'QRing_V3.03.00' : 'QRing_V3.02.85';
          SDK.pulseHardware({ led: 'green', vibrateMs: 600 });
          toast(`${t('펌웨어 업그레이드 완료', 'OTA Firmware Upgraded')}: ${SDK.getState().firmwareVersion}`);
        }
        render();
        SDK.emitStateChange();
      }, (idx + 1) * 450);
    });
  }

  function stopOtaUpgrade() {
    uiState.otaRunning = false;
    uiState.otaStageText = 'Upgrade Aborted by User';
    SDK.appendLog('ERROR', 'DfuHandle.abort()', 'DFU_ABORT', 'OTA upgrade stopped');
    render();
  }

  // 14. Resource Update (Section 14.2: FileHandle)
  function onSelectResourceFile(val) {
    uiState.resSelectedFile = val;
  }

  function queryResourceNames() {
    SDK.executeCommand('FileHandle.getInstance().queryResourceNames()', 0x52, [0x00], () => ({
      rspClass: 'ResourceNamesCallback',
      rspBytes: [0x52, 0x03],
      summary: `Device Resources: [${SDK.getState().deviceResources.join(', ')}]`
    }));
  }

  function startResourceUpdate() {
    if (!SDK.checkBleReady('FileHandle.startResourceUpdate')) return;
    uiState.resRunning = true;
    uiState.resProgress = 0;
    uiState.resStatusText = `Sending ${uiState.resSelectedFile}...`;
    SDK.appendLog('REQ', `FileHandle.getInstance().updateResource("${uiState.resSelectedFile}")`, '5A 53 01', 'Transferring binary resource blocks...');
    render();

    const timer = setInterval(() => {
      uiState.resProgress = Math.min(100, uiState.resProgress + 25);
      uiState.resStatusText = `Updating ${uiState.resSelectedFile} (${uiState.resProgress}%)`;
      if (uiState.resProgress >= 100) {
        clearInterval(timer);
        uiState.resRunning = false;
        uiState.resStatusText = `✓ Updated ${uiState.resSelectedFile} successfully`;
        if (!SDK.getState().deviceResources.includes(uiState.resSelectedFile)) {
          SDK.getState().deviceResources.push(uiState.resSelectedFile);
        }
        SDK.appendLog('RSP', 'IResourceUpdateCallback.onComplete()', '5A 53 64 00', `Resource ${uiState.resSelectedFile} verified on device`);
        toast(`${t('리소스 업데이트 완료', 'Resource Updated')}: ${uiState.resSelectedFile}`);
      }
      render();
    }, 300);
  }

  // 15. Debug & SdkLog File Actions (Section 15)
  function confirmClearSdkLogs() {
    showDialog({
      icon: 'delete_sweep',
      title: t('로그 파일 비우기 확인 (Clear sdk.log)', 'Clear Log File Confirmation'),
      html: t(
        '단일 로그 파일(sdk.log)의 내용을 모두 비우시겠습니까? 파일 경로와 수집 스위치 상태는 그대로 유지됩니다.',
        'Clear all contents of the single sdk.log file? The file path and collection switch state will be preserved.'
      ),
      actions: [
        { label: t('취소', 'Cancel'), variant: 'text' },
        {
          label: t('비우기 (Clear)', 'Clear File'),
          variant: 'error',
          onClick: () => {
            SDK.SdkLog.clearLogs().then(() => {
              toast(t('sdk.log 파일 내용이 초기화되었습니다.', 'Cleared sdk.log contents'));
              render();
            });
          }
        }
      ]
    });
  }

  function exportSdkLogSnapshot() {
    const snap = SDK.SdkLog.exportSnapshot();
    const blob = new Blob([snap.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = snap.fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast(`${t('로그 스냅샷 내보내기 완료', 'Exported log snapshot')}: ${snap.fileName}`);
    render();
  }

  // ==========================================================================
  // MAIN RENDER DISPATCHER & IN-APP BLE LOG PANEL
  // ==========================================================================
  const screenTitles = {
    home: { ko: 'QRing SDK 홈 (HomeActivity)', en: 'QRing SDK Home (HomeActivity)' },
    bind: { ko: '디바이스 스캔 및 바인딩', en: 'BLE Scan & Bind (DeviceBindActivity)' },
    health: { ko: '건강 측정 및 일괄 동기화', en: 'Health Settings & 7-Day Sync' },
    steps: { ko: '걸음수 및 활동 점수', en: 'Steps & Activity Score' },
    sleep: { ko: '수면 분석 및 수면 점수', en: 'Sleep Analysis & Score' },
    sport: { ko: '실시간 운동 및 운동 기록', en: 'Live Sport & Workout Records' },
    heart_rate: { ko: '심박수 · 원시 PPG · RRI', en: 'Heart Rate, Raw PPG & RRI' },
    blood_pressure: { ko: '혈압 측정 및 설정', en: 'Blood Pressure (SBP/DBP)' },
    blood_oxygen: { ko: '혈중산소(SpO₂) 및 PPG', en: 'Blood Oxygen (SpO₂) & PPG' },
    hrv: { ko: '심박변이도 (HRV)', en: 'Heart Rate Variability (HRV)' },
    pressure: { ko: '스트레스 및 간격 설정', en: 'Stress / Pressure Monitoring' },
    temperature: { ko: '피부 온도 모니터링', en: 'Skin Temperature' },
    sugar_lipids: { ko: '혈당 및 지질 설정', en: 'Blood Glucose & Lipids' },
    emotion: { ko: '감정 상태 모니터링 (0..10)', en: 'Emotion Monitoring (0..10)' },
    target_profile: { ko: '목표 및 사용자 프로필', en: 'Target & User Profile' },
    display: { ko: '디스플레이 설정', en: 'Display Settings' },
    touch_gesture: { ko: '터치 및 제스처 설정', en: 'Touch & Gesture Control' },
    device: { ko: '디바이스 제어 및 카메라', en: 'Device Control & Camera' },
    revision: { ko: '착용 방향 2단계 교정', en: '2-Step Wear Calibration' },
    notifications: { ko: '알림 및 스마트 리마인더', en: 'Notifications & Reminders' },
    smart_reminder: { ko: '음수 · 오래앉기 · 알람', en: 'Drink, Sedentary & Alarms' },
    message_push: { ko: '메시지 푸시 시뮬레이터', en: 'MessagePushUtil Simulator' },
    advanced: { ko: '고급 설정 및 오디오 녹음', en: 'Advanced & Audio Recordings' },
    recording: { ko: '녹음 파일 관리 (WAV/PCM)', en: 'Ring Recordings (WAV/PCM)' },
    ota: { ko: '펌웨어 업그레이드 (OTA)', en: 'Firmware Upgrade (OTA DFU)' },
    resource: { ko: '리소스 업데이트', en: 'Resource Update (FileHandle)' },
    debug: { ko: '디버그 및 SDK 로그 파일', en: 'Debug & SdkLog Files' }
  };

  function render() {
    const vp = document.getElementById('app-viewport');
    const titleEl = document.getElementById('app-top-title');
    const subEl = document.getElementById('app-top-subtitle');
    const backBtn = document.getElementById('app-back-btn');
    if (!vp) return;

    const meta = screenTitles[uiState.currentScreen] || screenTitles.home;
    if (titleEl) titleEl.textContent = uiState.lang === 'ko' ? meta.ko : meta.en;
    if (subEl) subEl.textContent = `${SDK.getState().deviceName} (${SDK.getState().connected ? 'CONNECTED' : 'DISCONNECTED'})`;
    if (backBtn) backBtn.style.display = uiState.currentScreen === 'home' ? 'none' : 'inline-flex';

    const renderMap = {
      home: renderHomeScreen,
      bind: renderBindScreen,
      health: renderHealthHubScreen,
      steps: renderStepsScreen,
      sleep: renderSleepScreen,
      sport: renderSportScreen,
      heart_rate: renderHeartRateScreen,
      blood_pressure: renderBloodPressureScreen,
      blood_oxygen: renderBloodOxygenScreen,
      hrv: renderHrvScreen,
      pressure: renderPressureScreen,
      temperature: renderTemperatureScreen,
      sugar_lipids: renderSugarLipidsScreen,
      emotion: renderEmotionScreen,
      target_profile: renderTargetProfileScreen,
      display: renderDisplayScreen,
      touch_gesture: renderTouchGestureScreen,
      device: renderDeviceScreen,
      revision: renderRevisionScreen,
      notifications: renderNotificationsScreen,
      smart_reminder: renderSmartReminderScreen,
      message_push: renderMessagePushScreen,
      advanced: renderAdvancedScreen,
      recording: renderRecordingScreen,
      ota: renderOtaScreen,
      resource: renderResourceScreen,
      debug: renderDebugScreen
    };

    const fn = renderMap[uiState.currentScreen] || renderHomeScreen;
    vp.innerHTML = fn();
    renderInAppBleDrawer();
  }

  function renderInAppBleDrawer() {
    const listEl = document.getElementById('inapp-ble-log-list');
    const countEl = document.getElementById('inapp-ble-log-count');
    if (!listEl) return;
    const logs = SDK.getBleLogs().slice(0, 20);
    if (countEl) countEl.textContent = `${SDK.getBleLogs().length} frames`;
    listEl.innerHTML = logs.map(l => `
      <div style="margin-bottom:3px">
        <span style="color:#93C5FD">[${l.time}]</span>
        <b style="color:${l.direction === 'ERROR' ? '#F87171' : l.direction === 'NOTIFY' ? '#FBBF24' : '#34D399'}">${l.direction}</b>
        <span>${l.apiCall}</span>
        <span style="opacity:0.75">→ ${l.summary}</span>
      </div>
    `).join('');
  }

  function toggleInAppDrawer() {
    uiState.inAppLogCollapsed = !uiState.inAppLogCollapsed;
    const drawer = document.getElementById('inapp-ble-log-drawer');
    if (drawer) drawer.classList.toggle('collapsed', uiState.inAppLogCollapsed);
  }

  // Subscribe to SDK events
  SDK.onLog(() => {
    renderInAppBleDrawer();
  });

  SDK.onGlobalReminder(({ title, message, dataType }) => {
    showDialog({
      icon: 'notifications_active',
      title: `🔔 ${title}`,
      html: `
        <div style="font-size:13.5px;line-height:1.5">${message}</div>
        <div style="margin-top:8px;font-size:11px;font-family:var(--md-sys-typescale-mono);color:var(--md-sys-color-primary)">
          GlobalDeviceReminderManager -> DeviceNotifyListener (dataType=${dataType})
        </div>
      `,
      actions: [{ label: t('확인 (Dismiss)', 'Dismiss'), variant: 'filled' }]
    });
  });

  SDK.onCameraNotify(() => {
    uiState.photosTaken += 1;
    uiState.lastPhotoTime = new Date().toTimeString().slice(0, 8);
    toast(`📸 ${t('원격 카메라 촬영 완료!', 'Remote Camera Shutter Triggered!')} (#${uiState.photosTaken})`);
    if (uiState.currentScreen === 'device') render();
  });

  return {
    uiState,
    t,
    toast,
    showDialog,
    closeDialog,
    navigateTo,
    goBack,
    setLanguage,
    render,
    toggleInAppDrawer,

    // Exported screen handlers
    toggleBleScan,
    onFilterScan: (v) => { uiState.scanFilterName = v; render(); },
    toggleScanSort: (v) => { uiState.scanSortRssi = v; render(); },
    selectDeviceToConnect,
    startBatchSync7Days,
    syncTodaySteps,
    openActivityScoreDialog,
    onSelectDayOffset,
    queryMetricData,
    onSelectSportType,
    startSportSession,
    requestStopSportSession,
    syncSportRecords,
    hrSettingAction,
    toggleSingleHrMeasure,
    toggleRealTimeHr,
    toggleHrPpgStream,
    toggleSpo2PpgStream,
    rriAction,
    genericMetricSetting,
    toggleManualMeasure,
    openPressureSettingDialog,
    syncManualTemperatureOnce,
    sugarLipidsAction,
    emotionSettingAction,
    targetProfileAction,
    displayAction,
    touchGestureAction,
    deviceAction,
    cameraAction,
    selectWearHand,
    runCalibrationStep,
    confirmHighRiskDeviceOp,
    notifAction,
    toggleAncsApp,
    smartReminderAction,
    toggleDrinkSlot,
    toggleAlarm,
    toggleMsgMaster,
    sendSimulatedAppNotification,
    toggleOneKeyMeasurement,
    advancedAction,
    setRecordingFormat,
    recordingAction,
    importSingleRecording,
    playSimulatedRecording,
    downloadRecordingFile,
    deleteRecording,
    onSelectOtaFile,
    startOtaUpgrade,
    stopOtaUpgrade,
    onSelectResourceFile,
    queryResourceNames,
    startResourceUpdate,
    confirmClearSdkLogs,
    exportSdkLogSnapshot
  };
})();
