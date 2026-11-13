// LifeGame 3.0 — Главный контроллер приложения, оболочка в духе первой версии (Root v1), маршрутизация и делегированные обработчики

const LG3_STATES = {
  my: null,
  demo: null
};

const UI3 = {
  space: 'demo',
  wide: false,
  route: 'home',
  historyStack: [],
  activeBlockId: null,
  blockTab: 'current',
  inspectStageId: null,
  mapMode: 'now',
  actionsSub: 'quests',
  bonusSub: 'shop',
  reviewSub: 'evening',
  settingsTab: 'general',
  searchText: '',
  sparkIndex: 0,
  eveningMood: 'calm',
  eveningDraft: '',
  recording: false,
  speechRec: null,
  aiMode: 'weekly',
  aiConsent: false,
  aiDraft: '',
  modal: null,
  toast: null,
  toastTimer: null,
  undoStack: [],
  quickForm: {
    title: '',
    when: 'later',
    date: '',
    blockId: '',
    rewardOn: true
  },
  itemForm: {
    title: '',
    kind: 'task',
    schedType: 'once',
    dailyTarget: 1,
    date: '',
    time: '15:00',
    inDay: true,
    isKey: false,
    reward: 15,
    load: 'normal',
    blockId: '',
    stageId: '',
    goalId: '',
    newGoalTitle: '',
    ifTrigger: '',
    ifAction: ''
  }
};

function activeStorageKey() {
  return UI3.space === 'my' ? LG3_KEYS.my : LG3_KEYS.demo;
}

function getState() {
  return LG3_STATES[UI3.space];
}

function saveMetaPrefs() {
  try {
    window.localStorage.setItem(LG3_KEYS.meta, JSON.stringify({
      space: UI3.space,
      wide: UI3.wide
    }));
  } catch (e) {}
}

function loadMetaPrefs() {
  try {
    const raw = window.localStorage.getItem(LG3_KEYS.meta);
    if (!raw) return;
    const m = JSON.parse(raw);
    if (m && (m.space === 'my' || m.space === 'demo')) UI3.space = m.space;
    if (m && typeof m.wide === 'boolean') UI3.wide = m.wide;
  } catch (e) {}
}

function showToast(msg, withUndo) {
  if (UI3.toastTimer) clearTimeout(UI3.toastTimer);
  UI3.toast = { msg, withUndo: !!withUndo && UI3.undoStack.length > 0 };
  renderToastOnly();
  UI3.toastTimer = setTimeout(() => {
    UI3.toast = null;
    renderToastOnly();
  }, 4200);
}

function renderToastOnly() {
  const host = document.getElementById('lg3ToastHost');
  if (!host) return;
  if (!UI3.toast) {
    host.innerHTML = '';
    return;
  }
  host.innerHTML = `
    <div class="toast-box" role="status" aria-live="polite">
      <span>${esc(UI3.toast.msg)}</span>
      ${UI3.toast.withUndo ? `<button type="button" class="toast-undo" data-act="undo-tx">Отменить</button>` : ''}
    </div>
  `;
}

function syncDraftInputsFromDOM() {
  const qc = document.getElementById('qcTitleInput');
  if (qc) UI3.quickForm.title = qc.value;
  const ev = document.getElementById('evNoteField');
  if (ev) UI3.eveningDraft = ev.value;
  const ai = document.getElementById('aiJsonInput');
  if (ai) UI3.aiDraft = ai.value;
  const ieTitle = document.getElementById('ieTitle');
  if (ieTitle) UI3.itemForm.title = ieTitle.value;
  const ieDate = document.getElementById('ieDate');
  if (ieDate) UI3.itemForm.date = ieDate.value;
  const ieTime = document.getElementById('ieTime');
  if (ieTime) UI3.itemForm.time = ieTime.value;
  const ieSched = document.getElementById('ieSchedType');
  if (ieSched) UI3.itemForm.schedType = ieSched.value;
  const ieTarget = document.getElementById('ieTarget');
  if (ieTarget) UI3.itemForm.dailyTarget = Math.max(1, Number(ieTarget.value) || 1);
  const ieReward = document.getElementById('ieReward');
  if (ieReward) UI3.itemForm.reward = Math.max(0, Number(ieReward.value) || 0);
  const ieLoad = document.getElementById('ieLoad');
  if (ieLoad) UI3.itemForm.load = ieLoad.value;
  const ieGoal = document.getElementById('ieGoal');
  if (ieGoal) UI3.itemForm.goalId = ieGoal.value;
  const ieNewGoal = document.getElementById('ieNewGoalTitle');
  if (ieNewGoal) UI3.itemForm.newGoalTitle = ieNewGoal.value;
  const ieIfT = document.getElementById('ieIfTrig');
  if (ieIfT) UI3.itemForm.ifTrigger = ieIfT.value;
  const ieIfA = document.getElementById('ieIfAct');
  if (ieIfA) UI3.itemForm.ifAction = ieIfA.value;
}

function commitMutation(mutatorFn, opts) {
  opts = opts || {};
  const key = activeStorageKey();
  const prevSnapshot = deepClone(getState());
  const res = transactV3(key, getState(), mutatorFn, {
    autoToday: UI3.space === 'my' && opts.autoToday !== false,
    sound: opts.sound || null,
    allowRecovery: !!opts.allowRecovery
  });

  if (!res.ok) {
    renderApp();
    showToast(res.error || 'Не удалось сохранить изменение.', false);
    return res;
  }

  if (opts.undoable) {
    UI3.undoStack.push({ space: UI3.space, state: prevSnapshot });
    if (UI3.undoStack.length > 15) UI3.undoStack.shift();
  }

  LG3_STATES[UI3.space] = res.state;
  applyThemeAndWidth(res.state);
  renderApp();
  if (opts.toast) {
    showToast(opts.toast, !!opts.undoable);
  }
  return res;
}

function applyThemeAndWidth(state) {
  const theme = (state && state.settings && state.settings.theme) || 'night';
  document.documentElement.setAttribute('data-theme', theme);
  document.body.classList.toggle('wide-shell', !!UI3.wide);
}

function navigateTo(route, sub) {
  syncDraftInputsFromDOM();
  const rootTabs = ['home', 'blocks', 'quests', 'bonuses'];
  if (route !== UI3.route) {
    if (rootTabs.includes(route)) {
      UI3.historyStack = [];
    } else {
      UI3.historyStack.push(UI3.route);
      if (UI3.historyStack.length > 20) UI3.historyStack.shift();
    }
  }
  if (route === 'calendar') {
    UI3.route = 'quests';
    UI3.actionsSub = 'calendar';
  } else if (route === 'treats') {
    UI3.route = 'bonuses';
    UI3.bonusSub = 'treats';
  } else if (route === 'ai') {
    UI3.route = 'settings';
    UI3.settingsTab = 'ai';
  } else {
    UI3.route = route;
    if (sub && route === 'quests') UI3.actionsSub = sub;
    if (sub && route === 'bonuses') UI3.bonusSub = sub;
  }
  renderApp();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function goBack() {
  syncDraftInputsFromDOM();
  if (UI3.route === 'map-overview') {
    UI3.route = 'blocks';
  } else if (UI3.route === 'block') {
    UI3.route = 'blocks';
  } else if (UI3.historyStack.length > 0) {
    UI3.route = UI3.historyStack.pop();
  } else {
    UI3.route = 'home';
  }
  renderApp();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function activeBottomTab() {
  if (UI3.route === 'blocks' || UI3.route === 'block' || UI3.route === 'map-overview') return 'blocks';
  if (UI3.route === 'quests' || UI3.route === 'calendar') return 'quests';
  if (UI3.route === 'bonuses' || UI3.route === 'treats') return 'bonuses';
  return 'home';
}

function renderCurrentRoute(state) {
  switch (UI3.route) {
    case 'home':
      return renderHomeView(state);
    case 'quick':
      return renderQuickCaptureView(state);
    case 'day':
      return renderDayConstructorView(state);
    case 'blocks':
      return renderBlocksListView(state);
    case 'block':
      return renderSingleBlockView(state);
    case 'map-overview':
      return renderMapOverview(state);
    case 'quests':
      return renderQuestsAndActionsView(state);
    case 'bonuses':
      return renderBonusesView(state);
    case 'widgets':
      return renderWidgetsView(state);
    case 'evening':
      return renderEveningAndReviewView(state);
    case 'settings':
      return renderSettingsAndAiView(state, false);
    default:
      return renderHomeView(state);
  }
}

function renderApp() {
  const state = getState();
  if (!state) return;
  applyThemeAndWidth(state);

  const w = calcWallet(state);
  const isBasic = state.complexity === 'basic';
  const rootTabs = ['home', 'blocks', 'quests', 'bonuses'];
  const showBack = isBasic ? (UI3.route !== 'home') : (!rootTabs.includes(UI3.route));
  const ft = state.focusTimer;
  const curTab = activeBottomTab();

  // В Базовом режиме, если пользователь был на скрытом стратегическом маршруте, мягко показать Главную
  if (isBasic && (UI3.route === 'blocks' || UI3.route === 'block' || UI3.route === 'map-overview')) {
    UI3.route = 'home';
  }

  let statusStripHtml = '';
  if (state.specialMode === 'pause') {
    statusStripHtml = `
      <div class="status-strip">
        <span>🎨 Творческая пауза: ожидания по обычным делам сняты без пропусков</span>
        <button type="button" class="mini-btn" data-act="set-special-mode" data-val="none">Вернуть ход</button>
      </div>
    `;
  } else if (state.specialMode === 'red') {
    const rb = state.blocks.find(b => b.id === state.redBlockId);
    statusStripHtml = `
      <div class="status-strip" style="background:var(--danger-soft);">
        <span>🔴 Мобилизация: фокус на блоке «${esc(rb ? rb.name : 'Приоритет')}»</span>
        <button type="button" class="mini-btn" data-act="go" data-route="settings">Настроить</button>
      </div>
    `;
  } else if (UI3.space === 'demo' && UI3.route === 'home') {
    statusStripHtml = `
      <div class="status-strip">
        <span>🎸 Открыт демо-пример (с блоком «Гитара»)</span>
        <button type="button" class="mini-btn" style="color:var(--accent); border-color:var(--accent-border);" data-act="switch-space" data-val="my">Перейти в «Мою жизнь»</button>
      </div>
    `;
  }

  const root = document.getElementById('appRoot');
  if (!root) return;

  root.innerHTML = `
    <div class="app-shell ${isBasic ? 'basic-mode' : ''} ${ft ? 'has-minitimer' : ''}">
      <header class="top-header">
        <div class="header-left">
          ${showBack ? `<button type="button" class="back-chip" data-act="nav-back">← Назад</button>` : ''}
          <button type="button" class="brand-btn" data-act="go" data-route="home" aria-label="На главную">
            <span class="brand-dot"></span>
            <span>LIFE GAME</span>
          </button>
        </div>

        <div class="header-right">
          <button type="button" class="mode-pill ${isBasic ? 'is-basic' : ''}" data-act="toggle-complexity-quick" title="Переключить Базовый / Полный режим">
            ${isBasic ? 'Базовый' : 'Полный'}
          </button>
          <button type="button" class="wallet-pill ${w.coins < 0 ? 'negative' : ''}" data-act="go" data-route="bonuses" title="Монеты и награды">
            <span>${w.coins}</span><span>●</span>
          </button>
        </div>
      </header>

      ${!LG3_HEALTH.healthy ? `
        <div class="alert-banner" role="alert">
          <span>⚠ ${esc(LG3_HEALTH.errorText || 'Проблема записи в память браузера.')}</span>
          <button type="button" class="mini-btn" data-act="export-json">Скачать JSON</button>
        </div>
      ` : ''}

      ${statusStripHtml}

      <main style="flex:1; display:flex; flex-direction:column;">
        ${renderCurrentRoute(state)}
      </main>
    </div>

    ${ft ? `
      <div class="mini-timer-bar">
        <div style="min-width:0; cursor:pointer;" data-act="go" data-route="widgets">
          <div style="font-size:11px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ⏱ ${esc(ft.itemName || 'Время для важного')}
          </div>
          <div id="miniTimerClock" style="font-size:15px; font-weight:800; font-family:var(--font-mono); color:var(--accent);">
            ${formatTimerClock(ft)}
          </div>
        </div>
        <div style="display:flex; gap:6px; align-items:center; flex-shrink:0;">
          ${ft.status === 'running'
            ? `<button type="button" class="mini-btn" data-act="timer-pause">Пауза</button>`
            : `<button type="button" class="mini-btn" data-act="timer-resume">Дальше</button>`}
          <button type="button" class="pill active" data-act="timer-finish">Готово</button>
        </div>
      </div>
    ` : ''}

    ${!isBasic ? `
      <nav class="bottom-tabs" aria-label="Основная навигация">
        <button type="button" class="b-tab ${curTab === 'home' ? 'active' : ''}" data-act="go" data-route="home">
          ${LG3_ICONS.home}
          <span>Главная</span>
        </button>
        <button type="button" class="b-tab ${curTab === 'blocks' ? 'active' : ''}" data-act="go" data-route="blocks">
          ${LG3_ICONS.blocks}
          <span>Блоки</span>
        </button>
        <button type="button" class="b-tab ${curTab === 'quests' ? 'active' : ''}" data-act="go" data-route="quests">
          ${LG3_ICONS.quests}
          <span>Квесты</span>
        </button>
        <button type="button" class="b-tab ${curTab === 'bonuses' ? 'active' : ''}" data-act="go" data-route="bonuses">
          ${LG3_ICONS.bonuses}
          <span>Бонусы</span>
        </button>
      </nav>
    ` : ''}

    ${renderModalDialog(state)}
    <div id="lg3ToastHost"></div>
  `;

  renderToastOnly();
}

// Открытие редактора действия с аккуратным заполнением полей
function openItemEditorModal(itemId, presetBlockId, presetStageId, presetKind) {
  const state = getState();
  const existing = itemId ? state.items.find(i => i.id === itemId) : null;
  if (existing) {
    UI3.itemForm = {
      title: existing.title || '',
      kind: existing.kind || 'task',
      schedType: (existing.schedule && existing.schedule.type) || (existing.kind === 'habit' ? 'daily' : 'once'),
      dailyTarget: existing.dailyTarget || 1,
      date: (existing.schedule && existing.schedule.date) || '',
      time: (existing.schedule && existing.schedule.time) || '15:00',
      inDay: existing.inDay !== false,
      isKey: !!existing.isKey,
      reward: Number(existing.reward ?? 10),
      load: existing.load || 'normal',
      blockId: existing.blockId || '',
      stageId: existing.stageId || '',
      goalId: existing.goalId || '',
      newGoalTitle: '',
      ifTrigger: existing.ifTrigger || '',
      ifAction: existing.ifAction || ''
    };
  } else {
    const blkId = presetBlockId || (UI3.route === 'block' ? UI3.activeBlockId : '');
    const blk = blkId ? state.blocks.find(b => b.id === blkId) : null;
    const stgId = presetStageId || (blk ? blk.currentStageId : '');
    const kind = presetKind || 'task';
    UI3.itemForm = {
      title: '',
      kind,
      schedType: kind === 'habit' ? 'daily' : 'once',
      dailyTarget: 1,
      date: kind === 'calendar' ? state.lastDay : '',
      time: '15:00',
      inDay: true,
      isKey: false,
      reward: kind === 'habit' ? 10 : 15,
      load: 'normal',
      blockId: blkId || '',
      stageId: stgId || '',
      goalId: '',
      newGoalTitle: '',
      ifTrigger: '',
      ifAction: ''
    };
  }
  UI3.modal = { name: 'item-editor', id: existing ? existing.id : '' };
  renderApp();
}

function buildAiContextText(state) {
  const liveBlocks = state.blocks.filter(b => !b.archivedAt);
  const lines = [
    `# Контекст LifeGame 3.0 (${state.lastDay})`,
    `Режим анализа: ${UI3.aiMode === 'strategy' ? 'Разбор Блоков и Этапов' : 'Спокойный совет на неделю'}`,
    '',
    '## Живые Блоки времени и текущие этапы'
  ];
  liveBlocks.forEach(b => {
    const cur = state.stages.find(s => s.id === b.currentStageId);
    const opt = state.stages.find(s => s.blockId === b.id && s.role === 'optimal');
    lines.push(`- ${b.name}: Факт="${b.fact || '—'}" | Текущий этап="${cur ? cur.name : '—'}" | Оптимум="${opt ? opt.name : '—'}"`);
  });
  lines.push('', '## Активные дела и минуты практики');
  state.items.filter(i => !i.archivedAt && i.inDay).forEach(it => {
    const p = getItemProgressOnDate(state, it, state.lastDay);
    lines.push(`- [${it.kind}] "${it.title}" (сегодня мин: ${p.mins})`);
  });
  lines.push('', 'Ответь бережно, опираясь только на факты. В конце при желании добавь JSON: {"proposals":[{"title":"...","blockId":"' + (liveBlocks[0]?.id || 'b_soul') + '","kind":"habit"}]}');
  return lines.join('\n');
}

function copyTextSafe(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      () => showToast('Контекст скопирован в буфер обмена ✨', false),
      () => fallbackCopy(text)
    );
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast('Контекст скопирован в буфер обмена ✨', false);
  } catch (e) {
    showToast('Выдели текст вручную для копирования.', false);
  }
  document.body.removeChild(ta);
}

// ============================================================================
// ОБРАБОТЧИКИ ВСЕХ ДЕЙСТВИЙ ИНТЕРФЕЙСА ([data-act])
// ============================================================================
function handleAction(act, btn, event) {
  const id = btn.getAttribute('data-id') || '';
  const val = btn.getAttribute('data-val') || '';
  const state = getState();

  switch (act) {
    // --- Навигация и оболочка ---
    case 'go': {
      const r = btn.getAttribute('data-route') || 'home';
      const sub = btn.getAttribute('data-sub') || '';
      navigateTo(r, sub);
      return;
    }
    case 'nav-back':
      goBack();
      return;

    case 'open-block': {
      syncDraftInputsFromDOM();
      const blk = state.blocks.find(b => b.id === id);
      if (!blk) return;
      UI3.historyStack.push(UI3.route);
      UI3.activeBlockId = blk.id;
      UI3.blockTab = 'current';
      UI3.inspectStageId = blk.currentStageId;
      UI3.route = 'block';
      renderApp();
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    case 'set-block-tab':
      syncDraftInputsFromDOM();
      UI3.blockTab = val === 'all' ? 'all' : 'current';
      if (UI3.blockTab === 'current') {
        const blk = state.blocks.find(b => b.id === UI3.activeBlockId);
        if (blk && !UI3.inspectStageId) UI3.inspectStageId = blk.currentStageId;
      }
      renderApp();
      return;

    case 'inspect-stage':
      UI3.inspectStageId = id;
      UI3.blockTab = 'current';
      renderApp();
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;

    case 'set-map-mode':
      UI3.mapMode = val === 'horizons' ? 'horizons' : 'now';
      renderApp();
      return;

    case 'set-actions-sub':
      UI3.actionsSub = val;
      renderApp();
      return;

    case 'set-bonus-sub':
      UI3.bonusSub = val;
      renderApp();
      return;

    case 'set-review-sub':
      syncDraftInputsFromDOM();
      UI3.reviewSub = val;
      renderApp();
      return;

    case 'set-settings-tab':
      syncDraftInputsFromDOM();
      UI3.settingsTab = val;
      renderApp();
      return;

    case 'open-modal':
      syncDraftInputsFromDOM();
      UI3.modal = { name: btn.getAttribute('data-modal'), id };
      renderApp();
      return;

    case 'close-modal':
      UI3.modal = null;
      renderApp();
      return;

    case 'backdrop-dismiss':
      if (event.target === btn) {
        UI3.modal = null;
        renderApp();
      }
      return;

    case 'undo-tx': {
      const last = UI3.undoStack.pop();
      if (!last) return;
      if (last.space !== UI3.space) UI3.space = last.space;
      const key = activeStorageKey();
      transactV3(key, getState(), draft => {
        Object.keys(draft).forEach(k => delete draft[k]);
        Object.assign(draft, deepClone(last.state));
      }, { autoToday: false });
      LG3_STATES[UI3.space] = loadSpaceSafe(key, UI3.space === 'my' ? buildCleanStateV3 : buildDemoStateV3);
      UI3.toast = null;
      renderApp();
      showToast('Последнее действие отменено ↩', false);
      return;
    }

    case 'toggle-complexity-quick': {
      const nextMode = state.complexity === 'basic' ? 'full' : 'basic';
      commitMutation(draft => {
        draft.complexity = nextMode;
        if (nextMode === 'basic') {
          draft.basicFreeze = true;
        }
        // Важно: при возврате в full флаг basicFreeze остаётся до явного нажатия «Возобновить все планы»!
      }, {
        toast: nextMode === 'basic' ? 'Включён спокойный Базовый режим' : 'Открыт Полный режим (Блоки и Этапы)'
      });
      return;
    }

    // --- Быстрое добавление (Quick Capture) ---
    case 'qc-toggle-today':
      syncDraftInputsFromDOM();
      UI3.quickForm.when = UI3.quickForm.when === 'today' ? 'later' : 'today';
      renderApp();
      return;

    case 'qc-clear-when':
      syncDraftInputsFromDOM();
      UI3.quickForm.when = 'later';
      UI3.quickForm.date = '';
      renderApp();
      return;

    case 'qc-toggle-reward':
      syncDraftInputsFromDOM();
      UI3.quickForm.rewardOn = !UI3.quickForm.rewardOn;
      renderApp();
      return;

    case 'qc-submit': {
      syncDraftInputsFromDOM();
      const title = (UI3.quickForm.title || '').trim();
      if (!title) {
        showToast('Напиши короткое название дела', false);
        return;
      }
      const qf = deepClone(UI3.quickForm);
      commitMutation(draft => {
        const blk = qf.blockId ? draft.blocks.find(b => b.id === qf.blockId) : null;
        const newId = uid('it');
        const isToday = qf.when === 'today';
        const isDate = qf.when === 'date' && qf.date;
        const newItem = {
          id: newId,
          kind: isDate ? 'calendar' : 'task',
          title,
          description: '',
          blockId: blk ? blk.id : null,
          stageId: blk ? blk.currentStageId : null,
          goalId: null,
          schedule: { type: 'once', days: [], date: isDate ? qf.date : null, time: isDate ? '12:00' : '' },
          dailyTarget: 1,
          inDay: isToday || isDate,
          inBasic: isToday || draft.complexity === 'basic',
          isKey: false,
          load: 'normal',
          reward: qf.rewardOn ? 25 : 0,
          ifTrigger: '',
          ifAction: '',
          status: 'active',
          cycle: 1,
          createdAt: draft.lastDay,
          archivedAt: null
        };
        draft.items.push(newItem);
        if (isToday) {
          const dRec = ensureDayObj(draft, draft.lastDay);
          if (!dRec.includes.includes(newId)) dRec.includes.push(newId);
        }
      }, { sound: 'soft', undoable: true, toast: 'Добавлено ✨' });
      UI3.quickForm.title = '';
      renderApp();
      return;
    }

    case 'toggle-item-today': {
      commitMutation(draft => {
        const it = draft.items.find(i => i.id === id);
        if (!it) return;
        const dRec = ensureDayObj(draft, draft.lastDay);
        const already = dRec.includes.includes(id) || it.inDay;
        if (already) {
          dRec.includes = dRec.includes.filter(x => x !== id);
          it.inDay = false;
        } else {
          dRec.includes.push(id);
          dRec.excludes = dRec.excludes.filter(x => x !== id);
          it.inDay = true;
          if (draft.complexity === 'basic') it.inBasic = true;
        }
      }, { toast: 'План на сегодня обновлён' });
      return;
    }

    // --- Выполнение действий, Конструктор дня и Редактор действия ---
    case 'toggle-item': {
      const item = state.items.find(i => i.id === id);
      if (!item) return;
      const prog = getItemProgressOnDate(state, item, state.lastDay);

      // Если действие уже выполнено сегодня — отменяем с проверкой неотрицательности монет!
      if (prog.done) {
        const todaysEvs = state.events.filter(e => e.active && e.entityId === item.id && e.date === state.lastDay);
        const coinsToRevert = todaysEvs.reduce((s, e) => s + (Number(e.coins) || 0), 0);
        const curCoins = calcWallet(state).coins;
        if (coinsToRevert > 0 && (curCoins - coinsToRevert) < 0) {
          showToast('Монеты уже потрачены в Магазине — сначала верни неиспользованный бонус.', false);
          return;
        }
        commitMutation(draft => {
          const evIds = [];
          draft.events.forEach(e => {
            if (e.active && e.entityId === id && e.date === draft.lastDay) {
              e.active = false;
              evIds.push(e.id);
            }
          });
          if (evIds.length) {
            draft.ledger.push({
              id: uid('led'),
              eventId: evIds[0],
              type: 'revert',
              coins: -coinsToRevert,
              xp: -todaysEvs.reduce((s, e) => s + (Number(e.xp) || 0), 0),
              date: draft.lastDay,
              name: `Отмена отметки: ${item.title}`
            });
          }
        }, { toast: 'Отметка снята' });
        return;
      }

      // Начисление шага или полного выполнения
      const target = item.kind === 'habit' ? Math.max(1, Number(item.dailyTarget) || 1) : 1;
      const willCompleteToday = (prog.units + 1) >= target;
      const rewardCoins = willCompleteToday ? Math.max(0, Number(item.reward) || 0) : 0;
      const rewardXp = willCompleteToday ? Math.max(5, rewardCoins || 10) : 2;

      commitMutation(draft => {
        const evId = uid('ev');
        draft.events.push({
          id: evId,
          entityId: item.id,
          kind: item.kind,
          name: item.title,
          date: draft.lastDay,
          units: 1,
          coins: rewardCoins,
          xp: rewardXp,
          cycle: item.cycle || 1,
          active: true,
          blockId: item.blockId || null
        });
        if (rewardCoins > 0 || rewardXp > 0) {
          draft.ledger.push({
            id: uid('led'),
            eventId: evId,
            type: 'earn',
            coins: rewardCoins,
            xp: rewardXp,
            date: draft.lastDay,
            name: item.title
          });
        }
        // Закрыть связанный carryover или missed, если был
        draft.carryovers = draft.carryovers.filter(c => c.itemId !== item.id);
        draft.missed.forEach(m => {
          if (m.itemId === item.id && m.status === 'open') m.status = 'done';
        });
      }, {
        sound: willCompleteToday ? 'coin' : 'soft',
        undoable: true,
        toast: willCompleteToday
          ? (rewardCoins > 0 ? `Выполнено! +${rewardCoins} ● и +${rewardXp} XP` : `Выполнено! +${rewardXp} XP`)
          : `Шаг засчитан (${prog.units + 1}/${target})`
      });
      return;
    }

    case 'set-day-tempo': {
      commitMutation(draft => {
        const dRec = ensureDayObj(draft, draft.lastDay);
        dRec.tempo = val;
      }, {
        toast: val === 'rest'
          ? 'Темп «Отдыхаю»: обычные дела сняты с ожидания без пропусков'
          : (val === 'intense' ? 'Темп «Фигачу»: показаны все задачи повышенной отдачи' : 'Обычный темп дня')
      });
      return;
    }

    case 'resolve-carryover': {
      const how = btn.getAttribute('data-how') || 'today';
      commitMutation(draft => {
        const co = draft.carryovers.find(c => c.id === id);
        if (!co) return;
        const it = draft.items.find(i => i.id === co.itemId);
        const dRec = ensureDayObj(draft, draft.lastDay);
        if (it) {
          if (how === 'today') {
            it.inDay = true;
            if (!dRec.includes.includes(it.id)) dRec.includes.push(it.id);
          } else if (how === 'later') {
            it.inDay = false;
            dRec.includes = dRec.includes.filter(x => x !== it.id);
          } else if (how === 'archive') {
            it.archivedAt = draft.lastDay;
            it.status = 'archived';
          }
        }
        draft.carryovers = draft.carryovers.filter(c => c.id !== id);
      }, { undoable: true, toast: how === 'today' ? 'Взято в сегодняшний день' : (how === 'archive' ? 'Отправлено в архив' : 'Оставлено на потом') });
      return;
    }

    case 'show-hidden-today': {
      commitMutation(draft => {
        const dRec = ensureDayObj(draft, draft.lastDay);
        dRec.excludes = dRec.excludes.filter(x => x !== id);
        if (!dRec.overrides.includes(id)) dRec.overrides.push(id);
      }, { toast: 'Показано на сегодня' });
      return;
    }

    case 'resume-from-basic': {
      commitMutation(draft => {
        draft.basicFreeze = false;
      }, { toast: 'Все регулярные планы снова активны' });
      return;
    }

    case 'open-item-editor': {
      syncDraftInputsFromDOM();
      openItemEditorModal(
        id,
        btn.getAttribute('data-block') || '',
        btn.getAttribute('data-stage') || '',
        btn.getAttribute('data-kind') || ''
      );
      return;
    }

    case 'ie-set-kind': {
      syncDraftInputsFromDOM();
      UI3.itemForm.kind = val;
      if (val === 'habit' && UI3.itemForm.schedType === 'once') UI3.itemForm.schedType = 'daily';
      if (val === 'calendar' && !UI3.itemForm.date) UI3.itemForm.date = state.lastDay;
      renderApp();
      return;
    }

    case 'save-item-editor': {
      syncDraftInputsFromDOM();
      const f = deepClone(UI3.itemForm);
      const title = (f.title || '').trim();
      if (!title) {
        showToast('Укажи название действия', false);
        return;
      }
      commitMutation(draft => {
        let finalGoalId = f.goalId || null;
        if ((f.newGoalTitle || '').trim() && f.stageId) {
          const ng = {
            id: uid('gl'),
            blockId: f.blockId,
            stageId: f.stageId,
            title: f.newGoalTitle.trim(),
            criterion: '',
            ifTrigger: f.ifTrigger || '',
            ifAction: f.ifAction || '',
            status: 'active',
            reason: ''
          };
          draft.goals.push(ng);
          finalGoalId = ng.id;
        }

        const schedObj = {
          type: f.kind === 'habit' ? (f.schedType === 'weekly' ? 'weekly' : 'daily') : (f.schedType || 'once'),
          days: f.schedType === 'weekly' ? [localWeekday(f.date || draft.lastDay)] : [],
          date: f.date || (f.kind === 'calendar' ? draft.lastDay : null),
          time: f.kind === 'calendar' ? (f.time || '15:00') : '',
          exceptions: {}
        };

        if (id) {
          const ex = draft.items.find(i => i.id === id);
          if (ex) {
            schedObj.exceptions = (ex.schedule && ex.schedule.exceptions) || {};
            Object.assign(ex, {
              title,
              kind: f.kind,
              blockId: f.blockId || null,
              stageId: f.blockId ? (f.stageId || null) : null,
              goalId: f.blockId ? finalGoalId : null,
              schedule: schedObj,
              dailyTarget: f.kind === 'habit' ? Math.max(1, Number(f.dailyTarget) || 1) : 1,
              inDay: !!f.inDay,
              isKey: !!f.isKey,
              reward: Math.max(0, Number(f.reward) || 0),
              load: f.load || 'normal',
              ifTrigger: (f.ifTrigger || '').trim(),
              ifAction: (f.ifAction || '').trim()
            });
          }
        } else {
          const createdId = uid('it');
          draft.items.push({
            id: createdId,
            kind: f.kind,
            title,
            description: '',
            blockId: f.blockId || null,
            stageId: f.blockId ? (f.stageId || null) : null,
            goalId: f.blockId ? finalGoalId : null,
            schedule: schedObj,
            dailyTarget: f.kind === 'habit' ? Math.max(1, Number(f.dailyTarget) || 1) : 1,
            inDay: !!f.inDay,
            inBasic: draft.complexity === 'basic' || !!f.isKey,
            isKey: !!f.isKey,
            load: f.load || 'normal',
            reward: Math.max(0, Number(f.reward) || 0),
            ifTrigger: (f.ifTrigger || '').trim(),
            ifAction: (f.ifAction || '').trim(),
            status: 'active',
            cycle: 1,
            createdAt: draft.lastDay,
            archivedAt: null
          });
          if (f.inDay) {
            const dRec = ensureDayObj(draft, draft.lastDay);
            if (!dRec.includes.includes(createdId)) dRec.includes.push(createdId);
          }
        }
      }, { sound: 'soft', undoable: true, toast: id ? 'Действие обновлено' : 'Действие создано' });
      UI3.modal = null;
      renderApp();
      return;
    }

    case 'archive-item': {
      commitMutation(draft => {
        const it = draft.items.find(i => i.id === id);
        if (it) {
          it.archivedAt = draft.lastDay;
          it.status = 'archived';
        }
        draft.carryovers = draft.carryovers.filter(c => c.itemId !== id);
      }, { undoable: true, toast: 'Перенесено в архив' });
      UI3.modal = null;
      renderApp();
      return;
    }

    case 'unarchive-item': {
      commitMutation(draft => {
        const it = draft.items.find(i => i.id === id);
        if (it) {
          it.archivedAt = null;
          it.status = 'active';
        }
      }, { toast: 'Восстановлено из архива' });
      return;
    }

    case 'restart-oneoff-cycle': {
      commitMutation(draft => {
        const it = draft.items.find(i => i.id === id);
        if (it) {
          it.cycle = (Number(it.cycle) || 1) + 1;
          it.inDay = true;
          const dRec = ensureDayObj(draft, draft.lastDay);
          if (!dRec.includes.includes(it.id)) dRec.includes.push(it.id);
        }
      }, { sound: 'soft', toast: 'Задание снова открыто к выполнению' });
      return;
    }

    // --- Блоки времени, Этапы и Цели ---
    case 'set-block-preset': {
      commitMutation(draft => {
        const b = draft.blocks.find(x => x.id === id);
        if (!b) return;
        b.preset = val === 'full' ? 'full' : 'simple';
        b.secs = Object.assign({ ach: true, fact: true, cur: true, plan: true, opt: true }, b.secs || {}, {
          unk: b.preset === 'full',
          lvmg: b.preset === 'full'
        });
        // Гарантировать наличие этапов Неизвестное и LVMG для Полной стратегии
        if (b.preset === 'full') {
          if (!draft.stages.some(s => s.blockId === b.id && s.role === 'unknown')) {
            draft.stages.push({ id: uid('stg_unk'), blockId: b.id, role: 'unknown', name: 'Участок пути пока исследуется', description: '', meaning: '', order: 200, status: 'open', completedAt: null, archivedAt: null });
          }
          if (!draft.stages.some(s => s.blockId === b.id && s.role === 'lvmg')) {
            draft.stages.push({ id: uid('stg_lvmg'), blockId: b.id, role: 'lvmg', name: 'Дальний вдохновляющий горизонт LVMG', description: '', meaning: '', order: 300, status: 'open', completedAt: null, archivedAt: null });
          }
        }
      }, { toast: val === 'full' ? 'Включена Полная дорожка этапов (+ Неизвестное и LVMG)' : 'Включена Упрощённая дорожка (до Оптимума)' });
      return;
    }

    case 'make-stage-current': {
      commitMutation(draft => {
        const st = draft.stages.find(s => s.id === id);
        if (!st) return;
        const b = draft.blocks.find(x => x.id === st.blockId);
        if (b) b.currentStageId = st.id;
        st.status = 'open';
      }, { sound: 'soft', toast: 'Текущий этап блока обновлён' });
      UI3.inspectStageId = id;
      renderApp();
      return;
    }

    case 'move-stage-order': {
      const dir = Number(btn.getAttribute('data-dir')) || 1;
      commitMutation(draft => {
        const st = draft.stages.find(s => s.id === id);
        if (!st) return;
        const peers = draft.stages
          .filter(s => s.blockId === st.blockId && !s.archivedAt && s.role === 'step' && s.status !== 'completed')
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        const idx = peers.findIndex(p => p.id === id);
        const swapIdx = idx + dir;
        if (idx < 0 || swapIdx < 0 || swapIdx >= peers.length) return;
        const tmp = peers[idx];
        peers[idx] = peers[swapIdx];
        peers[swapIdx] = tmp;
        peers.forEach((p, i) => { p.order = i + 1; });
      }, { toast: 'Порядок этапов обновлён' });
      return;
    }

    case 'open-stage-editor':
      UI3.modal = { name: 'stage-editor', id, blockId: btn.getAttribute('data-block') || UI3.activeBlockId };
      renderApp();
      return;

    case 'save-stage-editor': {
      const name = (document.getElementById('seName')?.value || '').trim();
      const desc = (document.getElementById('seDesc')?.value || '').trim();
      const meaning = (document.getElementById('seMeaning')?.value || '').trim();
      const blkId = btn.getAttribute('data-block') || UI3.activeBlockId;
      if (!name) {
        showToast('Введи название этапа', false);
        return;
      }
      let createdStageId = id;
      commitMutation(draft => {
        if (id) {
          const st = draft.stages.find(s => s.id === id);
          if (st) {
            st.name = name;
            st.description = desc;
            st.meaning = meaning;
          }
        } else if (blkId) {
          const openSteps = draft.stages.filter(s => s.blockId === blkId && s.role === 'step' && !s.archivedAt);
          const maxOrd = openSteps.reduce((m, s) => Math.max(m, Number(s.order) || 1), 1);
          createdStageId = uid('stg');
          draft.stages.push({
            id: createdStageId,
            blockId: blkId,
            role: 'step',
            name,
            description: desc,
            meaning,
            order: maxOrd + 1,
            status: 'open',
            completedAt: null,
            archivedAt: null
          });
        }
      }, { sound: 'soft', toast: id ? 'Этап сохранён' : 'Добавлен новый этап' });
      UI3.modal = null;
      if (!id && createdStageId) UI3.inspectStageId = createdStageId;
      renderApp();
      return;
    }

    case 'archive-stage': {
      commitMutation(draft => {
        const st = draft.stages.find(s => s.id === id);
        if (st) st.archivedAt = draft.lastDay;
      }, { undoable: true, toast: 'Этап перенесён в архив' });
      UI3.modal = null;
      renderApp();
      return;
    }

    case 'open-complete-stage':
      UI3.modal = { name: 'complete-stage', id };
      renderApp();
      return;

    case 'confirm-complete-stage': {
      const carryRadio = document.querySelector('input[name="stageCarryRule"]:checked');
      const carryMode = carryRadio ? carryRadio.value : 'next';
      let nextActiveId = null;
      commitMutation(draft => {
        const st = draft.stages.find(s => s.id === id);
        if (!st) return;
        const blk = draft.blocks.find(b => b.id === st.blockId);
        st.status = 'completed';
        st.completedAt = draft.lastDay;

        const remainingSteps = draft.stages
          .filter(s => s.blockId === st.blockId && !s.archivedAt && s.role === 'step' && s.status !== 'completed')
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        let nextStep = remainingSteps[0] || null;
        if (!nextStep) {
          nextStep = {
            id: uid('stg'),
            blockId: st.blockId,
            role: 'step',
            name: 'Поддержание и развитие',
            description: 'Спокойное продолжение в своём темпе',
            meaning: blk ? blk.meaning : '',
            order: (Number(st.order) || 1) + 1,
            status: 'open',
            completedAt: null,
            archivedAt: null
          };
          draft.stages.push(nextStep);
        }
        if (blk) blk.currentStageId = nextStep.id;
        nextActiveId = nextStep.id;

        draft.items.forEach(it => {
          if (!it.archivedAt && it.stageId === st.id && !isOneOffEverDoneInCurrentCycle(draft, it)) {
            it.stageId = carryMode === 'next' ? nextStep.id : null;
          }
        });

        const evId = uid('ev_stg');
        draft.events.push({ id: evId, entityId: st.id, kind: 'stage', name: `Этап пройден: ${st.name}`, date: draft.lastDay, units: 1, coins: 40, xp: 80, active: true, blockId: st.blockId });
        draft.ledger.push({ id: uid('led'), eventId: evId, type: 'earn', coins: 40, xp: 80, date: draft.lastDay, name: `Этап пройден: ${st.name}` });
      }, { sound: 'coin', undoable: true, toast: '🏆 Этап пройден! +40 ● и +80 XP' });
      UI3.modal = null;
      if (nextActiveId) UI3.inspectStageId = nextActiveId;
      renderApp();
      return;
    }

    case 'reopen-stage': {
      commitMutation(draft => {
        const st = draft.stages.find(s => s.id === id);
        if (!st) return;
        st.status = 'open';
        st.completedAt = null;
        const b = draft.blocks.find(x => x.id === st.blockId);
        if (b) b.currentStageId = st.id;
      }, { toast: 'Этап снова открыт в работу' });
      return;
    }

    case 'peek-or-add-next-stage': {
      const cur = state.stages.find(s => s.id === id);
      if (!cur) return;
      const nextStep = state.stages
        .filter(s => s.blockId === cur.blockId && !s.archivedAt && s.role === 'step' && s.status !== 'completed' && (s.order || 0) > (cur.order || 0))
        .sort((a, b) => (a.order || 0) - (b.order || 0))[0];
      if (nextStep) {
        UI3.inspectStageId = nextStep.id;
        UI3.blockTab = 'current';
        renderApp();
      } else {
        UI3.modal = { name: 'stage-editor', id: '', blockId: cur.blockId };
        renderApp();
      }
      return;
    }

    case 'toggle-opt-reached': {
      commitMutation(draft => {
        const st = draft.stages.find(s => s.id === id);
        if (st) st.reached = !st.reached;
      }, { sound: 'soft', toast: 'Статус Оптимального ориентира обновлён 🌿' });
      return;
    }

    case 'open-goal-editor':
      UI3.modal = { name: 'goal-editor', id, stageId: btn.getAttribute('data-stage') || '' };
      renderApp();
      return;

    case 'save-goal-editor': {
      const title = (document.getElementById('geTitle')?.value || '').trim();
      const crit = (document.getElementById('geCrit')?.value || '').trim();
      const ifT = (document.getElementById('geIfT')?.value || '').trim();
      const ifA = (document.getElementById('geIfA')?.value || '').trim();
      const stgId = btn.getAttribute('data-stage') || '';
      if (!title) {
        showToast('Укажи желаемый результат цели', false);
        return;
      }
      commitMutation(draft => {
        if (id) {
          const g = draft.goals.find(x => x.id === id);
          if (g) {
            g.title = title;
            g.criterion = crit;
            g.ifTrigger = ifT;
            g.ifAction = ifA;
          }
        } else {
          const st = draft.stages.find(s => s.id === stgId);
          draft.goals.push({
            id: uid('gl'),
            blockId: st ? st.blockId : UI3.activeBlockId,
            stageId: stgId,
            title,
            criterion: crit,
            ifTrigger: ifT,
            ifAction: ifA,
            status: 'active',
            reason: ''
          });
        }
      }, { sound: 'soft', toast: id ? 'Цель обновлена' : 'Цель этапа добавлена 🎯' });
      UI3.modal = null;
      renderApp();
      return;
    }

    case 'set-goal-status': {
      const stVal = btn.getAttribute('data-st') || 'active';
      commitMutation(draft => {
        const g = draft.goals.find(x => x.id === id);
        if (!g) return;
        const wasAchieved = g.status === 'achieved';
        g.status = stVal;
        if (stVal === 'achieved' && !wasAchieved) {
          const evId = uid('ev_gl');
          draft.events.push({ id: evId, entityId: g.id, kind: 'goal', name: `Цель достигнута: ${g.title}`, date: draft.lastDay, units: 1, coins: 25, xp: 50, active: true, blockId: g.blockId });
          draft.ledger.push({ id: uid('led'), eventId: evId, type: 'earn', coins: 25, xp: 50, date: draft.lastDay, name: `Цель достигнута: ${g.title}` });
        }
      }, { sound: stVal === 'achieved' ? 'coin' : 'soft', toast: stVal === 'achieved' ? '🎯 Цель достигнута! +25 ● и +50 XP' : 'Цель возвращена в работу' });
      return;
    }

    case 'open-abandon-goal':
      UI3.modal = { name: 'abandon-goal', id };
      renderApp();
      return;

    case 'confirm-abandon-goal': {
      const reason = (document.getElementById('abGoalReason')?.value || '').trim();
      commitMutation(draft => {
        const g = draft.goals.find(x => x.id === id);
        if (g) {
          g.status = 'abandoned';
          g.reason = reason;
        }
      }, { toast: 'Цель отпущена осознанно и без штрафа' });
      UI3.modal = null;
      renderApp();
      return;
    }

    case 'save-block-modal': {
      const icon = (document.getElementById('bsIcon')?.value || '📌').trim() || '📌';
      const name = (document.getElementById('bsName')?.value || '').trim();
      const subtitle = (document.getElementById('bsSub')?.value || '').trim();
      const meaning = (document.getElementById('bsMeaning')?.value || '').trim();
      const preset = document.getElementById('bsPreset')?.value === 'full' ? 'full' : 'simple';
      const knownLvmg = !!document.getElementById('bsKnownLvmg')?.checked;
      if (!name) {
        showToast('Напиши название блока времени', false);
        return;
      }
      let openNewBlockId = null;
      commitMutation(draft => {
        if (id) {
          const b = draft.blocks.find(x => x.id === id);
          if (b) {
            b.icon = icon;
            b.name = name;
            b.subtitle = subtitle;
            b.meaning = meaning;
            b.preset = preset;
            b.routeKnownToLvmg = knownLvmg;
            b.secs = Object.assign({ ach: true, fact: true, cur: true, plan: true, opt: true }, b.secs || {}, {
              unk: preset === 'full',
              lvmg: preset === 'full'
            });
          }
        } else {
          const nbId = uid('blk');
          const curStgId = uid('stg_cur');
          openNewBlockId = nbId;
          draft.blocks.push({
            id: nbId,
            name,
            icon,
            color: '#ffd54a',
            subtitle,
            meaning,
            fact: '',
            priority: 2,
            intensity: 'balanced',
            preset,
            secs: { ach: true, fact: true, cur: true, plan: true, opt: true, unk: preset === 'full', lvmg: preset === 'full' },
            currentStageId: curStgId,
            routeKnownToLvmg: false,
            order: draft.blocks.length,
            createdAt: draft.lastDay,
            archivedAt: null
          });
          draft.stages.push(
            { id: curStgId, blockId: nbId, role: 'step', name: 'Первый этап', description: subtitle, meaning, order: 1, status: 'open', completedAt: null, archivedAt: null },
            { id: uid('stg_opt'), blockId: nbId, role: 'optimal', name: 'Устойчивый комфортный ритм («достаточно хорошо»)', description: '', meaning: '', order: 100, status: 'open', reached: false, completedAt: null, archivedAt: null }
          );
          if (preset === 'full') {
            draft.stages.push(
              { id: uid('stg_unk'), blockId: nbId, role: 'unknown', name: 'Участок пути пока исследуется', description: '', meaning: '', order: 200, status: 'open', completedAt: null, archivedAt: null },
              { id: uid('stg_lvmg'), blockId: nbId, role: 'lvmg', name: 'Дальний вдохновляющий ориентир LVMG', description: '', meaning: '', order: 300, status: 'open', completedAt: null, archivedAt: null }
            );
          }
        }
      }, { sound: 'soft', undoable: true, toast: id ? 'Блок обновлён' : `Создан блок «${name}»` });
      UI3.modal = null;
      if (openNewBlockId) {
        const fresh = getState();
        const nb = fresh.blocks.find(x => x.id === openNewBlockId);
        UI3.activeBlockId = openNewBlockId;
        UI3.inspectStageId = nb ? nb.currentStageId : null;
        UI3.blockTab = 'current';
        UI3.route = 'block';
      }
      renderApp();
      return;
    }

    case 'archive-block': {
      commitMutation(draft => {
        const b = draft.blocks.find(x => x.id === id);
        if (b) b.archivedAt = draft.lastDay;
      }, { undoable: true, toast: 'Блок перенесён в архив' });
      UI3.modal = null;
      if (UI3.activeBlockId === id) UI3.route = 'blocks';
      renderApp();
      return;
    }

    case 'save-fact': {
      const txt = (document.getElementById('efText')?.value || '').trim();
      commitMutation(draft => {
        const b = draft.blocks.find(x => x.id === id);
        if (b) b.fact = txt;
      }, { toast: 'Фактическое состояние сохранено' });
      UI3.modal = null;
      renderApp();
      return;
    }

    case 'save-past-stage': {
      const name = (document.getElementById('apsName')?.value || '').trim();
      if (!name) return;
      commitMutation(draft => {
        draft.stages.push({
          id: uid('stg_past'),
          blockId: id,
          role: 'step',
          name,
          description: '',
          meaning: '',
          order: 0,
          status: 'completed',
          completedAt: draft.lastDay,
          archivedAt: null
        });
      }, { sound: 'soft', toast: 'Добавлено в Мои достижения 🏆' });
      UI3.modal = null;
      renderApp();
      return;
    }

    case 'set-block-prio': {
      const prio = Number(btn.getAttribute('data-prio')) || 2;
      commitMutation(draft => {
        const b = draft.blocks.find(x => x.id === id);
        if (b) b.priority = prio;
      }, { toast: 'Приоритет блока обновлён' });
      return;
    }

    // --- Квесты, Календарь, Принятые решения, Пропуски ---
    case 'quest-step-delta': {
      const delta = Number(btn.getAttribute('data-d')) || 1;
      const qCheck = state.quests.find(x => x.id === id);
      if (!qCheck) return;
      if (delta < 0 && calcWallet(state).coins < (qCheck.stepReward || 5)) {
        showToast('Монеты шага уже потрачены в Магазине бонусов.', false);
        return;
      }
      commitMutation(draft => {
        const q = draft.quests.find(x => x.id === id);
        if (!q || q.qtype !== 'counter') return;
        const nextP = Math.max(0, Math.min(q.target, (Number(q.progress) || 0) + delta));
        if (nextP === q.progress) return;
        const wasDone = q.status === 'completed';
        q.progress = nextP;
        const stepCoins = delta > 0 ? (q.stepReward || 5) : -(q.stepReward || 5);
        draft.ledger.push({ id: uid('led'), eventId: q.id, type: delta > 0 ? 'earn' : 'revert', coins: stepCoins, xp: delta > 0 ? 10 : -10, date: draft.lastDay, name: `Шаг квеста: ${q.title}` });
        if (q.progress >= q.target && !wasDone) {
          q.status = 'completed';
          draft.ledger.push({ id: uid('led'), eventId: q.id, type: 'earn', coins: q.finalReward || 60, xp: 90, date: draft.lastDay, name: `Финал квеста: ${q.title}` });
          if (q.linkedBonusId) {
            const bon = draft.bonuses.find(b => b.id === q.linkedBonusId);
            if (bon) {
              draft.instances.push({ id: uid('ins'), bonusId: bon.id, name: bon.title, paid: 0, snapshotCost: bon.cost, limit: 1, uses: 0, source: 'quest', eventId: q.id, acquiredAt: draft.lastDay, refundedAt: null });
            }
          }
        } else if (q.progress < q.target && wasDone) {
          q.status = 'active';
        }
      }, { sound: delta > 0 ? 'coin' : 'soft', undoable: true, toast: delta > 0 ? 'Шаг квеста засчитан!' : 'Шаг квеста скорректирован' });
      return;
    }

    case 'toggle-quest-check': {
      const sid = btn.getAttribute('data-sid') || '';
      commitMutation(draft => {
        const q = draft.quests.find(x => x.id === id);
        if (!q) return;
        const st = (q.steps || []).find(s => s.id === sid);
        if (!st) return;
        st.done = !st.done;
        q.progress = q.steps.filter(s => s.done).length;
        const wasDone = q.status === 'completed';
        if (st.done) {
          draft.ledger.push({ id: uid('led'), eventId: q.id, type: 'earn', coins: q.stepReward || 5, xp: 10, date: draft.lastDay, name: `Пункт квеста: ${st.title}` });
        }
        if (q.progress >= q.steps.length && !wasDone) {
          q.status = 'completed';
          draft.ledger.push({ id: uid('led'), eventId: q.id, type: 'earn', coins: q.finalReward || 60, xp: 90, date: draft.lastDay, name: `Финал квеста: ${q.title}` });
          if (q.linkedBonusId) {
            const bon = draft.bonuses.find(b => b.id === q.linkedBonusId);
            if (bon) {
              draft.instances.push({ id: uid('ins'), bonusId: bon.id, name: bon.title, paid: 0, snapshotCost: bon.cost, limit: 1, uses: 0, source: 'quest', eventId: q.id, acquiredAt: draft.lastDay, refundedAt: null });
            }
          }
        } else if (q.progress < q.steps.length) {
          q.status = 'active';
        }
      }, { sound: 'coin', undoable: true, toast: 'Прогресс квеста обновлён' });
      return;
    }

    case 'save-quest-modal': {
      const title = (document.getElementById('qeTitle')?.value || '').trim();
      const qtype = document.getElementById('qeType')?.value || 'counter';
      const rawTS = (document.getElementById('qeTargetOrSteps')?.value || '7').trim();
      const blkId = document.getElementById('qeBlock')?.value || '';
      const bonId = document.getElementById('qeBonus')?.value || '';
      if (!title) {
        showToast('Введи название квеста', false);
        return;
      }
      commitMutation(draft => {
        if (id) {
          const q = draft.quests.find(x => x.id === id);
          if (!q) return;
          q.title = title;
          q.blockId = blkId || null;
          q.linkedBonusId = bonId || null;
          if (q.qtype === 'counter') {
            q.target = Math.max(1, Number(rawTS) || 7);
          } else {
            const parts = rawTS.split(',').map(s => s.trim()).filter(Boolean);
            if (parts.length) {
              q.steps = parts.map((p, i) => ({ id: q.steps[i]?.id || uid('qs'), title: p, done: !!q.steps[i]?.done }));
              q.target = q.steps.length;
            }
          }
        } else {
          const isCl = qtype === 'checklist';
          const parts = isCl ? rawTS.split(',').map(s => s.trim()).filter(Boolean) : [];
          const steps = isCl ? (parts.length ? parts : ['Шаг 1', 'Шаг 2', 'Шаг 3']).map(p => ({ id: uid('qs'), title: p, done: false })) : [];
          const blk = blkId ? draft.blocks.find(b => b.id === blkId) : null;
          draft.quests.push({
            id: uid('q'),
            title,
            blockId: blkId || null,
            stageId: blk ? blk.currentStageId : null,
            qtype: isCl ? 'checklist' : 'counter',
            target: isCl ? steps.length : Math.max(1, Number(rawTS) || 7),
            progress: 0,
            steps,
            stepReward: 5,
            finalReward: 60,
            linkedBonusId: bonId || null,
            inDay: true,
            status: 'active',
            createdAt: draft.lastDay,
            archivedAt: null
          });
        }
      }, { sound: 'soft', toast: id ? 'Квест обновлён' : 'Новый квест запущен 💎' });
      UI3.modal = null;
      renderApp();
      return;
    }

    case 'archive-quest': {
      commitMutation(draft => {
        const q = draft.quests.find(x => x.id === id);
        if (q) q.archivedAt = draft.lastDay;
      }, { undoable: true, toast: 'Квест отправлен в архив' });
      UI3.modal = null;
      renderApp();
      return;
    }

    case 'open-cal-move':
      UI3.modal = { name: 'cal-move', id, occ: btn.getAttribute('data-occ') || state.lastDay };
      renderApp();
      return;

    case 'confirm-cal-move': {
      const newDate = document.getElementById('cmDate')?.value || state.lastDay;
      const newTime = document.getElementById('cmTime')?.value || '15:00';
      const occ = btn.getAttribute('data-occ') || state.lastDay;
      const scope = btn.getAttribute('data-scope') || 'all';
      commitMutation(draft => {
        const it = draft.items.find(i => i.id === id);
        if (!it) return;
        it.schedule = it.schedule || { type: 'once', exceptions: {} };
        it.schedule.exceptions = it.schedule.exceptions || {};
        if (scope === 'single' && it.schedule.type !== 'once') {
          it.schedule.exceptions[occ] = { movedTo: newDate, time: newTime };
        } else {
          it.schedule.date = newDate;
          it.schedule.time = newTime;
          if (it.schedule.type === 'weekly') it.schedule.days = [localWeekday(newDate)];
        }
      }, { toast: scope === 'single' ? 'Перенесено одно появление встречи' : 'Расписание встречи обновлено' });
      UI3.modal = null;
      renderApp();
      return;
    }

    case 'save-new-decision': {
      const title = (document.getElementById('ndTitle')?.value || '').trim();
      const deadline = document.getElementById('ndDate')?.value || shiftLocalDays(state.lastDay, 7);
      const stake = Math.max(0, Number(document.getElementById('ndStake')?.value) || 0);
      if (!title) {
        showToast('Сформулируй принятое решение', false);
        return;
      }
      commitMutation(draft => {
        draft.decisions.push({
          id: uid('dec'),
          blockId: null,
          stageId: null,
          title,
          deadline,
          coinsStake: stake,
          xpReward: 25,
          status: 'active'
        });
      }, { sound: 'soft', toast: 'Принятое решение зафиксировано' });
      UI3.modal = null;
      renderApp();
      return;
    }

    case 'resolve-decision': {
      const out = btn.getAttribute('data-out') || 'kept';
      commitMutation(draft => {
        const dc = draft.decisions.find(d => d.id === id);
        if (!dc) return;
        if (out === 'kept') {
          dc.status = 'kept';
          draft.ledger.push({ id: uid('led'), eventId: dc.id, type: 'earn', coins: dc.coinsStake || 20, xp: dc.xpReward || 25, date: draft.lastDay, name: `Слово сдержано: ${dc.title}` });
        } else if (out === 'broken') {
          dc.status = 'broken';
          // Единственный случай по спецификации, когда баланс может честно уйти в минус («Цена слова»)
          draft.ledger.push({ id: uid('led'), eventId: dc.id, type: 'penalty', coins: -(dc.coinsStake || 0), xp: 0, date: draft.lastDay, name: `Цена слова: ${dc.title}` });
        } else {
          dc.status = 'active';
        }
      }, { sound: out === 'kept' ? 'coin' : 'soft', undoable: true, toast: out === 'kept' ? 'Слово сдержано! Награда начислена' : (out === 'broken' ? 'Зафиксирована Цена слова' : 'Решение возвращено в активные') });
      return;
    }

    case 'handle-miss': {
      const how = btn.getAttribute('data-how') || 'done';
      commitMutation(draft => {
        const ms = draft.missed.find(m => m.id === id);
        if (!ms) return;
        ms.status = how === 'done' ? 'done' : 'archived';
        const it = draft.items.find(i => i.id === ms.itemId);
        if (how === 'done' && it) {
          const evId = uid('ev');
          const c = Math.max(0, Number(it.reward) || 0);
          draft.events.push({ id: evId, entityId: it.id, kind: it.kind, name: it.title, date: draft.lastDay, units: 1, coins: c, xp: Math.max(5, c), active: true, blockId: it.blockId });
          draft.ledger.push({ id: uid('led'), eventId: evId, type: 'earn', coins: c, xp: Math.max(5, c), date: draft.lastDay, name: it.title });
        }
      }, { sound: how === 'done' ? 'coin' : 'soft', toast: how === 'done' ? 'Закрыто задним числом!' : 'Спокойно убрано в архив' });
      return;
    }

    // --- Бонусы, Экземпляры наград и Ништяки ---
    case 'set-reward-target': {
      commitMutation(draft => {
        draft.rewardTargetId = id;
      }, { toast: 'Выбрано как «Моя награда» на Главной ✦' });
      return;
    }

    case 'buy-bonus-instance': {
      const bon = state.bonuses.find(b => b.id === id && !b.archivedAt);
      if (!bon) return;
      if (calcWallet(state).coins < bon.cost) {
        showToast('Пока недостаточно монет для этой награды', false);
        return;
      }
      commitMutation(draft => {
        const b = draft.bonuses.find(x => x.id === id);
        if (!b) return;
        const evId = uid('ev_buy');
        // Отдельный экземпляр со снимком фактической уплаченной цены!
        draft.instances.push({
          id: uid('ins'),
          bonusId: b.id,
          name: b.title,
          paid: b.cost,
          limit: b.limit || 1,
          uses: 0,
          source: 'shop',
          eventId: evId,
          acquiredAt: draft.lastDay,
          refundedAt: null
        });
        draft.ledger.push({
          id: uid('led'),
          eventId: evId,
          type: 'spend',
          coins: -b.cost,
          xp: 0,
          date: draft.lastDay,
          name: `Покупка награды: ${b.title}`
        });
      }, { sound: 'coin', undoable: true, toast: `Куплена награда «${bon.title}» 🎁` });
      UI3.bonusSub = 'instances';
      renderApp();
      return;
    }

    case 'use-instance': {
      commitMutation(draft => {
        const ins = draft.instances.find(x => x.id === id);
        if (ins && !ins.refundedAt) {
          ins.uses = (Number(ins.uses) || 0) + 1;
          ins.lastUsedAt = draft.lastDay;
        }
      }, { sound: 'coin', toast: 'Награда с удовольствием использована ✨' });
      return;
    }

    case 'refund-instance': {
      commitMutation(draft => {
        const ins = draft.instances.find(x => x.id === id);
        if (!ins || ins.refundedAt || ins.uses > 0 || ins.source !== 'shop') return;
        ins.refundedAt = draft.lastDay;
        draft.ledger.push({
          id: uid('led'),
          eventId: ins.eventId,
          type: 'refund',
          coins: Number(ins.paid) || 0,
          xp: 0,
          date: draft.lastDay,
          name: `Возврат неиспользованной награды: ${ins.name}`
        });
      }, { sound: 'soft', toast: 'Монеты за неиспользованный бонус возвращены ↩' });
      return;
    }

    case 'save-bonus-modal': {
      const title = (document.getElementById('beTitle')?.value || '').trim();
      const cost = Math.max(5, Number(document.getElementById('beCost')?.value) || 50);
      if (!title) {
        showToast('Напиши название бонуса', false);
        return;
      }
      commitMutation(draft => {
        if (id) {
          const b = draft.bonuses.find(x => x.id === id);
          if (b) { b.title = title; b.cost = cost; }
        } else {
          const nbId = uid('bon');
          draft.bonuses.push({ id: nbId, title, cost, limit: 1, archivedAt: null });
          if (!draft.rewardTargetId) draft.rewardTargetId = nbId;
        }
      }, { sound: 'soft', toast: id ? 'Бонус обновлён (прошлые покупки сохранили свою цену)' : 'Бонус добавлен в магазин' });
      UI3.modal = null;
      renderApp();
      return;
    }

    case 'archive-bonus': {
      commitMutation(draft => {
        const b = draft.bonuses.find(x => x.id === id);
        if (b) b.archivedAt = draft.lastDay;
      }, { undoable: true, toast: 'Бонус скрыт в архив' });
      UI3.modal = null;
      renderApp();
      return;
    }

    case 'add-treat': {
      const inp = document.getElementById('newTreatField');
      const title = (inp?.value || '').trim();
      if (!title) return;
      commitMutation(draft => {
        draft.treats.push({ id: uid('tr'), title });
      }, { sound: 'soft', toast: 'Ништяк добавлен ☕' });
      return;
    }

    case 'del-treat': {
      commitMutation(draft => {
        draft.treats = draft.treats.filter(t => t.id !== id);
      }, { undoable: true, toast: 'Ништяк удалён' });
      return;
    }

    // --- Таймер фокуса (с раздельным подтверждением минут!), Счастье, Тихий вечер, Настройки и AI ---
    case 'open-focus-for':
      UI3.modal = { name: 'focus-for-item', id };
      renderApp();
      return;

    case 'timer-start': {
      const mins = Math.max(1, Number(btn.getAttribute('data-min')) || 15);
      const pickEl = document.getElementById('focusItemPick');
      const pickedId = pickEl ? pickEl.value : '';
      const pickedItem = pickedId ? state.items.find(i => i.id === pickedId) : null;
      commitMutation(draft => {
        draft.focusTimer = {
          itemId: pickedItem ? pickedItem.id : null,
          itemName: pickedItem ? pickedItem.title : (mins === 2 ? 'Первый шаг (2 минуты)' : 'Свободный подход'),
          blockId: pickedItem ? pickedItem.blockId : null,
          targetMin: mins,
          elapsedSec: 0,
          status: 'running',
          lastTickMs: Date.now()
        };
      }, { sound: 'soft', toast: `Таймер на ${mins} мин запущен ▶` });
      return;
    }

    case 'timer-start-item': {
      const mins = Math.max(1, Number(btn.getAttribute('data-min')) || 15);
      const pickedItem = state.items.find(i => i.id === id);
      UI3.modal = null;
      commitMutation(draft => {
        draft.focusTimer = {
          itemId: pickedItem ? pickedItem.id : null,
          itemName: pickedItem ? pickedItem.title : 'Подход к делу',
          blockId: pickedItem ? pickedItem.blockId : null,
          targetMin: mins,
          elapsedSec: 0,
          status: 'running',
          lastTickMs: Date.now()
        };
      }, { sound: 'soft', toast: `Подход ${mins} мин запущен ▶` });
      return;
    }

    case 'timer-pause': {
      commitMutation(draft => {
        if (draft.focusTimer) draft.focusTimer.status = 'paused';
      });
      return;
    }

    case 'timer-resume': {
      commitMutation(draft => {
        if (draft.focusTimer) {
          draft.focusTimer.status = 'running';
          draft.focusTimer.lastTickMs = Date.now();
        }
      });
      return;
    }

    case 'timer-finish': {
      commitMutation(draft => {
        if (draft.focusTimer) draft.focusTimer.status = 'paused';
      });
      UI3.modal = { name: 'confirm-timer-mins' };
      renderApp();
      return;
    }

    case 'timer-reset': {
      UI3.modal = null;
      commitMutation(draft => {
        draft.focusTimer = null;
      }, { toast: 'Таймер сброшен без записи минут' });
      return;
    }

    case 'confirm-save-timer-mins': {
      const mins = Math.max(1, Math.min(180, Number(document.getElementById('ctmInput')?.value) || 10));
      UI3.modal = null;
      commitMutation(draft => {
        const ft = draft.focusTimer;
        draft.timeSessions.push({
          id: uid('ts'),
          itemId: ft ? ft.itemId : null,
          itemName: ft ? ft.itemName : 'Практика',
          blockId: ft ? ft.blockId : null,
          date: draft.lastDay,
          minutes: mins
        });
        draft.focusTimer = null;
      }, { sound: 'soft', undoable: true, toast: `Записано ${mins} мин практики (галочка выполнения остаётся за тобой)` });
      return;
    }

    case 'quick-log-mins': {
      const mins = Math.max(1, Number(btn.getAttribute('data-min')) || 10);
      const it = state.items.find(i => i.id === id);
      UI3.modal = null;
      commitMutation(draft => {
        draft.timeSessions.push({
          id: uid('ts'),
          itemId: it ? it.id : null,
          itemName: it ? it.title : 'Практика',
          blockId: it ? it.blockId : null,
          date: draft.lastDay,
          minutes: mins
        });
      }, { sound: 'soft', undoable: true, toast: `+${mins} мин записано в историю усилий ⏱` });
      return;
    }

    case 'next-spark':
      UI3.sparkIndex = (UI3.sparkIndex + 1 + Math.floor(Math.random() * 7)) % HAPPINESS_200.length;
      renderApp();
      return;

    case 'save-moment': {
      const txt = (document.getElementById('momentInput')?.value || '').trim();
      if (!txt) return;
      commitMutation(draft => {
        draft.moments.push({ id: uid('mom'), date: draft.lastDay, text: txt });
      }, { sound: 'soft', toast: 'Тёплый момент сохранён 💛' });
      return;
    }

    case 'set-evening-mood':
      syncDraftInputsFromDOM();
      UI3.eveningMood = val;
      renderApp();
      return;

    case 'voice-evening': {
      syncDraftInputsFromDOM();
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        showToast('Голосовой ввод не поддерживается этим браузером — напиши пару слов текстом.', false);
        return;
      }
      if (UI3.recording && UI3.speechRec) {
        try { UI3.speechRec.stop(); } catch (e) {}
        UI3.recording = false;
        renderApp();
        return;
      }
      try {
        const rec = new SR();
        rec.lang = 'ru-RU';
        rec.interimResults = false;
        UI3.speechRec = rec;
        UI3.recording = true;
        renderApp();
        rec.onresult = (ev) => {
          const tr = ev.results?.[0]?.[0]?.transcript || '';
          if (tr) UI3.eveningDraft = (UI3.eveningDraft ? UI3.eveningDraft + ' ' : '') + tr;
        };
        rec.onend = () => {
          UI3.recording = false;
          renderApp();
        };
        rec.onerror = () => {
          UI3.recording = false;
          renderApp();
        };
        rec.start();
      } catch (e) {
        UI3.recording = false;
        renderApp();
      }
      return;
    }

    case 'save-evening-reflection': {
      syncDraftInputsFromDOM();
      const moodLabels = { calm: '🌿 Спокойно', warm: '✨ Наполненно', tired: '🌙 Приятная усталость', rest: '🫂 Нужен отдых' };
      const note = (UI3.eveningDraft || '').trim() || 'Спокойное завершение дня.';
      const reply = pickEveningReplyV3(state, UI3.eveningMood);
      commitMutation(draft => {
        draft.reviews.push({
          id: uid('rev'),
          scale: 'daily',
          date: draft.lastDay,
          mood: UI3.eveningMood,
          moodLabel: moodLabels[UI3.eveningMood] || '🌿 Спокойно',
          text: note,
          reply
        });
      }, { sound: 'soft', toast: 'Итог дня бережно сохранён 🌙' });
      UI3.eveningDraft = '';
      renderApp();
      return;
    }

    case 'switch-space': {
      const target = val === 'my' ? 'my' : 'demo';
      if (UI3.space === target) return;
      UI3.space = target;
      UI3.activeBlockId = null;
      UI3.inspectStageId = null;
      UI3.historyStack = [];
      saveMetaPrefs();
      renderApp();
      showToast(target === 'my' ? 'Открыто твоё чистое пространство «Моя жизнь» 🌱' : 'Открыт демонстрационный пример с блоком «Гитара» 🎸', false);
      return;
    }

    case 'step-demo-date': {
      if (UI3.space !== 'demo') return;
      commitMutation(draft => {
        const nextIso = shiftLocalDays(draft.lastDay, 1);
        advanceToDateV3(draft, nextIso);
      }, { autoToday: false, toast: 'Демо-дата переведена на +1 день вперёд ⏭' });
      return;
    }

    case 'set-complexity': {
      const target = val === 'basic' ? 'basic' : 'full';
      commitMutation(draft => {
        draft.complexity = target;
        if (target === 'basic') draft.basicFreeze = true;
      }, { toast: target === 'basic' ? 'Включён Базовый режим' : 'Включён Полный режим' });
      return;
    }

    case 'set-special-mode': {
      commitMutation(draft => {
        draft.specialMode = val;
        if (val === 'red' && !draft.redBlockId) {
          const firstBlk = draft.blocks.find(b => !b.archivedAt);
          if (firstBlk) draft.redBlockId = firstBlk.id;
        }
      }, { toast: val === 'pause' ? 'Включена Творческая пауза' : (val === 'red' ? 'Включена мобилизация на 1 блоке' : 'Обычный ход восстановлен') });
      return;
    }

    case 'toggle-red-care': {
      const k = btn.getAttribute('data-k');
      commitMutation(draft => {
        draft.redCare = draft.redCare || { sleep: false, water: false, rest: false };
        if (k) draft.redCare[k] = !draft.redCare[k];
      });
      return;
    }

    case 'set-theme': {
      commitMutation(draft => {
        draft.settings.theme = val;
      });
      return;
    }

    case 'toggle-setting': {
      const k = btn.getAttribute('data-k');
      commitMutation(draft => {
        if (k) draft.settings[k] = !draft.settings[k];
      });
      return;
    }

    case 'toggle-wide':
      UI3.wide = !UI3.wide;
      saveMetaPrefs();
      applyThemeAndWidth(state);
      renderApp();
      return;

    case 'export-json': {
      const payload = JSON.stringify(state, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifegame-v3-${UI3.space}-${state.lastDay}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      showToast('Резервный JSON скачан ⬇', false);
      return;
    }

    case 'confirm-import-json': {
      const raw = (document.getElementById('impTextArea')?.value || '').trim();
      if (!raw) {
        showToast('Выбери файл JSON или вставь содержимое в поле', false);
        return;
      }
      try {
        const imported = importAnyLifeGameBackup(raw);
        commitMutation(draft => {
          const snap = deepClone(draft);
          Object.keys(draft).forEach(k => delete draft[k]);
          Object.assign(draft, imported);
          draft.snapshots = Array.isArray(draft.snapshots) ? draft.snapshots : [];
          draft.snapshots.push({ id: uid('snap'), date: localTodayISO(), reason: 'before-import', backupRevision: snap.revision });
          if (draft.snapshots.length > 5) draft.snapshots.shift();
        }, { allowRecovery: true, sound: 'coin', undoable: true, toast: 'Резервная копия успешно импортирована ✓' });
        UI3.modal = null;
        renderApp();
      } catch (err) {
        showToast('Ошибка импорта: ' + (err.message || 'проверь формат JSON'), false);
      }
      return;
    }

    case 'clean-plans-keep-xp': {
      commitMutation(draft => {
        draft.items.forEach(it => {
          if (!it.archivedAt && it.kind !== 'calendar') {
            it.inDay = false;
            it.inBasic = false;
          }
        });
        draft.carryovers = [];
        draft.missed.forEach(m => { if (m.status === 'open') m.status = 'archived'; });
        draft.days[draft.lastDay] = { tempo: 'normal', mainItemId: null, includes: [], excludes: [], overrides: [] };
      }, { undoable: true, toast: 'День очищен без потери опыта, монет и достижений 🌱' });
      return;
    }

    case 'confirm-hard-reset': {
      const word = (document.getElementById('resetWordInput')?.value || '').trim();
      if (word !== 'СБРОС') {
        showToast('Введи слово СБРОС заглавными буквами для подтверждения', false);
        return;
      }
      const fresh = UI3.space === 'my' ? buildCleanStateV3(localTodayISO()) : buildDemoStateV3(localTodayISO());
      commitMutation(draft => {
        Object.keys(draft).forEach(k => delete draft[k]);
        Object.assign(draft, fresh);
      }, { allowRecovery: true, toast: 'Пространство сброшено к начальному состоянию' });
      UI3.modal = null;
      UI3.route = 'home';
      renderApp();
      return;
    }

    case 'save-motivation': {
      const txt = (document.getElementById('motField')?.value || '').trim();
      commitMutation(draft => {
        draft.settings.motivationText = txt;
      }, { toast: 'Личная фраза опоры сохранена' });
      UI3.modal = null;
      renderApp();
      return;
    }

    case 'copy-ai-context': {
      copyTextSafe(buildAiContextText(state));
      return;
    }

    case 'fill-sample-ai': {
      const firstBlk = state.blocks.find(b => !b.archivedAt);
      UI3.aiDraft = JSON.stringify({
        proposals: [
          { title: '10 минут спокойного разбора главной задачи этапа', blockId: firstBlk ? firstBlk.id : 'b_know', kind: 'habit' }
        ]
      }, null, 2);
      renderApp();
      return;
    }

    case 'apply-ai-json': {
      syncDraftInputsFromDOM();
      const raw = (UI3.aiDraft || '').trim();
      if (!raw) {
        showToast('Вставь JSON с предложениями или нажми «Пример JSON»', false);
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed.proposals) ? parsed.proposals : (Array.isArray(parsed) ? parsed : []);
        if (!list.length) throw new Error('Список proposals пуст.');
        commitMutation(draft => {
          draft.snapshots.push({ id: uid('snap'), date: draft.lastDay, reason: 'before-ai-apply' });
          if (draft.snapshots.length > 5) draft.snapshots.shift();
          list.forEach(p => {
            if (!p || !p.title) return;
            const blk = p.blockId ? draft.blocks.find(b => b.id === p.blockId && !b.archivedAt) : null;
            draft.items.push({
              id: uid('it_ai'),
              kind: p.kind === 'habit' ? 'habit' : 'task',
              title: String(p.title).slice(0, 120),
              description: '',
              blockId: blk ? blk.id : null,
              stageId: blk ? blk.currentStageId : null,
              goalId: null,
              schedule: { type: p.kind === 'habit' ? 'daily' : 'once', days: [], date: null },
              dailyTarget: 1,
              inDay: true,
              inBasic: false,
              isKey: false,
              load: 'normal',
              reward: 15,
              ifTrigger: '',
              ifAction: '',
              status: 'active',
              cycle: 1,
              createdAt: draft.lastDay,
              archivedAt: null
            });
          });
        }, { sound: 'coin', undoable: true, toast: `Добавлено шагов от ИИ: ${list.length} (создан страховочный снимок)` });
        UI3.aiDraft = '';
        renderApp();
      } catch (e) {
        showToast('Не удалось разобрать JSON предложений ИИ.', false);
      }
      return;
    }

    case 'switch-to-basic-welcome': {
      UI3.modal = null;
      commitMutation(draft => {
        draft.complexity = 'basic';
        draft.basicFreeze = true;
      }, { toast: 'Включён бережный Базовый ритм 🌱' });
      return;
    }
  }
}

function handleChange(chg, el) {
  switch (chg) {
    case 'qc-pick-date':
      syncDraftInputsFromDOM();
      UI3.quickForm.date = el.value;
      UI3.quickForm.when = el.value ? 'date' : 'later';
      renderApp();
      return;

    case 'qc-pick-block':
      syncDraftInputsFromDOM();
      UI3.quickForm.blockId = el.value;
      return;

    case 'move-quick-to-block': {
      const itemId = el.getAttribute('data-id');
      const blkId = el.value;
      if (!itemId || !blkId) return;
      commitMutation(draft => {
        const it = draft.items.find(i => i.id === itemId);
        const blk = draft.blocks.find(b => b.id === blkId);
        if (it && blk) {
          it.blockId = blk.id;
          it.stageId = blk.currentStageId;
        }
      }, { sound: 'soft', undoable: true, toast: 'Дело перенесено в выбранный Блок времени' });
      return;
    }

    case 'pick-main-day-item': {
      const chosen = el.value || null;
      commitMutation(draft => {
        const dRec = ensureDayObj(draft, draft.lastDay);
        dRec.mainItemId = chosen;
      }, { toast: chosen ? 'Выбрано Главное дело дня ☀' : 'Главное дело снято' });
      return;
    }

    case 'ie-toggle-inday':
      syncDraftInputsFromDOM();
      UI3.itemForm.inDay = !!el.checked;
      return;

    case 'ie-toggle-key':
      syncDraftInputsFromDOM();
      // Инвариант #4: переключение «Ключевое» НЕ меняет галочку «В Конструктор дня» насильно!
      UI3.itemForm.isKey = !!el.checked;
      return;

    case 'ie-change-block': {
      syncDraftInputsFromDOM();
      const bId = el.value;
      UI3.itemForm.blockId = bId;
      if (bId) {
        const b = getState().blocks.find(x => x.id === bId);
        UI3.itemForm.stageId = b ? b.currentStageId : '';
      } else {
        UI3.itemForm.stageId = '';
      }
      UI3.itemForm.goalId = '';
      renderApp();
      return;
    }

    case 'ie-change-stage':
      syncDraftInputsFromDOM();
      UI3.itemForm.stageId = el.value;
      UI3.itemForm.goalId = '';
      renderApp();
      return;

    case 'set-red-block':
      commitMutation(draft => {
        draft.redBlockId = el.value;
      }, { toast: 'Приоритетный блок мобилизации обновлён' });
      return;

    case 'toggle-ai-consent':
      syncDraftInputsFromDOM();
      UI3.aiConsent = !!el.checked;
      renderApp();
      return;

    case 'import-file-pick': {
      const file = el.files && el.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const ta = document.getElementById('impTextArea');
        if (ta) ta.value = String(reader.result || '');
      };
      reader.readAsText(file);
      return;
    }
  }
}

// ============================================================================
// ЖИЗНЕННЫЙ ЦИКЛ, ЖИВОЙ ТИК ТАЙМЕРА И СИНХРОНИЗАЦИЯ ВКЛАДОК БРАУЗЕРА
// ============================================================================
let lg3IntervalId = null;

function startLiveTimerLoop() {
  if (lg3IntervalId) clearInterval(lg3IntervalId);
  lg3IntervalId = setInterval(() => {
    const state = getState();
    if (!state || !state.focusTimer || state.focusTimer.status !== 'running') return;
    const ft = state.focusTimer;
    ft.elapsedSec = (Number(ft.elapsedSec) || 0) + 1;
    const targetSec = (Number(ft.targetMin) || 15) * 60;

    const miniEl = document.getElementById('miniTimerClock');
    if (miniEl) miniEl.textContent = formatTimerClock(ft);
    const fullEl = document.getElementById('fullTimerClock');
    if (fullEl) fullEl.textContent = formatTimerClock(ft);

    if (ft.elapsedSec >= targetSec) {
      commitMutation(draft => {
        if (draft.focusTimer) {
          draft.focusTimer.elapsedSec = targetSec;
          draft.focusTimer.status = 'paused';
        }
      }, { sound: 'coin' });
      UI3.modal = { name: 'confirm-timer-mins' };
      renderApp();
    }
  }, 1000);
}

function initLifeGameV3() {
  loadMetaPrefs();
  LG3_STATES.my = loadSpaceSafe(LG3_KEYS.my, buildCleanStateV3);
  LG3_STATES.demo = loadSpaceSafe(LG3_KEYS.demo, buildDemoStateV3);

  // Мягкая проверка смены календарной даты в пространстве «Моя жизнь» (Мост спокойного возвращения!)
  const realToday = localTodayISO();
  if (LG3_STATES.my.lastDay < realToday) {
    const gap = daysBetweenISO(LG3_STATES.my.lastDay, realToday);
    const res = transactV3(LG3_KEYS.my, LG3_STATES.my, draft => {
      advanceToDateV3(draft, realToday);
    }, { autoToday: false });
    if (res.ok) {
      LG3_STATES.my = res.state;
      if (gap >= 3 && UI3.space === 'my') {
        UI3.modal = { name: 'return-bridge' };
      }
    }
  }

  // Делегирование кликов, изменений и поиска
  document.addEventListener('click', (ev) => {
    const target = ev.target.closest('[data-act]');
    if (!target) return;
    handleAction(target.getAttribute('data-act'), target, ev);
  });

  document.addEventListener('change', (ev) => {
    const target = ev.target.closest('[data-change]');
    if (!target) return;
    handleChange(target.getAttribute('data-change'), target);
  });

  document.addEventListener('input', (ev) => {
    const target = ev.target.closest('[data-input]');
    if (!target) return;
    if (target.getAttribute('data-input') === 'lg3-search') {
      const pos = target.selectionStart || 0;
      UI3.searchText = target.value;
      renderApp();
      const restored = document.getElementById('lg3SearchField');
      if (restored) {
        restored.focus();
        try { restored.setSelectionRange(pos, pos); } catch (e) {}
      }
    }
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && ev.target && ev.target.id === 'qcTitleInput') {
      ev.preventDefault();
      const btn = document.querySelector('[data-act="qc-submit"]');
      if (btn) handleAction('qc-submit', btn, ev);
    } else if (ev.key === 'Escape' && UI3.modal) {
      UI3.modal = null;
      renderApp();
    }
  });

  // Синхронизация между открытыми вкладками браузера (Инвариант #2)
  window.addEventListener('storage', (ev) => {
    if (ev.key === LG3_KEYS.my) {
      LG3_STATES.my = loadSpaceSafe(LG3_KEYS.my, buildCleanStateV3);
      if (UI3.space === 'my') renderApp();
    } else if (ev.key === LG3_KEYS.demo) {
      LG3_STATES.demo = loadSpaceSafe(LG3_KEYS.demo, buildDemoStateV3);
      if (UI3.space === 'demo') renderApp();
    }
  });

  renderApp();
  startLiveTimerLoop();
}

window.addEventListener('DOMContentLoaded', initLifeGameV3);
