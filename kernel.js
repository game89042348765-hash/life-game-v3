// LifeGame 3.0 — Транзакционное ядро хранения (6 инвариантов защиты данных, локальные даты, правило отдыха R2, единые ID и импорт всех поколений)

const LG3_KEYS = {
  my: 'lifegame_v3_my',
  demo: 'lifegame_v3_demo',
  meta: 'lifegame_v3_meta'
};

const LG3_HEALTH = {
  healthy: true,
  errorText: ''
};

// Строго локальные календарные даты (Инвариант: никогда не вычислять локальный день через toISOString()!)
function localTodayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shiftLocalDays(iso, delta) {
  const [y, m, d] = String(iso || localTodayISO()).split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + Number(delta || 0), 12, 0, 0);
  const ny = dt.getFullYear();
  const nm = String(dt.getMonth() + 1).padStart(2, '0');
  const nd = String(dt.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

function daysBetweenISO(aIso, bIso) {
  const [ay, am, ad] = aIso.split('-').map(Number);
  const [by, bm, bd] = bIso.split('-').map(Number);
  const t1 = Date.UTC(ay, am - 1, ad);
  const t2 = Date.UTC(by, bm - 1, bd);
  return Math.round((t2 - t1) / 86400000);
}

function localWeekday(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).getDay(); // 0=Вс..6=Сб
}

function daysInMonthLocal(year, month1to12) {
  return new Date(year, month1to12, 0).getDate();
}

function humanDateShort(iso) {
  if (!iso) return 'Без даты';
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${months[(m || 1) - 1]}`;
}

function humanDateWithWeekday(iso) {
  if (!iso) return '';
  const wds = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
  return `${humanDateShort(iso)}, ${wds[localWeekday(iso)]}`;
}

function uid(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return prefix + '_' + crypto.randomUUID().slice(0, 8);
  }
  return prefix + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Звуковая обратная связь (запускается ТОЛЬКО после подтверждённой записи в localStorage!)
const LG3Sound = {
  ctx: null,
  play(kind, enabled) {
    if (!enabled) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!this.ctx) this.ctx = new AC();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      if (kind === 'coin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, t);
        osc.frequency.exponentialRampToValueAtTime(659.25, t + 0.08);
        osc.frequency.exponentialRampToValueAtTime(783.99, t + 0.17);
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.start(t);
        osc.stop(t + 0.3);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(554.37, t + 0.1);
        gain.gain.setValueAtTime(0.045, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        osc.start(t);
        osc.stop(t + 0.18);
      }
    } catch (e) {}
  }
};

// Вычисление баланса строго по журналу ledger (Инвариант: исторические операции неизменны!)
function calcWallet(state) {
  let coins = 0;
  let xp = 0;
  for (const row of (state.ledger || [])) {
    coins += Number(row.coins) || 0;
    xp += Number(row.xp) || 0;
  }
  xp = Math.max(0, xp);
  const level = Math.floor(xp / 250) + 1;
  const into = xp % 250;
  return { coins, xp, level, into, span: 250, pct: Math.min(100, Math.round((into / 250) * 100)) };
}

// Валидация и мягкая нормализация схемы (Никогда не затирать повреждённые данные пустой базой!)
function normalizeStateV3(s) {
  if (!s || typeof s !== 'object' || !Array.isArray(s.blocks) || !Array.isArray(s.stages)) {
    throw new Error('Нарушена структура блоков или этапов сохранения.');
  }
  s.version = '3.0';
  s.revision = Number(s.revision) || 1;
  s.lastDay = s.lastDay || localTodayISO();
  s.complexity = s.complexity === 'basic' ? 'basic' : 'full';
  s.specialMode = s.specialMode || 'none';
  s.redCare = s.redCare || { sleep: false, water: false, rest: false };
  s.settings = Object.assign({
    theme: 'night',
    sound: true,
    showMotivation: true,
    compactHero: false,
    motivationText: '',
    enabledWidgets: ['timer', 'firstStep', 'weekRhythm', 'happiness']
  }, s.settings || {});
  s.goals = Array.isArray(s.goals) ? s.goals : [];
  s.items = Array.isArray(s.items) ? s.items : [];
  s.quests = Array.isArray(s.quests) ? s.quests : [];
  s.bonuses = Array.isArray(s.bonuses) ? s.bonuses : [];
  s.instances = Array.isArray(s.instances) ? s.instances : [];
  s.treats = Array.isArray(s.treats) ? s.treats : [];
  s.decisions = Array.isArray(s.decisions) ? s.decisions : [];
  s.days = (s.days && typeof s.days === 'object') ? s.days : {};
  s.carryovers = Array.isArray(s.carryovers) ? s.carryovers : [];
  s.missed = Array.isArray(s.missed) ? s.missed : [];
  s.events = Array.isArray(s.events) ? s.events : [];
  s.ledger = Array.isArray(s.ledger) ? s.ledger : [];
  s.timeSessions = Array.isArray(s.timeSessions) ? s.timeSessions : [];
  s.moments = Array.isArray(s.moments) ? s.moments : [];
  s.reviews = Array.isArray(s.reviews) ? s.reviews : [];
  s.snapshots = Array.isArray(s.snapshots) ? s.snapshots : [];

  // Гарантировать валидный currentStageId у каждого живого блока
  for (const b of s.blocks) {
    const bStages = s.stages.filter(st => st.blockId === b.id && !st.archivedAt);
    if (!bStages.some(st => st.id === b.currentStageId)) {
      const openStep = bStages.find(st => st.role === 'step' && st.status !== 'completed') || bStages[0];
      if (openStep) b.currentStageId = openStep.id;
    }
  }
  return s;
}

// Безопасное чтение пространства (Инвариант #3 из аудита Claude: не перезаписывать битый JSON пустой жизнью!)
function loadSpaceSafe(key, factoryFn) {
  let raw = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch (e) {
    LG3_HEALTH.healthy = false;
    LG3_HEALTH.errorText = 'Хранилище браузера недоступно — изменения заблокированы от потери.';
    return factoryFn(localTodayISO());
  }
  if (!raw) {
    const fresh = normalizeStateV3(factoryFn(localTodayISO()));
    try {
      const ser = JSON.stringify(fresh);
      window.localStorage.setItem(key, ser);
      window.localStorage.setItem(key + '_last_good', ser);
    } catch (e) {}
    return fresh;
  }
  try {
    const parsed = normalizeStateV3(JSON.parse(raw));
    LG3_HEALTH.healthy = true;
    LG3_HEALTH.errorText = '';
    return parsed;
  } catch (corruptErr) {
    // Сохраняем повреждённую строку нетронутой под _corrupt_raw и поднимаем _last_good с честным предупреждением!
    LG3_HEALTH.healthy = false;
    LG3_HEALTH.errorText = 'Обнаружено повреждение записи сохранения. Загружена последняя исправная копия — скачай резервный JSON в Настройках.';
    try { window.localStorage.setItem(key + '_corrupt_raw', raw); } catch (e) {}
    try {
      const goodRaw = window.localStorage.getItem(key + '_last_good');
      if (goodRaw) return normalizeStateV3(JSON.parse(goodRaw));
    } catch (e2) {}
    return normalizeStateV3(factoryFn(localTodayISO()));
  }
}

// Расписание действия на конкретную календарную дату
function isScheduledOnDate(item, dateIso) {
  if (!item || item.archivedAt || item.status === 'archived') return false;
  const sch = item.schedule || { type: 'once' };
  const ex = sch.exceptions || {};

  // Проверка явного переноса НА эту дату
  for (const [origDate, exObj] of Object.entries(ex)) {
    if (exObj && exObj.movedTo === dateIso && !exObj.cancelled) return true;
  }
  if (ex[dateIso] && (ex[dateIso].cancelled || (ex[dateIso].movedTo && ex[dateIso].movedTo !== dateIso))) {
    return false;
  }

  if (sch.type === 'daily') return true;
  if (sch.type === 'weekly' || sch.type === 'days') {
    const wd = localWeekday(dateIso);
    const days = Array.isArray(sch.days) && sch.days.length ? sch.days : (sch.date ? [localWeekday(sch.date)] : []);
    return days.includes(wd);
  }
  if (sch.type === 'monthly') {
    if (!sch.date || dateIso < sch.date) return false;
    const [y, m, d] = dateIso.split('-').map(Number);
    const baseDay = Number(sch.date.split('-')[2]) || 1;
    return d === Math.min(baseDay, daysInMonthLocal(y, m));
  }
  if (sch.type === 'once') {
    if (sch.date) return sch.date === dateIso;
    return true; // Разовое без даты с включённым inDay участвует в очереди до выполнения без пропусков!
  }
  return false;
}

function getItemProgressOnDate(state, item, dateIso) {
  const activeEvents = state.events.filter(e => e.active && e.entityId === item.id && e.date === dateIso);
  const units = activeEvents.reduce((s, e) => s + (Number(e.units) || 0), 0);
  const target = item.kind === 'habit' ? Math.max(1, Number(item.dailyTarget) || 1) : 1;
  const done = item.kind === 'habit' ? (units >= target) : (units >= 1);
  const mins = state.timeSessions
    .filter(ts => ts.itemId === item.id && ts.date === dateIso)
    .reduce((s, ts) => s + (Number(ts.minutes) || 0), 0);
  return { units, target, done, mins };
}

function isOneOffEverDoneInCurrentCycle(state, item) {
  if (item.kind === 'habit' || (item.schedule && item.schedule.type !== 'once')) return false;
  return state.events.some(e => e.active && e.entityId === item.id && (e.cycle || 1) === (item.cycle || 1));
}

function ensureDayObj(state, dateIso) {
  if (!state.days[dateIso]) {
    state.days[dateIso] = { tempo: 'normal', mainItemId: null, includes: [], excludes: [], overrides: [] };
  }
  return state.days[dateIso];
}

// Сборка видимого дня и скрытых по темпу/режиму дел (Точное соблюдение правила R2!)
function assembleDayPlan(state, dateIso) {
  const dayRec = ensureDayObj(state, dateIso);
  const tempo = dayRec.tempo || 'normal'; // 'rest' | 'normal' | 'intense'
  const isBasic = state.complexity === 'basic';
  const visible = [];
  const hidden = [];

  for (const it of state.items) {
    if (it.archivedAt || it.status === 'archived') continue;
    // Если блок в архиве — исключить
    if (it.blockId) {
      const blk = state.blocks.find(b => b.id === it.blockId);
      if (blk && blk.archivedAt) continue;
    }

    const prog = getItemProgressOnDate(state, it, dateIso);
    const doneEverOnce = isOneOffEverDoneInCurrentCycle(state, it);
    if (doneEverOnce && !prog.done) continue; // Завершённое в прошлые дни разовое дело уходит из новых дней

    // В Базовом режиме показываем только выбранный базовый ритм, сегодняшние ручные включения и календарь на дату
    if (isBasic && !prog.done) {
      const basicAllowed = it.inBasic || dayRec.includes.includes(it.id) || (it.kind === 'calendar' && isScheduledOnDate(it, dateIso));
      if (!basicAllowed) continue;
    }

    const scheduled = isScheduledOnDate(it, dateIso);
    const manuallyIncluded = dayRec.includes.includes(it.id);
    const candidate = (scheduled && (it.inDay || it.kind === 'calendar')) || manuallyIncluded || prog.done;
    if (!candidate) continue;

    if (dayRec.excludes.includes(it.id) && !prog.done) {
      hidden.push({ item: it, reason: 'Снято с сегодняшнего плана' });
      continue;
    }

    const hasOverride = dayRec.overrides.includes(it.id) || prog.done;
    if (!hasOverride && it.kind !== 'calendar') {
      if (state.specialMode === 'pause') {
        hidden.push({ item: it, reason: 'Творческая пауза (без пропуска)' });
        continue;
      }
      if (state.specialMode === 'red' && it.blockId && it.blockId !== state.redBlockId && !it.isKey) {
        hidden.push({ item: it, reason: 'Вне приоритетного блока мобилизации' });
        continue;
      }
      if (tempo === 'rest' && !it.isKey) {
        hidden.push({ item: it, reason: 'Темп «Отдыхаю» — ожидание снято (R2)' });
        continue;
      }
      if (tempo === 'normal' && it.load === 'intense' && !it.isKey) {
        hidden.push({ item: it, reason: 'Для темпа «Фигачу»' });
        continue;
      }
    }

    visible.push({ item: it, prog });
  }

  // Сортировка: Главное дело дня -> Ключевые -> по приоритету блока -> остальные
  visible.sort((a, b) => {
    const aMain = dayRec.mainItemId === a.item.id ? 1 : 0;
    const bMain = dayRec.mainItemId === b.item.id ? 1 : 0;
    if (aMain !== bMain) return bMain - aMain;
    const ak = a.item.isKey ? 1 : 0;
    const bk = b.item.isKey ? 1 : 0;
    if (ak !== bk) return bk - ak;
    const ab = state.blocks.find(x => x.id === a.item.blockId);
    const bb = state.blocks.find(x => x.id === b.item.blockId);
    return ((bb ? bb.priority : 0) - (ab ? ab.priority : 0));
  });

  return { dayRec, tempo, visible, hidden };
}

// Корректная смена суток ДО любой мутации (Инвариант #6 из аудита Claude + правило отдыха R2!)
function advanceToDateV3(state, targetIso) {
  if (!state.lastDay || targetIso <= state.lastDay) return { gapDays: 0 };
  const gap = daysBetweenISO(state.lastDay, targetIso);

  // Если перерыв больше 7 дней — не генерируем лавину из сотен пропусков, а включаем мягкий мост возвращения!
  const maxStepDays = Math.min(gap, 14);
  let cur = state.lastDay;

  for (let i = 0; i < maxStepDays; i++) {
    const plan = assembleDayPlan(state, cur);
    const pauseOrBasicFreeze = plan.tempo === 'rest' || state.specialMode === 'pause' || state.complexity === 'basic' || state.basicFreeze;

    for (const entry of plan.visible) {
      const it = entry.item;
      if (entry.prog.done) continue;

      // Календарное дело с точной датой даёт запись в Невыполненные даже на паузе (согласно R2)
      if (it.kind === 'calendar') {
        const mKey = `${it.id}@${cur}`;
        if (!state.missed.some(m => m.mKey === mKey)) {
          state.missed.push({ id: uid('ms'), mKey, itemId: it.id, kind: 'calendar', title: it.title, date: cur, status: 'open' });
        }
        continue;
      }

      if (pauseOrBasicFreeze) continue;

      // Разовое дело, включённое на вчерашний день -> в спокойный разбор «Со вчера» (carryovers)!
      if (it.kind === 'task' && (!it.schedule || it.schedule.type === 'once')) {
        if (it.schedule && it.schedule.date === cur) {
          const mKey = `${it.id}@${cur}`;
          if (!state.missed.some(m => m.mKey === mKey)) {
            state.missed.push({ id: uid('ms'), mKey, itemId: it.id, kind: 'task', title: it.title, date: cur, status: 'open' });
          }
        } else if (!state.carryovers.some(c => c.itemId === it.id)) {
          state.carryovers.push({ id: uid('co'), itemId: it.id, fromDate: cur, title: it.title });
        }
      }
    }
    cur = shiftLocalDays(cur, 1);
  }

  state.lastDay = targetIso;
  state.redCare = { sleep: false, water: false, rest: false };
  ensureDayObj(state, targetIso);
  return { gapDays: gap };
}

// Атомарная транзакция transact() (Инвариант #1 и #2: проверка актуальной ревизии хранилища -> мутация клона -> запись -> звук/UI!)
function transactV3(storageKey, currentMemState, mutatorFn, opts) {
  opts = opts || {};
  if (!LG3_HEALTH.healthy && !opts.allowRecovery) {
    return { ok: false, error: LG3_HEALTH.errorText || 'Хранилище защищено от перезаписи.', state: currentMemState };
  }

  let baseState = currentMemState;
  try {
    const diskRaw = window.localStorage.getItem(storageKey);
    if (diskRaw) {
      const diskParsed = JSON.parse(diskRaw);
      if (diskParsed && Number(diskParsed.revision) > Number(currentMemState.revision || 0)) {
        // Другая вкладка уже обновила состояние — берём свежую основу, чтобы не затереть чужую вкладку!
        baseState = normalizeStateV3(diskParsed);
      }
    }
  } catch (e) {}

  const draft = deepClone(baseState);
  if (opts.autoToday) {
    const realT = localTodayISO();
    if (draft.lastDay < realT) advanceToDateV3(draft, realT);
  }

  let resultMeta = null;
  try {
    resultMeta = mutatorFn(draft) || {};
    draft.revision = (Number(draft.revision) || 1) + 1;
    draft.updatedAt = new Date().toISOString();
    normalizeStateV3(draft);

    const serialized = JSON.stringify(draft);
    window.localStorage.setItem(storageKey, serialized);
    window.localStorage.setItem(storageKey + '_last_good', serialized);
    LG3_HEALTH.healthy = true;
    LG3_HEALTH.errorText = '';
  } catch (err) {
    if (err && (err.name === 'QuotaExceededError' || String(err).includes('Quota') || String(err).includes('setItem'))) {
      LG3_HEALTH.healthy = false;
      LG3_HEALTH.errorText = 'Не удалось записать изменение в память браузера — начисление отменено, старые данные сохранены.';
    }
    return { ok: false, error: err.message || 'Ошибка сохранения.', state: baseState };
  }

  if (opts.sound) {
    LG3Sound.play(opts.sound, draft.settings.sound);
  }
  return { ok: true, state: draft, meta: resultMeta };
}

// Универсальный адаптер импорта (LifeGame 3.0 + гибрид v1/v2 + Personal 1.2.0 + прежний Root v1!)
function importAnyLifeGameBackup(rawJsonString) {
  const parsed = JSON.parse(rawJsonString);
  const today = localTodayISO();

  // 1. Родной формат LifeGame 3.0
  if (parsed && parsed.app === 'LifeGame' && parsed.version === '3.0' && Array.isArray(parsed.blocks) && Array.isArray(parsed.stages)) {
    return normalizeStateV3(parsed);
  }

  // 2. Обёртка прежнего Root v1: { app: "LifeGame", version: 1, data: { blocks, tasks, goals, ... } }
  if (parsed && parsed.app === 'LifeGame' && parsed.data && Array.isArray(parsed.data.blocks)) {
    const d = parsed.data;
    const base = buildCleanStateV3(today);
    base.blocks = d.blocks.map((b, idx) => ({
      id: b.id || ('b_imp_' + idx),
      name: b.name || 'Блок',
      icon: '📌',
      color: '#ffd54a',
      subtitle: b.subtitle || '',
      meaning: b.meaning || '',
      fact: '',
      priority: 2,
      intensity: 'balanced',
      preset: 'simple',
      secs: { ach: true, fact: true, cur: true, plan: true, opt: true, unk: false, lvmg: false },
      currentStageId: 'stg_cur_' + (b.id || idx),
      routeKnownToLvmg: false,
      order: idx,
      createdAt: today,
      archivedAt: b.archived ? today : null
    }));
    base.stages = [];
    base.blocks.forEach(b => {
      base.stages.push(
        { id: b.currentStageId, blockId: b.id, role: 'step', name: 'Текущий этап', description: '', meaning: b.meaning || '', order: 1, status: 'open', completedAt: null, archivedAt: null },
        { id: 'stg_opt_' + b.id, blockId: b.id, role: 'optimal', name: 'Оптимальный ориентир', description: '', meaning: '', order: 100, status: 'open', reached: false, completedAt: null, archivedAt: null }
      );
    });
    base.items = (d.tasks || []).map(t => ({
      id: t.id || uid('it'),
      kind: t.type === 'daily' ? 'habit' : 'task',
      title: t.name || t.title || 'Задание',
      description: '',
      blockId: t.block === 'lifegame:inbox' ? null : (t.block || null),
      stageId: t.block && t.block !== 'lifegame:inbox' ? ('stg_cur_' + t.block) : null,
      goalId: t.goalId || null,
      schedule: { type: t.type === 'daily' ? 'daily' : 'once', days: t.weekdays || [], date: null },
      dailyTarget: 1,
      inDay: !!t.inDayBuilder,
      inBasic: !!t.favorite,
      isKey: !!t.favorite,
      load: 'normal',
      reward: Number(t.reward) || 10,
      ifTrigger: '',
      ifAction: '',
      status: 'active',
      cycle: 1,
      createdAt: today,
      archivedAt: t.archived ? today : null
    }));
    return normalizeStateV3(base);
  }

  // 3. Personal 1.2.0 / Personal-Lab (включая многоключевой дамп)
  let p2 = (parsed && (parsed.v === 2 || Array.isArray(parsed.blocks))) ? parsed : null;
  if (!p2 && parsed && parsed.data && parsed.data.v === 2) p2 = parsed.data;
  if (!p2 && parsed && typeof parsed === 'object') {
    for (const [k, val] of Object.entries(parsed)) {
      if (val && typeof val === 'object' && !k.endsWith('-last-good') && (val.v === 2 || Array.isArray(val.blocks))) {
        p2 = val;
        break;
      }
    }
  }
  if (p2) {
    const base = buildCleanStateV3(p2.lastProcessed || today);
    base.blocks = (p2.blocks || []).map((b, idx) => ({
      id: b.id,
      name: b.name || 'Блок',
      icon: b.icon || '📌',
      color: '#ffd54a',
      subtitle: '',
      meaning: b.meaning || '',
      fact: b.fact || '',
      priority: b.priority === 'high' ? 3 : (b.priority === 'low' ? 1 : 2),
      intensity: 'balanced',
      preset: (b.lvmg || b.unknown) ? 'full' : 'simple',
      secs: { ach: true, fact: true, cur: true, plan: true, opt: true, unk: !!(b.unknown || b.lvmg), lvmg: !!(b.unknown || b.lvmg) },
      currentStageId: b.currentStageId || ('stg_cur_' + b.id),
      routeKnownToLvmg: false,
      order: idx,
      createdAt: today,
      archivedAt: b.status === 'archived' ? today : null
    }));
    base.stages = [];
    base.blocks.forEach(b => {
      const srcStgs = (p2.stages || []).filter(s => s.blockId === b.id);
      if (srcStgs.length) {
        srcStgs.forEach((s, si) => {
          base.stages.push({
            id: s.id, blockId: b.id, role: 'step', name: s.name || 'Этап',
            description: s.content || '', meaning: s.meaning || '', order: si + 1,
            status: s.status === 'closed' ? 'completed' : 'open', completedAt: s.closedAt || null, archivedAt: null
          });
        });
      } else {
        base.stages.push({ id: b.currentStageId, blockId: b.id, role: 'step', name: 'Сейчас', description: '', meaning: '', order: 1, status: 'open', completedAt: null, archivedAt: null });
      }
      base.stages.push(
        { id: 'stg_opt_' + b.id, blockId: b.id, role: 'optimal', name: (p2.blocks.find(x => x.id === b.id)?.optimal) || 'Оптимальный ориентир', description: '', meaning: '', order: 100, status: 'open', reached: false, completedAt: null, archivedAt: null },
        { id: 'stg_unk_' + b.id, blockId: b.id, role: 'unknown', name: (p2.blocks.find(x => x.id === b.id)?.unknown) || 'Неизвестное', description: '', meaning: '', order: 200, status: 'open', completedAt: null, archivedAt: null },
        { id: 'stg_lvmg_' + b.id, blockId: b.id, role: 'lvmg', name: (p2.blocks.find(x => x.id === b.id)?.lvmg) || 'LVMG', description: '', meaning: '', order: 300, status: 'open', completedAt: null, archivedAt: null }
      );
    });
    base.items = [];
    (p2.tasks || []).forEach(t => {
      base.items.push({
        id: t.id, kind: 'task', title: t.title, description: t.desc || '',
        blockId: t.blockId || null, stageId: t.stageId || null, goalId: t.goalId || null,
        schedule: t.sched || { type: 'once', days: [], date: null }, dailyTarget: 1,
        inDay: t.inDay !== false, inBasic: !!t.key, isKey: !!t.key, load: 'normal',
        reward: Number(t.reward) || 10, ifTrigger: t.ifThen || '', ifAction: '',
        status: 'active', cycle: 1, createdAt: today, archivedAt: t.status === 'archived' ? today : null
      });
    });
    (p2.habits || []).forEach(h => {
      base.items.push({
        id: h.id, kind: 'habit', title: h.title, description: h.desc || '',
        blockId: h.blockId || null, stageId: h.stageId || null, goalId: h.goalId || null,
        schedule: { type: 'daily', days: [], date: null }, dailyTarget: Number(h.dailyTarget) || 1,
        inDay: h.inDay !== false, inBasic: !!h.key, isKey: !!h.key, load: 'gentle',
        reward: Number(h.reward) || 10, ifTrigger: '', ifAction: '',
        status: 'active', cycle: 1, createdAt: today, archivedAt: h.status === 'archived' ? today : null
      });
    });
    base.timeSessions = (p2.timeLog || []).map(tl => ({
      id: tl.id || uid('ts'), itemId: String(tl.ref || '').split(':')[1] || tl.ref,
      itemName: tl.label || 'Практика', blockId: null, date: tl.date || today, minutes: Number(tl.minutes) || 5
    }));
    return normalizeStateV3(base);
  }

  // 4. Гибридная v1.0 / v2.0 (directions -> blocks & stages)
  if (parsed && Array.isArray(parsed.directions)) {
    const base = buildCleanStateV3(parsed.currentDate || today);
    base.blocks = parsed.directions.map((d, idx) => ({
      id: d.id, name: d.name, icon: '📌', color: d.color || '#ffd54a',
      subtitle: d.short || '', meaning: d.currentStage?.strategy || '', fact: d.fact || '',
      priority: 2, intensity: 'balanced', preset: d.lvmg ? 'full' : 'simple',
      secs: { ach: true, fact: true, cur: true, plan: true, opt: true, unk: !!d.unknownGap, lvmg: !!d.lvmg },
      currentStageId: 'stg_cur_' + d.id, routeKnownToLvmg: !!d.routeKnownToLvmg, order: idx, createdAt: today, archivedAt: null
    }));
    base.stages = [];
    parsed.directions.forEach(d => {
      base.stages.push(
        { id: 'stg_cur_' + d.id, blockId: d.id, role: 'step', name: d.currentStage?.title || 'Текущий этап', description: d.currentStage?.strategy || '', meaning: '', order: 1, status: 'open', completedAt: null, archivedAt: null },
        { id: 'stg_plan_' + d.id, blockId: d.id, role: 'step', name: d.nextStage || 'Следующий этап', description: '', meaning: '', order: 2, status: 'open', completedAt: null, archivedAt: null },
        { id: 'stg_opt_' + d.id, blockId: d.id, role: 'optimal', name: d.optimal || 'Оптимум', description: '', meaning: '', order: 100, status: 'open', reached: d.status === 'oasis', completedAt: null, archivedAt: null },
        { id: 'stg_unk_' + d.id, blockId: d.id, role: 'unknown', name: d.unknownGap || 'Неизвестное', description: '', meaning: '', order: 200, status: 'open', completedAt: null, archivedAt: null },
        { id: 'stg_lvmg_' + d.id, blockId: d.id, role: 'lvmg', name: d.lvmg || 'LVMG', description: '', meaning: '', order: 300, status: 'open', completedAt: null, archivedAt: null }
      );
    });
    base.items = (parsed.items || []).map(it => ({
      id: it.id, kind: it.kind === 'habit' ? 'habit' : 'task', title: it.title, description: '',
      blockId: it.directionId || null, stageId: it.directionId ? ('stg_cur_' + it.directionId) : null, goalId: null,
      schedule: { type: it.kind === 'habit' ? 'daily' : 'once', days: [], date: it.dueDate || null },
      dailyTarget: Number(it.dailyNorm) || 1, inDay: it.inDayPlan !== false, inBasic: !!it.inLiteRhythm,
      isKey: !!it.isKey, load: it.tempoMin || 'normal', reward: Number(it.coins) || 10,
      ifTrigger: '', ifAction: '', status: 'active', cycle: it.cycle || 1, createdAt: today, archivedAt: it.status === 'archived' ? today : null
    }));
    return normalizeStateV3(base);
  }

  throw new Error('Неподдерживаемый формат файла резервной копии.');
}
