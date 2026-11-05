/**
 * ============================================================================
 * QRing Android SDK v1.0.0.79 — Virtual BLE & Hardware Simulation Engine
 * Mirrors com.oudmon.ble.base.* and com.qcwireless.sdksample.* architecture
 * ============================================================================
 */

window.QRingSDK = (function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. SDK Constants & SportTypeCatalog (135+ Official SDK SportTypeConstants)
  // --------------------------------------------------------------------------
  const Constants = {
    CMD_BIND_SUCCESS: 0x10,
    CMD_GET_DEVICE_ELECTRICITY_VALUE: 0x03,
    CMD_GET_STEP_TODAY: 0x43,
    CMD_GET_SIT_LONG: 0x26,
    CMD_GET_ANCS_ON_OFF: 0x61,
    CMD_TAKING_PICTURE: 0x02,
    CMD_RE_BOOT: 0x08,
    CMD_RE_STORE: 0xFF,
    CHAR_FIRMWARE_REVISION: '00002a26-0000-1000-8000-00805f9b34fb',
    CHAR_HW_REVISION: '00002a27-0000-1000-8000-00805f9b34fb',
    RESULT_OK: 0
  };

  const DeviceNotifyType = {
    TYPE_HEART_RATE: 1,
    TYPE_BLOOD_PRESSURE: 2,
    TYPE_BLOOD_OXYGEN: 3,
    TYPE_STEP: 4,
    TYPE_BODY_TEMPERATURE: 5,
    TYPE_SPORT_RECORD: 7,
    TYPE_BATTERY: 12,
    TYPE_STEP_CALORIE_DISTANCE: 18,
    TYPE_EMOTION: 21,
    TYPE_RAISE_WRIST: 28,
    TYPE_MUSLIM_TASBIH_CLICK: 37,
    TYPE_CUSTOM_BUTTON_FUNCTION: 45,
    TYPE_SPORT_HEART_RATE_WARNING: 49,
    TYPE_DRINK_WATER_REMINDER: 50,
    TYPE_SEDENTARY_REMINDER: 51,
    TYPE_ALARM_REMINDER: 52,
    TYPE_MENSTRUATION_REMINDER: 57,
    TYPE_AUTO_HEART_RATE_ALARM: 58,
    TYPE_RECORD_FILE_COUNT: 209
  };

  const EmotionMap = {
    0: { en: 'null (No Data)', ko: '데이터 없음', color: '#90909A', emoji: '😶' },
    1: { en: 'Excited', ko: '신남 (Excited)', color: '#F59E0B', emoji: '🤩' },
    2: { en: 'Happy', ko: '행복 (Happy)', color: '#10B981', emoji: '😊' },
    3: { en: 'Pleased', ko: '만족 (Pleased)', color: '#34D399', emoji: '🙂' },
    4: { en: 'Calm', ko: '평온 (Calm)', color: '#3B82F6', emoji: '😌' },
    5: { en: 'Nervous', ko: '긴장 (Nervous)', color: '#A855F7', emoji: '😬' },
    6: { en: 'Confused', ko: '혼란 (Confused)', color: '#EC4899', emoji: '😕' },
    7: { en: 'Challenged', ko: '도전적 (Challenged)', color: '#6366F1', emoji: '😤' },
    8: { en: 'Uncomfortable', ko: '불편함 (Uncomfortable)', color: '#F97316', emoji: '😣' },
    9: { en: 'Sad', ko: '슬픔 (Sad)', color: '#64748B', emoji: '😢' },
    10: { en: 'Anxious', ko: '불안 (Anxious)', color: '#EF4444', emoji: '😰' }
  };

  const SportTypeCatalog = [
    { type: 4, constant: 'SPORT_TYPE_WALK', name: 'Walk', ko: '걷기', met: 3.8 },
    { type: 5, constant: 'SPORT_TYPE_ROPE_SKIPPING', name: 'Rope skipping', ko: '줄넘기', met: 9.8 },
    { type: 6, constant: 'SPORT_TYPE_SWIMMING', name: 'Swimming', ko: '수영', met: 8.0 },
    { type: 7, constant: 'SPORT_TYPE_RUN', name: 'Run', ko: '달리기', met: 8.5 },
    { type: 8, constant: 'SPORT_TYPE_HIKING', name: 'Hiking', ko: '하이킹', met: 6.0 },
    { type: 9, constant: 'SPORT_TYPE_CYCLING', name: 'Cycling', ko: '사이클링', met: 7.5 },
    { type: 10, constant: 'SPORT_TYPE_OTHER_SPORTS', name: 'Other sports', ko: '기타 운동', met: 5.0 },
    { type: 20, constant: 'SPORT_TYPE_MOUNTAIN_CLIMBING', name: 'Mountain climbing', ko: '등산', met: 7.8 },
    { type: 21, constant: 'SPORT_TYPE_BADMINTON', name: 'Badminton', ko: '배드민턴', met: 5.5 },
    { type: 22, constant: 'SPORT_TYPE_YOGA', name: 'Yoga', ko: '요가', met: 3.0 },
    { type: 23, constant: 'SPORT_TYPE_AEROBICS', name: 'Aerobics', ko: '에어로빅', met: 6.5 },
    { type: 24, constant: 'SPORT_TYPE_SPINNING_BIKE', name: 'Spinning bike', ko: '스피닝 바이크', met: 8.5 },
    { type: 25, constant: 'SPORT_TYPE_KAYAKING', name: 'Kayaking', ko: '카약', met: 5.0 },
    { type: 26, constant: 'SPORT_TYPE_ELLIPTICAL_MACHINE', name: 'Elliptical machine', ko: '일립티컬', met: 5.8 },
    { type: 27, constant: 'SPORT_TYPE_ROWING_MACHINE', name: 'Rowing machine', ko: '로잉머신', met: 7.0 },
    { type: 28, constant: 'SPORT_TYPE_PINGPONG', name: 'PingPong', ko: '탁구', met: 4.0 },
    { type: 29, constant: 'SPORT_TYPE_TENNIS', name: 'Tennis', ko: '테니스', met: 7.3 },
    { type: 30, constant: 'SPORT_TYPE_GOLF', name: 'Golf', ko: '골프', met: 4.5 },
    { type: 31, constant: 'SPORT_TYPE_BASKETBALL', name: 'Basketball', ko: '농구', met: 8.0 },
    { type: 32, constant: 'SPORT_TYPE_SOCCER', name: 'Football', ko: '축구', met: 8.5 },
    { type: 33, constant: 'SPORT_TYPE_VOLLEYBALL', name: 'Volleyball', ko: '배구', met: 5.5 },
    { type: 34, constant: 'SPORT_TYPE_ROCK_CLIMBING', name: 'Rock climbing', ko: '클라이밍', met: 8.0 },
    { type: 35, constant: 'SPORT_TYPE_DANCE', name: 'Dance', ko: '댄스', met: 5.5 },
    { type: 40, constant: 'SPORT_TYPE_TREADMILL', name: 'Treadmill', ko: '트레드밀', met: 7.5 },
    { type: 42, constant: 'SPORT_TYPE_TRAIL_RUNNING', name: 'Trail running', ko: '트레일 러닝', met: 9.2 },
    { type: 50, constant: 'SPORT_TYPE_OUTDOOR_CYCLING', name: 'Outdoor cycling', ko: '야외 사이클링', met: 7.5 },
    { type: 70, constant: 'SPORT_TYPE_MARATHON', name: 'Marathon', ko: '마라톤', met: 11.0 },
    { type: 83, constant: 'SPORT_TYPE_KICKBOXING', name: 'Kickboxing', ko: '킥복싱', met: 9.0 },
    { type: 84, constant: 'SPORT_TYPE_CORE_TRAINING', name: 'Core training', ko: '코어 트레이닝', met: 5.0 },
    { type: 88, constant: 'SPORT_TYPE_STRENGTH_TRAINING', name: 'Strength training', ko: '근력 운동', met: 6.0 },
    { type: 89, constant: 'SPORT_TYPE_INTERVAL_TRAINING', name: 'Interval training', ko: '인터벌 트레이닝', met: 8.5 },
    { type: 94, constant: 'SPORT_TYPE_PILATES', name: 'Pilates', ko: '필라테스', met: 3.8 },
    { type: 130, constant: 'SPORT_TYPE_BOXING', name: 'Boxing', ko: '복싱', met: 9.0 },
    { type: 136, constant: 'SPORT_TYPE_TAEKWONDO', name: 'Taekwondo', ko: '태권도', met: 8.5 },
    { type: 190, constant: 'SPORT_TYPE_SKIING', name: 'Snowboard / Skiing', ko: '스키/스노보드', met: 7.0 },
    { type: 235, constant: 'SPORT_TYPE_TRIATHLON', name: 'Triathlon', ko: '철인 3종', met: 10.5 },
    { type: 238, constant: 'SPORT_TYPE_DRIVING', name: 'Driving', ko: '드라이빙', met: 2.0 }
  ];

  const TouchAppTypeCatalog = [
    { value: 0, name: '0 - Close', ko: '0 - 끄기 (Close)' },
    { value: 1, name: '1 - HID music control', ko: '1 - 음악 제어 (HID Music)' },
    { value: 2, name: '2 - HID short-video control', ko: '2 - 숏폼 비디오 제어 (Short Video)' },
    { value: 3, name: '3 - Muslim/praise counter', ko: '3 - 타스비흐/기도 카운터 (Muslim Counter)' },
    { value: 4, name: '4 - HID e-book control', ko: '4 - 전자책 페이지 넘김 (E-book)' },
    { value: 5, name: '5 - Camera control', ko: '5 - 원격 카메라 촬영 (Camera)' },
    { value: 6, name: '6 - Phone-call control', ko: '6 - 통화 제어 (Phone Call)' },
    { value: 7, name: '7 - Game control', ko: '7 - 게임 컨트롤 (Game)' },
    { value: 8, name: '8 - Manual heart-rate measurement', ko: '8 - 수동 심박 측정 (Manual HR)' },
    { value: 9, name: '9 - Touch event report', ko: '9 - 터치 이벤트 리포트 (Touch Event)' },
    { value: 10, name: '10 - Lover interaction report', ko: '10 - 커플 인터랙션 리포트 (Lover Interaction)' }
  ];

  // --------------------------------------------------------------------------
  // 2. Virtual Nearby BLE Devices (DeviceBindActivity Scanner)
  //    Rule: R22_11C1 (BLE ID: F1BE85F511C1) -> SAI_11C1
  // --------------------------------------------------------------------------
  const NearbyDevices = [
    { name: 'SAI_11C1', rawFirmware: 'R22_11C1', bleId: 'F1BE85F511C1', mac: 'F1:BE:85:F5:11:C1', rssi: -44, hwVer: 'R22_HW_V3.2', fwVer: 'SAI_11C1', hasScreen: true },
    { name: 'SAI_0428', rawFirmware: 'R22_0428', bleId: 'A4C138000428', mac: 'A4:C1:38:00:04:28', rssi: -58, hwVer: 'R22_HW_V3.2', fwVer: 'SAI_0428', hasScreen: true },
    { name: 'SAI_1024', rawFirmware: 'R22_1024', bleId: 'E82A447F1024', mac: 'E8:2A:44:7F:10:24', rssi: -67, hwVer: 'R22_HW_V3.0', fwVer: 'SAI_1024', hasScreen: false },
    { name: 'SAI_88E2', rawFirmware: 'R22_88E2', bleId: 'D2910F2388E2', mac: 'D2:91:0F:23:88:E2', rssi: -51, hwVer: 'R22_HW_V3.5', fwVer: 'SAI_88E2', hasScreen: true }
  ];

  // --------------------------------------------------------------------------
  // 3. Complete Hardware & SDK State Store
  // --------------------------------------------------------------------------
  const state = {
    // System & Connection State
    systemBluetoothEnabled: true,
    connected: true,
    bonded: true,
    scanning: false,
    connecting: false,
    deviceName: 'SAI_11C1',
    rawFirmwareName: 'R22_11C1',
    bleUniqueId: 'F1BE85F511C1',
    deviceAddress: 'F1:BE:85:F5:11:C1',
    reConnectMac: 'F1:BE:85:F5:11:C1',
    firmwareVersion: 'SAI_11C1',
    hardwareVersion: 'R22_HW_V3.2',
    batteryValue: 86,
    isCharging: false,
    wearHand: 'left', // 'left' | 'right'
    isWearing: true,
    screenAwake: true,
    oledMode: 'CLOCK', // 'CLOCK' | 'STEPS' | 'HR' | 'BATTERY' | 'CAMERA' | 'TASBIH'

    // Live Physiological Sensor Values (controllable from Hardware Panel)
    liveSensors: {
      heartRate: 74,
      bloodOxygen: 98,
      sbp: 118,
      dbp: 76,
      hrv: 64,
      stress: 32,
      skinTemp: 36.5,
      bloodGlucose: 5.2,
      todaySteps: 6842,
      todayCalorie: 342, // kcal
      todayDistance: 4920, // meters
      sportDurationMin: 48,
      sleepDurationMin: 455,
      emotionStatus: 2, // 2 = Happy
      tasbihCount: 18
    },

    // Active Measurement / Session Flags
    activeSession: {
      sportRunning: false,
      sportType: 4,
      sportStartTime: 0,
      sportDurationSec: 0,
      sportSteps: 0,
      sportDistanceM: 0,
      sportCalorie: 0,
      hrManualRunning: false,
      hrRealtimeRunning: false,
      hrPpgRunning: false,
      bpManualRunning: false,
      spo2ManualRunning: false,
      spo2PpgRunning: false,
      hrvManualRunning: false,
      pressureManualRunning: false,
      cameraControlActive: false,
      calibrating: false,
      otaRunning: false,
      otaProgress: 0,
      resourceUpdating: false,
      resourceProgress: 0,
      manualDefaultValuesEnabled: false
    },

    // Capability Bitmap (SetTimeRsp + DeviceSupportFunctionRsp)
    capabilities: {
      // SetTimeRsp
      mSupportTemperature: true,
      mSupportBloodOxygen: true,
      mSupportBloodPressure: true,
      mSupportPressure: true,
      mSupportHrv: true,
      mSupportPlate: true,
      mSupportCustomWallpaper: true,
      mMaxWatchFace: 6,
      mSupportMenstruation: true,
      mSupportFeature: true,
      mSupportOneKeyCheck: true,
      mSupportWeather: true,
      mNewSleepProtocol: true,
      mSupportContact: true,
      mMaxContacts: 20,
      mSupportManualHeart: true,
      mSupportManualBloodOxygen: true,
      mSupportAppMeasure: true,
      mSupportECard: true,
      mSupportLocation: true,
      mMusicSupport: true,
      mEbookSupport: true,
      mSupportWeChat: true,
      mSupportAvatar: true,
      mSupportBloodSugar: true,
      bpSettingSupport: true,
      mYaWeiSupport: true,
      mSupportRecord: true,
      rtkMcu: true,

      // DeviceSupportFunctionRsp
      supportTouch: true,
      supportGesture: true,
      onlyTouch: false,
      tpSleep: true,
      supportMoslin: true,
      supportWorship: true,
      supportNewPraise: true,
      supportMoslinTouch: true,
      supportAPPRevision: true,
      supportBlePair: true,
      resumeServices: true,
      supportRingMusic: true,
      supportRingVideo: true,
      supportRingEbook: true,
      supportRingCamera: true,
      supportRingPhoneCall: true,
      supportRingGame: true,
      supportRingMusicTouch: true,
      supportRingVideoTouch: true,
      supportRingEbookTouch: true,
      supportRingCameraTouch: true,
      supportRingPhoneCallTouch: true,
      supportRingGameTouch: true,
      supportHeart: true,
      supportHeartTouch: true,
      supportIntervalHeartRate: true,
      supportIntervalHeartRateRemind: true,
      supportIntervalBloodOxygen: true,
      supportIntervalTemperature: true,
      supportLongSit: true,
      supportDrink: true,
      supportSkinTemperature: true,
      supportNoSingleTemperature: false,
      supportEcg: false,
      supportEmotion: true,
      supportNotification: true,
      supportCallReminder: true,
      supportRingGestureDND: true,
      supportDoNotDisturb: true,
      supportAlarm: true,
      supportRt11: true,
      deviceNoScreen: false,
      supportAiAnalyze: true,
      supportLoverSpace: true,
      supportFriends: true,
      supportLoverInteract: true,
      supportUltraviolet: false,
      supportAudio: true,
      supportWifiImport: true,
      supportAudioCoding: true,
      isOpusAudio: true
    },

    // Device Configuration Settings (Read/Write persisted in simulator)
    settings: {
      heartRate: { enable: true, interval: 10, startInterval: 10, lowReminder: 40, highReminder: 110, mainSwitch: true },
      rri: { enable: true },
      bloodPressure: { enable: true, startHour: 9, startMinute: 0, endHour: 18, endMinute: 0, multiple: 60 },
      bloodOxygen: { enable: true, interval: 2 },
      hrv: { enable: true, interval: 30 },
      pressure: { enable: true, minInterval: 15, interval: 30, intervalSettingSupported: true },
      temperature: { enable: true, interval: 5 },
      sugarLipids: { type: 1, enable: true, value: 0, interval: 2 },
      emotion: { enable: true, interval: 30 },

      // Target & Profile
      target: { step: 8000, calorie: 500, distance: 3000, sportMinute: 60, sleepMinute: 600 },
      timeFormat: { is24: true, metric: 0 }, // 0=Metric, 1=Imperial
      profile: { sex: 0, age: 30, height: 170, weight: 65, sbp: 115, dbp: 75, rateWarn: 160 },
      phoneId: '123456789123',

      // Display Settings
      display: {
        brightness: 4, // 1..5
        maxBrightness: 5,
        clockEnabled: true,
        orientationPortrait: true,
        orientationLeft: true,
        styleIndex: 1, // 0..4
        displayTime: { startHour: 8, startMinute: 0, endHour: 22, endMinute: 0, durationSec: 8, alpha: 100, total: 5, curr: 1, open: true },
        dialIndex: 2, // 0..5
        palmScreen: { enable: true, isLeft: true, needPalm: false, screenLight: 4, maxLight: 5, dnd: false, start: 480, end: 1320 }
      },

      // Device Settings
      device: {
        degreeSwitch: { enable: true, isCelsius: true },
        batterySaving: false
      },

      // Touch & Gesture Settings
      touchGesture: {
        actionType: 1, // 0 None, 1 Read, 2 Set
        functionType: 0, // 0 Touch, 1 Gesture, 2 RT11 Touch
        appType: 9, // 0..10
        strength: 5, // 1..10
        sleepTime: 3, // 1..5 min
        rt11State: 0 // 0 Awake, 1 Sleeping
      },

      // Notifications & Reminders
      notifications: {
        dnd: { enable: false, startHour: 22, startMinute: 0, endHour: 7, endMinute: 0 },
        callReminder: true,
        messageNotification: true,
        notificationListenerGranted: true,
        musicSwitch: true,
        ancs: {
          call: true, sms: true, qq: false, wechat: true, facebook: true,
          whatsapp: true, twitter: false, skype: false, line: true,
          linkedin: false, instagram: true, tim: false, snapchat: false, other: true
        },
        sedentary: {
          enable: true, startHour: 9, startMinute: 0, endHour: 18, endMinute: 0,
          intervalMinute: 60, weekMask: 0x7F // Sun..Sat
        },
        drink: {
          enable: true,
          weekMask: 0x7F,
          slots: [
            { index: 0, enable: true, hour: 9, minute: 0 },
            { index: 1, enable: true, hour: 10, minute: 30 },
            { index: 2, enable: true, hour: 12, minute: 0 },
            { index: 3, enable: true, hour: 13, minute: 30 },
            { index: 4, enable: true, hour: 15, minute: 0 },
            { index: 5, enable: true, hour: 16, minute: 30 },
            { index: 6, enable: false, hour: 18, minute: 0 },
            { index: 7, enable: false, hour: 20, minute: 0 }
          ]
        },
        alarms: [
          { id: 1, title: 'Morning Wake Up', hour: 7, minute: 30, enable: true, repeatMask: 0x3E }, // Mon-Fri
          { id: 2, title: 'Evening Stretch', hour: 21, minute: 0, enable: true, repeatMask: 0x7F }, // Every day
          { id: 3, title: 'Vitamin Supplement', hour: 12, minute: 30, enable: false, repeatMask: 0x7F }
        ],
        lightConfig: { priority: 3, light: 2, loopCount: 3, activeDuration: 10, pauseDuration: 5 },
        vibrationConfig: { priority: 5, vibration: 2, loopCount: 3, activeDuration: 10, pauseDuration: 5 }
      },

      // Advanced Settings
      advanced: {
        agps: true,
        intell: { enable: true, delaySecond: 5 },
        muslim: { enable: true, target: 33 },
        personalization: { themeMode: 1, hapticLevel: 2, wearCheck: true, aiInsight: true },
        contacts: [
          { name: 'Partner (SAI)', phone: '+82-10-8240-1920' },
          { name: 'Emergency SOS', phone: '119' }
        ]
      },

      // Debug & SdkLog Settings
      debug: {
        consoleLogEnabled: true,
        fileLogEnabled: true,
        logFilePath: '/data/user/0/com.qcwireless.sdksample/files/qc-sdk.log',
        blePanelCollecting: true
      }
    },

    // RRI Blocks on Device
    rriBlocks: [
      { blockId: 101, startMinuteSec: Math.floor(Date.now() / 1000) - 7200, endMinuteSec: Math.floor(Date.now() / 1000) - 5400, samples: 30 },
      { blockId: 102, startMinuteSec: Math.floor(Date.now() / 1000) - 5400, endMinuteSec: Math.floor(Date.now() / 1000) - 3600, samples: 30 },
      { blockId: 103, startMinuteSec: Math.floor(Date.now() / 1000) - 3600, endMinuteSec: Math.floor(Date.now() / 1000) - 1800, samples: 30 },
      { blockId: 104, startMinuteSec: Math.floor(Date.now() / 1000) - 1800, endMinuteSec: Math.floor(Date.now() / 1000) - 300, samples: 25 }
    ],

    // Device Resource Files
    deviceResources: [
      'res_ui_icons_v79.bin',
      'font_unicode_kr_jp.bin',
      'dial_01_minimal.bin',
      'dial_02_cyber_ring.bin',
      'dial_03_lover_pulse.bin',
      'algo_hr_spo2_v4.bin'
    ],

    // Device & Local Audio Recordings (RecordingPcmImportManager)
    saveRecordingAsWav: true,
    recordings: [
      {
        id: 'rec_20261103_0915',
        fileName: 'QRING_REC_001',
        createdAt: '2026-11-03 09:15:22',
        durationSec: 6,
        sourceSizeBytes: 192000,
        sampleRate: 16000,
        channels: 1,
        bitDepth: 16,
        onDevice: true,
        importedLocal: true,
        localFormat: 'WAV',
        localPath: '/storage/emulated/0/Android/data/com.qcwireless.sdksample/files/recordings/QRING_REC_001.wav',
        importProgress: 100,
        importing: false,
        notesFreq: [440, 523.25, 659.25, 783.99, 659.25, 523.25]
      },
      {
        id: 'rec_20261103_1420',
        fileName: 'QRING_REC_002',
        createdAt: '2026-11-03 14:20:08',
        durationSec: 8,
        sourceSizeBytes: 256000,
        sampleRate: 16000,
        channels: 1,
        bitDepth: 16,
        onDevice: true,
        importedLocal: false,
        localFormat: null,
        localPath: null,
        importProgress: 0,
        importing: false,
        notesFreq: [392, 493.88, 587.33, 783.99, 587.33, 493.88]
      },
      {
        id: 'rec_20261103_1605',
        fileName: 'QRING_REC_003',
        createdAt: '2026-11-03 16:05:45',
        durationSec: 5,
        sourceSizeBytes: 160000,
        sampleRate: 16000,
        channels: 1,
        bitDepth: 16,
        onDevice: true,
        importedLocal: false,
        localFormat: null,
        localPath: null,
        importProgress: 0,
        importing: false,
        notesFreq: [523.25, 659.25, 783.99, 1046.5, 783.99]
      }
    ]
  };

  // --------------------------------------------------------------------------
  // 4. Historical 7-Day Health Dataset Generator (dayOffset 0..6)
  // --------------------------------------------------------------------------
  const historicalData = {};

  function getDateString(dayOffset) {
    const d = new Date();
    d.setDate(d.getDate() - dayOffset);
    return d.toISOString().slice(0, 10);
  }

  function generate7DaysHistory() {
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const seed = dayOffset + 1;
      const dateStr = getDateString(dayOffset);

      // 1. Steps: 96 slots (15-min each)
      const stepSlots = [];
      let totalSteps = 0;
      let totalCalorie = 0;
      let totalDistance = 0;
      for (let slot = 0; slot < 96; slot++) {
        const hour = Math.floor(slot / 4);
        let walkSteps = 0;
        if (hour >= 7 && hour <= 22) {
          const activePeak = (hour === 8 || hour === 12 || hour === 18 || hour === 19) ? 2.4 : 0.8;
          walkSteps = Math.max(0, Math.round((Math.sin(slot * 0.7 + seed) + 1.1) * 42 * activePeak));
        }
        const runSteps = walkSteps > 160 ? Math.round(walkSteps * 0.25) : 0;
        const dist = Math.round((walkSteps + runSteps) * 0.72);
        const cal = Math.round((walkSteps + runSteps) * 0.05);
        totalSteps += walkSteps + runSteps;
        totalDistance += dist;
        totalCalorie += cal;
        stepSlots.push({
          timeIndex: slot,
          timeLabel: `${String(Math.floor((slot * 15) / 60)).padStart(2, '0')}:${String((slot * 15) % 60).padStart(2, '0')}`,
          walkSteps,
          runSteps,
          distance: dist,
          calorie: cal
        });
      }
      if (dayOffset === 0) {
        state.liveSensors.todaySteps = totalSteps;
        state.liveSensors.todayDistance = totalDistance;
        state.liveSensors.todayCalorie = totalCalorie;
      }

      // 2. Sleep (SleepNewProtoResp & SleepDisplay)
      const deepMin = 95 + ((dayOffset * 13) % 35);
      const lightMin = 220 + ((dayOffset * 19) % 45);
      const remMin = 85 + ((dayOffset * 11) % 25);
      const awakeMin = 12 + ((dayOffset * 7) % 15);
      const totalSleepMin = deepMin + lightMin + remMin;
      const sleepEfficiency = Math.min(99, Math.round((totalSleepMin / (totalSleepMin + awakeMin)) * 100));
      const sleepScore = Math.min(98, Math.round(72 + (deepMin / 130) * 18 + (remMin / 110) * 8));
      const sleepSegments = [
        { t: 2, label: 'Light Sleep', d: 35, start: '23:15' },
        { t: 1, label: 'Deep Sleep', d: Math.round(deepMin * 0.55), start: '23:50' },
        { t: 2, label: 'Light Sleep', d: Math.round(lightMin * 0.4), start: '00:45' },
        { t: 4, label: 'REM Sleep', d: Math.round(remMin * 0.5), start: '02:15' },
        { t: 3, label: 'Awake', d: awakeMin, start: '03:00' },
        { t: 1, label: 'Deep Sleep', d: Math.round(deepMin * 0.45), start: '03:15' },
        { t: 2, label: 'Light Sleep', d: Math.round(lightMin * 0.45), start: '04:00' },
        { t: 4, label: 'REM Sleep', d: Math.round(remMin * 0.5), start: '05:45' }
      ];

      // 3. Heart Rate (288 samples at 5-min intervals)
      const hrSamples = [];
      for (let i = 0; i < 48; i++) {
        const hr = Math.round(62 + Math.sin(i * 0.35 + seed) * 12 + (i > 16 && i < 40 ? 10 : 0));
        hrSamples.push({ time: `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`, bpm: hr });
      }

      // 4. Blood Pressure
      const bpSamples = [];
      for (let h = 9; h <= 18; h += 2) {
        const sbp = Math.round(114 + Math.sin(h + seed) * 6);
        const dbp = Math.round(74 + Math.cos(h + seed) * 4);
        bpSamples.push({ time: `${String(h).padStart(2, '0')}:00`, sbp, dbp });
      }

      // 5. Blood Oxygen (SpO2 24h)
      const spo2Samples = [];
      for (let h = 0; h < 24; h++) {
        const minSpo2 = 95 + ((h + seed) % 3);
        const maxSpo2 = Math.min(100, minSpo2 + 2);
        spo2Samples.push({ time: `${String(h).padStart(2, '0')}:00`, min: minSpo2, max: maxSpo2, avg: Math.round((minSpo2 + maxSpo2) / 2) });
      }

      // 6. HRV (ms)
      const hrvSamples = [];
      for (let h = 0; h < 24; h += 2) {
        const val = Math.round(52 + Math.cos(h * 0.4 + seed) * 16);
        hrvSamples.push({ time: `${String(h).padStart(2, '0')}:00`, hrv: val });
      }

      // 7. Pressure / Stress (0..100)
      const pressureSamples = [];
      for (let h = 0; h < 24; h += 2) {
        const val = Math.round(28 + (h >= 10 && h <= 18 ? 18 : 0) + Math.sin(h + seed) * 10);
        pressureSamples.push({ time: `${String(h).padStart(2, '0')}:00`, stress: val });
      }

      // 8. Skin Temperature (°C)
      const tempSamples = [];
      for (let h = 0; h < 24; h += 2) {
        const temp = +(36.2 + Math.sin(h * 0.3 + seed) * 0.45).toFixed(2);
        tempSamples.push({ time: `${String(h).padStart(2, '0')}:00`, temp });
      }

      // 9. Emotion (status 1..10)
      const emotionSamples = [];
      for (let h = 8; h <= 22; h += 2) {
        const st = ((h + dayOffset) % 4) + 1; // 1=Excited, 2=Happy, 3=Pleased, 4=Calm
        emotionSamples.push({
          time: `${String(h).padStart(2, '0')}:00`,
          status: st,
          label: EmotionMap[st].en,
          ko: EmotionMap[st].ko,
          emoji: EmotionMap[st].emoji
        });
      }

      // 10. Sport Records (SportPlusEntity)
      const sportRecords = [
        {
          dayIndex: dayOffset,
          date: dateStr,
          mSportType: dayOffset % 2 === 0 ? 7 : 4,
          sportName: dayOffset % 2 === 0 ? 'Run' : 'Walk',
          mStartTime: Math.floor(Date.now() / 1000) - dayOffset * 86400 - 14400,
          mDuration: 1840 + dayOffset * 120,
          mDistance: 3420 + dayOffset * 180,
          mCalories: 245 + dayOffset * 15,
          mSpeedAvg: 185,
          mSpeedMax: 260,
          mRateAvg: 136,
          mRateMin: 98,
          mRateMax: 164,
          mStepRate: 152,
          steps: 4210 + dayOffset * 210
        }
      ];

      // 11. Muslim / Tasbih 24h array
      const muslimHourly = Array.from({ length: 24 }, (_, h) => (h === 6 || h === 13 || h === 16 || h === 19 || h === 21 ? 33 : 0));

      // Normalize EmotionMap label alias
      Object.values(EmotionMap).forEach(em => { em.label = em.en; });
      // Normalize SportTypeCatalog & TouchAppTypeCatalog code alias
      SportTypeCatalog.forEach(s => { s.code = s.type; });
      TouchAppTypeCatalog.forEach(t => { t.code = t.value; });

      // Normalize state fields for UI screens
      state.ledColor = null;
      state.vibrating = false;
      Object.assign(state.liveSensors, {
        spo2: state.liveSensors.bloodOxygen,
        pressure: state.liveSensors.stress,
        temperature: state.liveSensors.skinTemp,
        emotion: state.liveSensors.emotionStatus,
        rriMs: 812
      });
      Object.assign(state.activeSession, {
        sportActive: false,
        sportPaused: false,
        sportDistance: 0,
        sportCalories: 0,
        singleHrMeasuring: false,
        realTimeHrActive: false,
        hrPpgStreaming: false,
        spo2PpgStreaming: false,
        manualBpMeasuring: false,
        manualSpo2Measuring: false,
        manualHrvMeasuring: false,
        manualPressureMeasuring: false,
        oneKeyMeasureActive: false
      });
      // Normalize settings aliases
      state.settings.heartRate.isEnable = state.settings.heartRate.enable;
      state.settings.rri.isEnable = state.settings.rri.enable;
      state.settings.bloodPressure.isEnable = state.settings.bloodPressure.enable;
      state.settings.bloodOxygen.isEnable = state.settings.bloodOxygen.enable;
      state.settings.hrv.isEnable = state.settings.hrv.enable;
      state.settings.pressure.isEnable = state.settings.pressure.enable;
      state.settings.temperature.isEnable = state.settings.temperature.enable;
      state.settings.sugarLipids.isEnable = state.settings.sugarLipids.enable;
      state.settings.emotion.isEnable = state.settings.emotion.enable;
      state.settings.target.steps = state.settings.target.step;
      state.settings.timeFormat.is24Hour = state.settings.timeFormat.is24;
      state.settings.profile.waist = 78;
      state.settings.profile.stepLength = 72;
      state.settings.phoneId = { idString: 'QR9081' };
      state.settings.display.orientation = 0;
      state.settings.display.style = state.settings.display.styleIndex;
      state.settings.display.displayTimeSec = 8;
      state.settings.display.palmScreen = true;
      state.settings.display.leftHand = true;
      state.settings.device.degreeCelsius = true;
      state.settings.touchGesture.enabled = true;
      state.settings.touchGesture.gestureStrength = state.settings.touchGesture.strength;
      state.settings.touchGesture.touchSleepMinutes = state.settings.touchGesture.sleepTime;
      state.settings.notifications.ancsApps = state.settings.notifications.ancs;
      state.settings.notifications.drinkSlots = state.settings.notifications.drink.slots.map(s => ({
        index: s.index,
        enable: s.enable,
        startHour: s.hour,
        endHour: s.hour + 1,
        interval: 60
      }));
      state.settings.notifications.sedentary.interval = state.settings.notifications.sedentary.intervalMinute;
      state.settings.notifications.alarms.forEach((a, idx) => { a.index = idx; });
      state.settings.advanced.muslim.open = state.settings.advanced.muslim.enable;
      state.settings.advanced.agpsEnabled = state.settings.advanced.agps;
      state.settings.advanced.intellMinutes = state.settings.advanced.intell.delaySecond;
      state.settings.advanced.contactsSynced = state.settings.advanced.contacts;
      state.settings.advanced.oneClickDefaultValuesSwitch = false;
      state.settings.advanced.recordingExportFormat = 'wav';
      state.rriBlocks = state.rriBlocks.map((b, idx) => ({
        ...b,
        index: idx,
        timeRange: `${10 + idx}:00~${10 + idx}:30`,
        samples: [804, 818, 796, 812, 825]
      }));

      historicalData[dayOffset] = {
        dayOffset,
        date: dateStr,
        dateStr,
        steps: {
          totalSteps,
          runningSteps: Math.round(totalSteps * 0.18),
          calorie: totalCalorie,
          distance: totalDistance,
          walkDistance: totalDistance,
          sportDuration: 45 + dayOffset * 5,
          sleepDuration: totalSleepMin,
          details: stepSlots.map(s => s.walkSteps + s.runSteps),
          bleStepDetailses: stepSlots
        },
        sleep: {
          dayIndex: dayOffset,
          date: dateStr,
          sleepTime: '23:15',
          wakeTime: '07:02',
          sleepTimeStr: '23:15',
          wakeTimeStr: '07:02',
          deepMin,
          lightMin,
          remMin,
          deepSleepMin: deepMin,
          lightSleepMin: lightMin,
          remSleepMin: remMin,
          awakeMin,
          totalDuration: totalSleepMin,
          totalSleepMin,
          efficiency: sleepEfficiency,
          sleepEfficiency,
          score: sleepScore,
          sleepScore,
          lunchBreak: dayOffset % 2 === 0,
          lunchMin: dayOffset % 2 === 0 ? 25 : 0,
          stages: sleepSegments.map(s => ({ type: s.t, duration: s.d, label: s.label })),
          segments: sleepSegments
        },
        heartRate: hrSamples.map(s => s.bpm),
        bloodPressure: bpSamples,
        spo2: spo2Samples,
        bloodOxygen: { dayIndex: dayOffset, date: dateStr, samples: spo2Samples },
        hrv: hrvSamples.map(s => s.hrv),
        pressure: pressureSamples.map(s => s.stress),
        temperature: tempSamples.map(s => s.temp),
        emotion: emotionSamples.map(s => s.status),
        sports: sportRecords.map(r => ({
          ...r,
          sportType: r.mSportType,
          duration: r.mDuration,
          distance: r.mDistance,
          calories: r.mCalories,
          hrMin: r.mRateMin,
          hrMax: r.mRateMax,
          hrAvg: r.mRateAvg
        })),
        muslim24h: muslimHourly,
        muslim: { offset: dayOffset, date: dateStr, pressureArray: muslimHourly }
      };
    }
  }

  generate7DaysHistory();

  // --------------------------------------------------------------------------
  // 5. Event Bus & Listeners (Mirrors EventBus + DeviceNotifyListener)
  // --------------------------------------------------------------------------
  const listeners = {
    logs: new Set(),
    stateChange: new Set(),
    deviceNotify: new Map(), // key -> callback
    sportNotify: new Map(),
    cameraNotify: new Set(),
    globalReminder: new Set()
  };

  function emitStateChange() {
    listeners.stateChange.forEach(fn => {
      try { fn(state); } catch (e) { console.error(e); }
    });
  }

  // --------------------------------------------------------------------------
  // 6. BLE Log Manager & SdkLog (Section 15 of SDK Guide)
  // --------------------------------------------------------------------------
  const bleLogs = [];
  const sdkFileLogs = [];

  function toHexPacket(cmdByte, payloadBytes = []) {
    const bytes = [cmdByte & 0xFF, ...payloadBytes.map(b => b & 0xFF)];
    while (bytes.length < 15) bytes.push(0x00);
    const crc = bytes.slice(0, 15).reduce((acc, v) => (acc + v) & 0xFF, 0);
    bytes.push(crc);
    return bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
  }

  function appendLog(direction, apiCall, hexFrame, summary) {
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    const entry = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      timestamp,
      time: timestamp,
      direction, // 'REQ' | 'RSP' | 'NOTIFY' | 'BATCH' | 'ERROR'
      apiCall,
      hexFrame,
      summary
    };

    if (state.settings.debug.blePanelCollecting) {
      bleLogs.unshift(entry);
      if (bleLogs.length > 250) bleLogs.pop();
    }

    if (state.settings.debug.fileLogEnabled) {
      sdkFileLogs.push(`${now.toISOString()} [${direction}] ${apiCall} | HEX: ${hexFrame} | ${summary}`);
    }

    if (state.settings.debug.consoleLogEnabled) {
      console.debug(`[QRingSDK][${direction}] ${apiCall} -> ${summary}`);
    }

    listeners.logs.forEach(fn => {
      try { fn(entry, bleLogs); } catch (e) { console.error(e); }
    });
    return entry;
  }

  // Pre-check @BleIsConnected aspect (Section 3.2)
  function checkBleReady(apiName) {
    if (!state.systemBluetoothEnabled) {
      appendLog('ERROR', apiName, '--', 'Blocked by @BleIsConnected: Please turn on Bluetooth first');
      if (window.QRingUI && window.QRingUI.toast) {
        window.QRingUI.toast('Please turn on Bluetooth first (시스템 블루투스를 먼저 켜주세요)');
      }
      return false;
    }
    if (!state.connected) {
      appendLog('ERROR', apiName, '--', 'Blocked by @BleIsConnected: Device is not connected');
      if (window.QRingUI && window.QRingUI.toast) {
        window.QRingUI.toast('Device not connected. Please connect first (기기가 연결되어 있지 않습니다)');
      }
      return false;
    }
    return true;
  }

  // Trigger hardware visual feedback (LED / Vibration)
  let hwResetTimer = null;
  function pulseHardware({ led = null, vibrateMs = 0, oledMode = null }) {
    if (oledMode) state.oledMode = oledMode;
    if (led !== undefined) state.ledColor = led;
    if (vibrateMs > 0) state.vibrating = true;
    emitStateChange();
    if (vibrateMs > 0 || led) {
      if (hwResetTimer) clearTimeout(hwResetTimer);
      hwResetTimer = setTimeout(() => {
        state.vibrating = false;
        if (!state.activeSession.hrPpgStreaming && !state.activeSession.spo2PpgStreaming && !state.activeSession.sportActive) {
          state.ledColor = null;
        }
        emitStateChange();
      }, Math.max(vibrateMs, 900));
    }
  }

  // --------------------------------------------------------------------------
  // 7. ActivityScoreUtils (Section 6.1)
  // --------------------------------------------------------------------------
  const ActivityScoreUtils = {
    calculateActivityScore(steps, age) {
      if (steps <= 0 || age <= 0) return 0;
      const targetByAge = age < 25 ? 9500 : age < 40 ? 8000 : age < 60 ? 7000 : 6000;
      const rawScore = Math.round(Math.min(100, (steps / targetByAge) * 85 + (steps > 3000 ? 15 : (steps / 3000) * 15)));
      return Math.max(0, Math.min(100, rawScore));
    }
  };

  // --------------------------------------------------------------------------
  // 8. SdkLog API (Section 15)
  // --------------------------------------------------------------------------
  const SdkLog = {
    setConsoleLogEnabled(enabled) {
      state.settings.debug.consoleLogEnabled = !!enabled;
      appendLog('REQ', `SdkLog.setConsoleLogEnabled(${enabled})`, 'LOCAL_CFG', `Console logging ${enabled ? 'ENABLED' : 'DISABLED'}`);
      emitStateChange();
    },
    isConsoleLogEnabled() {
      return state.settings.debug.consoleLogEnabled;
    },
    setFileLogEnabled(enabled) {
      state.settings.debug.fileLogEnabled = !!enabled;
      appendLog('REQ', `SdkLog.setFileLogEnabled(${enabled})`, 'LOCAL_CFG', `Single-file collection ${enabled ? 'ENABLED' : 'DISABLED'}`);
      emitStateChange();
    },
    isFileLogEnabled() {
      return state.settings.debug.fileLogEnabled;
    },
    getLogFilePath() {
      return state.settings.debug.logFilePath;
    },
    getFileLogLines() {
      return sdkFileLogs;
    },
    clearLogs() {
      sdkFileLogs.length = 0;
      appendLog('RSP', 'SdkLog.clearLogs().get()', 'FILE_IO', `Cleared contents of ${state.settings.debug.logFilePath} (path & switch retained)`);
      emitStateChange();
      return Promise.resolve(true);
    },
    exportSnapshot() {
      const wasEnabled = state.settings.debug.fileLogEnabled;
      state.settings.debug.fileLogEnabled = false;
      appendLog('REQ', 'SdkLog.flush().get()', 'FILE_IO', 'Paused file collection, flushed stream, creating snapshot copy...');
      const content = [
        `# QRing Android SDK v1.0.0.79 Diagnostic Log Snapshot`,
        `# Exported At: ${new Date().toISOString()}`,
        `# Source Path: ${state.settings.debug.logFilePath}`,
        `# Device: ${state.deviceName} (${state.deviceAddress}) FW=${state.firmwareVersion}`,
        `# ------------------------------------------------------------------------`,
        ...(sdkFileLogs.length ? sdkFileLogs : ['[INFO] Log file initialized.'])
      ].join('\n');
      state.settings.debug.fileLogEnabled = wasEnabled;
      const snapshotName = `sdk-log-${Date.now()}.log`;
      appendLog('RSP', `exportSdkLogFile() -> ${snapshotName}`, 'FILE_IO', `Snapshot ready (${content.length} bytes), collection restored=${wasEnabled}`);
      return { fileName: snapshotName, content };
    }
  };

  // --------------------------------------------------------------------------
  // 9. MessagePushUtil & DoNotDisturbPolicy (Section 9.3)
  // --------------------------------------------------------------------------
  const MessagePushUtil = {
    isDndActiveNow() {
      const dnd = state.settings.notifications.dnd;
      if (!state.capabilities.supportDoNotDisturb || !dnd.enable) return false;
      const now = new Date();
      const curMin = now.getHours() * 60 + now.getMinutes();
      const startMin = dnd.startHour * 60 + dnd.startMinute;
      const endMin = dnd.endHour * 60 + dnd.endMinute;
      if (startMin <= endMin) {
        return curMin >= startMin && curMin < endMin;
      } else {
        return curMin >= startMin || curMin < endMin;
      }
    },
    resolveType(pkg) {
      const p = (pkg || '').toLowerCase();
      if (p.includes('sms')) return { code: 0x01, label: 'SMS (0x01)' };
      if (p.includes('mobileqq')) return { code: 0x02, label: 'QQ (0x02)' };
      if (p.includes('tencent.mm')) return { code: 0x03, label: 'WeChat (0x03)' };
      if (p.includes('facebook')) return { code: 0x05, label: 'Facebook (0x05)' };
      if (p.includes('whatsapp')) return { code: 0x06, label: 'WhatsApp (0x06)' };
      if (p.includes('twitter')) return { code: 0x07, label: 'Twitter (0x07)' };
      if (p.includes('skype')) return { code: 0x08, label: 'Skype (0x08)' };
      if (p.includes('naver.line')) return { code: 0x09, label: 'Line (0x09)' };
      if (p.includes('linkedin')) return { code: 0x0A, label: 'LinkedIn (0x0A)' };
      if (p.includes('instagram')) return { code: 0x0B, label: 'Instagram (0x0B)' };
      if (p.includes('snapchat')) return { code: 0x0D, label: 'Snapchat (0x0D)' };
      return { code: 0x0E, label: 'Other notification (0x0E)' };
    },
    pushIncomingCall() {
      if (!checkBleReady('MessagePushUtil.pushIncomingCall')) return false;
      if (!state.settings.notifications.callReminder) {
        appendLog('ERROR', 'MessagePushUtil.pushIncomingCall()', '--', 'Ignored: Call reminder switch is OFF');
        return false;
      }
      if (!state.capabilities.supportCallReminder && !state.capabilities.supportNotification) {
        appendLog('ERROR', 'MessagePushUtil.pushIncomingCall()', '--', 'Ignored: Device lacks supportCallReminder || supportNotification');
        return false;
      }
      if (this.isDndActiveNow()) {
        appendLog('ERROR', 'MessagePushUtil.pushIncomingCall()', '--', 'Silently ignored: Active Do-Not-Disturb schedule');
        return false;
      }
      const hex = toHexPacket(0x72, [0x00, 0x01, 0x0C, 0x49, 0x6E, 0x63, 0x6F, 0x6D, 0x69, 0x6E, 0x67]);
      appendLog('REQ', 'MessagePushUtil.pushIncomingCall() -> PushMsgUintReq(0x00)', hex, 'Sent incoming call alert (0x00) to ring');
      pulseHardware({ led: 'green', vibrateMs: 1200, oledMode: 'CALL' });
      return true;
    },
    pushCallAction() {
      if (!checkBleReady('MessagePushUtil.pushCallAction')) return false;
      const hex = toHexPacket(0x72, [0x04, 0x01, 0x00]);
      appendLog('REQ', 'MessagePushUtil.pushCallAction() -> PushMsgUintReq(0x04)', hex, 'Sent call recovery action (0x04) — allowed even during DND');
      pulseHardware({ led: null, vibrateMs: 0, oledMode: 'CLOCK' });
      return true;
    },
    pushNotification(packageName, title, text) {
      if (!checkBleReady('MessagePushUtil.pushNotification')) return false;
      if (!state.settings.notifications.messageNotification) {
        appendLog('ERROR', `MessagePushUtil.pushNotification("${packageName}")`, '--', 'Ignored: Message notification switch is OFF');
        return false;
      }
      if (!state.capabilities.supportNotification && !state.capabilities.supportWeChat) {
        appendLog('ERROR', `MessagePushUtil.pushNotification("${packageName}")`, '--', 'Ignored: Device lacks supportNotification');
        return false;
      }
      if (this.isDndActiveNow()) {
        appendLog('ERROR', `MessagePushUtil.pushNotification("${packageName}")`, '--', 'Silently ignored: Active Do-Not-Disturb schedule');
        return false;
      }
      const cleanTitle = (title || '').trim();
      const cleanText = (text || '').trim();
      if (!cleanTitle && !cleanText) return false;
      const formatted = cleanTitle && cleanText && cleanTitle !== cleanText ? `${cleanTitle}: ${cleanText}` : (cleanTitle || cleanText);
      const resolved = this.resolveType(packageName);
      const hex = toHexPacket(0x72, [resolved.code, 0x01, Math.min(64, formatted.length), 0x54, 0x45, 0x58, 0x54]);
      appendLog('REQ', `MessagePushUtil.pushNotification("${packageName}")`, hex, `Type=${resolved.label} | Payload="${formatted}"`);
      pulseHardware({ led: 'green', vibrateMs: 500 });
      return true;
    }
  };

  // --------------------------------------------------------------------------
  // 10. CommandHandle, BleOperateManager, LargeDataHandler, FileHandle, DfuHandle
  // --------------------------------------------------------------------------
  function executeCommand(apiSignature, cmdByte, reqBytes, buildResponseFn, delayMs = 140) {
    if (!checkBleReady(apiSignature)) return;
    const reqHex = toHexPacket(cmdByte, reqBytes);
    appendLog('REQ', apiSignature, reqHex, 'Command sent to GATT TX characteristic');
    setTimeout(() => {
      if (!state.connected) return;
      const res = buildResponseFn();
      const rspHex = toHexPacket(cmdByte, res.rspBytes || [0x00, 0x01]);
      appendLog('RSP', `${res.rspClass || 'ICommandResponse'}`, rspHex, res.summary);
      if (res.callback) res.callback(res.data);
      emitStateChange();
    }, delayMs);
  }

  // Trigger incoming DeviceNotifyRsp from Virtual Ring Hardware to App
  function triggerDeviceNotify(dataType, customPayload = {}) {
    if (!state.systemBluetoothEnabled || !state.connected) {
      if (window.QRingUI && window.QRingUI.toast) {
        window.QRingUI.toast('Connect the ring first to simulate device-to-app notifications');
      }
      return;
    }

    let loadData = [0x73, dataType & 0xFF];
    let title = 'Device Reminder';
    let message = '';
    let summary = '';

    switch (dataType) {
      case DeviceNotifyType.TYPE_SPORT_HEART_RATE_WARNING: {
        const hr = customPayload.hr || Math.max(165, state.liveSensors.heartRate);
        loadData = [0x73, 0x31, hr];
        title = 'Sport Heart Rate Warning';
        message = `Warning: Current sport heart rate is ${hr} bpm (exceeds threshold ${state.settings.profile.rateWarn} bpm)!`;
        summary = `TYPE_SPORT_HEART_RATE_WARNING (0x31) -> loadData[1]=${hr} bpm`;
        pulseHardware({ led: 'red', vibrateMs: 900, oledMode: 'HR' });
        break;
      }
      case DeviceNotifyType.TYPE_DRINK_WATER_REMINDER: {
        loadData = [0x73, 0x32, 0x01];
        title = 'Drink Water Reminder';
        message = 'Time to hydrate! Drink a glass of water (DeviceNotifyRsp.TYPE_DRINK_WATER_REMINDER).';
        summary = 'TYPE_DRINK_WATER_REMINDER (0x32) -> Drink water reminder fired';
        pulseHardware({ led: 'green', vibrateMs: 600 });
        break;
      }
      case DeviceNotifyType.TYPE_SEDENTARY_REMINDER: {
        loadData = [0x73, 0x33, 0x01];
        title = 'Sedentary Reminder';
        message = 'You have been sitting for over 60 minutes. Stand up and stretch!';
        summary = 'TYPE_SEDENTARY_REMINDER (0x33) -> Sedentary reminder fired';
        pulseHardware({ led: 'green', vibrateMs: 600 });
        break;
      }
      case DeviceNotifyType.TYPE_ALARM_REMINDER: {
        loadData = [0x73, 0x34, 0x00];
        const firstAlarm = state.settings.notifications.alarms[0];
        title = 'Ring Alarm Reminder';
        message = `Alarm triggered: "${firstAlarm ? firstAlarm.title : 'Scheduled Alarm'}"`;
        summary = 'TYPE_ALARM_REMINDER (0x34) -> Ring alarm fired';
        pulseHardware({ led: 'green', vibrateMs: 1000 });
        break;
      }
      case DeviceNotifyType.TYPE_MENSTRUATION_REMINDER: {
        const statusType = customPayload.statusType || 1; // 1=Period, 2=Ovulation
        const daysAway = customPayload.days || 2;
        loadData = [0x73, 0x39, statusType, daysAway];
        title = 'Menstruation / Cycle Reminder';
        message = statusType === 1
          ? `Period reminder: Estimated period starts in ${daysAway} days.`
          : `Ovulation window reminder: ${daysAway} days away.`;
        summary = `TYPE_MENSTRUATION_REMINDER (0x39) -> status=${statusType}, days=${daysAway}`;
        pulseHardware({ led: 'red', vibrateMs: 500 });
        break;
      }
      case DeviceNotifyType.TYPE_AUTO_HEART_RATE_ALARM: {
        const isHigh = customPayload.isHigh !== false;
        const hrVal = isHigh ? 124 : 38;
        loadData = [0x73, 0x3A, isHigh ? 2 : 1, hrVal];
        title = isHigh ? 'High Heart Rate Alert' : 'Low Heart Rate Alert';
        message = `Automatic Heart Rate Alert: ${hrVal} bpm (${isHigh ? 'Above High Threshold ' + state.settings.heartRate.highReminder : 'Below Low Threshold ' + state.settings.heartRate.lowReminder} bpm).`;
        summary = `TYPE_AUTO_HEART_RATE_ALARM (0x3A) -> type=${isHigh ? 'HIGH' : 'LOW'}, bpm=${hrVal}`;
        pulseHardware({ led: 'red', vibrateMs: 900, oledMode: 'HR' });
        break;
      }
      case DeviceNotifyType.TYPE_BATTERY: {
        loadData = [0x73, 0x0C, state.batteryValue, state.isCharging ? 1 : 0];
        summary = `TYPE_BATTERY (0x0C) -> battery=${state.batteryValue}%, charging=${state.isCharging}`;
        break;
      }
      case DeviceNotifyType.TYPE_STEP_CALORIE_DISTANCE: {
        state.liveSensors.todaySteps += 45;
        state.liveSensors.todayDistance += 32;
        state.liveSensors.todayCalorie += 3;
        loadData = [0x73, 0x12, (state.liveSensors.todaySteps >> 8) & 0xFF, state.liveSensors.todaySteps & 0xFF];
        summary = `TYPE_STEP_CALORIE_DISTANCE (0x12) -> steps=${state.liveSensors.todaySteps}, cal=${state.liveSensors.todayCalorie} kcal, dist=${(state.liveSensors.todayDistance / 1000).toFixed(2)} km`;
        pulseHardware({ oledMode: 'STEPS' });
        break;
      }
      case DeviceNotifyType.TYPE_MUSLIM_TASBIH_CLICK: {
        state.liveSensors.tasbihCount += 1;
        const cnt = state.liveSensors.tasbihCount;
        const target = state.settings.advanced.muslim.target || 33;
        loadData = [0x73, 0x25, (cnt >> 8) & 0xFF, cnt & 0xFF];
        summary = `TYPE_MUSLIM_TASBIH_CLICK (0x25) -> Tasbih count=${cnt} / target=${target}`;
        pulseHardware({ led: cnt % target === 0 ? 'green' : null, vibrateMs: cnt % target === 0 ? 700 : 120, oledMode: 'TASBIH' });
        if (cnt % target === 0) {
          title = 'Tasbih Target Reached';
          message = `Praise counter reached ${cnt} (Target: ${target})! Ring vibrated.`;
        }
        break;
      }
      case DeviceNotifyType.TYPE_RAISE_WRIST: {
        state.screenAwake = !state.screenAwake;
        loadData = [0x73, 0x1C, state.screenAwake ? 1 : 0, state.wearHand === 'left' ? 1 : 0];
        summary = `TYPE_RAISE_WRIST (0x1C) -> screenAwake=${state.screenAwake}, hand=${state.wearHand}`;
        break;
      }
      case DeviceNotifyType.TYPE_RECORD_FILE_COUNT: {
        const newIdx = state.recordings.length + 1;
        const newRec = {
          id: `rec_${Date.now()}`,
          fileName: `QRING_REC_00${newIdx}`,
          createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
          durationSec: 6,
          sourceSizeBytes: 192000,
          sampleRate: 16000,
          channels: 1,
          bitDepth: 16,
          onDevice: true,
          importedLocal: false,
          localFormat: null,
          localPath: null,
          importProgress: 0,
          importing: false,
          notesFreq: [440, 554.37, 659.25, 880, 659.25, 554.37]
        };
        state.recordings.unshift(newRec);
        loadData = [0x73, 0xD1, state.recordings.length];
        summary = `TYPE_RECORD_FILE_COUNT (0xD1) -> Device recorded new PCM audio (${newRec.fileName}), total=${state.recordings.length}`;
        pulseHardware({ led: 'red', vibrateMs: 300 });
        break;
      }
      default:
        summary = `DeviceNotifyRsp (dataType=${dataType})`;
    }

    const hex = toHexPacket(0x73, loadData.slice(1));
    appendLog('NOTIFY', `DeviceNotifyListener.onDataResponse(dataType=${dataType})`, hex, summary);

    if (message) {
      listeners.globalReminder.forEach(fn => fn({ dataType, title, message, loadData }));
    }
    emitStateChange();
  }

  // Ring Physical Tap / Gesture Action (Simulates touching the ring sensor)
  function simulateRingTap() {
    if (!state.connected) {
      if (window.QRingUI && window.QRingUI.toast) {
        window.QRingUI.toast('Ring is disconnected');
      }
      return;
    }
    state.screenAwake = true;

    // If Camera Control mode is active, take a photo!
    if (state.activeSession.cameraControlActive) {
      const hex = toHexPacket(Constants.CMD_TAKING_PICTURE, [0x02]);
      appendLog('NOTIFY', 'CameraNotifyRsp(ACTION_TAKE_PHOTO=2)', hex, 'Ring touch/shake triggered remote camera shutter!');
      pulseHardware({ led: 'green', vibrateMs: 250, oledMode: 'CAMERA' });
      listeners.cameraNotify.forEach(fn => fn({ action: 2, label: 'ACTION_TAKE_PHOTO' }));
      return;
    }

    const appType = state.settings.touchGesture.appType;
    if (appType === 3) {
      triggerDeviceNotify(DeviceNotifyType.TYPE_MUSLIM_TASBIH_CLICK);
      return;
    }
    if (appType === 5) {
      const hex = toHexPacket(Constants.CMD_TAKING_PICTURE, [0x02]);
      appendLog('NOTIFY', 'CameraNotifyRsp(ACTION_TAKE_PHOTO)', hex, 'Ring touch triggered camera shutter');
      pulseHardware({ led: 'green', vibrateMs: 200, oledMode: 'CAMERA' });
      listeners.cameraNotify.forEach(fn => fn({ action: 2, label: 'ACTION_TAKE_PHOTO' }));
      return;
    }
    if (appType === 10) {
      const hex = toHexPacket(0x73, [0x2D, 0x0A, 0x01]);
      appendLog('NOTIFY', 'DeviceNotifyRsp.TYPE_CUSTOM_BUTTON_FUNCTION (Lover Interaction)', hex, 'Ring touch sent "Love You / Heartbeat Touch" event to partner');
      pulseHardware({ led: 'red', vibrateMs: 450 });
      listeners.globalReminder.forEach(fn => fn({
        dataType: 45,
        title: 'Lover Interaction Touch (SAI)',
        message: 'Ring touch detected (appType=10): Partner pulse & light resonance sent!'
      }));
      return;
    }

    // Cycle OLED screen & report custom button event
    const modes = ['CLOCK', 'STEPS', 'HR', 'BATTERY', 'TASBIH'];
    const idx = (modes.indexOf(state.oledMode) + 1) % modes.length;
    state.oledMode = modes[idx];
    const hex = toHexPacket(0x73, [0x2D, appType, idx]);
    appendLog('NOTIFY', `DeviceNotifyRsp.TYPE_CUSTOM_BUTTON_FUNCTION (0x2D)`, hex, `Touch event reported (appType=${appType}), OLED switched to ${state.oledMode}`);
    pulseHardware({ vibrateMs: 100 });
  }

  // --------------------------------------------------------------------------
  // 11. Public SDK Facade for UI Screens
  // --------------------------------------------------------------------------
  return {
    Constants,
    DeviceNotifyType,
    EmotionMap,
    SportTypeCatalog,
    TouchAppTypeCatalog,
    NearbyDevices,
    ActivityScoreUtils,
    SdkLog,
    MessagePushUtil,

    getState: () => state,
    getHistory: (dayOffset = 0) => historicalData[Math.max(0, Math.min(6, dayOffset))],
    getAllHistory: () => Object.values(historicalData),
    getBleLogs: () => bleLogs,
    clearBleLogs: () => {
      bleLogs.length = 0;
      listeners.logs.forEach(fn => fn(null, bleLogs));
    },

    onLog: (fn) => { listeners.logs.add(fn); return () => listeners.logs.delete(fn); },
    onStateChange: (fn) => { listeners.stateChange.add(fn); return () => listeners.stateChange.delete(fn); },
    onGlobalReminder: (fn) => { listeners.globalReminder.add(fn); return () => listeners.globalReminder.delete(fn); },
    onCameraNotify: (fn) => { listeners.cameraNotify.add(fn); return () => listeners.cameraNotify.delete(fn); },

    emitStateChange,
    appendLog,
    checkBleReady,
    executeCommand,
    triggerDeviceNotify,
    simulateRingTap,
    pulseHardware,

    // Connection & Initialization Flow (Section 3 & 4)
    setSystemBluetooth(enabled) {
      state.systemBluetoothEnabled = !!enabled;
      if (!enabled) {
        state.connected = false;
        appendLog('NOTIFY', 'BluetoothAdapter.ACTION_STATE_CHANGED (STATE_OFF)', 'SYS_BT_OFF', 'BleOperateManager.setBluetoothTurnOff(false) -> Disconnected');
      } else {
        appendLog('NOTIFY', 'BluetoothAdapter.ACTION_STATE_CHANGED (STATE_ON)', 'SYS_BT_ON', `BleOperateManager.setBluetoothTurnOff(true) -> Auto-reconnecting to ${state.reConnectMac}`);
        this.connectDirectly(state.reConnectMac, state.deviceName);
      }
      emitStateChange();
    },

    connectDirectly(mac, name) {
      if (!state.systemBluetoothEnabled) {
        checkBleReady('BleOperateManager.connectDirectly');
        return;
      }
      state.connecting = true;
      if (mac) state.deviceAddress = mac;
      if (name) state.deviceName = name;
      const dev = NearbyDevices.find(d => d.mac === state.deviceAddress);
      if (dev) {
        state.deviceName = dev.name;
        state.firmwareVersion = dev.fwVer;
        state.hardwareVersion = dev.hwVer;
        state.capabilities.deviceNoScreen = !dev.hasScreen;
      }
      appendLog('REQ', `BleOperateManager.getInstance().connectDirectly("${state.deviceAddress}")`, 'GATT_CONN', `Connecting to ${state.deviceName} (${state.deviceAddress})...`);
      emitStateChange();

      setTimeout(() => {
        state.connecting = false;
        state.connected = true;
        state.reConnectMac = state.deviceAddress;
        appendLog('NOTIFY', 'MyBluetoothReceiver.connectStatue(device, true)', 'BLE_GATT_CONNECTED', 'GATT connected; discovering services...');
        appendLog('NOTIFY', 'MyBluetoothReceiver.onServiceDiscovered()', 'BLE_SERVICE_DISCOVERED', 'LargeDataHandler.getInstance().initEnable() completed');

        // Post-connect serial initialization queue per Section 3.1 & 4.2
        executeCommand('SimpleKeyReq(Constants.CMD_BIND_SUCCESS)', Constants.CMD_BIND_SUCCESS, [0x01], () => ({
          rspClass: 'BindSuccessRsp',
          rspBytes: [0x01, 0x00],
          summary: 'Bind relationship confirmed (RESULT_OK)'
        }), 80);

        executeCommand('SetTimeReq(1)', 0x01, [0x01, 0x1A, 0x0B, 0x03], () => ({
          rspClass: 'ICommandResponse<SetTimeRsp>',
          rspBytes: [0x01, 0xFF, 0xFF, 0x06],
          summary: `Phone time synced; SetTimeRsp capabilities cached (mSupportTemperature=${state.capabilities.mSupportTemperature}, mSupportAppMeasure=${state.capabilities.mSupportAppMeasure}, mMaxWatchFace=${state.capabilities.mMaxWatchFace})`
        }), 180);

        executeCommand('DeviceSupportReq.getReadInstance()', 0x3C, [0x00], () => ({
          rspClass: 'ICommandResponse<DeviceSupportFunctionRsp>',
          rspBytes: [0x3C, 0xFF, 0x7F, 0x3F],
          summary: `Extended capability bitmap cached (supportTouch=${state.capabilities.supportTouch}, supportGesture=${state.capabilities.supportGesture}, supportBlePair=${state.capabilities.supportBlePair})`
        }), 280);

        executeCommand('SimpleKeyReq(Constants.CMD_GET_DEVICE_ELECTRICITY_VALUE)', Constants.CMD_GET_DEVICE_ELECTRICITY_VALUE, [0x00], () => ({
          rspClass: 'ICommandResponse<BatteryRsp>',
          rspBytes: [0x03, state.batteryValue, state.isCharging ? 1 : 0],
          summary: `BatteryRsp: batteryValue=${state.batteryValue}%, isCharging=${state.isCharging}`
        }), 360);

        appendLog('RSP', 'onCharacteristicRead(CHAR_FIRMWARE_REVISION)', 'GATT_READ_2A26', `Firmware Version=${state.firmwareVersion}, HW=${state.hardwareVersion}`);
        pulseHardware({ led: 'green', vibrateMs: 250 });
        emitStateChange();
      }, 450);
    },

    disconnect() {
      if (!state.connected) return;
      if (state.capabilities.supportBlePair) {
        appendLog('REQ', 'BleOperateManager.getInstance().unBindDevice() [supportBlePair=true]', 'GATT_DISCONN', 'supportBlePair is true -> calling unBindDevice() on disconnect');
      } else {
        appendLog('REQ', 'BleOperateManager.getInstance().disconnect() [supportBlePair=false]', 'GATT_DISCONN', 'Closing current BLE connection while keeping bind address');
      }
      state.connected = false;
      emitStateChange();
    },

    unBindDevice() {
      appendLog('REQ', 'BleOperateManager.getInstance().unBindDevice()', 'GATT_UNBIND', 'Disconnected and cleared device binding relationship');
      state.connected = false;
      state.bonded = false;
      emitStateChange();
    },

    bleCreateBond() {
      if (!checkBleReady('BleOperateManager.bleCreateBond')) return;
      appendLog('REQ', 'BleOperateManager.getInstance().bleCreateBond()', 'SYS_BOND_REQ', 'Initiating Android system Bluetooth pairing (ACTION_BOND_STATE_CHANGED)...');
      setTimeout(() => {
        state.bonded = true;
        appendLog('NOTIFY', 'BluetoothDevice.ACTION_BOND_STATE_CHANGED (BOND_BONDED)', 'SYS_BOND_OK', `System Bluetooth paired with ${state.deviceName} (${state.deviceAddress})`);
        emitStateChange();
        if (window.QRingUI && window.QRingUI.toast) {
          window.QRingUI.toast('Bluetooth Pairing Succeeded (BOND_BONDED)');
        }
      }, 300);
    },

    findDevice() {
      executeCommand('CommandHandle.executeReqCmd(FindDeviceReq())', 0x50, [0x55, 0xAA], () => {
        pulseHardware({ led: 'green', vibrateMs: 1400 });
        return {
          rspClass: 'FindDeviceRsp',
          rspBytes: [0x50, 0x00],
          summary: 'Ring vibrating and blinking green LED to identify itself!'
        };
      });
    }
  };
})();
