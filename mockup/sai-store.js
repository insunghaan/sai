/* ==========================================================================
   SAI Shared Persistent Database, 20,000-User Virtual Enterprise Cohort Engine
   & Hardware Naming Engine (window.SAIStore)
   Shared across Mobile App (index.html) and Admin Console (admin.html)
   ========================================================================== */
(() => {
  'use strict';

  const STORAGE_KEY = 'sai_admin_db_v1';
  const SCHEMA_VERSION = '2026.12.15-v3-friendly20k';

  const VIRTUAL_BASELINE = {
    totalMembers: 20480,
    activeMembers: 19120,
    withdrawnMembers: 1360,
    todaySignups: 184,
    dau: 14820,
    mau: 18940,
    connectedRings: 17890,
    totalDevices: 18650,
    avgBattery: 84,
    pairedCouples: 7320,
    pairedMembers: 14640,
    dailyHealthSyncs: 142840,
    appleHealthUsers: 11420,
    healthConnectUsers: 5180,
    samsungHealthUsers: 3890,
    totalLogs: 284920
  };

  const KR_LAST = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '전'];
  const KR_FIRST = [
    '수민', '윤서', '하은', '민준', '서연', '지우', '도윤', '서윤', '시우', '하준',
    '지호', '주원', '예준', '유진', '채원', '다은', '수아', '지아', '태윤', '건우',
    '현우', '지훈', '유나', '소율', '연우', '시현', '예은', '민서', '지원', '수빈'
  ];
  const EMAIL_DOMAINS = ['sai.io', 'kakao.com', 'naver.com', 'gmail.com', 'icloud.com', 'appleid.com'];
  const PROVIDERS = ['카카오 로그인', 'Apple 로그인', '네이버 로그인', 'Google 로그인', '이메일 인증'];
  const FINISHES = ['Gold', 'Silver', 'Rose Gold'];
  const INTENTS = [
    '수면을 알아가고 싶어요',
    '서로의 하루를 나누고 싶어요',
    '몸의 리듬과 주기를 돌보고 싶어요',
    '활동을 꾸준히 기록하고 싶어요'
  ];

  /**
   * Hardware R22 firmware name: R22_11C1 (BLE Unique ID: F1BE85F511C1)
   * -> SAI Firmware Name: SAI_11C1
   */
  function parseHardwareIdentity(input = 'F1BE85F511C1', baseModel = 'R22') {
    const model = String(baseModel || 'R22').trim().toUpperCase() || 'R22';
    const raw = String(input || 'F1BE85F511C1').trim().toUpperCase();
    const hexOnly = raw.replace(/[^0-9A-F]/g, '');
    let bleId = 'F1BE85F511C1';
    let suffix = '11C1';

    if (hexOnly.length >= 12) {
      bleId = hexOnly.slice(0, 12);
      suffix = bleId.slice(-4);
    } else if (/^(?:SAI|R22)[_-]?([0-9A-Z]{4})$/i.test(raw)) {
      suffix = raw.slice(-4).toUpperCase();
      bleId = ('F1BE85F5' + suffix).slice(-12);
    } else if (hexOnly.length >= 4) {
      suffix = hexOnly.slice(-4);
      bleId = ('F1BE85F5' + suffix).slice(-12);
    }

    const mac = bleId.match(/.{1,2}/g).join(':');
    const legacyFwName = `${model}_${suffix}`;
    const saiName = `SAI_${suffix}`;

    return {
      baseModel: model,
      bleId,
      mac,
      macAddress: mac,
      suffix,
      legacyFwName,
      rawFirmware: legacyFwName,
      saiName,
      saiFirmware: saiName
    };
  }

  function nowFormatted() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function timeOnly() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function buildMemberRecord(seed) {
    const isWithdrawn = String(seed.status || '').toUpperCase() === 'WITHDRAWN';
    const status = isWithdrawn ? 'WITHDRAWN' : 'ACTIVE';
    const idInfo = seed.bleId || seed.ringId
      ? parseHardwareIdentity(seed.bleId || seed.ringId, 'R22')
      : null;

    const ringConnected = !isWithdrawn && Boolean(seed.ring?.connected ?? seed.ringId ?? seed.bleId);
    const ringObj = ringConnected && idInfo
      ? {
          connected: true,
          firmwareName: seed.ring?.firmwareName || idInfo.saiName,
          rawFirmware: seed.ring?.rawFirmware || idInfo.legacyFwName,
          bleId: seed.ring?.bleId || idInfo.bleId,
          macAddress: seed.ring?.macAddress || idInfo.mac,
          finish: seed.ring?.finish || seed.finish || 'Gold',
          battery: seed.ring?.battery ?? seed.battery ?? 86,
          fwVersion: seed.ring?.fwVersion || `${idInfo.saiName} (v1.0.2)`
        }
      : { connected: false, firmwareName: null, rawFirmware: null, bleId: null, battery: 0 };

    const partnerPaired = !isWithdrawn && Boolean(seed.partner?.paired ?? (seed.partnerName && seed.partnerName !== '-'));
    const partnerObj = partnerPaired
      ? {
          paired: true,
          partnerId: seed.partner?.partnerId || seed.partnerId || 'MEM-2026-0002',
          partnerName: seed.partner?.partnerName || seed.partnerName || '윤서',
          partnerEmail: seed.partner?.partnerEmail || seed.partnerEmail || 'yunseo@kakao.com',
          inviteCode: seed.partner?.inviteCode || seed.inviteCode || 'SAI1024',
          pairedSince: seed.partner?.pairedSince || seed.pairedSince || '2026-10-01'
        }
      : { paired: false, partnerId: null, partnerName: '-', partnerEmail: '-', inviteCode: seed.inviteCode || 'SAI1024', pairedSince: null };

    const sleepMinutes = seed.healthSync?.sleepMinutes ?? seed.latestMetrics?.sleepMin ?? 444;
    const sleepHours = Math.floor(sleepMinutes / 60);
    const sleepRemMin = sleepMinutes % 60;
    const steps = seed.healthSync?.steps ?? seed.latestMetrics?.steps ?? 6842;
    const hr = seed.healthSync?.heartRateBpm ?? seed.latestMetrics?.hr ?? 68;
    const hrv = seed.healthSync?.hrvMs ?? seed.latestMetrics?.hrv ?? 64;
    const spo2 = seed.healthSync?.spo2Pct ?? seed.latestMetrics?.spo2 ?? 98;
    const stress = seed.healthSync?.stressIndex ?? seed.latestMetrics?.stress ?? 29;
    const sleepScore = seed.healthSync?.sleepScore ?? seed.latestMetrics?.energyScore ?? 86;
    const skinTempDelta = seed.healthSync?.skinTempDelta ?? '+0.1';
    const lastSyncedAt = seed.healthSync?.lastSyncedAt || seed.lastLoginAt || '2026-11-04 09:38';

    const appleOn = Boolean(
      seed.healthSync?.externalHealth?.appleHealth ??
      seed.externalHealth?.appleHealth?.connected ??
      true
    );
    const hcOn = Boolean(
      seed.healthSync?.externalHealth?.googleHealthConnect ??
      seed.externalHealth?.healthConnect?.connected ??
      false
    );
    const samsungOn = Boolean(
      seed.healthSync?.externalHealth?.samsungHealth ??
      seed.externalHealth?.samsungHealth?.connected ??
      false
    );

    return {
      id: seed.id || 'MEM-2026-0001',
      name: seed.name || '수민',
      email: seed.email || 'sumin@sai.io',
      provider: seed.providerLabel || seed.provider || '이메일 인증',
      providerLabel: seed.providerLabel || seed.provider || '이메일 인증',
      age: Number(seed.age) || 27,
      age14Verified: true,
      gender: seed.gender || '여성',
      height: seed.height ?? 165,
      weight: seed.weight ?? 53,
      intent: seed.intent || '수면을 알아가고 싶어요',
      status,
      withdrawnAt: seed.withdrawnAt || null,
      withdrawReason: seed.withdrawReason || null,
      ringId: ringObj.connected ? ringObj.firmwareName : null,
      bleId: ringObj.connected ? ringObj.bleId : null,
      legacyFwName: ringObj.connected ? ringObj.rawFirmware : null,
      ring: ringObj,
      partnerId: partnerObj.paired ? partnerObj.partnerId : null,
      partnerName: partnerObj.paired ? partnerObj.partnerName : '-',
      pairedSince: partnerObj.paired ? partnerObj.pairedSince : null,
      inviteCode: partnerObj.inviteCode,
      partner: partnerObj,
      joinedAt: seed.joinedAt || '2026-10-01 09:12',
      lastLoginAt: seed.lastLoginAt || '2026-11-04 09:38',
      consents: {
        terms: !isWithdrawn,
        privacy: !isWithdrawn,
        age14: true,
        health: !isWithdrawn && (seed.consents?.health ?? true),
        cycle: !isWithdrawn && (seed.consents?.cycle ?? true),
        location: !isWithdrawn && (seed.consents?.location ?? true),
        marketing: !isWithdrawn && (seed.consents?.marketing ?? false),
        version: 'v1.0 (2026-12-15 시행)',
        agreedAt: seed.joinedAt || '2026-10-01 09:12'
      },
      externalHealth: {
        appleHealth: { connected: appleOn, read: appleOn, write: appleOn, lastSync: appleOn ? lastSyncedAt : '-' },
        healthConnect: { connected: hcOn, read: hcOn, write: hcOn, lastSync: hcOn ? lastSyncedAt : '-' },
        samsungHealth: { connected: samsungOn, read: samsungOn, write: samsungOn, lastSync: samsungOn ? lastSyncedAt : '-' }
      },
      healthSync: {
        sleepMinutes,
        sleepScore,
        heartRateBpm: hr,
        hrvMs: hrv,
        spo2Pct: spo2,
        skinTempDelta,
        steps,
        stressIndex: stress,
        lastSyncedAt,
        externalHealth: {
          appleHealth: appleOn,
          googleHealthConnect: hcOn,
          samsungHealth: samsungOn
        }
      },
      latestMetrics: isWithdrawn ? null : {
        sleepMin: sleepMinutes,
        sleepHours,
        sleepRemMin,
        sleepWindow: '00:12 – 07:58',
        deepText: '1시간 31분',
        remText: '1시간 32분',
        lightText: '4시간 21분',
        awakeText: '22분',
        steps,
        stepGoal: 8000,
        activeMin: Math.round(steps / 135),
        distanceKm: Number((steps * 0.00072).toFixed(1)),
        kcal: Math.round(steps * 0.05),
        hr,
        restingHr: Math.max(48, hr - 12),
        hrRange: `${Math.max(48, hr - 14)}–${hr + 38}`,
        hrv,
        spo2,
        temp: 36.5,
        stress,
        energyScore: sleepScore,
        syncedAt: String(lastSyncedAt).slice(-5)
      }
    };
  }

  function buildDeviceRecord(seed) {
    const idInfo = parseHardwareIdentity(seed.bleId || seed.saiName || seed.firmwareName || 'F1BE85F511C1', seed.baseModel || 'R22');
    const paired = (seed.status === 'bound' || seed.status === 'PAIRED') && Boolean(seed.ownerName || seed.assignedMemberName);
    const ownerName = paired ? (seed.assignedMemberName || seed.ownerName) : null;
    const ownerId = paired ? (seed.assignedMemberId || seed.ownerId) : null;
    return {
      saiName: idInfo.saiName,
      firmwareName: idInfo.saiName,
      legacyFwName: idInfo.legacyFwName,
      rawFirmware: idInfo.legacyFwName,
      baseModel: idInfo.baseModel,
      bleId: idInfo.bleId,
      mac: idInfo.mac,
      macAddress: idInfo.mac,
      finish: seed.finish || 'Gold',
      finishLabel: seed.finishLabel || '골드 (18K Gold)',
      size: seed.size || 9,
      fwVersion: seed.fwVersion || `${idInfo.saiName} (v1.0.2)`,
      sdkVersion: 'QRing_Android_SDK_1.0.0.79',
      battery: seed.battery ?? 86,
      isCharging: Boolean(seed.isCharging),
      rssi: seed.rssi ?? -46,
      status: paired ? 'PAIRED' : 'STANDBY',
      ownerId,
      ownerName,
      assignedMemberId: ownerId,
      assignedMemberName: ownerName,
      lastSyncAt: seed.lastSyncAt || '2026-11-04 09:38',
      diagLogRetention: '2027-02-02 (최대 90일 보관)'
    };
  }

  /**
   * Deterministically generates virtual member #index (1-based up to 20,480)
   * so the 20,000-user directory can paginate, search, and filter smoothly.
   */
  function generateVirtualMemberByIndex(idx) {
    const n = Number(idx) || 1;
    const name = KR_LAST[n % KR_LAST.length] + KR_FIRST[(n * 7 + 3) % KR_FIRST.length];
    const domain = EMAIL_DOMAINS[(n * 5) % EMAIL_DOMAINS.length];
    const email = `member${String(n).padStart(5, '0')}@${domain}`;
    const provider = PROVIDERS[(n * 3) % PROVIDERS.length];
    const isWithdrawn = (n % 15 === 0); // ~6.6% withdrawn (1,360 / 20,480)
    const hasRing = !isWithdrawn && (n % 10 !== 9); // ~90% of active users paired with SAI_XXXX
    const hasPartner = !isWithdrawn && (n % 4 !== 3); // ~75% of active users paired in couples
    const hexSuffix = ((0x1000 + ((n * 2654435761) >>> 0) % 0xEFFF) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    const bleId = `F1BE85F5${hexSuffix}`;
    const finish = FINISHES[n % FINISHES.length];
    const battery = 62 + (n * 17) % 37;
    const partnerIdx = n % 2 === 0 ? n + 1 : Math.max(1, n - 1);
    const partnerName = KR_LAST[partnerIdx % KR_LAST.length] + KR_FIRST[(partnerIdx * 7 + 3) % KR_FIRST.length];
    const partnerEmail = `member${String(partnerIdx).padStart(5, '0')}@${EMAIL_DOMAINS[(partnerIdx * 5) % EMAIL_DOMAINS.length]}`;
    const month = 8 + (n % 4);
    const day = 1 + (n % 28);
    const hour = 7 + (n % 16);
    const min = (n * 7) % 60;
    const pad = (v) => String(v).padStart(2, '0');

    return buildMemberRecord({
      id: `MEM-2026-${String(n).padStart(5, '0')}`,
      name,
      email,
      providerLabel: provider,
      age: 21 + (n % 24),
      gender: n % 2 === 0 ? '여성' : '남성',
      height: n % 2 === 0 ? 158 + (n % 14) : 170 + (n % 16),
      weight: n % 2 === 0 ? 47 + (n % 15) : 64 + (n % 20),
      intent: INTENTS[n % INTENTS.length],
      status: isWithdrawn ? 'WITHDRAWN' : 'ACTIVE',
      withdrawnAt: isWithdrawn ? `2026-11-0${1 + (n % 4)} 14:${pad(min)}` : null,
      bleId: hasRing ? bleId : null,
      finish,
      battery,
      partnerId: hasPartner ? `MEM-2026-${String(partnerIdx).padStart(5, '0')}` : null,
      partnerName: hasPartner ? partnerName : '-',
      partnerEmail: hasPartner ? partnerEmail : '-',
      pairedSince: hasPartner ? `2026-${pad(month)}-${pad(day)}` : null,
      inviteCode: `SAI${hexSuffix}`,
      joinedAt: `2026-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(min)}`,
      lastLoginAt: `2026-11-04 ${pad(6 + (n % 4))}:${pad(min)}`,
      consents: {
        health: true,
        cycle: n % 2 === 0,
        location: n % 3 !== 0,
        marketing: n % 2 === 0
      },
      healthSync: {
        sleepMinutes: 390 + ((n * 19) % 115),
        sleepScore: 76 + (n % 21),
        heartRateBpm: 56 + (n % 22),
        hrvMs: 44 + (n % 38),
        spo2Pct: 96 + (n % 4),
        skinTempDelta: n % 3 === 0 ? '+0.1' : n % 3 === 1 ? '+0.0' : '-0.1',
        steps: 4200 + ((n * 317) % 7800),
        stressIndex: 18 + (n % 34),
        lastSyncedAt: `2026-11-04 ${pad(6 + (n % 4))}:${pad(min)}`,
        externalHealth: {
          appleHealth: n % 2 === 0,
          googleHealthConnect: n % 3 === 0,
          samsungHealth: n % 4 === 0
        }
      }
    });
  }

  function defaultDatabase() {
    const seedMembers = [
      {
        id: 'MEM-2026-00001',
        name: '김수민',
        email: 'sumin@sai.io',
        providerLabel: '이메일 인증',
        age: 27,
        gender: '여성',
        height: 165,
        weight: 53,
        bleId: 'F1BE85F511C1',
        finish: 'Gold',
        battery: 86,
        partnerId: 'MEM-2026-00002',
        partnerName: '이윤서',
        partnerEmail: 'yunseo@kakao.com',
        pairedSince: '2026-10-01',
        inviteCode: 'SAI1024',
        joinedAt: '2026-10-01 09:12',
        lastLoginAt: '2026-11-04 09:38',
        healthSync: {
          sleepMinutes: 444,
          sleepScore: 88,
          heartRateBpm: 64,
          hrvMs: 66,
          spo2Pct: 98,
          skinTempDelta: '+0.1',
          steps: 6842,
          stressIndex: 24,
          lastSyncedAt: '2026-11-04 09:38',
          externalHealth: { appleHealth: true, googleHealthConnect: false, samsungHealth: false }
        }
      },
      {
        id: 'MEM-2026-00002',
        name: '이윤서',
        email: 'yunseo@kakao.com',
        providerLabel: '카카오 로그인',
        age: 29,
        gender: '남성',
        height: 178,
        weight: 72,
        bleId: 'A4C138900428',
        finish: 'Silver',
        battery: 79,
        partnerId: 'MEM-2026-00001',
        partnerName: '김수민',
        partnerEmail: 'sumin@sai.io',
        pairedSince: '2026-10-01',
        inviteCode: 'SAI1024',
        joinedAt: '2026-10-01 09:20',
        lastLoginAt: '2026-11-04 09:35',
        healthSync: {
          sleepMinutes: 412,
          sleepScore: 84,
          heartRateBpm: 62,
          hrvMs: 69,
          spo2Pct: 99,
          skinTempDelta: '+0.0',
          steps: 7910,
          stressIndex: 27,
          lastSyncedAt: '2026-11-04 09:35',
          externalHealth: { appleHealth: false, googleHealthConnect: true, samsungHealth: true }
        }
      },
      {
        id: 'MEM-2026-00003',
        name: '박하은',
        email: 'haeun@naver.com',
        providerLabel: '네이버 로그인',
        age: 25,
        gender: '여성',
        height: 162,
        weight: 49,
        bleId: 'C8478C911024',
        finish: 'Rose Gold',
        battery: 92,
        partnerId: 'MEM-2026-00004',
        partnerName: '최민준',
        partnerEmail: 'minjun.kim@gmail.com',
        pairedSince: '2026-10-14',
        inviteCode: 'SAI7721',
        joinedAt: '2026-10-14 18:04',
        lastLoginAt: '2026-11-04 09:22',
        healthSync: {
          sleepMinutes: 468,
          sleepScore: 91,
          heartRateBpm: 67,
          hrvMs: 61,
          spo2Pct: 98,
          skinTempDelta: '+0.1',
          steps: 5420,
          stressIndex: 22,
          lastSyncedAt: '2026-11-04 09:22',
          externalHealth: { appleHealth: true, googleHealthConnect: false, samsungHealth: false }
        }
      },
      {
        id: 'MEM-2026-00004',
        name: '최민준',
        email: 'minjun.kim@gmail.com',
        providerLabel: 'Google 로그인',
        age: 31,
        gender: '남성',
        height: 181,
        weight: 76,
        bleId: 'D4910F2388E4',
        finish: 'Silver',
        battery: 74,
        partnerId: 'MEM-2026-00003',
        partnerName: '박하은',
        partnerEmail: 'haeun@naver.com',
        pairedSince: '2026-10-14',
        inviteCode: 'SAI7721',
        joinedAt: '2026-10-14 18:19',
        lastLoginAt: '2026-11-04 09:18',
        healthSync: {
          sleepMinutes: 405,
          sleepScore: 83,
          heartRateBpm: 59,
          hrvMs: 72,
          spo2Pct: 98,
          skinTempDelta: '+0.0',
          steps: 10420,
          stressIndex: 25,
          lastSyncedAt: '2026-11-04 09:18',
          externalHealth: { appleHealth: false, googleHealthConnect: true, samsungHealth: false }
        }
      },
      {
        id: 'MEM-2026-00005',
        name: '정지우',
        email: 'jiwoo@sai.kr',
        providerLabel: 'Apple 로그인',
        age: 28,
        gender: '여성',
        height: 166,
        weight: 52,
        bleId: 'B87219A03C9D',
        finish: 'Gold',
        battery: 91,
        partnerId: 'MEM-2026-00006',
        partnerName: '강도윤',
        partnerEmail: 'doyun@sai.kr',
        pairedSince: '2026-10-19',
        inviteCode: 'SAI3C9D',
        joinedAt: '2026-10-19 11:05',
        lastLoginAt: '2026-11-04 09:31',
        healthSync: {
          sleepMinutes: 452,
          sleepScore: 89,
          heartRateBpm: 63,
          hrvMs: 68,
          spo2Pct: 99,
          skinTempDelta: '+0.1',
          steps: 7280,
          stressIndex: 21,
          lastSyncedAt: '2026-11-04 09:31',
          externalHealth: { appleHealth: true, googleHealthConnect: false, samsungHealth: false }
        }
      },
      {
        id: 'MEM-2026-00006',
        name: '강도윤',
        email: 'doyun@sai.kr',
        providerLabel: '카카오 로그인',
        age: 30,
        gender: '남성',
        height: 179,
        weight: 74,
        bleId: 'E7410C885A12',
        finish: 'Silver',
        battery: 83,
        partnerId: 'MEM-2026-00005',
        partnerName: '정지우',
        partnerEmail: 'jiwoo@sai.kr',
        pairedSince: '2026-10-19',
        inviteCode: 'SAI3C9D',
        joinedAt: '2026-10-19 11:12',
        lastLoginAt: '2026-11-04 09:29',
        healthSync: {
          sleepMinutes: 430,
          sleepScore: 86,
          heartRateBpm: 61,
          hrvMs: 65,
          spo2Pct: 98,
          skinTempDelta: '+0.0',
          steps: 8640,
          stressIndex: 26,
          lastSyncedAt: '2026-11-04 09:29',
          externalHealth: { appleHealth: true, googleHealthConnect: true, samsungHealth: false }
        }
      },
      {
        id: 'MEM-2026-00007',
        name: '조서윤',
        email: 'seoyun.cho@icloud.com',
        providerLabel: 'Apple 로그인',
        age: 26,
        gender: '여성',
        height: 163,
        weight: 50,
        bleId: '91AF04D27B18',
        finish: 'Rose Gold',
        battery: 88,
        partnerId: 'MEM-2026-00008',
        partnerName: '윤시우',
        partnerEmail: 'siwoo.yoon@kakao.com',
        pairedSince: '2026-10-24',
        inviteCode: 'SAI7B18',
        joinedAt: '2026-10-24 20:15',
        lastLoginAt: '2026-11-04 09:14',
        healthSync: {
          sleepMinutes: 460,
          sleepScore: 90,
          heartRateBpm: 65,
          hrvMs: 63,
          spo2Pct: 99,
          skinTempDelta: '+0.1',
          steps: 6190,
          stressIndex: 23,
          lastSyncedAt: '2026-11-04 09:14',
          externalHealth: { appleHealth: true, googleHealthConnect: false, samsungHealth: false }
        }
      },
      {
        id: 'MEM-2026-00008',
        name: '윤시우',
        email: 'siwoo.yoon@kakao.com',
        providerLabel: '카카오 로그인',
        age: 28,
        gender: '남성',
        height: 176,
        weight: 70,
        bleId: '309E7B116D40',
        finish: 'Gold',
        battery: 81,
        partnerId: 'MEM-2026-00007',
        partnerName: '조서윤',
        partnerEmail: 'seoyun.cho@icloud.com',
        pairedSince: '2026-10-24',
        inviteCode: 'SAI7B18',
        joinedAt: '2026-10-24 20:22',
        lastLoginAt: '2026-11-04 09:11',
        healthSync: {
          sleepMinutes: 418,
          sleepScore: 84,
          heartRateBpm: 60,
          hrvMs: 70,
          spo2Pct: 98,
          skinTempDelta: '-0.1',
          steps: 9120,
          stressIndex: 28,
          lastSyncedAt: '2026-11-04 09:11',
          externalHealth: { appleHealth: false, googleHealthConnect: false, samsungHealth: true }
        }
      },
      {
        id: 'MEM-2026-00009',
        name: '장채원',
        email: 'chaewon.jang@naver.com',
        providerLabel: '네이버 로그인',
        age: 24,
        gender: '여성',
        height: 161,
        weight: 48,
        bleId: '54CC9012E3A9',
        finish: 'Gold',
        battery: 94,
        partnerId: null,
        partnerName: '-',
        joinedAt: '2026-10-29 14:40',
        lastLoginAt: '2026-11-04 09:05',
        healthSync: {
          sleepMinutes: 475,
          sleepScore: 92,
          heartRateBpm: 66,
          hrvMs: 67,
          spo2Pct: 99,
          skinTempDelta: '+0.0',
          steps: 6530,
          stressIndex: 19,
          lastSyncedAt: '2026-11-04 09:05',
          externalHealth: { appleHealth: true, googleHealthConnect: false, samsungHealth: false }
        }
      },
      {
        id: 'MEM-2026-00010',
        name: '한서연',
        email: 'privaterelay@appleid.com',
        providerLabel: 'Apple 로그인 (이메일 가리기)',
        age: 28,
        gender: '여성',
        height: 167,
        weight: 55,
        status: 'WITHDRAWN',
        withdrawnAt: '2026-11-02 16:40',
        withdrawReason: '앱 내 회원 탈퇴 신청 완료 (개인 기록 즉시 파기 · 백업 30일 이내 소거 예정)',
        joinedAt: '2026-10-05 11:00',
        lastLoginAt: '2026-11-02 16:38'
      }
    ].map(buildMemberRecord);

    const seedDevices = [
      buildDeviceRecord({ bleId: 'F1BE85F511C1', finish: 'Gold', size: 8, battery: 86, rssi: -44, status: 'PAIRED', assignedMemberId: 'MEM-2026-00001', assignedMemberName: '김수민' }),
      buildDeviceRecord({ bleId: 'A4C138900428', finish: 'Silver', size: 11, battery: 79, rssi: -51, status: 'PAIRED', assignedMemberId: 'MEM-2026-00002', assignedMemberName: '이윤서' }),
      buildDeviceRecord({ bleId: 'C8478C911024', finish: 'Rose Gold', size: 7, battery: 92, rssi: -48, status: 'PAIRED', assignedMemberId: 'MEM-2026-00003', assignedMemberName: '박하은' }),
      buildDeviceRecord({ bleId: 'D4910F2388E4', finish: 'Silver', size: 12, battery: 74, rssi: -55, status: 'PAIRED', assignedMemberId: 'MEM-2026-00004', assignedMemberName: '최민준' }),
      buildDeviceRecord({ bleId: 'B87219A03C9D', finish: 'Gold', size: 8, battery: 91, rssi: -42, status: 'PAIRED', assignedMemberId: 'MEM-2026-00005', assignedMemberName: '정지우' }),
      buildDeviceRecord({ bleId: 'E7410C885A12', finish: 'Silver', size: 11, battery: 83, rssi: -49, status: 'PAIRED', assignedMemberId: 'MEM-2026-00006', assignedMemberName: '강도윤' }),
      buildDeviceRecord({ bleId: '91AF04D27B18', finish: 'Rose Gold', size: 7, battery: 88, rssi: -46, status: 'PAIRED', assignedMemberId: 'MEM-2026-00007', assignedMemberName: '조서윤' }),
      buildDeviceRecord({ bleId: '309E7B116D40', finish: 'Gold', size: 10, battery: 81, rssi: -53, status: 'PAIRED', assignedMemberId: 'MEM-2026-00008', assignedMemberName: '윤시우' }),
      buildDeviceRecord({ bleId: '54CC9012E3A9', finish: 'Gold', size: 8, battery: 94, rssi: -45, status: 'PAIRED', assignedMemberId: 'MEM-2026-00009', assignedMemberName: '장채원' }),
      buildDeviceRecord({ bleId: 'E219448A9F2A', finish: 'Gold', size: 9, battery: 96, rssi: -47, status: 'STANDBY', assignedMemberId: null, assignedMemberName: null })
    ];

    return {
      version: SCHEMA_VERSION,
      activeMemberId: 'MEM-2026-00001',
      selectedRingId: 'SAI_11C1',
      deltas: {
        addedMembers: 0,
        withdrawnDelta: 0,
        pairedRingsDelta: 0,
        registeredDevicesDelta: 0,
        pairedCouplesDelta: 0,
        syncCountDelta: 0
      },
      members: seedMembers,
      devices: seedDevices,
      auditLogs: [
        { at: '2026-11-04 09:38', type: 'HEALTH_SYNC', actor: '김수민 (SAI_11C1)', detail: '어젯밤 수면(7시간 24분)과 현재 심박수(64bpm) 기록을 링에서 앱으로 불러왔어요' },
        { at: '2026-11-04 09:35', type: 'HEALTH_SYNC', actor: '이윤서 (SAI_0428)', detail: '구글 헬스 커넥트와 연결해 수면(6시간 52분)과 걸음 수(7,910걸음)를 함께 기록했어요' },
        { at: '2026-11-04 09:31', type: 'COUPLE_CARE', actor: '정지우 ↔ 강도윤', detail: '초대 코드(SAI3C9D)로 두 분이 연결되어 아침 안부와 배려 카드를 나누기 시작했어요' },
        { at: '2026-11-04 09:26', type: 'RING_PAIR', actor: '박하은 (SAI_1024)', detail: '기본 모델(R22_1024)을 사이 전용 이름(SAI_1024)으로 바꾸어 앱과 연결했어요' },
        { at: '2026-11-04 09:20', type: 'MEMBER_JOIN', actor: '장채원 (MEM-2026-00009)', detail: '만 14세 이상 확인과 필수 이용약관 동의 후 새로 가입했어요' },
        { at: '2026-11-04 09:14', type: 'EXT_HEALTH', actor: '조서윤 (SAI_7B18)', detail: '애플 건강 앱과 수면·심박 기록을 자동으로 주고받도록 설정했어요' },
        { at: '2026-11-04 09:08', type: 'BATCH_TELEMETRY', actor: '사이 자동 집계', detail: '연결된 링 17,890대의 오늘 아침 평균 수면(7시간 18분)과 배터리(84%) 요약을 마쳤어요' },
        { at: '2026-11-02 16:40', type: 'WITHDRAWAL', actor: '한서연 (MEM-2026-00010)', detail: '회원 탈퇴 신청에 따라 개인 건강 기록을 즉시 지우고 파트너 연결을 해제했어요' }
      ],
      inquiries: [
        {
          id: 'INQ-2026-01',
          createdAt: '2026-11-04 09:10',
          memberName: '박하은',
          email: 'haeun@naver.com',
          category: '스마트링 연결 문의',
          subject: '블루투스 검색 화면에서 기기 이름이 SAI_1024로 보여요',
          content: '처음 안내서에는 R22_1024로 적혀 있었는데 앱에서는 SAI_1024로 나타납니다. 정상 기기가 맞는지 궁금해요.',
          status: 'OPEN'
        },
        {
          id: 'INQ-2026-02',
          createdAt: '2026-11-04 08:42',
          memberName: '최민준',
          email: 'minjun.kim@gmail.com',
          category: '건강 앱 연동 문의',
          subject: '스마트링 수면 기록이 휴대폰 건강 앱에는 언제 옮겨지나요?',
          content: '아침에 일어나서 앱을 열었을 때 구글 헬스 커넥트로도 바로 기록이 넘어가는지 알고 싶습니다.',
          status: 'OPEN'
        },
        {
          id: 'INQ-2026-03',
          createdAt: '2026-11-03 21:15',
          memberName: '정지우',
          email: 'jiwoo@sai.kr',
          category: '파트너 공유 문의',
          subject: '생리 주기 공유를 끄면 상대방 화면에서도 바로 사라지나요?',
          content: '공유 설정에서 주기 공유를 잠시 껐을 때 파트너 화면에서도 즉시 보이지 않게 되는지 확인 부탁드려요.',
          status: 'ANSWERED'
        },
        {
          id: 'INQ-2026-04',
          createdAt: '2026-11-02 16:40',
          memberName: '한서연',
          email: 'privaterelay@appleid.com',
          category: '탈퇴 및 기록 삭제 확인',
          subject: '회원 탈퇴 후 제 건강 기록이 모두 지워졌는지 확인하고 싶어요',
          content: '앱에서 회원 탈퇴를 완료했는데 제 수면과 심박 기록이 안전하게 삭제되었는지 안내 부탁드립니다.',
          status: 'ANSWERED'
        }
      ],
      appSettings: {
        showSelectAllTerms: true,
        allowSkipRingPairing: true,
        requireAge14Check: true,
        ringBlePrefix: 'SAI_',
        ringHelpDelaySec: '4',
        autoSyncInterval: '15m',
        morningCheckinTime: '08:00',
        defaultCoupleShareScope: 'all_4',
        togetherBreathSec: '24',
        updatedAt: '2026-11-04 09:00'
      }
    };
  }

  function normalizeDb(db) {
    if (!db || db.version !== SCHEMA_VERSION || !Array.isArray(db.members)) {
      return defaultDatabase();
    }
    db.members = db.members.map(buildMemberRecord);
    db.devices = (db.devices || []).map(buildDeviceRecord);
    db.auditLogs = Array.isArray(db.auditLogs) ? db.auditLogs : [];
    db.inquiries = Array.isArray(db.inquiries) ? db.inquiries : [];
    db.deltas = db.deltas || {
      addedMembers: 0,
      withdrawnDelta: 0,
      pairedRingsDelta: 0,
      registeredDevicesDelta: 0,
      pairedCouplesDelta: 0,
      syncCountDelta: 0
    };
    db.appSettings = {
      showSelectAllTerms: true,
      allowSkipRingPairing: true,
      requireAge14Check: true,
      ringBlePrefix: 'SAI_',
      ringHelpDelaySec: '4',
      autoSyncInterval: '15m',
      morningCheckinTime: '08:00',
      defaultCoupleShareScope: 'all_4',
      togetherBreathSec: '24',
      updatedAt: '2026-11-04 09:00',
      ...(db.appSettings || {})
    };
    return db;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seed = defaultDatabase();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        return seed;
      }
      const parsed = JSON.parse(raw);
      const normalized = normalizeDb(parsed);
      if (parsed.version !== SCHEMA_VERSION) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      }
      return normalized;
    } catch {
      return defaultDatabase();
    }
  }

  function save(db) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      window.dispatchEvent(new CustomEvent('sai-store-updated'));
    } catch {
      // ignore quota errors
    }
    return db;
  }

  function resetToDefault() {
    const seed = defaultDatabase();
    save(seed);
    return seed;
  }

  function ensureMemberMaterialized(db, memberIdOrEmail) {
    const key = String(memberIdOrEmail || '').trim();
    let m = db.members.find(
      (x) => x.id === key || x.email.toLowerCase() === key.toLowerCase()
    );
    if (m) return m;

    const match = key.match(/MEM-2026-(\d+)/i);
    if (match) {
      const idx = Number(match[1]);
      m = generateVirtualMemberByIndex(idx);
      db.members.push(m);
      return m;
    }
    return db.members[0];
  }

  function getDashboardStats() {
    const db = load();
    const d = db.deltas || {};
    const totalMembers = VIRTUAL_BASELINE.totalMembers + (d.addedMembers || 0);
    const withdrawnMembers = Math.max(0, VIRTUAL_BASELINE.withdrawnMembers + (d.withdrawnDelta || 0));
    const activeMembers = Math.max(0, totalMembers - withdrawnMembers);
    const connectedRings = Math.max(0, VIRTUAL_BASELINE.connectedRings + (d.pairedRingsDelta || 0));
    const totalDevices = Math.max(connectedRings, VIRTUAL_BASELINE.totalDevices + (d.registeredDevicesDelta || 0));
    const pairedCouples = Math.max(0, VIRTUAL_BASELINE.pairedCouples + (d.pairedCouplesDelta || 0));
    const pairedMembers = pairedCouples * 2;
    const openInquiries = db.inquiries.filter((i) => i.status !== 'ANSWERED').length + 10;
    const totalLogs = VIRTUAL_BASELINE.totalLogs + db.auditLogs.length + (d.syncCountDelta || 0);
    const dailyHealthSyncs = VIRTUAL_BASELINE.dailyHealthSyncs + (d.syncCountDelta || 0);

    return {
      totalMembers,
      activeMembers,
      withdrawnMembers,
      activeRate: ((activeMembers / totalMembers) * 100).toFixed(1),
      todaySignups: VIRTUAL_BASELINE.todaySignups + (d.addedMembers || 0),
      dau: VIRTUAL_BASELINE.dau + (d.addedMembers || 0),
      mau: VIRTUAL_BASELINE.mau + (d.addedMembers || 0),
      connectedRings,
      totalDevices,
      ringPairingRate: ((connectedRings / activeMembers) * 100).toFixed(1),
      avgBattery: VIRTUAL_BASELINE.avgBattery,
      pairedCouples,
      pairedMembers,
      coupleRate: ((pairedMembers / activeMembers) * 100).toFixed(1),
      dailyHealthSyncs,
      appleHealthUsers: VIRTUAL_BASELINE.appleHealthUsers,
      healthConnectUsers: VIRTUAL_BASELINE.healthConnectUsers,
      samsungHealthUsers: VIRTUAL_BASELINE.samsungHealthUsers,
      openInquiries,
      totalLogs
    };
  }

  function getEnterpriseAnalytics() {
    return {
      weeklyGrowth: {
        labels: ['8월 3주', '8월 4주', '9월 1주', '9월 2주', '9월 3주', '9월 4주', '10월 1주', '10월 2주', '10월 3주', '10월 4주', '11월 1주'],
        totalUsers: [4200, 5850, 7420, 9180, 11040, 12960, 14820, 16540, 18120, 19490, 20480],
        activeRings: [3610, 5040, 6480, 8010, 9680, 11340, 12980, 14490, 15840, 17020, 17890]
      },
      hourlySyncs: {
        labels: ['00시', '03시', '06시', '08시', '10시', '12시', '15시', '18시', '21시', '23시'],
        values: [6840, 4120, 14280, 28450, 19620, 11480, 10840, 14920, 18490, 13800]
      },
      cohortHealth: {
        avgSleepHours: '7시간 18분',
        avgSleepScore: 86.4,
        avgRestingHr: '57 bpm',
        avgHrv: '64 ms',
        avgSpo2: '98.4%',
        avgSteps: '7,420걸음'
      },
      firmwareBreakdown: [
        { version: 'SAI_XXXX (v1.0.2 최신)', count: 15420, ratio: '86.2%' },
        { version: 'SAI_XXXX (v1.0.1 안정)', count: 2110, ratio: '11.8%' },
        { version: 'SAI_XXXX (v1.0.0 초기)', count: 360, ratio: '2.0%' }
      ],
      finishBreakdown: [
        {
          key: 'Gold',
          finish: 'Gold (18K 샴페인 골드)',
          shortName: '18K 골드',
          swatch: 'linear-gradient(135deg, #ECCF8B 0%, #B88732 100%)',
          count: 8410,
          ratio: '47.0%',
          pct: 47.0,
          popularSizes: '인기 호수: 11 · 12 · 14호',
          couplePref: '커플 세트 1위 (54.2%)',
          activeRate: '연결률 95.8% · 일 21.4시간',
          stockCount: 380,
          stockBadge: '재고 380대',
          stockTone: 'good'
        },
        {
          key: 'Silver',
          finish: 'Silver (퓨어 실버)',
          shortName: '퓨어 실버',
          swatch: 'linear-gradient(135deg, #E8ECEF 0%, #9BA3AE 100%)',
          count: 5900,
          ratio: '33.0%',
          pct: 33.0,
          popularSizes: '인기 호수: 15 · 16 · 18호',
          couplePref: '단독·남성 선호 1위 (48.6%)',
          activeRate: '연결률 94.1% · 일 20.8시간',
          stockCount: 295,
          stockBadge: '재고 295대',
          stockTone: 'good'
        },
        {
          key: 'Rose Gold',
          finish: 'Rose Gold (웜 로즈골드)',
          shortName: '로즈골드',
          swatch: 'linear-gradient(135deg, #F2C4B6 0%, #C47A65 100%)',
          count: 3580,
          ratio: '20.0%',
          pct: 20.0,
          popularSizes: '인기 호수: 9 · 10 · 11호',
          couplePref: '선물·여성 만족도 1위 (98.4%)',
          activeRate: '연결률 96.4% · 일 21.9시간',
          stockCount: 64,
          stockBadge: '재고 부족 (64대)',
          stockTone: 'caution'
        }
      ],
      actionableInsights: [
        {
          id: 'INS-RING',
          severity: 'warning',
          badge: '우선 과제 1 · 페어링',
          screen: '#ring 링 검색',
          title: '블루투스 탐색 지연 시 이탈 14.2% · 연타 11.4%',
          cause: '크래들 미거치 또는 설명서 모델명(R22)과 앱 표시명(SAI) 혼동.',
          solution: '탐색 4초 후 자동 변환 안내 및 도움말(#ringhelp) 배너 자동 노출.',
          primaryActionLabel: '여정 맵 보기 →',
          primaryGotoTab: 'journey',
          primaryNodeId: 'ring',
          secondaryActionLabel: '앱 설정',
          secondaryGotoTab: 'support'
        },
        {
          id: 'INS-COUPLE',
          severity: 'caution',
          badge: '우선 과제 2 · 커플 연결',
          screen: '#together 초대 대기',
          title: '초대 코드 발송 후 24시간 미수락 1,840명 (9.0%)',
          cause: '초대 코드 공유 후 상대방의 앱 설치 및 코드 입력 지연.',
          solution: '24시간 미수락 시 원터치 리마인드 발송 (전환율 82.4% 달성).',
          primaryActionLabel: '대기 현황 →',
          primaryGotoTab: 'couples',
          secondaryActionLabel: '경로 보기',
          secondaryGotoTab: 'journey',
          primaryNodeId: 'together'
        },
        {
          id: 'INS-SIGNUP',
          severity: 'good',
          badge: '개선 완료 · 약관 동의',
          screen: '#signup 약관 동의',
          title: '전체 동의 버튼 상단 배치 후 가입 전환율 91.4%',
          cause: '민감정보 개별 체크 누락으로 인한 비활성 버튼 연타(5.8%) 해소.',
          solution: '상단 전체 동의 고정 및 한 화면 레이아웃 압축 적용 완료.',
          primaryActionLabel: '약관 설정 →',
          primaryGotoTab: 'support',
          secondaryActionLabel: '여정 확인',
          secondaryGotoTab: 'journey',
          primaryNodeId: 'signup'
        }
      ],
      providerBreakdown: [
        { label: '카카오 간편가입', count: 11060, ratio: '54.0%', pct: 54.0, note: '커플 초대 연동 81.2%' },
        { label: 'Apple 로그인', count: 5734, ratio: '28.0%', pct: 28.0, note: 'Apple 건강 연동 92.4%' },
        { label: '네이버 로그인', count: 2253, ratio: '11.0%', pct: 11.0, note: '스마트스토어 구매 유입' },
        { label: '이메일 가입', count: 1433, ratio: '7.0%', pct: 7.0, note: '비밀번호 재설정 문의 일부' }
      ],
      churnReasons: [
        { reason: '실물 링 배송 전 앱만 설치 후 이탈', count: 560, ratio: '41.2%', pct: 41.2, fix: '링 없이 둘러보기 모드 기본 활성화' },
        { reason: '블루투스 페어링(R22→SAI) 방법 미숙', count: 360, ratio: '26.5%', pct: 26.5, fix: '탐색 4초 후 크래들 LED 및 변환 안내 자동 노출' },
        { reason: '파트너 연결 해제 후 사용 중단', count: 270, ratio: '19.8%', pct: 19.8, fix: '연결 해제 시 개인 수면·심박 케어 모드로 전환' },
        { reason: '기타 (기기 변경 · 일시 휴식)', count: 170, ratio: '12.5%', pct: 12.5, fix: '재가입 시 계정 복구 또는 즉시 삭제 지원' }
      ],
      pairingDiagnostics: [
        { issue: '크래들 미거치 상태에서 검색 시도', share: '48.2%', count: '1,210건', action: '검색 화면 상단에 크래들 LED 확인 안내 노출' },
        { issue: '설명서 모델명(R22)과 앱 표시명(SAI) 혼동', share: '31.5%', count: '790건', action: 'R22 → SAI_XXXX 자동 변환 안내 명시' },
        { issue: '블루투스 권한 미허용 · 기존 기기 간섭', share: '20.3%', count: '510건', action: '권한 미허용 시 OS 설정 바로가기 표시' }
      ],
      journeySteps: [
        {
          step: '01',
          stage: '앱 첫 만남 · 시작 화면',
          screenName: '시작하기 (#welcome)',
          hash: '#welcome',
          users: 22400,
          rate: '100%',
          stayTime: '평균 14초',
          dropNote: '가입 전 둘러보기 후 91.4%가 회원가입으로 이동해요',
          summary: '앱을 처음 열었을 때 만나는 따뜻한 노을 배경의 시작 화면이에요. [사이 시작하기] 또는 [이미 계정이 있어요] 버튼을 눌러 여정을 시작합니다.',
          actions: ['사이 시작하기 클릭 (91.4%)', '기존 계정 로그인 (8.6%)']
        },
        {
          step: '02',
          stage: '간편 가입 · 약관 동의',
          screenName: '가입 및 약관 동의 (#signup)',
          hash: '#signup',
          users: 20480,
          rate: '91.4%',
          stayTime: '평균 42초',
          dropNote: '카카오·Apple·이메일 간편 가입으로 20,480명이 가입을 마쳤어요',
          summary: '카카오, Apple, 네이버 또는 이메일로 가입하고 만 14세 이상 확인 및 서비스 이용약관·개인정보 수집에 동의하는 화면이에요.',
          actions: ['필수 약관 한 번에 동의 (96.2%)', '약관 전문 펼쳐보기 (18.4%)']
        },
        {
          step: '03',
          stage: '나를 소개하는 시간',
          screenName: '이름·신체·목적 입력 (#name ~ #intent)',
          hash: '#name',
          users: 19640,
          rate: '95.9%',
          stayTime: '평균 55초',
          dropNote: '수면 파악(48%)과 서로의 하루 나누기(34%)를 가장 많이 골랐어요',
          summary: '불리고 싶은 이름, 나이·성별·키·몸무게, 그리고 사이 앱을 통해 가장 돌보고 싶은 마음(수면, 커플 연결, 주기 등)을 차례로 선택해요.',
          actions: ['수면을 알아가고 싶어요 (48%)', '서로의 하루를 나누고 싶어요 (34%)']
        },
        {
          step: '04',
          stage: '스마트링 찾기 · 연결 완료',
          screenName: '링 검색 및 연결 (#ring → #ringdone)',
          hash: '#ring',
          users: 17890,
          rate: '91.1%',
          stayTime: '평균 38초',
          dropNote: '아직 실물 링을 배송 중인 1,230명은 [나중에 연결하기]로 먼저 둘러봐요',
          summary: '충전 크래들에 올려둔 스마트링(예: R22_11C1 → SAI_11C1)을 블루투스로 자동 검색해 터치 한 번으로 연결을 마치는 화면이에요.',
          actions: ['SAI_XXXX 기기 즉시 연결 (91.1%)', '링 없이 먼저 둘러보기 (8.9%)']
        },
        {
          step: '05',
          stage: '아침 기분 체크인 · 오늘 홈',
          screenName: '체크인 및 오늘 홈 (#checkin → #today)',
          hash: '#today',
          users: 14820,
          rate: '82.8%',
          stayTime: '평균 2분 15초',
          dropNote: '매일 아침 14,820명이 어젯밤 수면 점수와 기분을 확인하고 있어요',
          summary: '아침마다 오늘의 기분과 한마디를 남기고, 밤사이 스마트링이 기록한 수면·심박·활동 요약과 파트너의 안부를 한눈에 살피는 메인 화면이에요.',
          actions: ['오늘의 기분 체크인 완료 (78.4%)', '링에서 최신 건강 기록 불러오기 (94.2%)']
        },
        {
          step: '06',
          stage: '건강 기록 깊이 보기',
          screenName: '수면 · 심박 · 활동 리포트 (#sleep · #heart · #activity)',
          hash: '#sleep',
          users: 13640,
          rate: '92.0%',
          stayTime: '평균 3분 10초',
          dropNote: '수면 단계 그래프와 마음이 움직인 심박 순간을 가장 오래 살펴봐요',
          summary: '깊은 잠·렘수면 비율, 하루 24시간 심박 흐름과 최고·최저 순간, 시간대별 걸음 수를 움직이는 차트로 자세히 돌아보는 화면이에요.',
          actions: ['수면 단계 타임라인 확인 (88.5%)', '마음이 움직인 심박 메모 남기기 (41.2%)']
        },
        {
          step: '07',
          stage: '두 사람의 연결 · 함께 탭',
          screenName: '파트너 초대 및 우리 탭 (#invite → #together)',
          hash: '#together',
          users: 14640,
          rate: '76.6%',
          stayTime: '평균 2분 40초',
          dropNote: '현재 7,320커플(14,640명)이 서로의 아침 리포트와 호흡을 나누고 있어요',
          summary: '초대 코드(예: SAI1024)로 연인·배우자와 연결해 서로의 컨디션을 배려하고, 24초 함께 호흡하기와 공유 달력을 함께 쓰는 공간이에요.',
          actions: ['아침 컨디션 리포트 나누기 (74.0%)', '24초 함께 호흡하기 실행 (39.5%)']
        },
        {
          step: '08',
          stage: '계정 정리 · 회원 탈퇴',
          screenName: '회원 탈퇴 및 기록 삭제 (#account-delete)',
          hash: '#account-delete',
          users: 1360,
          rate: '6.6%',
          stayTime: '평균 48초',
          dropNote: '탈퇴 시 개인 건강 기록은 즉시 지워지며 파트너 연결도 바로 해제돼요',
          summary: '설정 화면에서 회원 탈퇴를 신청하는 마지막 단계예요. 탈퇴 즉시 민감한 건강 기록과 파트너 공유 정보가 안전하게 삭제됩니다.',
          actions: ['건강 기록 즉시 삭제 동의 후 탈퇴 (1,360명)', '마음을 바꿔 계속 이용하기 (68.2%)']
        }
      ],
      productFlowGraph: getProductFlowGraph()
    };
  }

  function getProductFlowGraph(optionsOrDb) {
    let db = null;
    let period = '30d';
    let segment = 'all';

    if (optionsOrDb && typeof optionsOrDb === 'object' && Array.isArray(optionsOrDb.members)) {
      db = optionsOrDb;
    } else if (optionsOrDb && typeof optionsOrDb === 'object') {
      db = optionsOrDb.db || null;
      if (optionsOrDb.period) period = optionsOrDb.period;
      if (optionsOrDb.segment) segment = optionsOrDb.segment;
    }
    if (!db) db = load();

    const PERIOD_CFG = {
      today: {
        key: 'today',
        label: '오늘 실시간 (11월 4일)',
        dateRange: '2026.11.04 00:00 – 현재',
        scale: 0.088,
        sessionMult: 1.42,
        quickBackDelta: 0.4,
        rageTapDelta: 0.2
      },
      '7d': {
        key: '7d',
        label: '최근 7일',
        dateRange: '2026.10.29 – 2026.11.04 (7일간)',
        scale: 0.41,
        sessionMult: 2.35,
        quickBackDelta: 0.1,
        rageTapDelta: 0.1
      },
      '30d': {
        key: '30d',
        label: '최근 30일',
        dateRange: '2026.10.06 – 2026.11.04 (30일간)',
        scale: 0.89,
        sessionMult: 4.85,
        quickBackDelta: 0.0,
        rageTapDelta: 0.0
      },
      all: {
        key: 'all',
        label: '전체 누적 기간 (90일)',
        dateRange: '2026.08.07 – 2026.11.04 (전체 20,480명)',
        scale: 1.0,
        sessionMult: 7.45,
        quickBackDelta: -0.2,
        rageTapDelta: -0.1
      }
    };

    const SEGMENT_CFG = {
      all: { key: 'all', label: '전체 방문 회원', mult: 1.0 },
      new: { key: 'new', label: '신규 가입 여정 회원', mult: 0.64 },
      ring: { key: 'ring', label: '스마트링 착용 회원', mult: 0.87 },
      couple: { key: 'couple', label: '커플 연결 회원', mult: 0.72 }
    };

    const pCfg = PERIOD_CFG[period] || PERIOD_CFG['30d'];
    const sCfg = SEGMENT_CFG[segment] || SEGMENT_CFG.all;
    const factor = pCfg.scale * sCfg.mult;

    const tDeltas = db.transitionDeltas || {};
    const scaleCount = (base, edgeId) => {
      const delta = edgeId ? Number(tDeltas[edgeId]) || 0 : 0;
      return Math.max(12, Math.round(base * factor) + delta);
    };

    const rawNodes = [
      {
        id: 'welcome',
        hash: '#welcome',
        col: 0,
        row: 1.0,
        stageLabel: 'STEP 0 · 최초 진입',
        title: '앱 첫 만남 · 시작 화면',
        sub: '노을 배경 · 시작하기 / 기존 로그인',
        baseUsers: 22400,
        baseSessions: 26800,
        stayTime: '14초',
        dwellSec: 14,
        dropOffPct: 4.2,
        quickBackPct: 2.1,
        rageTapPct: 1.2,
        deadTapPct: 1.8,
        hesitationTime: '평균 3초',
        clarityStatus: 'good',
        clarityBadge: '원활 · 이탈 4.2%',
        lostReason: '대부분 즉시 [시작하기]를 누르며, 기존 회원 일부가 로그인 버튼 위치를 확인합니다.',
        uxFixTip: '하단 고정 버튼 영역에 [시작하기]와 [기존 로그인] 대비를 유지합니다.',
        hotspots: [
          { label: '하단 [사이 시작하기] 버튼', share: '84.2%', type: 'normal' },
          { label: '[이미 계정이 있어요] 링크', share: '11.4%', type: 'normal' },
          { label: '배경 반지 이미지 터치 (반응 없음)', share: '4.4%', type: 'dead' }
        ],
        badge: '최초 진입 100%',
        category: 'onboarding',
        theme: 'dusk'
      },
      {
        id: 'signup',
        hash: '#signup',
        col: 1,
        row: 0.42,
        stageLabel: 'STEP 1 · 가입 · 동의',
        title: '간편 가입 · 약관 동의',
        sub: '카카오/Apple · 민감정보 동의',
        baseUsers: 20480,
        baseSessions: 23400,
        stayTime: '48초',
        dwellSec: 48,
        dropOffPct: 4.1,
        quickBackPct: 8.4,
        rageTapPct: 5.8,
        deadTapPct: 4.6,
        hesitationTime: '평균 19초',
        clarityStatus: 'caution',
        clarityBadge: '약관 확인 · 뒤로 8.4%',
        lostReason: '민감정보 체크를 빠뜨린 채 비활성 [다음] 버튼을 반복 연타(5.8%)하는 패턴이 발생합니다.',
        uxFixTip: '[네, 모두 동의합니다] 버튼을 상단에 고정해 이탈을 줄였습니다.',
        hotspots: [
          { label: '[네, 모두 동의합니다] 전체 체크', share: '68.5%', type: 'normal' },
          { label: '미동의 상태 [동의하고 계속하기] 연타', share: '14.2%', type: 'rage' },
          { label: '민감정보 약관 전문 보기 모달', share: '17.3%', type: 'normal' }
        ],
        badge: '가입 전환 91.4%',
        category: 'onboarding',
        theme: 'paper'
      },
      {
        id: 'login',
        hash: '#login',
        col: 1,
        row: 1.88,
        stageLabel: 'STEP 1 · 기존 로그인',
        title: '기존 회원 로그인',
        sub: '이메일 · 계정 찾기',
        baseUsers: 1920,
        baseSessions: 4120,
        stayTime: '24초',
        dwellSec: 24,
        dropOffPct: 1.6,
        quickBackPct: 6.2,
        rageTapPct: 3.4,
        deadTapPct: 2.1,
        hesitationTime: '평균 9초',
        clarityStatus: 'good',
        clarityBadge: '원활 · 계정 찾기 6.2%',
        lostReason: '가입했던 소셜 수단을 헷갈려 첫 화면과 로그인 화면을 오가는 패턴(6.2%)이 일부 발생합니다.',
        uxFixTip: '최근 로그인한 소셜 수단 뱃지를 표시해 안내합니다.',
        hotspots: [
          { label: '이메일/비밀번호 입력창', share: '76.0%', type: 'normal' },
          { label: '비밀번호 재설정 / 계정 찾기', share: '16.5%', type: 'normal' },
          { label: '상단 뒤로가기 (가입 수단 재확인)', share: '7.5%', type: 'rage' }
        ],
        badge: '재방문 8.6%',
        category: 'onboarding',
        theme: 'dusk'
      },
      {
        id: 'name',
        hash: '#name',
        col: 2,
        row: 0.14,
        stageLabel: 'STEP 2 · 프로필 입력',
        title: '내 정보 · 관심 목적 선택',
        sub: '이름·신체·수면/커플 목표',
        baseUsers: 19640,
        baseSessions: 21100,
        stayTime: '58초',
        dwellSec: 58,
        dropOffPct: 3.8,
        quickBackPct: 4.5,
        rageTapPct: 2.3,
        deadTapPct: 2.9,
        hesitationTime: '평균 11초',
        clarityStatus: 'good',
        clarityBadge: '완료 95.9%',
        lostReason: '관심 목적 카드(수면 vs 커플) 중 복수 선택 가능 여부를 잠시 확인하는 구간입니다.',
        uxFixTip: '복수 선택 가능 안내 문구를 명시해 선택 속도를 높였습니다.',
        hotspots: [
          { label: '[수면을 알아가고 싶어요] 카드', share: '48.0%', type: 'normal' },
          { label: '[서로의 하루를 나누고 싶어요] 카드', share: '34.0%', type: 'normal' },
          { label: '하단 [다음으로] 고정 버튼', share: '18.0%', type: 'normal' }
        ],
        badge: '완료 95.9%',
        category: 'onboarding',
        theme: 'paper'
      },
      {
        id: 'ring',
        hash: '#ring',
        col: 2,
        row: 1.12,
        stageLabel: 'STEP 2 · 스마트링 연결',
        title: '링 검색 · SAI_11C1 페어링',
        sub: '블루투스 탐색 · 크래들 연결',
        baseUsers: 17890,
        baseSessions: 24900,
        stayTime: '1분 12초',
        dwellSec: 72,
        dropOffPct: 8.9,
        quickBackPct: 14.2,
        rageTapPct: 11.4,
        deadTapPct: 8.6,
        hesitationTime: '평균 31초 대기',
        clarityStatus: 'warning',
        clarityBadge: '이탈 주의 · 뒤로 14.2%',
        lostReason: '크래들 미거치 또는 블루투스 미허용으로 기기가 안 뜰 때 화면을 연타(11.4%)하거나 이탈합니다.',
        uxFixTip: '탐색 4초 후 도움말 버튼과 [나중에 연결하기]를 자동 강조합니다.',
        hotspots: [
          { label: '검색된 [SAI_11C1 연결하기] 카드', share: '64.2%', type: 'normal' },
          { label: '중앙 반지 탐색 그래픽 반복 연타 (Rage)', share: '21.6%', type: 'rage' },
          { label: '[링이 보이지 않나요?] 도움말 이동', share: '14.2%', type: 'dead' }
        ],
        badge: '이탈 주의 14.2%',
        category: 'onboarding',
        theme: 'pairing'
      },
      {
        id: 'ringhelp',
        hash: '#ringhelp',
        col: 2,
        row: 2.08,
        stageLabel: 'STEP 2 · 연결 도움말',
        title: '링 연결 도움말 · 재시도',
        sub: '크래들 LED 확인 · 재스캔',
        baseUsers: 1620,
        baseSessions: 2380,
        stayTime: '52초',
        dwellSec: 52,
        dropOffPct: 8.0,
        quickBackPct: 9.8,
        rageTapPct: 6.4,
        deadTapPct: 4.2,
        hesitationTime: '평균 24초',
        clarityStatus: 'caution',
        clarityBadge: '확인 후 92% 복귀',
        lostReason: '설명서 모델명(R22)과 앱 표시명(SAI)이 같은 기기인지 확인하러 진입합니다.',
        uxFixTip: '상단에 R22 → SAI_XXXX 자동 변환 안내를 명시해 해결했습니다.',
        hotspots: [
          { label: '[다시 스마트링 찾아보기] 버튼', share: '78.4%', type: 'normal' },
          { label: '크래들 하얀 불빛 확인 일러스트 터치', share: '13.2%', type: 'dead' },
          { label: '[링 없이 먼저 둘러보기] 우회 진입', share: '8.4%', type: 'normal' }
        ],
        badge: '재연결 92.0%',
        category: 'support',
        theme: 'pairing'
      },
      {
        id: 'checkin',
        hash: '#checkin',
        col: 3,
        row: 0.34,
        stageLabel: 'STEP 3 · 아침 체크인',
        title: '아침 기분 점수 · 한마디',
        sub: '기분 1~5점 · 오늘 메모',
        baseUsers: 15420,
        baseSessions: 32400,
        stayTime: '36초',
        dwellSec: 36,
        dropOffPct: 2.4,
        quickBackPct: 3.1,
        rageTapPct: 1.8,
        deadTapPct: 2.2,
        hesitationTime: '평균 7초',
        clarityStatus: 'good',
        clarityBadge: '완료율 97.6%',
        lostReason: '기분 점수(1~5) 선택 후 한마디 입력 여부를 잠깐 고민한 뒤 저장합니다.',
        uxFixTip: '자주 쓰는 기분 태그를 원터치 칩으로 제공해 입력 피로를 줄입니다.',
        hotspots: [
          { label: '기분 점수 원형 번호 (4~5점 집중)', share: '71.2%', type: 'normal' },
          { label: '하단 [기록하고 오늘 시작하기]', share: '22.4%', type: 'normal' },
          { label: '상단 [건너뛰기] 버튼', share: '6.4%', type: 'normal' }
        ],
        badge: '체크인 86.2%',
        category: 'health',
        theme: 'checkin'
      },
      {
        id: 'today',
        hash: '#today',
        col: 3,
        row: 1.42,
        stageLabel: 'STEP 3 · 핵심 허브',
        title: '오늘 홈 · 3대 원형 지표',
        sub: '수면 · 걸음 · 심박 대시보드',
        baseUsers: 19120,
        baseSessions: 68400,
        stayTime: '2분 18초',
        dwellSec: 138,
        dropOffPct: 5.4,
        quickBackPct: 3.8,
        rageTapPct: 2.9,
        deadTapPct: 5.1,
        hesitationTime: '평균 8초',
        clarityStatus: 'good',
        clarityBadge: '체류 2분 18초',
        lostReason: '수면·걸음·심박 3대 지표를 비교하며 가장 자주 머무는 메인 허브 화면입니다.',
        uxFixTip: '원형 지표 카드에 터치 피드백을 적용해 상세 리포트 이동을 유도합니다.',
        hotspots: [
          { label: '수면 원형 지표 (7h 30m) 클릭', share: '44.8%', type: 'normal' },
          { label: '하단 글라스 탭바 [우리] 탭 이동', share: '31.6%', type: 'normal' },
          { label: '심박(72bpm) · 걸음(6,842) 원형 클릭', share: '23.6%', type: 'normal' }
        ],
        badge: '평균 2분 18초',
        category: 'health',
        theme: 'today'
      },
      {
        id: 'sleep',
        hash: '#sleep',
        col: 4,
        row: 0.08,
        stageLabel: 'STEP 4 · 최장 체류',
        title: '수면 단계 · 밤의 기록',
        sub: '깊은 잠 · REM 차트 · 공유',
        baseUsers: 13640,
        baseSessions: 31900,
        stayTime: '3분 14초',
        dwellSec: 194,
        dropOffPct: 6.2,
        quickBackPct: 2.9,
        rageTapPct: 2.1,
        deadTapPct: 4.8,
        hesitationTime: '차트 구간 탐색',
        clarityStatus: 'good',
        clarityBadge: '체류 1위 · 3분 14초',
        lostReason: '시간대별 수면 단계 막대를 터치해 깊은 잠 구간을 확인하느라 가장 오래 머무릅니다.',
        uxFixTip: '차트 하단 [나의 아침 나누기] 버튼으로 파트너 공유를 바로 연결했습니다.',
        hotspots: [
          { label: '수면 단계 타임라인 막대 터치 탐색', share: '52.4%', type: 'normal' },
          { label: '하단 [나의 아침 나누기] 공유 버튼', share: '34.8%', type: 'normal' },
          { label: '수면 효율 · 깊은 잠 수치 카드 터치', share: '12.8%', type: 'dead' }
        ],
        badge: '체류 1위 · 3분 14초',
        category: 'health',
        theme: 'paper'
      },
      {
        id: 'heart',
        hash: '#heart',
        col: 4,
        row: 1.04,
        stageLabel: 'STEP 4 · 생체 상세',
        title: '24시간 심박 · 걸음 추이',
        sub: '안정 심박 · 심박 피크',
        baseUsers: 11280,
        baseSessions: 22400,
        stayTime: '2분 28초',
        dwellSec: 148,
        dropOffPct: 7.4,
        quickBackPct: 4.2,
        rageTapPct: 3.1,
        deadTapPct: 5.4,
        hesitationTime: '평균 12초',
        clarityStatus: 'good',
        clarityBadge: '체류 2분 28초',
        lostReason: '심박수가 올라간 피크 시간대 포인트를 터치하며 하루 기록을 돌아봅니다.',
        uxFixTip: '심박 피크 지점 터치 시 한줄 메모 및 달력 저장을 바로 지원합니다.',
        hotspots: [
          { label: '24시간 심박 영역 차트 최고점(118bpm)', share: '49.2%', type: 'normal' },
          { label: '[활동 · 걸음 수] 리포트 전환', share: '31.5%', type: 'normal' },
          { label: '안정 심박수 설명 툴팁 영역', share: '19.3%', type: 'dead' }
        ],
        badge: '평균 2분 28초',
        category: 'health',
        theme: 'paper'
      },
      {
        id: 'together',
        hash: '#together',
        col: 4,
        row: 2.0,
        stageLabel: 'STEP 4 · 커플 허브',
        title: '우리 탭 · 파트너 연결/배려',
        sub: '초대 코드 · 함께 호흡',
        baseUsers: 14640,
        baseSessions: 41800,
        stayTime: '2분 42초',
        dwellSec: 162,
        dropOffPct: 6.8,
        quickBackPct: 11.8,
        rageTapPct: 7.9,
        deadTapPct: 6.2,
        hesitationTime: '코드 확인 왕복 22초',
        clarityStatus: 'caution',
        clarityBadge: '코드 왕복 · 뒤로 11.8%',
        lostReason: '초대 코드를 카카오톡으로 보내고 확인하느라 화면을 오가는 빠른 뒤로가기(11.8%)가 발생합니다.',
        uxFixTip: '초대장 원터치 공유 및 클립보드 코드 자동 붙여넣기를 지원합니다.',
        hotspots: [
          { label: '[아침 안부 · 컨디션 보내기] 버튼', share: '46.4%', type: 'normal' },
          { label: '[24초 함께 호흡하기] 실행', share: '28.2%', type: 'normal' },
          { label: '초대 코드 복사 · 입력창 반복 터치', share: '25.4%', type: 'rage' }
        ],
        badge: '체류 2위 · 2분 42초',
        category: 'couple',
        theme: 'paper'
      },
      {
        id: 'morning',
        hash: '#morning',
        col: 5,
        row: 0.18,
        stageLabel: 'STEP 5 · 안부 전송',
        title: '아침 데이터 공유 · 배려 신호',
        sub: '수면·심박·기분 선택 전송',
        baseUsers: 11480,
        baseSessions: 24900,
        stayTime: '1분 54초',
        dwellSec: 114,
        dropOffPct: 4.5,
        quickBackPct: 5.6,
        rageTapPct: 2.4,
        deadTapPct: 3.1,
        hesitationTime: '평균 14초',
        clarityStatus: 'good',
        clarityBadge: '공유율 85.7%',
        lostReason: '공개할 건강 항목과 숨길 항목 토글을 선택하며 약 14초간 머무릅니다.',
        uxFixTip: '이전 공유 항목 선택값을 다음 날에도 자동 유지하도록 개선했습니다.',
        hotspots: [
          { label: '수면·심박·기분 공유 항목 체크 토글', share: '44.0%', type: 'normal' },
          { label: '하단 [파트너에게 아침 보내기]', share: '46.8%', type: 'normal' },
          { label: '미리보기 카드 영역 터치', share: '9.2%', type: 'dead' }
        ],
        badge: '공유 완료 85.7%',
        category: 'couple',
        theme: 'paper'
      },
      {
        id: 'calendar',
        hash: '#calendar',
        col: 5,
        row: 1.14,
        stageLabel: 'STEP 5 · 기억 아카이브',
        title: '순간 달력 · 개인 다이어리',
        sub: '날짜별 공유 기록 · 일기',
        baseUsers: 9840,
        baseSessions: 19200,
        stayTime: '2분 08초',
        dwellSec: 128,
        dropOffPct: 5.1,
        quickBackPct: 3.4,
        rageTapPct: 2.2,
        deadTapPct: 4.5,
        hesitationTime: '평균 9초',
        clarityStatus: 'good',
        clarityBadge: '체류 2분 08초',
        lostReason: '빈 날짜 터치 시 반응이 없어 반복 터치(4.5%)하는 패턴이 일부 나타납니다.',
        uxFixTip: '빈 날짜 터치 시 해당 날짜의 일기 작성 시트가 열리도록 연결합니다.',
        hotspots: [
          { label: '주황색 점이 찍힌 공유 기록 날짜 클릭', share: '58.6%', type: 'normal' },
          { label: '[새 다이어리 작성하기] 버튼', share: '27.4%', type: 'normal' },
          { label: '기록 없는 지난 날짜 반복 터치', share: '14.0%', type: 'dead' }
        ],
        badge: '평균 2분 08초',
        category: 'couple',
        theme: 'paper'
      },
      {
        id: 'account-delete',
        hash: '#account-delete',
        col: 5,
        row: 2.08,
        stageLabel: 'STEP 5 · 설정 · 탈퇴',
        title: '내 설정 · 회원 탈퇴',
        sub: '기기 관리 · 기록 즉시 파기',
        baseUsers: 1360,
        baseSessions: 2640,
        stayTime: '1분 26초',
        dwellSec: 86,
        dropOffPct: 68.2,
        quickBackPct: 24.6,
        rageTapPct: 4.8,
        deadTapPct: 3.9,
        hesitationTime: '평균 42초 고민',
        clarityStatus: 'warning',
        clarityBadge: '68.2% 계정 유지',
        lostReason: '데이터 영구 삭제 안내 확인 후 68.2%가 탈퇴를 취소하고 복귀합니다.',
        uxFixTip: '[알림만 잠시 끄기]와 [파트너 연결 잠시 쉬기] 대안을 함께 제공합니다.',
        hotspots: [
          { label: '[마음을 바꿔 계속 이용하기] 복귀 버튼', share: '68.2%', type: 'normal' },
          { label: '데이터 영구 삭제 안내 체크박스', share: '19.4%', type: 'normal' },
          { label: '하단 [회원 탈퇴 및 기록 삭제]', share: '12.4%', type: 'rage' }
        ],
        badge: '유지 복귀 68.2%',
        category: 'support',
        theme: 'paper'
      }
    ];

    const nodes = rawNodes.map((n) => {
      const scaledUsers = Math.max(18, Math.round(n.baseUsers * factor));
      const scaledSessions = Math.max(scaledUsers, Math.round(n.baseSessions * factor * (pCfg.sessionMult / 4.85)));
      const qb = Math.max(1.0, +(n.quickBackPct + pCfg.quickBackDelta).toFixed(1));
      const rt = Math.max(0.8, +(n.rageTapPct + pCfg.rageTapDelta).toFixed(1));
      return {
        ...n,
        users: scaledUsers,
        dailyVisits: scaledSessions,
        sessions: scaledSessions,
        dropOffRate: `${n.dropOffPct.toFixed(1)}%`,
        quickBackRate: `${qb.toFixed(1)}%`,
        rageTapRate: `${rt.toFixed(1)}%`,
        deadTapRate: `${n.deadTapPct.toFixed(1)}%`
      };
    });

    const rawEdges = [
      {
        id: 'welcome->signup',
        from: 'welcome',
        to: 'signup',
        baseCount: 20480,
        rate: '91.4%',
        category: 'onboarding',
        label: '신규 가입 시작',
        note: '최초 진입(#welcome) 후 망설임 없이(평균 14초) [사이 시작하기]를 눌러 가입 화면으로 이동한 주류 경로예요.'
      },
      {
        id: 'welcome->login',
        from: 'welcome',
        to: 'login',
        baseCount: 1920,
        rate: '8.6%',
        category: 'onboarding',
        label: '기존 회원 로그인',
        note: '첫 화면에서 [이미 계정이 있어요]를 눌러 기존 계정 로그인으로 이동한 흐름이에요.'
      },
      {
        id: 'signup->name',
        from: 'signup',
        to: 'name',
        baseCount: 19640,
        rate: '95.9%',
        category: 'onboarding',
        label: '약관 동의 완료',
        note: '필수 약관 4종 동의를 마치고 내 프로필 및 관심 목적 입력(#name)으로 이동한 흐름이에요.'
      },
      {
        id: 'login->today',
        from: 'login',
        to: 'today',
        baseCount: 1890,
        rate: '98.4%',
        category: 'onboarding',
        label: '로그인 후 홈 진입',
        note: '기존 계정에 연결된 SAI_11C1 데이터를 불러와 바로 오늘 홈(#today)으로 진입했어요.'
      },
      {
        id: 'name->ring',
        from: 'name',
        to: 'ring',
        baseCount: 17890,
        rate: '91.1%',
        category: 'onboarding',
        label: '스마트링 연결 진행',
        note: '프로필 설정 직후 충전 케이스에 놓인 스마트링(SAI_11C1)을 찾으러 이동한 핵심 온보딩 경로예요.'
      },
      {
        id: 'name->today',
        from: 'name',
        to: 'today',
        baseCount: 1750,
        rate: '8.9%',
        category: 'support',
        isDashed: true,
        isFriction: true,
        label: '링 나중에 연결 (건너뛰기)',
        note: '실물 스마트링 배송 전 앱을 먼저 둘러보기 위해 링 연결을 건너뛰고 오늘 홈으로 이동한 분기예요.'
      },
      {
        id: 'ring->ringhelp',
        from: 'ring',
        to: 'ringhelp',
        baseCount: 1620,
        rate: '14.2%',
        category: 'support',
        isDashed: true,
        isFriction: true,
        label: '기기 안 뜸 · 길 잃음 도움말',
        note: '[Clarity 헤맴 감지] 블루투스 검색에서 기기가 바로 안 떠서 연타 후 도움말(#ringhelp)로 진입한 경로예요.'
      },
      {
        id: 'ringhelp->ring',
        from: 'ringhelp',
        to: 'ring',
        baseCount: 1490,
        rate: '92.0%',
        category: 'support',
        label: '도움말 확인 후 재연결 성공',
        note: 'R22 → SAI_11C1 이름 변환 안내와 크래들 충전 확인 후 다시 스캔해 연결에 성공한 복귀 흐름이에요.'
      },
      {
        id: 'ring->checkin',
        from: 'ring',
        to: 'checkin',
        baseCount: 15420,
        rate: '86.2%',
        category: 'health',
        label: '링 연결 후 아침 체크인',
        note: '스마트링 연결 완료 후 첫 수면 데이터와 함께 오늘 아침 기분 점수(1~5점)를 기록하러 이동했어요.'
      },
      {
        id: 'ring->today',
        from: 'ring',
        to: 'today',
        baseCount: 2470,
        rate: '13.8%',
        category: 'health',
        label: '체크인 건너뛰고 홈 진입',
        note: '기분 체크인을 건너뛰고 곧바로 오늘 홈의 3대 원형 지표를 확인하러 이동한 흐름이에요.'
      },
      {
        id: 'checkin->today',
        from: 'checkin',
        to: 'today',
        baseCount: 15420,
        rate: '97.6%',
        category: 'health',
        label: '체크인 저장 후 오늘 홈',
        note: '오늘의 기분과 한마디를 저장하고 메인 허브인 오늘 홈(#today)으로 이동한 핵심 경로예요.'
      },
      {
        id: 'today->sleep',
        from: 'today',
        to: 'sleep',
        baseCount: 13640,
        rate: '71.3%',
        category: 'health',
        label: '다음 이동 1위 · 수면 리포트',
        note: '오늘 홈(#today)에서 회원들이 가장 많이 클릭해 이동하는 1위 경로(71.3%)로, 평균 3분 14초간 머뭅니다.'
      },
      {
        id: 'today->heart',
        from: 'today',
        to: 'heart',
        baseCount: 11280,
        rate: '59.0%',
        category: 'health',
        label: '심박·걸음 원형 지표 클릭',
        note: '오늘 홈에서 심박 및 활동 지표를 눌러 24시간 심박 범위와 걸음 추이를 확인한 흐름이에요.'
      },
      {
        id: 'today->together',
        from: 'today',
        to: 'together',
        baseCount: 14640,
        rate: '76.6%',
        category: 'couple',
        label: '하단 [우리] 탭 이동',
        note: '오늘 홈 확인 후 하단 글라스 탭바에서 [우리] 탭(#together)으로 넘어가 파트너 안부를 살피는 주요 흐름이에요.'
      },
      {
        id: 'sleep->morning',
        from: 'sleep',
        to: 'morning',
        baseCount: 6840,
        rate: '50.1%',
        category: 'couple',
        label: '수면 확인 후 아침 나누기',
        note: '내 수면 리포트를 꼼꼼히 확인한 뒤 하단 [나의 아침 나누기] 버튼을 눌러 파트너에게 공유한 흐름이에요.'
      },
      {
        id: 'together->morning',
        from: 'together',
        to: 'morning',
        baseCount: 11480,
        rate: '78.4%',
        category: 'couple',
        label: '파트너에게 아침 안부 전송',
        note: '우리 탭에서 아침 안부 카드나 배려 신호, 24초 함께 호흡하기를 실행한 커플 교감 흐름이에요.'
      },
      {
        id: 'morning->calendar',
        from: 'morning',
        to: 'calendar',
        baseCount: 9840,
        rate: '85.7%',
        category: 'couple',
        label: '공유 완료 후 순간 달력 보관',
        note: '파트너와 나눈 아침 기록과 심박 메모가 순간 달력(#calendar)에 추억으로 저장된 흐름이에요.'
      },
      {
        id: 'today->calendar',
        from: 'today',
        to: 'calendar',
        baseCount: 7620,
        rate: '39.9%',
        category: 'couple',
        label: '하단 [순간] 탭 · 일기장',
        note: '오늘 홈이나 하단 탭바에서 바로 순간 달력과 개인 일기장을 열어본 흐름이에요.'
      },
      {
        id: 'today->account-delete',
        from: 'today',
        to: 'account-delete',
        baseCount: 1360,
        rate: '6.6%',
        category: 'support',
        isDashed: true,
        isFriction: true,
        label: '설정 · 탈퇴 고민 진입 (68% 복귀)',
        note: '[Clarity 망설임 감지] 내 설정(#settings)에서 탈퇴 화면까지 갔으나 68.2%는 데이터 삭제 안내를 보고 다시 돌아옵니다.'
      }
    ];

    const edges = rawEdges.map((e) => ({
      ...e,
      count: scaleCount(e.baseCount, e.id)
    }));

    const totalTransitions = edges.reduce((sum, e) => sum + e.count, 0);
    const totalSessions = nodes.reduce((sum, n) => sum + n.sessions, 0);
    const maxEdgeCount = Math.max(...edges.map((e) => e.count), 1);

    return {
      periodMeta: {
        period: pCfg.key,
        periodLabel: pCfg.label,
        dateRange: pCfg.dateRange,
        segment: sCfg.key,
        segmentLabel: sCfg.label,
        totalSessions,
        uniqueUsers: nodes[0].users,
        topEntryText: `#welcome 첫 진입 (68.4%) · #today 재방문 (31.6%)`,
        topDwellScreen: `#sleep 수면 리포트 (평균 3분 14초)`,
        topDwellSub: `2위 #together 우리 탭 (2분 42초) · 3위 #heart 심박 (2분 28초)`,
        avgQuickBackRate: `${(6.8 + pCfg.quickBackDelta).toFixed(1)}%`,
        totalQuickBacks: Math.round(totalSessions * 0.068),
        avgRageTapRate: `${(4.2 + pCfg.rageTapDelta).toFixed(1)}%`,
        totalRageTaps: Math.round(totalSessions * 0.042),
        maxEdgeCount
      },
      nodes,
      edges,
      totalTransitions
    };
  }

  function recordScreenTransition(fromScreen, toScreen, stepUsers = 1) {
    const db = load();
    if (!db.transitionDeltas) db.transitionDeltas = {};
    const cleanFrom = String(fromScreen || '').replace(/^#/, '');
    const cleanTo = String(toScreen || '').replace(/^#/, '');
    if (!cleanFrom || !cleanTo || cleanFrom === cleanTo) return null;

    // Normalize sub-screens into canonical product map nodes so real app navigation always increments a visible line
    const normalizeNode = (id) => {
      if (['signup', 'verify', 'consent'].includes(id)) return 'signup';
      if (['find-id', 'find-password', 'reset-password', 'login'].includes(id)) return 'login';
      if (['name', 'age', 'gender', 'body', 'intent'].includes(id)) return 'name';
      if (['ring', 'ringpermission', 'ringsearch', 'ringfound', 'ringconnecting', 'ringdone'].includes(id)) return 'ring';
      if (['heart', 'activity', 'health'].includes(id)) return 'heart';
      if (['together', 'invite', 'care', 'breathing', 'date-session'].includes(id)) return 'together';
      if (['morning', 'share', 'sent', 'received'].includes(id)) return 'morning';
      if (['calendar', 'diary'].includes(id)) return 'calendar';
      if (['settings', 'account-manage', 'account-delete', 'account-deleted'].includes(id)) return 'account-delete';
      return id;
    };

    const nFrom = normalizeNode(cleanFrom);
    const nTo = normalizeNode(cleanTo);
    const edgeKey = `${nFrom}->${nTo}`;
    db.transitionDeltas[edgeKey] = (Number(db.transitionDeltas[edgeKey]) || 0) + Number(stepUsers || 1);
    db.lastTransition = {
      edgeKey,
      from: cleanFrom,
      to: cleanTo,
      at: nowFormatted(),
      stepUsers: Number(stepUsers || 1)
    };
    save(db);
    return db.lastTransition;
  }

  /**
   * Returns a paginated slice of the 20,480 virtual + live member directory.
   */
  function getVirtualMembersPage({ page = 1, pageSize = 20, search = '', status = 'ALL' } = {}) {
    const db = load();
    const stats = getDashboardStats();
    const q = String(search || '').trim().toLowerCase();
    const overriddenById = new Map(db.members.map((m) => [m.id, m]));

    // If searching or filtering specifically, scan live members + deterministic sample up to 20,480
    const matches = [];
    const totalToScan = q ? 2500 : stats.totalMembers;

    // First include any newly added members not in standard ID range
    db.members.forEach((m) => {
      const mNum = Number((m.id.match(/MEM-2026-(\d+)/) || [])[1] || 0);
      if (mNum > stats.totalMembers || mNum === 0) {
        if (status !== 'ALL' && m.status !== status) return;
        if (q && !(
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.ring?.firmwareName || '').toLowerCase().includes(q) ||
          (m.ring?.bleId || '').toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q)
        )) return;
        matches.push(m);
      }
    });

    if (!q && status === 'ALL') {
      const totalItems = stats.totalMembers;
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      const safePage = Math.min(Math.max(1, page), totalPages);
      const startIdx = (safePage - 1) * pageSize + 1;
      const endIdx = Math.min(totalItems, startIdx + pageSize - 1);
      const items = [];
      for (let i = startIdx; i <= endIdx; i++) {
        const id = `MEM-2026-${String(i).padStart(5, '0')}`;
        items.push(overriddenById.get(id) || generateVirtualMemberByIndex(i));
      }
      return {
        items,
        page: safePage,
        pageSize,
        totalItems,
        totalPages
      };
    }

    for (let i = 1; i <= totalToScan; i++) {
      const id = `MEM-2026-${String(i).padStart(5, '0')}`;
      const m = overriddenById.get(id) || generateVirtualMemberByIndex(i);
      if (status !== 'ALL' && m.status !== status) continue;
      if (q && !(
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.ring?.firmwareName || '').toLowerCase().includes(q) ||
        (m.ring?.bleId || '').toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
      )) continue;
      matches.push(m);
    }

    const totalItems = q
      ? matches.length
      : status === 'ACTIVE'
        ? stats.activeMembers
        : status === 'WITHDRAWN'
          ? stats.withdrawnMembers
          : stats.totalMembers;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const startOffset = (safePage - 1) * pageSize;
    return {
      items: matches.slice(startOffset, startOffset + pageSize),
      page: safePage,
      pageSize,
      totalItems,
      totalPages
    };
  }

  function getActiveMember() {
    const db = load();
    return db.members.find((m) => m.id === db.activeMemberId) || db.members[0];
  }

  function getSelectedDevice() {
    const db = load();
    return db.devices.find((d) => d.saiName === db.selectedRingId) || db.devices[0];
  }

  function registerOrUpdateMember(payload = {}) {
    const db = load();
    const email = (payload.email || 'user@sai.io').trim();
    let member = db.members.find((m) => m.email.toLowerCase() === email.toLowerCase() && m.status !== 'WITHDRAWN');
    const now = nowFormatted();

    if (!member) {
      db.deltas.addedMembers = (db.deltas.addedMembers || 0) + 1;
      const nextNum = VIRTUAL_BASELINE.totalMembers + db.deltas.addedMembers;
      member = buildMemberRecord({
        id: `MEM-2026-${String(nextNum).padStart(5, '0')}`,
        name: payload.name || email.split('@')[0] || '하윤',
        email,
        providerLabel: payload.provider || '이메일 인증',
        age: Number(payload.age) || 28,
        gender: payload.gender || '여성',
        height: payload.height || 165,
        weight: payload.weight || 53,
        intent: payload.intent || '수면을 알아가고 싶어요',
        status: 'ACTIVE',
        joinedAt: now,
        lastLoginAt: now,
        consents: payload.consents || { age14: true, terms: true, privacy: true, health: true, marketing: true }
      });
      db.members.unshift(member);
      db.auditLogs.unshift({
        at: now,
        type: 'MEMBER_JOIN',
        actor: `${member.name} (${member.id})`,
        detail: `${member.providerLabel} 신규 회원가입 및 필수 약관 동의 완료`
      });
    } else {
      if (payload.name) member.name = payload.name;
      if (payload.age) member.age = Number(payload.age);
      if (payload.gender) member.gender = payload.gender;
      if (payload.height !== undefined && payload.height !== '') member.height = payload.height;
      if (payload.weight !== undefined && payload.weight !== '') member.weight = payload.weight;
      if (payload.intent) member.intent = payload.intent;
      member.lastLoginAt = now;
    }

    db.activeMemberId = member.id;
    save(db);
    return member;
  }

  function loginMember(email = 'sumin@sai.io', provider = '이메일 인증') {
    return registerOrUpdateMember({ email, provider });
  }

  function pairDeviceToMember(memberIdOrEmail, { bleId = 'F1BE85F511C1', rawModel = 'R22', finish = 'Gold', battery = 88 } = {}) {
    const db = load();
    const member = ensureMemberMaterialized(db, memberIdOrEmail);
    const idInfo = parseHardwareIdentity(bleId, rawModel);
    const now = nowFormatted();

    if (!member.ring?.connected) {
      db.deltas.pairedRingsDelta = (db.deltas.pairedRingsDelta || 0) + 1;
    }

    member.ringId = idInfo.saiName;
    member.bleId = idInfo.bleId;
    member.legacyFwName = idInfo.legacyFwName;
    member.ring = {
      connected: true,
      firmwareName: idInfo.saiName,
      rawFirmware: idInfo.legacyFwName,
      bleId: idInfo.bleId,
      macAddress: idInfo.mac,
      finish,
      battery,
      fwVersion: `${idInfo.saiName} (v1.0.2)`
    };

    let dev = db.devices.find((d) => d.firmwareName === idInfo.saiName);
    if (!dev) {
      dev = buildDeviceRecord({
        bleId: idInfo.bleId,
        baseModel: rawModel,
        finish,
        battery,
        status: 'PAIRED',
        assignedMemberId: member.id,
        assignedMemberName: member.name,
        lastSyncAt: now
      });
      db.devices.unshift(dev);
    } else {
      dev.status = 'PAIRED';
      dev.ownerId = member.id;
      dev.ownerName = member.name;
      dev.assignedMemberId = member.id;
      dev.assignedMemberName = member.name;
      dev.battery = battery;
      dev.lastSyncAt = now;
    }

    db.selectedRingId = idInfo.saiName;
    db.auditLogs.unshift({
      at: now,
      type: 'RING_PAIR',
      actor: `${member.name} (${idInfo.saiName})`,
      detail: `${idInfo.legacyFwName} (BLE ${idInfo.bleId}) → ${idInfo.saiName} 스마트링 페어링 완료`
    });

    save(db);
    return dev;
  }

  function pairRingToActiveMember(saiName = 'SAI_11C1', finish = 'Gold') {
    const db = load();
    return pairDeviceToMember(db.activeMemberId, { bleId: saiName, rawModel: 'R22', finish, battery: 88 });
  }

  function pairRingDevice({ bleUniqueId = 'F1BE85F511C1', modelPrefix = 'R22', battery = 86 } = {}) {
    const db = load();
    return pairDeviceToMember(db.activeMemberId, { bleId: bleUniqueId, rawModel: modelPrefix, finish: 'Gold', battery });
  }

  function syncHealthDataFromRing(memberIdOrEmail, payload = {}) {
    const db = load();
    const member = ensureMemberMaterialized(db, memberIdOrEmail || db.activeMemberId);
    const now = nowFormatted();

    const sleepMinutes = payload.sleepMinutes ?? (420 + Math.floor(Math.random() * 54));
    const sleepScore = payload.sleepScore ?? (84 + Math.floor(Math.random() * 10));
    const heartRateBpm = payload.heartRateBpm ?? (60 + Math.floor(Math.random() * 12));
    const hrvMs = payload.hrvMs ?? (58 + Math.floor(Math.random() * 18));
    const spo2Pct = payload.spo2Pct ?? (97 + Math.floor(Math.random() * 3));
    const skinTempDelta = payload.skinTempDelta ?? '+0.1';
    const steps = payload.steps ?? (6500 + Math.floor(Math.random() * 2600));
    const stressIndex = payload.stressIndex ?? (21 + Math.floor(Math.random() * 12));

    member.healthSync = {
      ...(member.healthSync || {}),
      sleepMinutes,
      sleepScore,
      heartRateBpm,
      hrvMs,
      spo2Pct,
      skinTempDelta,
      steps,
      stressIndex,
      lastSyncedAt: now,
      externalHealth: member.healthSync?.externalHealth || {
        appleHealth: true,
        googleHealthConnect: false,
        samsungHealth: false
      }
    };

    const sleepHours = Math.floor(sleepMinutes / 60);
    const sleepRemMin = sleepMinutes % 60;
    member.latestMetrics = {
      ...(member.latestMetrics || {}),
      sleepMin: sleepMinutes,
      sleepHours,
      sleepRemMin,
      steps,
      hr: heartRateBpm,
      hrv: hrvMs,
      spo2: spo2Pct,
      stress: stressIndex,
      energyScore: sleepScore,
      syncedAt: timeOnly()
    };

    db.deltas.syncCountDelta = (db.deltas.syncCountDelta || 0) + 1;
    db.auditLogs.unshift({
      at: now,
      type: 'HEALTH_SYNC',
      actor: `${member.name} (${member.ring?.firmwareName || 'SAI_11C1'})`,
      detail: `수면 ${sleepHours}시간 ${sleepRemMin}분(${sleepScore}점) · 심박 ${heartRateBpm}bpm · HRV ${hrvMs}ms · 걸음 ${steps.toLocaleString()}보 동기화`
    });

    save(db);
    return member.healthSync;
  }

  function fetchHealthDataFromRing(options = {}) {
    const db = load();
    const sync = syncHealthDataFromRing(db.activeMemberId, options);
    const member = getActiveMember();
    const device = getSelectedDevice();
    return { metrics: member.latestMetrics, sync, device, member };
  }

  function withdrawMember(memberIdOrEmail, reason = '회원 탈퇴 및 민감 건강정보 즉시 파기') {
    const db = load();
    const member = ensureMemberMaterialized(db, memberIdOrEmail || db.activeMemberId);
    if (!member) return null;
    const now = nowFormatted();

    if (member.status !== 'WITHDRAWN') {
      db.deltas.withdrawnDelta = (db.deltas.withdrawnDelta || 0) + 1;
      if (member.ring?.connected) {
        db.deltas.pairedRingsDelta = (db.deltas.pairedRingsDelta || 0) - 1;
      }
      if (member.partner?.paired) {
        db.deltas.pairedCouplesDelta = (db.deltas.pairedCouplesDelta || 0) - 1;
      }
    }

    member.status = 'WITHDRAWN';
    member.withdrawnAt = now;
    member.withdrawReason = reason;
    member.ringId = null;
    member.ring = { connected: false, firmwareName: null, rawFirmware: null, bleId: null, battery: 0 };
    member.partner = { paired: false, partnerId: null, partnerName: '-', partnerEmail: '-', inviteCode: member.inviteCode, pairedSince: null };
    member.latestMetrics = null;

    db.auditLogs.unshift({
      at: now,
      type: 'WITHDRAWAL',
      actor: `${member.name} (${member.id})`,
      detail: `${reason} · 개인 건강기록 즉시 파기 및 스마트링/파트너 연결 해제`
    });

    save(db);
    return member;
  }

  function withdrawActiveMember(reason) {
    const db = load();
    return withdrawMember(db.activeMemberId, reason);
  }

  function restoreMember(memberIdOrEmail) {
    const db = load();
    const member = ensureMemberMaterialized(db, memberIdOrEmail);
    if (!member) return null;
    const now = nowFormatted();

    if (member.status === 'WITHDRAWN') {
      db.deltas.withdrawnDelta = Math.max(-VIRTUAL_BASELINE.withdrawnMembers, (db.deltas.withdrawnDelta || 0) - 1);
    }
    member.status = 'ACTIVE';
    member.withdrawnAt = null;
    member.withdrawReason = null;

    db.auditLogs.unshift({
      at: now,
      type: 'RESTORE',
      actor: `${member.name} (${member.id})`,
      detail: '탈퇴 유예 백업에서 계정 활성 상태 복구 완료'
    });

    save(db);
    return member;
  }

  function deleteMemberPermanently(memberIdOrEmail) {
    const db = load();
    const key = String(memberIdOrEmail || '').trim();
    const idx = db.members.findIndex((m) => m.id === key || m.email === key);
    const removed = idx >= 0 ? db.members.splice(idx, 1)[0] : { id: key, name: key };
    db.auditLogs.unshift({
      at: nowFormatted(),
      type: 'PURGE',
      actor: `${removed.name} (${removed.id})`,
      detail: '운영 DB 및 백업 스토리지 영구 파기 완료 (복구 불가)'
    });
    save(db);
  }

  function updatePartnerStatus(memberIdOrEmail, { paired = false, partnerName = '윤서', partnerEmail = 'yunseo@kakao.com', inviteCode = 'SAI1024' } = {}) {
    const db = load();
    const member = ensureMemberMaterialized(db, memberIdOrEmail || db.activeMemberId);
    if (!member) return null;
    const now = nowFormatted();

    if (paired && !member.partner?.paired) {
      db.deltas.pairedCouplesDelta = (db.deltas.pairedCouplesDelta || 0) + 1;
    } else if (!paired && member.partner?.paired) {
      db.deltas.pairedCouplesDelta = (db.deltas.pairedCouplesDelta || 0) - 1;
    }

    member.partner = paired
      ? {
          paired: true,
          partnerId: 'MEM-2026-00002',
          partnerName,
          partnerEmail,
          inviteCode,
          pairedSince: now.slice(0, 10)
        }
      : {
          paired: false,
          partnerId: null,
          partnerName: '-',
          partnerEmail: '-',
          inviteCode,
          pairedSince: null
        };
    member.partnerName = paired ? partnerName : '-';
    member.pairedSince = member.partner.pairedSince;

    db.auditLogs.unshift({
      at: now,
      type: paired ? 'COUPLE_PAIR' : 'COUPLE_UNPAIR',
      actor: `${member.name} (${member.id})`,
      detail: paired
        ? `파트너 ${partnerName}님과 초대 코드(${inviteCode}) 양방향 연결 완료`
        : '파트너(커플) 연결 해제 및 공유 채널 즉시 종료'
    });

    save(db);
    return member.partner;
  }

  function updatePartnerConnection(connected, partnerName = '윤서', code = 'SAI1024') {
    const db = load();
    return updatePartnerStatus(db.activeMemberId, { paired: Boolean(connected), partnerName, inviteCode: code });
  }

  function getDefaultCoupleRecords(db) {
    const activeMember = db.members.find((m) => m.id === db.activeMemberId) || db.members[0];
    const isSuminPaired = Boolean(activeMember?.partner?.paired);
    return [
      {
        id: 'CPL-1001',
        status: isSuminPaired ? 'CONNECTED' : 'UNLINKED',
        statusLabel: isSuminPaired ? '연결 완료 · 교감 중' : '연결 해제 · 단독 이용',
        memberId: activeMember?.id || 'MEM-2026-00001',
        memberName: activeMember?.name || '김수민',
        memberEmail: activeMember?.email || 'sumin@sai.io',
        memberRing: activeMember?.ring?.firmwareName || 'SAI_11C1',
        partnerName: isSuminPaired ? activeMember?.partner?.partnerName || '이윤서' : '이윤서 (연결 해제)',
        partnerEmail: 'yunseo@sai.io',
        partnerRing: 'SAI_88A2',
        inviteCode: activeMember?.partner?.inviteCode || 'SAI1024',
        durationText: isSuminPaired ? '2026.07.14 연결 (114일째)' : '연결 해제됨 · 단독 모드',
        sharedItems: isSuminPaired ? ['수면', '심박', '기분', '주기'] : [],
        sharedNote: isSuminPaired ? '전체 4개 항목 양방향 공유 중' : '공유 중단 · 개인 기록만 보관',
        lastActivity: isSuminPaired ? '오늘 07:42 아침 수면·기분 리포트 공유 완료' : '개인 수면·심박 리포트 단독 확인 중'
      },
      {
        id: 'CPL-1002',
        status: 'CONNECTED',
        statusLabel: '연결 완료 · 교감 중',
        memberId: 'MEM-2026-00003',
        memberName: '박지훈',
        memberEmail: 'jihoon.park@sai.io',
        memberRing: 'SAI_4E90',
        partnerName: '최서연',
        partnerEmail: 'seoyeon.choi@sai.io',
        partnerRing: 'SAI_4E91',
        inviteCode: 'SAI3088',
        durationText: '2026.05.02 연결 (187일째)',
        sharedItems: ['수면', '심박', '기분', '주기'],
        sharedNote: '전체 4개 항목 양방향 공유 중',
        lastActivity: '오늘 08:11 아침 컨디션 · 배려 신호 전송'
      },
      {
        id: 'CPL-1003',
        status: 'PENDING',
        statusLabel: '초대 수락 대기 중',
        memberId: 'MEM-2026-00005',
        memberName: '정하은',
        memberEmail: 'haeun.jung@sai.io',
        memberRing: 'SAI_7C24',
        partnerName: '강도윤 (수락 대기)',
        partnerEmail: 'doyoon.kang@sai.io',
        partnerRing: '링 연결 예정',
        inviteCode: 'SAI5519',
        durationText: '오늘 01:20 초대장 발송 (7시간 경과)',
        sharedItems: ['수면', '기분'],
        sharedNote: '수락 시 수면·기분 우선 공유 예정',
        lastActivity: '카카오톡 초대 코드 발송 완료 · 상대방 입력 대기'
      },
      {
        id: 'CPL-1004',
        status: 'PARTIAL',
        statusLabel: '일부 항목만 선택 공유',
        memberId: 'MEM-2026-00006',
        memberName: '한소희',
        memberEmail: 'sohee.han@sai.io',
        memberRing: 'SAI_92B4',
        partnerName: '윤재현',
        partnerEmail: 'jaehyun.yoon@sai.io',
        partnerRing: 'SAI_92B5',
        inviteCode: 'SAI7741',
        durationText: '2026.08.19 연결 (78일째)',
        sharedItems: ['기분', '심박'],
        sharedNote: '기분·심박만 공유 (수면·주기 비공개)',
        lastActivity: '오늘 07:55 아침 기분 점수(88점) 공유'
      },
      {
        id: 'CPL-1005',
        status: 'CONNECTED',
        statusLabel: '연결 완료 · 교감 중',
        memberId: 'MEM-2026-00008',
        memberName: '송민재',
        memberEmail: 'minjae.song@sai.io',
        memberRing: 'SAI_3D12',
        partnerName: '김다인',
        partnerEmail: 'dain.kim@sai.io',
        partnerRing: 'SAI_3D15',
        inviteCode: 'SAI6190',
        durationText: '2026.06.10 연결 (148일째)',
        sharedItems: ['수면', '심박', '기분', '주기'],
        sharedNote: '전체 4개 항목 양방향 공유 중',
        lastActivity: '오늘 08:30 순간 달력 사진 다이어리 함께 기록'
      },
      {
        id: 'CPL-1006',
        status: 'PENDING',
        statusLabel: '초대 수락 대기 중',
        memberId: 'MEM-2026-00011',
        memberName: '오유진',
        memberEmail: 'yujin.oh@sai.io',
        memberRing: 'SAI_6A08',
        partnerName: '임현우 (수락 대기)',
        partnerEmail: 'hyunwoo.lim@sai.io',
        partnerRing: 'SAI_6A09',
        inviteCode: 'SAI8823',
        durationText: '어제 21:40 초대장 발송 (14시간 경과)',
        sharedItems: ['수면', '심박', '기분'],
        sharedNote: '파트너가 #together 화면에서 코드 입력 대기 중',
        lastActivity: '파트너 초대 코드 복사 2회 · 리마인드 발송 가능'
      },
      {
        id: 'CPL-1007',
        status: 'PARTIAL',
        statusLabel: '일부 항목만 선택 공유',
        memberId: 'MEM-2026-00014',
        memberName: '신예은',
        memberEmail: 'yeeun.shin@sai.io',
        memberRing: 'SAI_5F31',
        partnerName: '조성민',
        partnerEmail: 'sungmin.jo@sai.io',
        partnerRing: 'SAI_5F32',
        inviteCode: 'SAI4012',
        durationText: '2026.09.05 연결 (61일째)',
        sharedItems: ['수면', '기분'],
        sharedNote: '수면·기분만 공유 (심박·주기 비공개)',
        lastActivity: '오늘 07:18 밤사이 수면 리포트(7시간 40분) 공유'
      },
      {
        id: 'CPL-1008',
        status: 'UNLINKED',
        statusLabel: '연결 해제 · 단독 이용',
        memberId: 'MEM-2026-00017',
        memberName: '장우진',
        memberEmail: 'woojin.jang@sai.io',
        memberRing: 'SAI_2C77',
        partnerName: '파트너 미연결 (개인 케어)',
        partnerEmail: '-',
        partnerRing: '-',
        inviteCode: 'SAI9304',
        durationText: '개인 수면·심박 단독 이용 (43일째)',
        sharedItems: [],
        sharedNote: '파트너 공유 없음 · 개인 건강 리포트 전용',
        lastActivity: '오늘 06:50 개인 수면 단계 · 심박 변이도 확인'
      },
      {
        id: 'CPL-1009',
        status: 'UNLINKED',
        statusLabel: '연결 해제 · 단독 이용',
        memberId: 'MEM-2026-00019',
        memberName: '배수빈',
        memberEmail: 'subin.bae@sai.io',
        memberRing: 'SAI_8B44',
        partnerName: '이전 연결 해제 (휴식 모드)',
        partnerEmail: '-',
        partnerRing: '-',
        inviteCode: 'SAI2195',
        durationText: '2026.10.28 연결 해제 후 개인 이용 전환',
        sharedItems: [],
        sharedNote: '연결 해제 시 기존 파트너 공유 열람 즉시 차단됨',
        lastActivity: '어제 23:15 개인 캘린더 다이어리 작성'
      }
    ];
  }

  function getCoupleStatusAnalytics({ status = 'ALL', search = '' } = {}) {
    const db = load();
    const baseRecords = getDefaultCoupleRecords(db);
    const overrides = db.coupleStatusOverrides || {};

    const records = baseRecords.map((r) => {
      if (overrides[r.id]) {
        return { ...r, ...overrides[r.id] };
      }
      return r;
    });

    const q = (search || '').trim().toLowerCase();
    const filtered = records.filter((r) => {
      if (status !== 'ALL' && r.status !== status) return false;
      if (
        q &&
        !(
          r.memberName.toLowerCase().includes(q) ||
          r.partnerName.toLowerCase().includes(q) ||
          r.inviteCode.toLowerCase().includes(q) ||
          r.memberRing.toLowerCase().includes(q) ||
          r.partnerRing.toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      return true;
    });

    return {
      summary: {
        totalActiveCouples: 7320,
        totalActiveCoupleMembers: 14640,
        fullConnectedCouples: 6700,
        partialShareCouples: 620,
        invitePendingMembers: 1840,
        soloOrUnlinkedMembers: 2760,
        soloOnlyMembers: 2120,
        unlinkedRestMembers: 640,
        avgDurationDays: 142,
        morningShareRate: '84.6%',
        inviteAcceptRate24h: '79.8%'
      },
      statusGroups: [
        {
          key: 'CONNECTED',
          label: '연결 완료 · 전체 공유',
          countText: '6,700쌍 (13,400명)',
          rate: '65.4%',
          pct: 65.4,
          tone: 'connected',
          desc: '수면·심박·기분·주기 4대 기록을 모두 공유하는 커플'
        },
        {
          key: 'PENDING',
          label: '초대 수락 대기',
          countText: '1,840명',
          rate: '9.0%',
          pct: 14.0,
          tone: 'pending',
          desc: '초대 코드 발송 후 파트너 입력 대기 중'
        },
        {
          key: 'PARTIAL',
          label: '선택 항목 공유',
          countText: '620쌍 (1,240명)',
          rate: '6.1%',
          pct: 10.5,
          tone: 'partial',
          desc: '기분·심박 등 일부 항목만 선택 공유 중인 커플'
        },
        {
          key: 'UNLINKED',
          label: '단독 이용 · 연결 해제',
          countText: '2,760명 (단독 2,120 · 해제 640)',
          rate: '13.5%',
          pct: 18.5,
          tone: 'unlinked',
          desc: '개인 건강 케어 단독 이용 또는 기존 연결 해제 회원'
        }
      ],
      sharingBreakdown: [
        { label: '아침 기분 · 한마디 공유', pairs: '7,056쌍', rate: '96.4%', pct: 96.4 },
        { label: '수면 시간 · 수면 단계 공유', pairs: '6,530쌍', rate: '89.2%', pct: 89.2 },
        { label: '심박수 · 걸음 수 공유', pairs: '6,039쌍', rate: '82.5%', pct: 82.5 },
        { label: '생리 주기 배려 신호 공유', pairs: '4,743쌍', rate: '64.8%', pct: 64.8 }
      ],
      records: filtered
    };
  }

  function updateCoupleRecordStatus(recordId, nextStatus) {
    const db = load();
    if (!db.coupleStatusOverrides) db.coupleStatusOverrides = {};

    const statusMeta = {
      CONNECTED: {
        status: 'CONNECTED',
        statusLabel: '연결 완료 · 교감 중',
        sharedItems: ['수면', '심박', '기분', '주기'],
        sharedNote: '전체 4개 항목 양방향 공유 중',
        lastActivity: '방금 전 · 양방향 커플 연결 및 전체 공유 활성화'
      },
      PARTIAL: {
        status: 'PARTIAL',
        statusLabel: '일부 항목만 선택 공유',
        sharedItems: ['기분', '심박'],
        sharedNote: '기분·심박만 공유 (수면·주기 비공개)',
        lastActivity: '방금 전 · 선택 항목 공유 모드로 변경됨'
      },
      PENDING: {
        status: 'PENDING',
        statusLabel: '초대 수락 대기 중',
        sharedItems: ['수면', '기분'],
        sharedNote: '파트너에게 초대 코드 재발송 완료 · 수락 대기',
        lastActivity: '방금 전 · 파트너 초대 알림 재발송 완료'
      },
      UNLINKED: {
        status: 'UNLINKED',
        statusLabel: '연결 해제 · 단독 이용',
        sharedItems: [],
        sharedNote: '공유 중단 · 개인 기록만 안전하게 보관',
        lastActivity: '방금 전 · 파트너 연결 해제 및 공유 즉시 종료'
      }
    };

    const patch = statusMeta[nextStatus] || statusMeta.CONNECTED;
    db.coupleStatusOverrides[recordId] = patch;

    if (recordId === 'CPL-1001') {
      const m = db.members.find((item) => item.id === db.activeMemberId) || db.members[0];
      if (m) {
        const isConn = nextStatus === 'CONNECTED' || nextStatus === 'PARTIAL';
        m.partner = {
          ...(m.partner || {}),
          paired: isConn,
          partnerName: isConn ? '이윤서' : '-',
          inviteCode: m.partner?.inviteCode || 'SAI1024',
          pairedSince: isConn ? nowFormatted().slice(0, 10) : null
        };
      }
    }

    db.auditLogs.unshift({
      at: nowFormatted(),
      type: 'COUPLE_STATUS',
      actor: `커플 현황 (${recordId})`,
      detail: `커플 연결 상태를 [${patch.statusLabel}] 상태로 업데이트`
    });

    save(db);
    return patch;
  }

  function toggleExternalHealth(arg1, arg2, arg3) {
    const db = load();
    let member;
    let providerKey;
    let nextVal;

    // Support both (memberId, providerKey, nextBool) from admin.js and (serviceKey, mode) from app
    if (typeof arg3 === 'boolean' || (arg2 && ['appleHealth', 'googleHealthConnect', 'samsungHealth', 'healthConnect'].includes(arg2))) {
      member = ensureMemberMaterialized(db, arg1);
      providerKey = arg2 === 'healthConnect' ? 'googleHealthConnect' : arg2;
      const cur = Boolean(member?.healthSync?.externalHealth?.[providerKey]);
      nextVal = typeof arg3 === 'boolean' ? arg3 : !cur;
    } else {
      member = getActiveMember();
      providerKey = arg1 === 'healthConnect' ? 'googleHealthConnect' : arg1;
      const cur = Boolean(member?.healthSync?.externalHealth?.[providerKey]);
      nextVal = arg2 === 'disconnect' ? false : !cur;
    }

    if (!member) return null;
    if (!member.healthSync) member.healthSync = { externalHealth: {} };
    if (!member.healthSync.externalHealth) member.healthSync.externalHealth = {};
    member.healthSync.externalHealth[providerKey] = nextVal;

    const mapKey = providerKey === 'googleHealthConnect' ? 'healthConnect' : providerKey;
    if (member.externalHealth && member.externalHealth[mapKey]) {
      member.externalHealth[mapKey].connected = nextVal;
      member.externalHealth[mapKey].read = nextVal;
      member.externalHealth[mapKey].write = nextVal;
      member.externalHealth[mapKey].lastSync = nextVal ? nowFormatted() : '-';
    }

    db.auditLogs.unshift({
      at: nowFormatted(),
      type: 'EXT_HEALTH',
      actor: `${member.name} (${member.id})`,
      detail: `${providerKey} 외부 헬스 연동 ${nextVal ? '활성화 (ON)' : '비활성화 (OFF)'}`
    });

    save(db);
    return member.healthSync.externalHealth;
  }

  function registerDevice({ bleId = 'F1BE85F511C1', rawModel = 'R22', finish = 'Gold', battery = 92 } = {}) {
    const db = load();
    const dev = buildDeviceRecord({
      bleId,
      baseModel: rawModel,
      finish,
      battery,
      status: 'STANDBY'
    });
    db.devices.unshift(dev);
    db.deltas.registeredDevicesDelta = (db.deltas.registeredDevicesDelta || 0) + 1;
    db.auditLogs.unshift({
      at: nowFormatted(),
      type: 'DEVICE_REG',
      actor: dev.firmwareName,
      detail: `신규 스마트링 ${dev.rawFirmware} (${dev.bleId}) → ${dev.firmwareName} (${finish}) 레지스트리 등록`
    });
    save(db);
    return dev;
  }

  function answerInquiry(inquiryId, answerText = '정상 처리 완료되었습니다.') {
    const db = load();
    const inq = db.inquiries.find((i) => i.id === inquiryId);
    if (inq) {
      inq.status = 'ANSWERED';
      inq.answer = answerText;
      inq.answeredAt = nowFormatted();
      db.auditLogs.unshift({
        at: nowFormatted(),
        type: 'SUPPORT_REPLY',
        actor: `고객지원 (${inq.id})`,
        detail: `${inq.memberName}님 문의 [${inq.subject}] 답변 완료 처리`
      });
      save(db);
    }
    return inq;
  }

  function getAppSettings() {
    const db = load();
    return {
      showSelectAllTerms: true,
      allowSkipRingPairing: true,
      requireAge14Check: true,
      ringBlePrefix: 'SAI_',
      ringHelpDelaySec: '4',
      autoSyncInterval: '15m',
      morningCheckinTime: '08:00',
      defaultCoupleShareScope: 'all_4',
      togetherBreathSec: '24',
      updatedAt: '2026-11-04 09:00',
      ...(db.appSettings || {})
    };
  }

  function updateAppSettings(patch = {}) {
    const db = load();
    db.appSettings = {
      ...getAppSettings(),
      ...patch,
      updatedAt: nowFormatted()
    };
    db.auditLogs.unshift({
      at: nowFormatted(),
      type: 'APP_SETTINGS',
      actor: '운영자 (앱 설정 관리)',
      detail: `앱 운영 설정 업데이트 완료 (전체동의:${db.appSettings.showSelectAllTerms ? 'ON' : 'OFF'}, 링도움말:${db.appSettings.ringHelpDelaySec}초, 아침알림:${db.appSettings.morningCheckinTime})`
    });
    save(db);
    return db.appSettings;
  }

  function getCommerceAnalytics(options = {}) {
    const db = load();
    const statusFilter = options.status || 'ALL';
    const search = (options.search || '').trim().toLowerCase();

    const defaultOrders = [
      {
        id: 'ORD-20261104-08',
        orderedAt: '2026-11-04 14:22',
        channel: '자사 공식몰',
        buyerName: '김지안',
        buyerPhone: '010-4821-3092',
        productName: 'SAI 커플 링 패키지 (2개입)',
        colorSpec: '18K 골드 (11호) + 퓨어 실버 (17호)',
        colors: ['Gold', 'Silver'],
        assignedBle: '출고 시 시리얼 매핑',
        courier: 'CJ대한통운',
        trackingNo: '송장 발급 대기',
        status: 'NEW_ORDER',
        statusLabel: '신규 주문 접수',
        appPaired: '출고 대기'
      },
      {
        id: 'ORD-20261104-07',
        orderedAt: '2026-11-04 13:45',
        channel: '카카오 선물하기',
        buyerName: '박도현 (선물수신: 이수아)',
        buyerPhone: '010-7732-1940',
        productName: 'SAI 커플 링 패키지 (2개입)',
        colorSpec: '로즈골드 (호수 미정) + 18K 골드 (호수 미정)',
        colors: ['Rose Gold', 'Gold'],
        assignedBle: '사이징 키트 먼저 발송',
        courier: 'CJ대한통운',
        trackingNo: '6482-9104-7712 (키트)',
        status: 'SIZING_KIT',
        statusLabel: '사이징 키트 배송 · 호수 대기',
        appPaired: '호수 입력 대기'
      },
      {
        id: 'ORD-20261104-06',
        orderedAt: '2026-11-04 11:18',
        channel: '네이버 스마트스토어',
        buyerName: '최유진',
        buyerPhone: '010-3391-8824',
        productName: 'SAI 싱글 스마트링 (1개입)',
        colorSpec: '18K 골드 (12호)',
        colors: ['Gold'],
        assignedBle: '출고 시 시리얼 매핑',
        courier: 'CJ대한통운',
        trackingNo: '송장 발급 대기',
        status: 'NEW_ORDER',
        statusLabel: '신규 주문 접수',
        appPaired: '출고 대기'
      },
      {
        id: 'ORD-20261104-05',
        orderedAt: '2026-11-03 19:30',
        channel: '자사 공식몰',
        buyerName: '정우성',
        buyerPhone: '010-9281-4410',
        productName: 'SAI 커플 링 패키지 (2개입)',
        colorSpec: '18K 골드 (11호) + 18K 골드 (16호)',
        colors: ['Gold', 'Gold'],
        assignedBle: 'SAI_48B2 · SAI_48B3',
        courier: 'CJ대한통운',
        trackingNo: '6482-9104-8821',
        status: 'SHIPPING',
        statusLabel: '본품 출고 · 배송 중',
        appPaired: '수령 후 연결 예정'
      },
      {
        id: 'ORD-20261104-04',
        orderedAt: '2026-11-03 16:12',
        channel: '29CM 스페셜',
        buyerName: '한소희',
        buyerPhone: '010-5512-9081',
        productName: 'SAI 싱글 스마트링 (1개입)',
        colorSpec: '로즈골드 (10호)',
        colors: ['Rose Gold'],
        assignedBle: 'SAI_77C9',
        courier: 'CJ대한통운',
        trackingNo: '6482-9104-8510',
        status: 'SHIPPING',
        statusLabel: '본품 출고 · 배송 중',
        appPaired: '수령 후 연결 예정'
      },
      {
        id: 'ORD-20261104-03',
        orderedAt: '2026-11-03 10:05',
        channel: '카카오 선물하기',
        buyerName: '송민호',
        buyerPhone: '010-6204-3198',
        productName: 'SAI 싱글 스마트링 (1개입)',
        colorSpec: '퓨어 실버 (호수 측정 중)',
        colors: ['Silver'],
        assignedBle: '사이징 키트 수령 완료',
        courier: 'CJ대한통운',
        trackingNo: '6482-9104-6104 (키트)',
        status: 'SIZING_KIT',
        statusLabel: '사이징 키트 배송 · 호수 대기',
        appPaired: '호수 입력 대기'
      },
      {
        id: 'ORD-20261104-02',
        orderedAt: '2026-11-02 15:40',
        channel: '자사 공식몰',
        buyerName: '서은하',
        buyerPhone: '010-2910-5531',
        productName: 'SAI 커플 링 패키지 (2개입)',
        colorSpec: '18K 골드 (11호) + 퓨어 실버 (16호)',
        colors: ['Gold', 'Silver'],
        assignedBle: 'SAI_11C1 · SAI_12A4',
        courier: 'CJ대한통운',
        trackingNo: '6482-9104-5012',
        status: 'DELIVERED',
        statusLabel: '배송 완료 · 앱 연결됨',
        appPaired: '✓ 두 사람 모두 페어링 완료'
      },
      {
        id: 'ORD-20261104-01',
        orderedAt: '2026-11-01 21:15',
        channel: '네이버 스마트스토어',
        buyerName: '윤서준',
        buyerPhone: '010-8412-0923',
        productName: 'SAI 싱글 스마트링 (1개입)',
        colorSpec: '퓨어 실버 (18호)',
        colors: ['Silver'],
        assignedBle: 'SAI_39F1',
        courier: 'CJ대한통운',
        trackingNo: '6482-9104-3980',
        status: 'DELIVERED',
        statusLabel: '배송 완료 · 앱 연결됨',
        appPaired: '✓ 앱 연결 완료 (SAI_39F1)'
      }
    ];

    const customOrders = Array.isArray(db.commerceOrders) ? db.commerceOrders : [];
    const overrides = db.commerceOrderOverrides || {};

    const merged = [...customOrders, ...defaultOrders].map((ord) => {
      if (overrides[ord.id]) {
        return { ...ord, ...overrides[ord.id] };
      }
      return ord;
    });

    const filtered = merged.filter((o) => {
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
      if (search) {
        const hay = `${o.id} ${o.channel} ${o.buyerName} ${o.buyerPhone} ${o.productName} ${o.colorSpec} ${o.assignedBle} ${o.trackingNo}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    return {
      summary: {
        newOrders: 48 + customOrders.filter((x) => x.status === 'NEW_ORDER').length,
        sizingKitWaiting: 64,
        shippingNow: 128,
        deliveredMonth: 1480,
        deliveryToAppRate: '94.6%'
      },
      channels: [
        { name: '자사 공식몰', status: '웹훅 연동', share: '52.4%', ordersToday: '오늘 25건', note: '커플 세트 비중 68.4% · 계정 자동 매칭' },
        { name: '카카오톡 선물하기', status: 'API 연동', share: '26.8%', ordersToday: '오늘 13건', note: '사이징 키트 발송 후 호수 입력 시 자동 출고' },
        { name: '네이버 스마트스토어', status: '양방향 연동', share: '14.2%', ordersToday: '오늘 7건', note: '송장 등록 시 네이버페이 배송중 자동 전환' },
        { name: '29CM · 무신사', status: '수집 정상', share: '6.6%', ordersToday: '오늘 3건', note: '싱글 링 (골드·로즈골드) 구매 집중' }
      ],
      orders: filtered
    };
  }

  function updateOrderStatus(orderId, nextStatus) {
    const db = load();
    if (!db.commerceOrderOverrides) db.commerceOrderOverrides = {};

    const STATUS_MAP = {
      NEW_ORDER: {
        status: 'NEW_ORDER',
        statusLabel: '신규 주문 접수',
        trackingNo: '송장 발급 대기',
        appPaired: '출고 대기'
      },
      SIZING_KIT: {
        status: 'SIZING_KIT',
        statusLabel: '사이징 키트 배송 · 호수 대기',
        trackingNo: `6482-9104-${Math.floor(1000 + Math.random() * 8999)} (키트)`,
        assignedBle: '사이징 키트 발송 완료',
        appPaired: '호수 입력 대기'
      },
      SHIPPING: {
        status: 'SHIPPING',
        statusLabel: '본품 출고 · 배송 중',
        trackingNo: `6482-9104-${Math.floor(1000 + Math.random() * 8999)}`,
        assignedBle: `SAI_${Math.floor(10 + Math.random() * 89)}C${Math.floor(1 + Math.random() * 9)}`,
        appPaired: '수령 후 연결 예정'
      },
      DELIVERED: {
        status: 'DELIVERED',
        statusLabel: '배송 완료 · 앱 연결됨',
        appPaired: '✓ 수령 및 앱 페어링 완료'
      }
    };

    const patch = STATUS_MAP[nextStatus] || STATUS_MAP.SHIPPING;
    db.commerceOrderOverrides[orderId] = {
      ...(db.commerceOrderOverrides[orderId] || {}),
      ...patch
    };

    if (Array.isArray(db.commerceOrders)) {
      const idx = db.commerceOrders.findIndex((o) => o.id === orderId);
      if (idx !== -1) {
        db.commerceOrders[idx] = { ...db.commerceOrders[idx], ...patch };
      }
    }

    db.auditLogs.unshift({
      at: nowFormatted(),
      type: 'ORDER_SHIP',
      actor: `주문·배송 (${orderId})`,
      detail: `주문 상태를 [${patch.statusLabel}] 단계로 변경 (${patch.trackingNo || '송장 반영'})`
    });

    save(db);
    return patch;
  }

  function createCommerceOrder({
    channel = '자사 공식몰',
    buyerName = '신규 구매자',
    buyerPhone = '010-5820-1194',
    productName = 'SAI 커플 링 패키지 (2개입)',
    colorSpec = '18K 골드 (11호) + 퓨어 실버 (17호)',
    colors = ['Gold', 'Silver'],
    needSizingKit = false
  } = {}) {
    const db = load();
    if (!Array.isArray(db.commerceOrders)) db.commerceOrders = [];
    const seq = String(9 + db.commerceOrders.length).padStart(2, '0');
    const newOrd = {
      id: `ORD-20261104-${seq}`,
      orderedAt: nowFormatted(),
      channel,
      buyerName,
      buyerPhone,
      productName,
      colorSpec,
      colors,
      assignedBle: needSizingKit ? '사이징 키트 먼저 발송' : '출고 시 시리얼 매핑',
      courier: 'CJ대한통운',
      trackingNo: needSizingKit ? `6482-9104-${Math.floor(1000 + Math.random() * 8999)} (키트)` : '송장 발급 대기',
      status: needSizingKit ? 'SIZING_KIT' : 'NEW_ORDER',
      statusLabel: needSizingKit ? '사이징 키트 배송 · 호수 대기' : '신규 주문 접수',
      appPaired: needSizingKit ? '호수 입력 대기' : '출고 대기'
    };
    db.commerceOrders.unshift(newOrd);
    db.auditLogs.unshift({
      at: nowFormatted(),
      type: 'ORDER_NEW',
      actor: `${channel} (${newOrd.id})`,
      detail: `${buyerName} 님 [${productName} · ${colorSpec}] 신규 주문 접수 완료`
    });
    save(db);
    return newOrd;
  }

  /* ------------------------------------------------------------------------
     PHASE 1 LOCAL TEST SERVER (READ-ONLY) ASYNC CLIENT
     - Strictly separated from the 20,480-user localStorage simulation
     - Requires server-verified operator bearer token (no URL-hash bypass)
     ------------------------------------------------------------------------ */
  const ADMIN_TOKEN_SESSION_KEY = 'sai_phase1_admin_token_v1';

  const testFlightPhase1State = {
    serverStatus: 'idle', // 'idle' | 'loading' | 'connected' | 'unauthorized' | 'offline'
    baseUrl: 'http://127.0.0.1:8787',
    operator: null,
    overview: null,
    lastError: null
  };

  const ADMIN_STANDALONE_SESSION_KEY = 'sai_admin_standalone_logged_in_v1';

  function getTestFlightServerBaseUrl() {
    if (
      typeof window !== 'undefined' &&
      window.location &&
      (window.location.protocol === 'http:' || window.location.protocol === 'https:') &&
      window.location.origin &&
      window.location.origin !== 'null' &&
      window.location.port === '8787'
    ) {
      return window.location.origin;
    }
    return 'http://127.0.0.1:8787';
  }

  function getStoredAdminToken() {
    try {
      return sessionStorage.getItem(ADMIN_TOKEN_SESSION_KEY) || '';
    } catch {
      return '';
    }
  }

  function setStoredAdminToken(token) {
    try {
      if (token) {
        sessionStorage.setItem(ADMIN_TOKEN_SESSION_KEY, token);
      } else {
        sessionStorage.removeItem(ADMIN_TOKEN_SESSION_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }

  function notifyTestFlightStateChanged() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sai-testflight-updated', { detail: testFlightPhase1State }));
    }
  }

  function getTestFlightPhase1State() {
    return {
      ...testFlightPhase1State,
      connected: testFlightPhase1State.serverStatus === 'connected',
      adminSession: testFlightPhase1State.operator,
      baseUrl: getTestFlightServerBaseUrl(),
      hasAdminToken: Boolean(getStoredAdminToken())
    };
  }

  function isStandaloneAdminLoggedIn() {
    try {
      return sessionStorage.getItem(ADMIN_STANDALONE_SESSION_KEY) === '1';
    } catch {
      return false;
    }
  }

  function setStandaloneAdminLoggedIn(flag) {
    try {
      if (flag) {
        sessionStorage.setItem(ADMIN_STANDALONE_SESSION_KEY, '1');
      } else {
        sessionStorage.removeItem(ADMIN_STANDALONE_SESSION_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }

  async function loginAdminOnTestServer(email, password) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const rawPassword = String(password || '').trim();
    const isValidLocalAdmin =
      (normalizedEmail === 'admin@sai.io' || normalizedEmail === 'admin@42sai.io' || normalizedEmail === 'admin') &&
      rawPassword === 'sai2026admin!';

    const baseUrl = getTestFlightServerBaseUrl();
    testFlightPhase1State.baseUrl = baseUrl;
    testFlightPhase1State.serverStatus = 'loading';
    testFlightPhase1State.lastError = null;
    notifyTestFlightStateChanged();

    try {
      const res = await fetch(`${baseUrl}/api/v1/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.status === 404 || res.status === 405 || res.status === 501) {
        throw new Error('STATIC_HOST_NO_API');
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.adminToken) {
        setStoredAdminToken('');
        setStandaloneAdminLoggedIn(false);
        testFlightPhase1State.serverStatus = 'unauthorized';
        testFlightPhase1State.operator = null;
        testFlightPhase1State.overview = null;
        testFlightPhase1State.lastError = data.message || '운영자 서버 인증에 실패했습니다.';
        notifyTestFlightStateChanged();
        return { ok: false, status: res.status, message: testFlightPhase1State.lastError };
      }

      setStoredAdminToken(data.adminToken);
      setStandaloneAdminLoggedIn(true);
      testFlightPhase1State.operator = data.operator || null;
      await fetchTestFlightPhase1Overview();
      return { ok: true, operator: data.operator, overview: testFlightPhase1State.overview };
    } catch {
      testFlightPhase1State.serverStatus = 'offline';
      testFlightPhase1State.lastError =
        '로컬 테스트 서버(127.0.0.1:8787) 미연결 상태입니다. 독립 어드민 콘솔 모드로 동작합니다.';
      if (!isValidLocalAdmin) {
        setStandaloneAdminLoggedIn(false);
        notifyTestFlightStateChanged();
        return {
          ok: false,
          status: 401,
          error: '아이디 또는 비밀번호가 올바르지 않습니다. (admin@sai.io / sai2026admin!)'
        };
      }
      setStandaloneAdminLoggedIn(true);
      notifyTestFlightStateChanged();
      return {
        ok: true,
        offline: true,
        standalone: true,
        message: testFlightPhase1State.lastError
      };
    }
  }

  async function verifyAdminSessionOnTestServer() {
    const token = getStoredAdminToken();
    if (!token) {
      testFlightPhase1State.serverStatus = 'offline';
      testFlightPhase1State.operator = null;
      testFlightPhase1State.overview = null;
      if (isStandaloneAdminLoggedIn()) {
        return { ok: true, standalone: true };
      }
      return { ok: false, reason: 'NO_TOKEN' };
    }
    const baseUrl = getTestFlightServerBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/v1/admin/session`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 404 || res.status === 405 || res.status === 501) {
        throw new Error('STATIC_HOST_NO_API');
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setStoredAdminToken('');
        setStandaloneAdminLoggedIn(false);
        testFlightPhase1State.serverStatus = 'unauthorized';
        testFlightPhase1State.operator = null;
        testFlightPhase1State.overview = null;
        notifyTestFlightStateChanged();
        return { ok: false, reason: 'INVALID_TOKEN' };
      }
      setStandaloneAdminLoggedIn(true);
      testFlightPhase1State.operator = data.operator;
      await fetchTestFlightPhase1Overview();
      return { ok: true, operator: data.operator };
    } catch {
      testFlightPhase1State.serverStatus = 'offline';
      notifyTestFlightStateChanged();
      if (isStandaloneAdminLoggedIn()) {
        return { ok: true, offline: true, standalone: true };
      }
      return { ok: false, offline: true };
    }
  }

  function logoutAdminOnTestServer() {
    setStoredAdminToken('');
    setStandaloneAdminLoggedIn(false);
    testFlightPhase1State.serverStatus = 'idle';
    testFlightPhase1State.operator = null;
    testFlightPhase1State.overview = null;
    testFlightPhase1State.lastError = null;
    notifyTestFlightStateChanged();
  }

  async function fetchTestFlightPhase1Overview() {
    const token = getStoredAdminToken();
    const baseUrl = getTestFlightServerBaseUrl();
    testFlightPhase1State.baseUrl = baseUrl;

    if (!token) {
      testFlightPhase1State.serverStatus = 'unauthorized';
      testFlightPhase1State.overview = null;
      testFlightPhase1State.lastError = '운영자 서버 인증 토큰이 없습니다. 로그인 후 조회할 수 있습니다.';
      notifyTestFlightStateChanged();
      return { ok: false, error: 'NO_ADMIN_TOKEN' };
    }

    testFlightPhase1State.serverStatus = 'loading';
    notifyTestFlightStateChanged();

    try {
      const res = await fetch(`${baseUrl}/api/v1/admin/testflight/overview`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (res.status === 401 || res.status === 403) {
          setStoredAdminToken('');
          testFlightPhase1State.serverStatus = 'unauthorized';
          testFlightPhase1State.operator = null;
        }
        testFlightPhase1State.overview = null;
        testFlightPhase1State.lastError = data.message || '1단계 테스트 연동 데이터를 불러오지 못했습니다.';
        notifyTestFlightStateChanged();
        return { ok: false, status: res.status, error: data.error };
      }

      testFlightPhase1State.serverStatus = 'connected';
      testFlightPhase1State.operator = data.operator || testFlightPhase1State.operator;
      testFlightPhase1State.overview = data;
      testFlightPhase1State.lastError = null;
      notifyTestFlightStateChanged();
      return { ok: true, data };
    } catch {
      testFlightPhase1State.serverStatus = 'offline';
      testFlightPhase1State.lastError =
        '로컬 테스트 서버(127.0.0.1:8787)가 응답하지 않습니다. 시뮬레이션 목업 데이터만 표시됩니다.';
      notifyTestFlightStateChanged();
      return { ok: false, offline: true };
    }
  }

  window.SAIStore = {
    STORAGE_KEY,
    VIRTUAL_BASELINE,
    parseHardwareIdentity,
    load,
    save,
    resetToDefault,
    resetToSeed: resetToDefault,
    getDashboardStats,
    getEnterpriseAnalytics,
    getProductFlowGraph,
    recordScreenTransition,
    getVirtualMembersPage,
    generateVirtualMemberByIndex,
    getActiveMember,
    getSelectedDevice,
    registerOrUpdateMember,
    loginMember,
    pairDeviceToMember,
    pairRingToActiveMember,
    pairRingDevice,
    syncHealthDataFromRing,
    fetchHealthDataFromRing,
    withdrawMember,
    withdrawActiveMember,
    restoreMember,
    deleteMemberPermanently,
    updatePartnerStatus,
    updatePartnerConnection,
    getCoupleStatusAnalytics,
    updateCoupleRecordStatus,
    toggleExternalHealth,
    registerDevice,
    answerInquiry,
    getAppSettings,
    updateAppSettings,
    getCommerceAnalytics,
    updateOrderStatus,
    createCommerceOrder,
    getTestFlightPhase1State,
    loginAdminOnTestServer,
    verifyAdminSessionOnTestServer,
    logoutAdminOnTestServer,
    fetchTestFlightPhase1Overview,
    nowFormatted,
    timeOnly
  };
})();
