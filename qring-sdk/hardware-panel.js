/**
 * QRing Android SDK v1.0.0.79 — Virtual Smart Ring Hardware Simulator & BLE Protocol Inspector
 * Controls the Left Pane (Virtual Hardware) and Right Pane (BLE Log & SDK Code Reference)
 */
window.QRingHardware = (() => {
  const SDK = window.QRingSDK;

  const hwUiState = {
    inspectorTab: 'logs', // 'logs' | 'code'
    logFilterDir: 'ALL',  // 'ALL' | 'REQ' | 'RSP' | 'NOTIFY' | 'BATCH' | 'ERROR'
    logSearchQuery: ''
  };

  function t(ko, en) {
    return window.QRingUI && window.QRingUI.uiState.lang === 'en' ? en : ko;
  }

  // Format OLED Screen Content based on current oledMode
  function getOledDisplayText(st) {
    if (!st.connected && !st.screenAwake) return '';
    if (!st.settings.display.clockEnabled && st.oledMode === 'CLOCK') return 'DISPLAY OFF';
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');

    switch (st.oledMode) {
      case 'STEPS':
        return `👣 ${st.liveSensors.todaySteps}`;
      case 'HR':
        return `♥ ${st.liveSensors.heartRate} BPM`;
      case 'BATTERY':
        return `${st.isCharging ? '⚡' : '🔋'} ${st.batteryValue}%`;
      case 'TASBIH':
        return `📿 ${st.liveSensors.tasbihCount}/${st.settings.advanced.muslim.target}`;
      case 'CAMERA':
        return `📸 SHUTTER`;
      case 'CALL':
        return `📞 CALL IN`;
      case 'CLOCK':
      default:
        return `${hh}:${mm} D#${st.settings.display.dialIndex}`;
    }
  }

  // Render Left Pane: Virtual Smart Ring Hardware Simulator
  function renderHardwarePane() {
    const container = document.getElementById('hardware-pane-body');
    if (!container) return;
    const st = SDK.getState();

    const ledClass = st.ledColor === 'green'
      ? 'active-green'
      : st.ledColor === 'red'
        ? 'active-red'
        : '';

    const oledBrightnessOpacity = 0.45 + (st.settings.display.brightness / 5) * 0.55;
    const isUpsideDown = st.settings.display.orientation === 1;

    const capabilityKeys = [
      { key: 'supportTouch', label: 'supportTouch' },
      { key: 'supportGesture', label: 'supportGesture' },
      { key: 'supportBlePair', label: 'supportBlePair' },
      { key: 'supportDoNotDisturb', label: 'supportDND' },
      { key: 'supportCallReminder', label: 'supportCall' },
      { key: 'supportNotification', label: 'supportMsg' },
      { key: 'mSupportTemperature', label: 'mSupportTemp' },
      { key: 'mSupportBloodOxygen', label: 'mSupportSpO2' },
      { key: 'mSupportHrv', label: 'mSupportHRV' },
      { key: 'mSupportPressure', label: 'mSupportStress' },
      { key: 'mSupportOneKeyCheck', label: 'mSupportOneKey' },
      { key: 'mSupportManualHeart', label: 'mSupportManualHR' }
    ];

    container.innerHTML = `
      <!-- 1. 3D Interactive Smart Ring Stage -->
      <div class="ring-stage-card">
        <div class="ring-stage-badges">
          <span class="hw-status-pill">
            <span class="status-dot ${!st.systemBluetoothEnabled ? 'off' : st.connected ? 'connected' : 'advertising'}"></span>
            ${!st.systemBluetoothEnabled ? 'SYS BT OFF' : st.connected ? 'GATT CONNECTED' : 'ADVERTISING'}
          </span>
          <span class="hw-status-pill" style="font-family:var(--md-sys-typescale-mono)">
            ${st.isCharging ? '⚡' : '🔋'} ${st.batteryValue}% | ${st.wearHand.toUpperCase()}
          </span>
        </div>

        <div class="ring-visualizer-wrap ${st.vibrating ? 'vibrating' : ''}" onclick="QRingSDK.simulateRingTap()" title="${t('클릭하여 스마트링 터치 센서 작동', 'Click to tap Smart Ring touch sensor')}">
          <!-- Mini OLED Screen on top of Ring -->
          <div class="ring-oled-screen ${isUpsideDown ? 'upside-down' : ''}" style="opacity:${oledBrightnessOpacity}">
            <span>${getOledDisplayText(st)}</span>
          </div>

          <!-- 3D Metallic Smart Ring SVG -->
          <svg class="ring-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="ringOuterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#64748B" />
                <stop offset="45%" stop-color="#CBD5E1" />
                <stop offset="75%" stop-color="#334155" />
                <stop offset="100%" stop-color="#0F172A" />
              </linearGradient>
              <linearGradient id="ringInnerGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#1E293B" />
                <stop offset="50%" stop-color="#475569" />
                <stop offset="100%" stop-color="#0F172A" />
              </linearGradient>
            </defs>
            <!-- Outer Titanium Ring Body -->
            <circle cx="100" cy="106" r="68" fill="none" stroke="url(#ringOuterGrad)" stroke-width="24" />
            <!-- Inner Titanium Bezel -->
            <circle cx="100" cy="106" r="56" fill="none" stroke="url(#ringInnerGrad)" stroke-width="8" />
            <!-- Inner Optical PPG Sensor Bumps (Green / Red / IR LEDs) -->
            <circle class="ppg-led-glow ${ledClass}" cx="82" cy="154" r="7" fill="#10B981" />
            <circle class="ppg-led-glow ${ledClass}" cx="100" cy="158" r="8" fill="#10B981" />
            <circle class="ppg-led-glow ${ledClass}" cx="118" cy="154" r="7" fill="#EF4444" />
            <!-- Touch capacitive area indicator -->
            <rect x="86" y="34" width="28" height="6" rx="3" fill="#38BDF8" opacity="0.7" />
          </svg>
        </div>

        <div class="ring-tap-hint">
          👆 ${t('링을 클릭하면 터치/카메라셔터/타스비흐/OLED 전환이 동작합니다', 'Click Ring to trigger Touch / Shutter / Tasbih / OLED mode')}
        </div>

        <div class="ring-quick-actions">
          <button class="m3-btn filled xs" onclick="QRingSDK.simulateRingTap()">Tap Ring</button>
          <button class="m3-btn tonal xs" onclick="QRingSDK.triggerDeviceNotify(QRingSDK.DeviceNotifyType.TYPE_STEP_CALORIE_DISTANCE)">+45 Steps</button>
          <button class="m3-btn tonal xs" onclick="QRingSDK.triggerDeviceNotify(QRingSDK.DeviceNotifyType.TYPE_MUSLIM_TASBIH_CLICK)">+1 Tasbih</button>
          <button class="m3-btn outlined xs" onclick="QRingSDK.triggerDeviceNotify(QRingSDK.DeviceNotifyType.TYPE_RAISE_WRIST)">Wrist Turn</button>
          <button class="m3-btn outlined xs" onclick="QRingSDK.triggerDeviceNotify(QRingSDK.DeviceNotifyType.TYPE_RECORD_FILE_COUNT)">+Rec Mic</button>
          <button class="m3-btn outlined xs" onclick="QRingHardware.toggleCharging()">${st.isCharging ? 'Unplug ⚡' : 'Charge ⚡'}</button>
        </div>
      </div>

      <!-- 2. System Bluetooth Switch (@BleIsConnected Guard Test) -->
      <div class="m3-card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:13px;font-weight:600">${t('안드로이드 시스템 블루투스', 'Android System Bluetooth')}</div>
            <div style="font-size:11px;color:var(--md-sys-color-on-surface-variant)">Tests @BleIsConnected & ACTION_STATE_CHANGED</div>
          </div>
          <label class="m3-switch">
            <input type="checkbox" ${st.systemBluetoothEnabled ? 'checked' : ''} onchange="QRingSDK.setSystemBluetooth(this.checked)">
            <span class="m3-switch-track"><span class="m3-switch-thumb material-symbols-rounded">check</span></span>
          </label>
        </div>
      </div>

      <!-- 3. Ring-to-App Notification Trigger Panel (DeviceNotifyRsp 0x73) -->
      <div class="m3-card">
        <div class="m3-card-title">
          <span class="material-symbols-rounded" style="font-size:18px;color:var(--md-sys-color-primary)">sensors</span>
          ${t('하드웨어 → 앱 리마인더 푸시 (DeviceNotifyRsp)', 'Ring -> App Push Events (DeviceNotifyRsp)')}
        </div>
        <div class="btn-grid-2">
          <button class="m3-btn tonal xs" onclick="QRingSDK.triggerDeviceNotify(QRingSDK.DeviceNotifyType.TYPE_SPORT_HEART_RATE_WARNING)">0x31 Sport HR Warn</button>
          <button class="m3-btn tonal xs" onclick="QRingSDK.triggerDeviceNotify(QRingSDK.DeviceNotifyType.TYPE_DRINK_WATER_REMINDER)">0x32 Drink Water</button>
          <button class="m3-btn tonal xs" onclick="QRingSDK.triggerDeviceNotify(QRingSDK.DeviceNotifyType.TYPE_SEDENTARY_REMINDER)">0x33 Sedentary</button>
          <button class="m3-btn tonal xs" onclick="QRingSDK.triggerDeviceNotify(QRingSDK.DeviceNotifyType.TYPE_ALARM_REMINDER)">0x34 Ring Alarm</button>
          <button class="m3-btn tonal xs" onclick="QRingSDK.triggerDeviceNotify(QRingSDK.DeviceNotifyType.TYPE_MENSTRUATION_REMINDER)">0x39 Cycle Alert</button>
          <button class="m3-btn error xs" onclick="QRingSDK.triggerDeviceNotify(QRingSDK.DeviceNotifyType.TYPE_AUTO_HEART_RATE_ALARM, {isHigh:true})">0x3A High HR Alert</button>
        </div>
      </div>

      <!-- 4. Live Physiological Sensor Sliders -->
      <div class="m3-card">
        <div class="m3-card-title">
          <span class="material-symbols-rounded" style="font-size:18px;color:var(--md-sys-color-primary)">tune</span>
          ${t('실시간 생체 센서 값 조절 (Live Sensors)', 'Live Biometric Sensor Sliders')}
        </div>

        <div class="m3-slider-row">
          <div class="m3-slider-header"><span>♥ Heart Rate</span><span id="hw-lbl-hr">${st.liveSensors.heartRate} bpm</span></div>
          <input class="m3-slider" type="range" min="42" max="185" value="${st.liveSensors.heartRate}" oninput="QRingHardware.updateSensor('heartRate', this.value, 'hw-lbl-hr', ' bpm')">
        </div>

        <div class="m3-slider-row">
          <div class="m3-slider-header"><span>🩸 Blood Oxygen (SpO₂)</span><span id="hw-lbl-spo2">${st.liveSensors.spo2}%</span></div>
          <input class="m3-slider" type="range" min="85" max="100" value="${st.liveSensors.spo2}" oninput="QRingHardware.updateSensor('spo2', this.value, 'hw-lbl-spo2', '%')">
        </div>

        <div class="m3-slider-row">
          <div class="m3-slider-header"><span>🩺 Blood Pressure (SBP)</span><span id="hw-lbl-sbp">${st.liveSensors.sbp}/${st.liveSensors.dbp} mmHg</span></div>
          <input class="m3-slider" type="range" min="95" max="165" value="${st.liveSensors.sbp}" oninput="QRingHardware.updateBpSensor(this.value)">
        </div>

        <div class="m3-slider-row">
          <div class="m3-slider-header"><span>🧠 Stress / Pressure</span><span id="hw-lbl-stress">${st.liveSensors.pressure} / 100</span></div>
          <input class="m3-slider" type="range" min="10" max="98" value="${st.liveSensors.pressure}" oninput="QRingHardware.updateSensor('pressure', this.value, 'hw-lbl-stress', ' / 100')">
        </div>

        <div class="m3-slider-row">
          <div class="m3-slider-header"><span>🌡️ Skin Temperature</span><span id="hw-lbl-temp">${st.liveSensors.temperature.toFixed(1)} °C</span></div>
          <input class="m3-slider" type="range" min="35.0" max="38.5" step="0.1" value="${st.liveSensors.temperature}" oninput="QRingHardware.updateTempSensor(this.value)">
        </div>

        <div class="m3-slider-row">
          <div class="m3-slider-header"><span>🔋 Battery Level</span><span id="hw-lbl-bat">${st.batteryValue}%</span></div>
          <input class="m3-slider" type="range" min="5" max="100" value="${st.batteryValue}" oninput="QRingHardware.updateBattery(this.value)">
        </div>
      </div>

      <!-- 5. Capability Bitmap Matrix (SetTimeRsp & DeviceSupportFunctionRsp) -->
      <div class="m3-card">
        <div class="m3-card-title">
          <span class="material-symbols-rounded" style="font-size:18px;color:var(--md-sys-color-primary)">memory</span>
          ${t('디바이스 지원 기능 비트맵 (Capabilities)', 'Capability Bitmap Toggles')}
        </div>
        <div class="m3-chip-group">
          ${capabilityKeys.map(item => `
            <span class="m3-chip ${st.capabilities[item.key] ? 'selected' : ''}" style="height:24px;font-size:11px;padding:0 8px" onclick="QRingHardware.toggleCapability('${item.key}')">
              ${item.label}: ${st.capabilities[item.key] ? '1' : '0'}
            </span>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Render Right Pane: BLE Protocol Console & SDK Code Reference
  function renderInspectorPane() {
    const logContainer = document.getElementById('ble-log-console');
    const codeContainer = document.getElementById('sdk-code-reference');
    if (!logContainer || !codeContainer) return;

    if (hwUiState.inspectorTab === 'logs') {
      logContainer.style.display = 'flex';
      codeContainer.style.display = 'none';

      let logs = SDK.getBleLogs();
      if (hwUiState.logFilterDir !== 'ALL') {
        logs = logs.filter(l => l.direction === hwUiState.logFilterDir);
      }
      if (hwUiState.logSearchQuery.trim()) {
        const q = hwUiState.logSearchQuery.trim().toLowerCase();
        logs = logs.filter(l =>
          l.apiCall.toLowerCase().includes(q) ||
          l.hexFrame.toLowerCase().includes(q) ||
          l.summary.toLowerCase().includes(q)
        );
      }

      logContainer.innerHTML = logs.slice(0, 80).map(entry => `
        <div class="log-entry" data-dir="${entry.direction}">
          <div class="log-entry-head">
            <span class="log-tag ${entry.direction}">${entry.direction}</span>
            <span>${entry.time}</span>
          </div>
          <div class="log-api-call">${entry.apiCall}</div>
          <div class="log-hex-frame">HEX: ${entry.hexFrame}</div>
          <div class="log-payload-summary">${entry.summary}</div>
        </div>
      `).join('') || `<div style="padding:20px;text-align:center;color:var(--md-sys-color-on-surface-variant)">No matching BLE packets</div>`;
    } else {
      logContainer.style.display = 'none';
      codeContainer.style.display = 'flex';
      const curScreen = (window.QRingUI && window.QRingUI.uiState.currentScreen) || 'home';
      codeContainer.innerHTML = getSdkCodeReferenceHtml(curScreen);
    }
  }

  // Context-sensitive Kotlin/Java SDK Code Reference per screen
  function getSdkCodeReferenceHtml(screenId) {
    const snippets = {
      home: `// HomeActivity.kt — Direct Connect, Unbind, Find Ring & Battery
BleOperateManager.getInstance().connectDirectly(deviceAddress)
BleOperateManager.getInstance().unBindDevice()
BleOperateManager.getInstance().bleCreateBond()

// Query Battery Level (0x03)
CommandHandle.getInstance().executeReqCmd(
    SimpleKeyReq(Constants.CMD_GET_DEVICE_ELECTRICITY_VALUE)
) { result: BatteryRsp ->
    val level = result.batteryValue
    val charging = result.isCharging
}`,
      steps: `// StepsActivity.kt — Today Steps, Offset Sync & Activity Score
CommandHandle.getInstance().executeReqCmd(
    SimpleKeyReq(Constants.CMD_GET_STEP_TODAY),
    object : ICommandResponse<SportTotalakelRsp> {
        override fun onDataResponse(rsp: SportTotalakelRsp) {
            val score = ActivityScoreUtils.calculateActivityScore(rsp.totalSteps, age)
        }
    }
)
// 15-min Detailed Steps by Day Offset (0..6)
CommandHandle.getInstance().executeReqCmd(
    ReadDetailSportDataReq(dayOffset, 0, 95), callback
)`,
      sleep: `// SleepActivity.kt — Sleep Stages, Score & Efficiency
LargeDataHandler.getInstance().syncSleepList(
    dayOffset,
    object : ILargeDataSleepResponse {
        override fun onSleepData(resp: SleepNewProtoResp) {
            // Stages: 1=Deep, 2=Light, 3=Awake, 4=REM
        }
    },
    object : SleepScoreAndEfficiencyCallback {
        override fun onScore(score: Int, efficiency: Int) {}
    }
)`,
      sport: `// SportRecordActivity.kt — App-Started Workout & 0x78 Listener
BleOperateManager.getInstance().addSportNotifyListener(
    0x78,
    object : DeviceSportNotifyListener() {
        override fun onDataResponse(result: DeviceNotifyRsp?) {
            // Parse live duration, HR, steps, distance, calories
        }
    }
)
// Start=1, Pause=2, Continue=3, Stop=4
CommandHandle.getInstance().executeReqCmd(
    PhoneSportReq.getSportInstance(1, SportTypeConstants.SPORT_TYPE_RUN),
    callback
)`,
      heart_rate: `// HeartRateActivity.kt — HR Settings, Raw PPG, RRI & Real-Time HR
CommandHandle.getInstance().executeReqCmd(
    HeartRateSettingReq.getWriteInstance(true, 30), callback
)
// Start Raw Green PPG + Accelerometer Stream
CommandHandle.getInstance().executeReqCmd(StartHeartRatePpgReq(true), callback)
// RRI Block Index & Data Sync (Section 6.4)
LargeDataHandler.getInstance().syncRriBlockIndexList(0, indexCallback)
LargeDataHandler.getInstance().syncRriBlockData(indices, blockCallback)`,
      pressure: `// PressureActivity.kt — Pressure Interval Setting (15/20/30/60 min)
CommandHandle.getInstance().executeReqCmd(
    PressureSettingReq.getWriteInstance(isEnable = true, interval = 30),
    callback
)
LargeDataHandler.getInstance().syncPressureWithCallback(dayOffset, callback)`,
      emotion: `// EmotionActivity.kt — Emotion Monitoring (Status Codes 0..10)
CommandHandle.getInstance().executeReqCmd(
    EmotionSettingReq.getWriteInstance(true), callback
)
LargeDataHandler.getInstance().syncEmotionWithCallback(dayOffset) { list ->
    // 0=Not worn, 1=Calm, 2=Stressed, 3=Tense, 4=Excited ... 10=Negative
}`,
      touch_gesture: `// TouchGestureActivity.kt — Section 10 Touch/Gesture Protocol
// AA: 1=Read, 2=Write | BB: 1=Gesture, 2=Touch, 3=RT11
// CC: AppType 0..10 (3=Muslim Tasbih, 5=Camera, 10=Lover Touch)
CommandHandle.getInstance().executeReqCmd(
    TouchGestureReq(action = 2, funcType = 2, enable = true, appType = 10),
    callback
)`,
      notifications: `// NotificationAndReminderActivity.kt & MessagePushUtil.kt
MessagePushUtil.pushIncomingCall(context)
MessagePushUtil.pushCallAction(context)
MessagePushUtil.pushNotification(context, "com.tencent.mm", "Alice", "Hello!")

// Event Notification (eventType 0..9: LED & Vibration)
CommandHandle.getInstance().executeReqCmd(
    NotificationEventNotifyReq(eventType = 8), callback
)`,
      recording: `// RecordingActivity.kt — RecordingPcmImportManager (16kHz 16-bit Mono)
val importManager = RecordingPcmImportManager(context)
importManager.syncRecordFileList(callback)
importManager.importRecording(
    recordEntry,
    exportFormat = ExportFormat.WAV, // or ExportFormat.PCM
    progressListener = { pct -> }
)`,
      debug: `// DebugSettingsActivity.kt & LogFilesActivity.kt (Section 15)
SdkLog.setConsoleLogEnabled(true)
SdkLog.setFileLogEnabled(true)
val singleLogFilePath: String = SdkLog.getLogFilePath()

// Clear single log file without changing path or switch state
SdkLog.clearLogs().get()
// Pause collection, flush, copy snapshot, and share
SdkLog.flush().get()`
    };

    const code = snippets[screenId] || snippets.home;
    return `
      <div class="m3-card" style="margin:12px">
        <div class="m3-card-title">
          <span class="material-symbols-rounded" style="color:var(--md-sys-color-primary)">code</span>
          SDK Kotlin / Java Reference (${screenId})
        </div>
        <pre style="margin:0;padding:12px;border-radius:10px;background:#0F172A;color:#E2E8F0;font-family:var(--md-sys-typescale-mono);font-size:11px;overflow-x:auto;line-height:1.5">${code}</pre>
      </div>
    `;
  }

  // Interactive Hardware Slider & Capability Handlers
  function updateSensor(key, val, labelId, suffix) {
    const num = parseInt(val, 10);
    SDK.getState().liveSensors[key] = num;
    const lbl = document.getElementById(labelId);
    if (lbl) lbl.textContent = `${num}${suffix}`;
    if (window.QRingUI) window.QRingUI.render();
  }

  function updateBpSensor(sbpVal) {
    const sbp = parseInt(sbpVal, 10);
    const dbp = Math.round(sbp * 0.65);
    SDK.getState().liveSensors.sbp = sbp;
    SDK.getState().liveSensors.dbp = dbp;
    const lbl = document.getElementById('hw-lbl-sbp');
    if (lbl) lbl.textContent = `${sbp}/${dbp} mmHg`;
    if (window.QRingUI) window.QRingUI.render();
  }

  function updateTempSensor(val) {
    const num = parseFloat(val);
    SDK.getState().liveSensors.temperature = num;
    const lbl = document.getElementById('hw-lbl-temp');
    if (lbl) lbl.textContent = `${num.toFixed(1)} °C`;
    if (window.QRingUI) window.QRingUI.render();
  }

  function updateBattery(val) {
    const num = parseInt(val, 10);
    SDK.getState().batteryValue = num;
    const lbl = document.getElementById('hw-lbl-bat');
    if (lbl) lbl.textContent = `${num}%`;
    SDK.triggerDeviceNotify(SDK.DeviceNotifyType.TYPE_BATTERY);
  }

  function toggleCharging() {
    const st = SDK.getState();
    st.isCharging = !st.isCharging;
    SDK.triggerDeviceNotify(SDK.DeviceNotifyType.TYPE_BATTERY);
  }

  function toggleCapability(key) {
    const cap = SDK.getState().capabilities;
    cap[key] = !cap[key];
    SDK.appendLog('NOTIFY', `CapabilityBitmap.${key} = ${cap[key]}`, 'CAP_UPDATE', `Updated capability flag ${key} -> ${cap[key]}`);
    render();
    if (window.QRingUI) window.QRingUI.render();
  }

  function setInspectorTab(tab) {
    hwUiState.inspectorTab = tab;
    document.querySelectorAll('.inspector-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    renderInspectorPane();
  }

  function setLogFilter(dir) {
    hwUiState.logFilterDir = dir;
    document.querySelectorAll('[data-log-filter]').forEach(chip => {
      chip.classList.toggle('selected', chip.dataset.logFilter === dir);
    });
    renderInspectorPane();
  }

  function onSearchLogs(q) {
    hwUiState.logSearchQuery = q;
    renderInspectorPane();
  }

  function render() {
    renderHardwarePane();
    renderInspectorPane();
  }

  SDK.onStateChange(() => {
    renderHardwarePane();
    if (hwUiState.inspectorTab === 'code') renderInspectorPane();
    if (window.QRingUI) window.QRingUI.render();
  });

  SDK.onLog(() => {
    renderInspectorPane();
  });

  return {
    hwUiState,
    render,
    renderHardwarePane,
    renderInspectorPane,
    updateSensor,
    updateBpSensor,
    updateTempSensor,
    updateBattery,
    toggleCharging,
    toggleCapability,
    setInspectorTab,
    setLogFilter,
    onSearchLogs
  };
})();
