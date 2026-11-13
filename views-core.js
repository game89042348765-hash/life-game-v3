// LifeGame 3.0 — Главные экраны первой версии: Главная, Быстрое добавление, Конструктор дня, Блоки времени и Этапы

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function get7DayDots(state, itemId) {
  const wds = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const iso = shiftLocalDays(state.lastDay, -i);
    const done = state.events.some(e => e.active && e.entityId === itemId && e.date === iso);
    const mins = state.timeSessions
      .filter(ts => ts.itemId === itemId && ts.date === iso)
      .reduce((s, ts) => s + (Number(ts.minutes) || 0), 0);
    out.push({
      iso,
      wd: wds[localWeekday(iso)],
      isToday: i === 0,
      done,
      mins,
      cls: done ? 'done' : (mins > 0 ? 'mins' : '')
    });
  }
  return out;
}

function renderActionRow(state, item, opts) {
  opts = opts || {};
  const prog = getItemProgressOnDate(state, item, state.lastDay);
  const dayRec = ensureDayObj(state, state.lastDay);
  const isMain = dayRec.mainItemId === item.id;
  const blk = item.blockId ? state.blocks.find(b => b.id === item.blockId) : null;
  const goal = item.goalId ? state.goals.find(g => g.id === item.goalId) : null;
  const dots = opts.showDots !== false ? get7DayDots(state, item.id) : [];

  const tickCls = prog.done ? 'done' : (prog.units > 0 ? 'partial' : '');
  const tickLabel = prog.done ? '✓' : (item.kind === 'habit' && prog.target > 1 ? `${prog.units}/${prog.target}` : '');

  return `
    <div class="item-row ${isMain ? 'is-main-day' : ''}">
      <button type="button" class="tick-btn ${tickCls}" data-act="toggle-item" data-id="${esc(item.id)}" aria-label="Отметить выполнение">
        ${tickLabel}
      </button>

      <div class="item-mid">
        <div class="item-name ${prog.done ? 'done' : ''}">
          ${isMain ? '<span style="color:var(--accent); font-weight:800; margin-right:5px;">☀ Главное:</span>' : (item.isKey ? '<span style="color:var(--accent); margin-right:4px;">★</span>' : '')}${esc(item.title)}
        </div>

        <div class="item-sub">
          ${blk && !opts.hideBlock ? `<span style="color:${esc(blk.color)}; font-weight:600;">${esc(blk.icon)} ${esc(blk.name)}</span>` : ''}
          ${item.kind === 'calendar' && item.schedule?.time ? `<span style="color:var(--accent);">🕒 ${esc(item.schedule.time)}</span>` : ''}
          ${item.schedule?.date && item.kind !== 'habit' ? `<span>📅 ${humanDateShort(item.schedule.date)}</span>` : ''}
          ${item.reward > 0 ? `<span>+${item.reward} ●</span>` : '<span>без монет</span>'}
          ${prog.mins > 0 ? `<span style="color:var(--amber); font-weight:650;">⏱ ${prog.mins} мин сегодня</span>` : ''}
          ${goal ? `<span style="color:var(--good);">🎯 к цели</span>` : ''}
        </div>

        ${(item.ifTrigger && item.ifAction && !prog.done) ? `
          <div style="font-size:11.5px; color:var(--muted); margin-top:4px;">
            💡 <em>Если ${esc(item.ifTrigger.toLowerCase())} → ${esc(item.ifAction)}</em>
          </div>
        ` : ''}

        ${dots.length ? `
          <div class="effort-dots">
            ${dots.map(d => `<span class="e-dot ${d.cls} ${d.isToday ? 'today' : ''}">${d.wd}${d.done ? '✓' : (d.mins > 0 ? '·' + d.mins + 'м' : '')}</span>`).join('')}
          </div>
        ` : ''}
      </div>

      <div style="display:flex; align-items:center; gap:5px; flex-shrink:0;">
        ${!prog.done ? `<button type="button" class="mini-btn" data-act="open-focus-for" data-id="${esc(item.id)}" title="Запустить подход 5/15/25 мин или записать время">⏱</button>` : ''}
        <button type="button" class="mini-btn" data-act="open-item-editor" data-id="${esc(item.id)}" title="Настроить дело">⋯</button>
      </div>
    </div>
  `;
}

// ============================================================================
function getNextOnboardingIdx(state) {
  const c = state.companion || { done: {}, skipped: {} };
  for (let i = 0; i < LG3_ONBOARDING_7_DAYS.length; i++) {
    if (!c.done[i] && !c.skipped[i]) return i;
  }
  return -1;
}

function renderHomeOnboardingCard(state) {
  const c = state.companion;
  if (!c || c.enabled === false || c.homeMinimized) return '';
  const nextIdx = getNextOnboardingIdx(state);
  if (nextIdx < 0) return '';
  const stepObj = LG3_ONBOARDING_7_DAYS[nextIdx];
  const arch = getCompanionArchetype(c.archetype);
  const w = calcWallet(state);
  const posture = resolveCompanionPosture(state, window.UI3 ? window.UI3.previewPosture : null);
  const miniSvg = LG3CompanionAvatar.renderStaticPreviewSVG(arch.id, posture, w.level, countRedCareDone(state));
  return `
    <div class="card" style="border-color:var(--accent-border); background:linear-gradient(145deg, var(--accent-soft), var(--card) 68%); display:flex; flex-direction:column; gap:8px;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <span style="font-size:11px; font-weight:800; color:var(--accent); letter-spacing:0.08em; text-transform:uppercase; display:inline-flex; align-items:center; gap:6px;">
          ${LG3_COMPANION_ICON} ${esc(arch.name)} · ДЕНЬ ${stepObj.step} ИЗ 7
        </span>
        <button type="button" class="mini-btn" data-act="minimize-home-helper" title="Свернуть подсказку в шапку">Свернуть</button>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <div style="flex-shrink:0;">${miniSvg}</div>
        <div style="min-width:0;">
          <div style="font-size:14.5px; font-weight:750; line-height:1.26;">${esc(stepObj.title)}</div>
          <div style="font-size:12px; color:var(--accent); margin-top:2px;">«${esc(arch.voices[posture] || arch.voices.pro)}»</div>
        </div>
      </div>
      <div style="font-size:12.5px; color:var(--muted); line-height:1.42;">${esc(stepObj.body)}</div>
      ${nextIdx === 0 ? `
        <div class="pills" style="gap:5px;">
          ${LG3_COMPANION_ARCHETYPES.map(a => `
            <button type="button" class="pill ${arch.id === a.id ? 'active' : ''}" style="font-size:11.5px; padding:4px 9px;" data-act="set-companion-archetype" data-val="${esc(a.id)}">${esc(a.name)}</button>
          `).join('')}
        </div>
      ` : ''}
      <div style="display:flex; gap:7px; flex-wrap:wrap; margin-top:2px;">
        ${nextIdx === 0
          ? `<button type="button" class="pill active" data-act="open-helper">Примерить 3 режима →</button>`
          : `<button type="button" class="pill active" data-act="helper-go-step" data-idx="${nextIdx}">${esc(stepObj.actionLabel)} →</button>`}
        <button type="button" class="mini-btn" data-act="helper-mark-step" data-idx="${nextIdx}" data-how="done">✓ Уже знакомо</button>
        <button type="button" class="mini-btn" data-act="open-helper">Все подсказки</button>
      </div>
    </div>
  `;
}

// 1. ГЛАВНАЯ (В духе самой первой версии: воздух, карточки-входы, без перегруза)
// ============================================================================
function renderHomeView(state) {
  const w = calcWallet(state);
  const isBasic = state.complexity === 'basic';
  const plan = assembleDayPlan(state, state.lastDay);
  const doneTodayCount = plan.visible.filter(x => x.prog.done).length;
  const liveBlocks = state.blocks.filter(b => !b.archivedAt);
  const quickCount = state.items.filter(i => !i.archivedAt && !i.blockId && !isOneOffEverDoneInCurrentCycle(state, i)).length;
  const calToday = state.items.filter(i => !i.archivedAt && i.kind === 'calendar' && isScheduledOnDate(i, state.lastDay));
  const targetBonus = state.bonuses.find(b => !b.archivedAt && b.id === state.rewardTargetId) || state.bonuses.find(b => !b.archivedAt);
  const readyInstances = state.instances.filter(ins => !ins.refundedAt && ins.uses < (ins.limit || 999999)).length;

  const tempoLabels = { rest: 'Отдыхаю', normal: 'Обычный', intense: 'Фигачу' };

  return `
    <div class="page-wrap">
      <div class="hero-banner ${state.settings.compactHero ? 'compact' : ''}" style="background-image: linear-gradient(180deg, rgba(12,12,12,0.08) 0%, rgba(12,12,12,0.58) 54%, rgba(12,12,12,0.92) 100%), url('${LG3_HERO_URI}');">
        <div class="hero-kicker">${isBasic ? 'БАЗОВЫЙ РИТМ · ПРОСТОЙ ВХОД' : 'ТВОЯ ИГРА · ТВОЙ ПУТЬ'}</div>
        <h1 class="hero-h1">Больше жизни.<br>В каждом дне.</h1>
        <p class="hero-sub">${isBasic ? 'Спокойные шаги сегодня и личные награды — без лишней сложности.' : 'От жизненного смысла и этапов — к простому действию сегодня.'}</p>
      </div>

      ${state.settings.showMotivation ? `
        <div class="mot-quote" data-act="open-modal" data-modal="motivation" title="Нажми, чтобы изменить свою фразу опоры">
          ${esc(state.settings.motivationText || 'Ради чего ты действуешь? Напиши свою опору — или скрой в настройках.')}
        </div>
      ` : ''}

      ${renderHomeOnboardingCard(state)}

      <div class="lv-wrap">
        <div class="lv-row">
          <span class="lv-title">УРОВЕНЬ ${w.level}</span>
          <span style="color:var(--muted);">${w.into} / ${w.span} XP</span>
        </div>
        <div class="lv-track"><div class="lv-fill" style="width:${w.pct}%;"></div></div>
      </div>

      <div class="grid-2">
        <button type="button" class="stat-tile" data-act="go" data-route="bonuses">
          <div class="stat-kicker"><span>МОНЕТЫ</span><span>●</span></div>
          <div>
            <div class="stat-num" style="${w.coins < 0 ? 'color:var(--danger);' : ''}">${w.coins}</div>
            <div class="stat-note">${readyInstances > 0 ? `Готовых наград: ${readyInstances}` : 'Честный игровой счёт'}</div>
          </div>
        </button>

        <button type="button" class="stat-tile" data-act="go" data-route="bonuses">
          <div class="stat-kicker"><span>МОЯ НАГРАДА</span><span style="color:var(--accent);">✦</span></div>
          <div>
            <div style="font-size:14px; font-weight:750; margin-top:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${esc(targetBonus ? targetBonus.title : 'Выбрать цель')}
            </div>
            <div class="stat-note">
              ${targetBonus ? (w.coins >= targetBonus.cost ? `Доступно! (${w.coins}/${targetBonus.cost} ●)` : `Накоплено ${w.coins} из ${targetBonus.cost} ●`) : 'В магазине бонусов'}
            </div>
          </div>
        </button>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; padding-top:2px;">
        <span style="font-size:11.5px; font-weight:750; letter-spacing:0.12em; color:var(--muted); text-transform:uppercase;">СЕГОДНЯ — ${humanDateShort(state.lastDay)}</span>
        ${state.carryovers.length > 0 && !isBasic ? `<span style="font-size:11.5px; color:var(--accent);">Со вчера: ${state.carryovers.length}</span>` : ''}
      </div>

      <!-- 1. Золотая карточка Конструктора дня -->
      <button type="button" class="hub-card primary" data-act="go" data-route="day">
        <div class="hub-icon">${LG3_ICONS.day}</div>
        <div class="hub-body">
          <div class="hub-title">${isBasic ? 'Мой ритм сегодня' : 'Конструктор дня'}</div>
          <div class="hub-sub">Выполнено ${doneTodayCount} из ${plan.visible.length} · темп «${tempoLabels[plan.tempo] || 'Обычный'}»</div>
        </div>
        <span class="hub-chev">›</span>
      </button>

      ${isBasic ? `
        <!-- В Базовом режиме: Быстрое добавление + Бонусы прямо под рукой, без сложной стратегии -->
        <button type="button" class="hub-card quick-accent" data-act="go" data-route="quick">
          <div class="hub-icon">⚡</div>
          <div class="hub-body">
            <div class="hub-title">Быстрое добавление</div>
            <div class="hub-sub">${quickCount > 0 ? `Записано дел: ${quickCount} · без привязки к стратегии` : 'Записать мысль или дело за 3 секунды'}</div>
          </div>
          <span class="hub-chev">›</span>
        </button>

        <button type="button" class="hub-card" data-act="go" data-route="bonuses">
          <div class="hub-icon">${LG3_ICONS.bonuses}</div>
          <div class="hub-body">
            <div class="hub-title">Бонусы и вознаграждения</div>
            <div class="hub-sub">Магазин личных радостей и мои полученные награды (${readyInstances})</div>
          </div>
          <span class="hub-chev">›</span>
        </button>

        <div class="grid-2">
          <button type="button" class="small-tile" data-act="go" data-route="calendar">
            <span style="font-size:18px;">📅</span>
            <div><div class="small-tile-title">Календарь</div><div class="small-tile-sub">${calToday.length ? `Сегодня: ${calToday.length}` : 'Точные даты'}</div></div>
          </button>
          <button type="button" class="small-tile" data-act="go" data-route="evening">
            <span style="font-size:18px;">🌙</span>
            <div><div class="small-tile-title">Тихий вечер</div><div class="small-tile-sub">Короткий итог дня</div></div>
          </button>
          <button type="button" class="small-tile" data-act="go" data-route="treats">
            <span style="font-size:18px;">☕</span>
            <div><div class="small-tile-title">Ништяки</div><div class="small-tile-sub">Бесплатные радости</div></div>
          </button>
          <button type="button" class="small-tile" data-act="go" data-route="settings">
            <span style="font-size:18px;">⚙</span>
            <div><div class="small-tile-title">Настройки</div><div class="small-tile-sub">Режимы и копия</div></div>
          </button>
        </div>
      ` : `
        <!-- В Полном режиме: Блоки времени и Этапы — прямо под Конструктором дня! -->
        <button type="button" class="hub-card quick-accent" data-act="go" data-route="blocks">
          <div class="hub-icon">${LG3_ICONS.blocks}</div>
          <div class="hub-body">
            <div class="hub-title">Блоки времени и этапы</div>
            <div class="hub-sub">${liveBlocks.length} направлений жизни · смыслы, цели и шаги</div>
          </div>
          <span class="hub-chev">›</span>
        </button>

        <button type="button" class="hub-card" data-act="go" data-route="calendar">
          <div class="hub-icon">${LG3_ICONS.cal}</div>
          <div class="hub-body">
            <div class="hub-title">Календарь</div>
            <div class="hub-sub">${calToday.length ? `Сегодня встреч: ${calToday.length}` : 'Даты, повторы и Принятые решения'}</div>
          </div>
          <span class="hub-chev">›</span>
        </button>

        <div class="grid-2">
          <button type="button" class="small-tile" data-act="go" data-route="quick">
            <span style="font-size:19px; color:var(--accent);">⚡</span>
            <div><div class="small-tile-title">Быстрое добавление</div><div class="small-tile-sub">${quickCount ? `В очереди: ${quickCount}` : 'Запись в 1 касание'}</div></div>
          </button>
          <button type="button" class="small-tile" data-act="go" data-route="widgets">
            <span style="font-size:19px;">⏱</span>
            <div><div class="small-tile-title">Мои виджеты</div><div class="small-tile-sub">Таймер · 2 мин · Счастье</div></div>
          </button>
          <button type="button" class="small-tile" data-act="go" data-route="evening">
            <span style="font-size:19px;">🌙</span>
            <div><div class="small-tile-title">Итоги и пересмотр</div><div class="small-tile-sub">Вечер и обзор недели</div></div>
          </button>
          <button type="button" class="small-tile" data-act="go" data-route="settings">
            <span style="font-size:19px;">⚙</span>
            <div><div class="small-tile-title">Настройки и ИИ</div><div class="small-tile-sub">${UI3.space === 'demo' ? 'Пример · Моя жизнь' : 'Темы · LifeGame AI'}</div></div>
          </button>
        </div>
      `}
    </div>
  `;
}

// ============================================================================
// 2. БЫСТРОЕ ДОБАВЛЕНИЕ (Точная механика первой версии: Название, ☀ Сегодня, 📅 Выбрать, Награда 25/0, Блок можно позже)
// ============================================================================
function renderQuickCaptureView(state) {
  const qf = UI3.quickForm;
  const liveBlocks = state.blocks.filter(b => !b.archivedAt);
  const unassigned = state.items.filter(i => !i.archivedAt && !i.blockId && !isOneOffEverDoneInCurrentCycle(state, i));
  const dayRec = ensureDayObj(state, state.lastDay);

  return `
    <div class="page-wrap">
      <div>
        <h1 style="margin:0; font-size:22px; font-weight:800;">⚡ Быстрое добавление</h1>
        <div style="font-size:12.5px; color:var(--muted); margin-top:3px;">Запиши дело или мысль за пару секунд — распределить по блокам можно позже.</div>
      </div>

      <div class="card" style="display:flex; flex-direction:column; gap:11px; border-color:var(--accent-border);">
        <input id="qcTitleInput" class="field" maxlength="120" placeholder="Что нужно сделать или не забыть?..." value="${esc(qf.title)}"/>

        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          <button type="button" class="pill ${qf.when === 'today' ? 'active' : ''}" data-act="qc-toggle-today">☀ Сегодня</button>
          <label class="pill ${qf.when === 'date' ? 'active' : ''}" style="cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
            <span>📅 ${qf.when === 'date' && qf.date ? humanDateShort(qf.date) : 'Выбрать дату'}</span>
            <input type="date" style="position:absolute; opacity:0; width:1px; height:1px;" value="${esc(qf.date || state.lastDay)}" data-change="qc-pick-date"/>
          </label>
          ${qf.when !== 'later' ? `<button type="button" class="mini-btn" data-act="qc-clear-when">Без даты</button>` : ''}
        </div>

        <select id="qcBlockSelect" class="field" data-change="qc-pick-block">
          <option value="">Выбрать блок — можно позже</option>
          ${liveBlocks.map(b => `<option value="${esc(b.id)}" ${qf.blockId === b.id ? 'selected' : ''}>${esc(b.icon)} ${esc(b.name)}</option>`).join('')}
        </select>

        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding-top:2px;">
          <span style="font-size:12px; color:var(--muted);">
            ${qf.when === 'today' ? 'Попадёт сразу в сегодняшний день' : (qf.when === 'date' ? 'Запишется в календарь на ' + qf.date : 'Без даты · останется в очереди')}
          </span>
          <button type="button" class="pill ${qf.rewardOn ? 'active' : ''}" data-act="qc-toggle-reward">
            ${qf.rewardOn ? 'Награда: +25 ●' : 'Без награды (0 ●)'}
          </button>
        </div>

        <button type="button" class="btn-primary" style="width:100%;" data-act="qc-submit">+ Добавить</button>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:11.5px; font-weight:750; letter-spacing:0.1em; color:var(--muted); text-transform:uppercase;">ДЕЛА БЕЗ БЛОКА (${unassigned.length})</span>
      </div>

      ${unassigned.length === 0 ? `
        <div class="card" style="text-align:center; color:var(--muted); font-size:13px; padding:22px;">
          Все быстрые записи разобраны или выполнены.
        </div>
      ` : `
        <div style="display:flex; flex-direction:column; gap:9px;">
          ${unassigned.map(it => {
            const inToday = dayRec.includes.includes(it.id) || it.inDay;
            return `
              <div class="card" style="display:flex; flex-direction:column; gap:9px;">
                ${renderActionRow(state, it, { showDots: false, hideBlock: true })}
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding-top:6px; border-top:1px solid var(--border);">
                  <button type="button" class="pill ${inToday ? 'active' : ''}" data-act="toggle-item-today" data-id="${esc(it.id)}">
                    ${inToday ? '☀ На сегодня (вкл)' : '☀ Взять на сегодня'}
                  </button>
                  <select class="field" style="width:auto; padding:5px 10px; font-size:12px;" data-change="move-quick-to-block" data-id="${esc(it.id)}">
                    <option value="">Перенести в блок →</option>
                    ${liveBlocks.map(b => `<option value="${esc(b.id)}">${esc(b.icon)} ${esc(b.name)}</option>`).join('')}
                  </select>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}

// ============================================================================
// 3. КОНСТРУКТОР ДНЯ (Три темпа с правилом R2, «Со вчера», «Главное сегодня», активные квесты и компактные строки)
// ============================================================================
function renderDayConstructorView(state) {
  const isBasic = state.complexity === 'basic';
  const plan = assembleDayPlan(state, state.lastDay);
  const activeRows = plan.visible.filter(x => !x.prog.done);
  const doneRows = plan.visible.filter(x => x.prog.done);
  const activeQuests = isBasic ? [] : state.quests.filter(q => !q.archivedAt && q.status === 'active' && q.inDay);
  const mainItem = state.items.find(i => i.id === plan.dayRec.mainItemId);

  return `
    <div class="page-wrap">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
        <div>
          <h1 style="margin:0; font-size:22px; font-weight:800;">${isBasic ? 'Мой ритм сегодня' : 'Конструктор дня'}</h1>
          <div style="font-size:12.5px; color:var(--muted); margin-top:2px;">${humanDateWithWeekday(state.lastDay)}</div>
        </div>
        <button type="button" class="btn-primary" style="padding:8px 13px; font-size:12.5px;" data-act="open-item-editor" data-id="">+ Дело</button>
      </div>

      ${state.basicFreeze && !isBasic ? `
        <div class="card-2" style="border-color:var(--accent-border); display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
          <span style="font-size:12.5px;">🛡 Пауза базового режима сохранена: просмотр Полного режима не включает старые планы сам.</span>
          <button type="button" class="pill active" data-act="resume-from-basic">Возобновить все планы</button>
        </div>
      ` : ''}

      <!-- Переключатель темпа дня (правило отдыха R2!) -->
      <div class="pills">
        ${[['rest','🌿 Отдыхаю'],['normal','⚖ Обычный день'],['intense','🔥 Фигачу']].map(([id, lbl]) => `
          <button type="button" class="pill ${plan.tempo === id ? 'active' : ''}" data-act="set-day-tempo" data-val="${id}">${lbl}</button>
        `).join('')}
      </div>

      <!-- Мягкий разбор «Со вчера» (carryovers из первой версии / Claude Lite!) -->
      ${state.carryovers.length > 0 ? `
        <div class="card" style="border-color:var(--accent-border); display:flex; flex-direction:column; gap:8px;">
          <div style="font-size:12px; font-weight:750; color:var(--accent);">СО ВЧЕРА (${state.carryovers.length}) — без штрафа, реши как поступить:</div>
          ${state.carryovers.map(co => `
            <div class="card-2" style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="font-size:13.5px; font-weight:600;">${esc(co.title)}</span>
              <div style="display:flex; gap:5px;">
                <button type="button" class="pill active" data-act="resolve-carryover" data-id="${esc(co.id)}" data-how="today">В сегодня</button>
                <button type="button" class="mini-btn" data-act="resolve-carryover" data-id="${esc(co.id)}" data-how="later">Позже</button>
                <button type="button" class="mini-btn" data-act="resolve-carryover" data-id="${esc(co.id)}" data-how="archive">В архив</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Главное дело дня (с быстрым стартом подхода 5/15/25 минут!) -->
      ${!isBasic && activeRows.length > 0 ? `
        <div class="card-2" style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
          <div style="font-size:12.5px;">
            <span style="color:var(--accent); font-weight:750;">☀ Главное сегодня:</span>
            <span style="margin-left:4px;">${mainItem ? esc(mainItem.title) : 'выбери одну главную опору дня'}</span>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            ${mainItem ? `<button type="button" class="mini-btn" style="color:var(--accent); border-color:var(--accent-border);" data-act="open-focus-for" data-id="${esc(mainItem.id)}">▶ Подход</button>` : ''}
            <select class="field" style="width:auto; padding:4px 8px; font-size:12px;" data-change="pick-main-day-item">
              <option value="">— Выбрать —</option>
              ${activeRows.map(r => `<option value="${esc(r.item.id)}" ${plan.dayRec.mainItemId === r.item.id ? 'selected' : ''}>${esc(r.item.title.slice(0, 34))}</option>`).join('')}
            </select>
          </div>
        </div>
      ` : ''}

      <!-- Активные дела дня -->
      ${activeRows.length === 0 ? `
        <div class="card" style="text-align:center; padding:26px 18px;">
          <div style="font-size:15.5px; font-weight:750;">На сегодня открытых обязательств нет ✨</div>
          <div style="font-size:12.5px; color:var(--muted); margin-top:5px;">
            ${plan.tempo === 'rest' ? 'Включён бережный режим «Отдыхаю» — все обычные дела сняты с ожидания без пропусков.' : 'Можно спокойно отдыхать или взять дело из Блоков / Быстрого добавления.'}
          </div>
        </div>
      ` : `
        <div style="display:flex; flex-direction:column; gap:9px;">
          ${activeRows.map(r => renderActionRow(state, r.item)).join('')}
        </div>
      `}

      <!-- Выбранные квесты в дне (компактно) -->
      ${activeQuests.length > 0 ? `
        <div style="font-size:11.5px; font-weight:750; letter-spacing:0.1em; color:var(--muted); text-transform:uppercase; padding-top:4px;">КВЕСТЫ В ФОКУСЕ (${activeQuests.length})</div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${activeQuests.map(q => `
            <div class="card-2" style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
              <div>
                <div style="font-size:14px; font-weight:650;">💎 ${esc(q.title)}</div>
                <div style="font-size:11.5px; color:var(--muted);">${q.qtype === 'counter' ? `Счётчик: ${q.progress} / ${q.target}` : `Шагов: ${q.steps.filter(s=>s.done).length} / ${q.steps.length}`} · финал +${q.finalReward} ●</div>
              </div>
              <button type="button" class="pill active" data-act="go" data-route="quests">Открыть</button>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${(plan.nextConveyorOffers && plan.nextConveyorOffers.length > 0) ? `
        <div class="card-2" style="border-color:var(--accent-border); display:flex; flex-direction:column; gap:7px;">
          <div style="font-size:11.5px; font-weight:750; color:var(--good);">✓ Шаг очереди этапа на сегодня выполнен — следующий запланирован на завтра:</div>
          ${plan.nextConveyorOffers.map(off => `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="font-size:12.5px; color:var(--muted);">Далее в «${esc(off.stageName)}»: <strong style="color:var(--text);">${esc(off.item.title)}</strong></span>
              <button type="button" class="mini-btn" style="color:var(--accent); border-color:var(--accent-border);" data-act="show-hidden-today" data-id="${esc(off.item.id)}">+ Взять уже сегодня</button>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Свёрнутое Выполнено сегодня -->
      ${doneRows.length > 0 ? `
        <details class="card-2" ${doneRows.length <= 3 ? 'open' : ''}>
          <summary style="cursor:pointer; font-size:12px; font-weight:750; color:var(--good);">✓ ВЫПОЛНЕНО СЕГОДНЯ (${doneRows.length})</summary>
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
            ${doneRows.map(r => renderActionRow(state, r.item, { showDots: false })).join('')}
          </div>
        </details>
      ` : ''}

      <!-- Прозрачный список «Скрыто сегодня» с причиной и кнопкой Показать сегодня -->
      ${plan.hidden.length > 0 ? `
        <details class="card-2">
          <summary style="cursor:pointer; font-size:12px; color:var(--muted);">Скрыто сегодня по темпу или паузе (${plan.hidden.length})</summary>
          <div style="display:flex; flex-direction:column; gap:7px; margin-top:10px;">
            ${plan.hidden.map(h => `
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:12.5px;">
                <div>
                  <div>${esc(h.item.title)}</div>
                  <div style="font-size:11px; color:var(--muted);">${esc(h.reason)}</div>
                </div>
                <button type="button" class="mini-btn" data-act="show-hidden-today" data-id="${esc(h.item.id)}">Показать сегодня</button>
              </div>
            `).join('')}
          </div>
        </details>
      ` : ''}
    </div>
  `;
}

// ============================================================================
// 4. БЛОКИ ВРЕМЕНИ И ЭТАПЫ (Сердце LifeGame 3.0 в духе самой первой версии + тихая кнопка Карты-дополнения!)
// ============================================================================
function renderBlocksListView(state) {
  const liveBlocks = state.blocks.filter(b => !b.archivedAt).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const quickItems = state.items.filter(i => !i.archivedAt && !i.blockId && !isOneOffEverDoneInCurrentCycle(state, i));
  const dayRec = ensureDayObj(state, state.lastDay);
  const quickToday = quickItems.filter(i => i.inDay || dayRec.includes.includes(i.id)).length;

  return `
    <div class="page-wrap">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
        <div>
          <h1 style="margin:0; font-size:22px; font-weight:800;">Блоки времени</h1>
          <div style="font-size:12.5px; color:var(--muted); margin-top:2px;">Направления жизни и последовательные этапы внутри каждого</div>
        </div>
        <div style="display:flex; gap:6px;">
          <button type="button" class="btn-ghost" style="padding:8px 11px; font-size:12px; border-color:var(--accent-border); color:var(--accent);" data-act="go" data-route="map-overview" title="Дополнительный панорамный обзор блоков">
            🗺 Карта-обзор
          </button>
          <button type="button" class="btn-primary" style="padding:8px 12px; font-size:12px;" data-act="open-modal" data-modal="new-block">+ Блок</button>
        </div>
      </div>

      <!-- Виртуальная карточка «Быстрое добавление» в списке блоков (точно как в первой версии!) -->
      <button type="button" class="hub-card quick-accent" data-act="go" data-route="quick">
        <div class="hub-icon">⚡</div>
        <div class="hub-body">
          <div class="hub-title">Быстрое добавление</div>
          <div class="hub-sub">Заданий: ${quickItems.length} · На сегодня: ${quickToday}</div>
        </div>
        <span class="hub-chev">›</span>
      </button>

      <!-- Вертикальный список Блоков времени -->
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${liveBlocks.map(b => {
          const curStage = state.stages.find(s => s.id === b.currentStageId);
          const openItemsCount = state.items.filter(i => !i.archivedAt && i.blockId === b.id && !isOneOffEverDoneInCurrentCycle(state, i)).length;
          return `
            <button type="button" class="hub-card" data-act="open-block" data-id="${esc(b.id)}">
              <div class="hub-icon" style="border-color:${esc(b.color)}44; color:${esc(b.color)};">${esc(b.icon || '📌')}</div>
              <div class="hub-body">
                <div class="hub-title">${esc(b.name)}</div>
                <div class="hub-sub">
                  ${curStage ? 'Этап: ' + esc(curStage.name) : 'Выбрать этап'}${openItemsCount ? ` · дел: ${openItemsCount}` : ''}
                </div>
              </div>
              <span class="hub-chev">›</span>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function getStageCounters(state, stageId) {
  const linked = state.items.filter(i => !i.archivedAt && i.stageId === stageId);
  const plan = assembleDayPlan(state, state.lastDay);
  const inDayIds = new Set(plan.visible.map(v => v.item.id));
  let active = 0, completed = 0, inToday = 0;
  linked.forEach(it => {
    const doneOnce = isOneOffEverDoneInCurrentCycle(state, it);
    const prog = getItemProgressOnDate(state, it, state.lastDay);
    if (doneOnce || prog.done) completed++;
    else active++;
    if (inDayIds.has(it.id)) inToday++;
  });
  return { active, completed, inToday };
}

function renderSingleBlockView(state) {
  const blk = state.blocks.find(b => b.id === UI3.activeBlockId) || state.blocks.find(b => !b.archivedAt);
  if (!blk) return renderBlocksListView(state);
  UI3.activeBlockId = blk.id;

  const tab = UI3.blockTab || 'current'; // 'current' | 'all'
  const allBlockStages = state.stages
    .filter(s => s.blockId === blk.id && !s.archivedAt)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const viewStage = (UI3.inspectStageId && allBlockStages.find(s => s.id === UI3.inspectStageId))
    || allBlockStages.find(s => s.id === blk.currentStageId)
    || allBlockStages[0];

  let innerHtml = '';

  if (tab === 'current' && viewStage) {
    const isCurrent = viewStage.id === blk.currentStageId;
    const isHorizon = viewStage.role === 'unknown' || viewStage.role === 'lvmg';
    const stageGoals = state.goals.filter(g => g.stageId === viewStage.id && g.status !== 'archived');
    const stageItems = state.items.filter(i => !i.archivedAt && i.stageId === viewStage.id);
    const stageQuests = state.quests.filter(q => !q.archivedAt && q.stageId === viewStage.id);
    const openSteps = allBlockStages.filter(s => s.role === 'step' && s.status !== 'completed');
    const nextStep = openSteps.find(s => (s.order ?? 0) > (viewStage.order ?? 0));

    innerHtml = `
      <!-- Шапка выбранного этапа -->
      <div class="card" style="border-color:${isCurrent ? 'var(--accent)' : 'var(--border)'}; display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <span style="font-size:10.5px; font-weight:800; letter-spacing:0.1em; color:${isCurrent ? 'var(--accent)' : 'var(--muted)'}; text-transform:uppercase;">
            ${isCurrent ? '● ТЕКУЩИЙ ЭТАП В РАБОТЕ' : (viewStage.role === 'optimal' ? '🌿 ОПТИМАЛЬНЫЙ ОРИЕНТИР' : (isHorizon ? '✦ ДАЛЬНИЙ ГОРИЗОНТ' : (viewStage.status === 'completed' ? '🏆 ПРОЙДЕННЫЙ ЭТАП' : 'ПЛАНИРУЕМЫЙ ЭТАП')))}
          </span>
          <button type="button" class="mini-btn" data-act="open-stage-editor" data-id="${esc(viewStage.id)}">✎ Изменить этап</button>
        </div>
        <h2 style="margin:0; font-size:18.5px; font-weight:800; line-height:1.28;">${esc(viewStage.name)}</h2>
        ${viewStage.description ? `<div style="font-size:13px; color:var(--muted);">${esc(viewStage.description)}</div>` : ''}
        ${!isCurrent && viewStage.role === 'step' && viewStage.status !== 'completed' ? `
          <div><button type="button" class="pill active" data-act="make-stage-current" data-id="${esc(viewStage.id)}">Сделать текущим этапом блока</button></div>
        ` : ''}
      </div>

      <!-- Розовая/бордовая карточка СМЫСЛ из первой версии (#302023) -->
      <div class="meaning-card" data-act="open-stage-editor" data-id="${esc(viewStage.id)}" style="cursor:pointer;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="meaning-label">СМЫСЛ · ЗАЧЕМ МНЕ ЭТО</span>
          <span style="font-size:11.5px; opacity:0.75;">✎</span>
        </div>
        <div style="margin-top:6px; font-size:14px; line-height:1.45;">
          ${esc(viewStage.meaning || blk.meaning || 'Нажми, чтобы записать личную ценность и смысл этого этапа.')}
        </div>
      </div>

      ${isHorizon ? `
        <div class="card-2" style="font-size:13px; color:var(--muted);">
          Это описательный горизонт ориентира — здесь хранится видение возможного будущего без обязательных ежедневных списков и штрафов.
        </div>
      ` : `
        <!-- Зелёные карточки ЦЕЛИ ЭТАПА из первой версии (#1d2d25 + критерий + Если-то + Отказ без штрафа!) -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding-top:2px;">
          <span style="font-size:11.5px; font-weight:750; letter-spacing:0.1em; color:var(--muted); text-transform:uppercase;">ЦЕЛИ ЭТАПА (${stageGoals.length})</span>
          <button type="button" class="mini-btn" style="color:var(--good);" data-act="open-goal-editor" data-stage="${esc(viewStage.id)}" data-id="">+ Добавить цель</button>
        </div>

        ${stageGoals.length === 0 ? `
          <div class="card-2" style="font-size:12.5px; color:var(--muted);">
            У этапа пока нет отдельной цели — можно добавить её с понятным критерием результата или сразу записать простые действия ниже.
          </div>
        ` : stageGoals.map(g => `
          <div class="goal-card ${g.status === 'abandoned' ? 'abandoned' : ''}">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
              <span style="font-size:10.5px; font-weight:800; letter-spacing:0.1em; text-transform:uppercase;">
                ${g.status === 'achieved' ? '✓ ЦЕЛЬ ДОСТИГНУТА' : (g.status === 'abandoned' ? 'ОТКАЗАЛСЯ ОСОЗНАННО' : '🎯 ЦЕЛЬ ЭТАПА')}
              </span>
              <button type="button" class="mini-btn" data-act="open-goal-editor" data-stage="${esc(viewStage.id)}" data-id="${esc(g.id)}">✎</button>
            </div>
            <div style="font-size:15.5px; font-weight:750; margin-top:5px;">${esc(g.title)}</div>
            ${g.criterion ? `<div style="font-size:12.5px; opacity:0.88; margin-top:4px;"><strong>Как пойму результат:</strong> ${esc(g.criterion)}</div>` : ''}
            ${(g.ifTrigger && g.ifAction) ? `<div style="font-size:12px; opacity:0.85; margin-top:5px; padding-top:5px; border-top:1px solid rgba(255,255,255,0.12);">💡 <strong>Если</strong> ${esc(g.ifTrigger)} → <strong>то</strong> ${esc(g.ifAction)}</div>` : ''}
            ${g.reason ? `<div style="font-size:11.5px; opacity:0.75; margin-top:4px;">Заметка пересмотра: ${esc(g.reason)}</div>` : ''}

            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:10px;">
              ${g.status === 'active' ? `
                <button type="button" class="pill active" data-act="set-goal-status" data-id="${esc(g.id)}" data-st="achieved">✓ Достигнута</button>
                <button type="button" class="mini-btn" data-act="open-abandon-goal" data-id="${esc(g.id)}">Пересмотреть / Отказаться</button>
              ` : `
                <button type="button" class="mini-btn" data-act="set-goal-status" data-id="${esc(g.id)}" data-st="active">Вернуть в активные</button>
              `}
            </div>
          </div>
        `).join('')}

        <!-- ДЕЙСТВИЯ ЭТАПА + переключатель пошаговой подачи конвейера -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding-top:4px; gap:8px; flex-wrap:wrap;">
          <span style="font-size:11.5px; font-weight:750; letter-spacing:0.1em; color:var(--muted); text-transform:uppercase;">ДЕЙСТВИЯ В ЭТАПЕ (${stageItems.length + stageQuests.length})</span>
          <button type="button" class="btn-primary" style="padding:6px 12px; font-size:12px;" data-act="open-item-editor" data-stage="${esc(viewStage.id)}" data-block="${esc(blk.id)}" data-id="">+ Добавить действие</button>
        </div>

        ${stageItems.length > 0 ? `
          <div class="card-2" style="padding:9px 12px; display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
            <span style="font-size:12px; color:var(--muted);">Подача разовых шагов в день:</span>
            <div style="display:inline-flex; gap:5px;">
              <button type="button" class="mini-btn" style="${viewStage.feedMode !== 'one' ? 'background:var(--accent); color:var(--on-accent); border-color:var(--accent); font-weight:750;' : ''}" data-act="set-stage-feed" data-id="${esc(viewStage.id)}" data-val="all">Все выбранные</button>
              <button type="button" class="mini-btn" style="${viewStage.feedMode === 'one' ? 'background:var(--accent); color:var(--on-accent); border-color:var(--accent); font-weight:750;' : ''}" data-act="set-stage-feed" data-id="${esc(viewStage.id)}" data-val="one">По одному шагу</button>
            </div>
          </div>
        ` : ''}

        ${stageItems.length === 0 && stageQuests.length === 0 ? `
          <div class="card-2" style="font-size:13px; color:var(--muted); text-align:center; padding:18px;">
            Добавь посильное регулярное или разовое действие для этого этапа.
          </div>
        ` : `
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${(() => {
              const sortedStageItems = stageItems.slice().sort((a, b) => (Number(a.stageOrder) || 0) - (Number(b.stageOrder) || 0));
              const openQueue = viewStage.feedMode === 'one'
                ? sortedStageItems.filter(x => isConveyorQueueTask(x) && !isOneOffEverDoneInCurrentCycle(state, x))
                : [];
              const doneTodayInQueue = viewStage.feedMode === 'one' && sortedStageItems.some(x => isConveyorQueueTask(x) && getItemProgressOnDate(state, x, state.lastDay).done);
              return sortedStageItems.map(it => {
                const qIdx = openQueue.findIndex(q => q.id === it.id);
                if (viewStage.feedMode !== 'one' || qIdx < 0) {
                  return renderActionRow(state, it, { hideBlock: true });
                }
                const isHead = qIdx === 0 && !doneTodayInQueue;
                const badgeText = isHead ? '● Сейчас в дне (шаг №1)' : (qIdx === 0 && doneTodayInQueue ? 'На завтра (следующий шаг)' : `В очереди · №${qIdx + 1}`);
                return `
                  <div style="display:flex; flex-direction:column; gap:4px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:0 4px;">
                      <span class="conveyor-badge ${isHead ? 'is-head' : ''}">${badgeText}</span>
                      <span style="display:inline-flex; gap:4px;">
                        ${qIdx > 0 ? `<button type="button" class="mini-btn" style="padding:2px 7px;" data-act="move-stage-item-order" data-id="${esc(it.id)}" data-dir="-1" title="Поднять раньше в очереди">↑</button>` : ''}
                        ${qIdx < openQueue.length - 1 ? `<button type="button" class="mini-btn" style="padding:2px 7px;" data-act="move-stage-item-order" data-id="${esc(it.id)}" data-dir="1" title="Отложить позже в очереди">↓</button>` : ''}
                      </span>
                    </div>
                    ${renderActionRow(state, it, { hideBlock: true })}
                  </div>
                `;
              }).join('');
            })()}
            ${stageQuests.map(q => `
              <div class="card-2" style="display:flex; justify-content:space-between; align-items:center;">
                <span>💎 Квест: <strong>${esc(q.title)}</strong> (${q.qtype === 'counter' ? `${q.progress}/${q.target}` : `${q.steps.filter(s=>s.done).length}/${q.steps.length}`})</span>
                <button type="button" class="mini-btn" data-act="go" data-route="quests">Открыть</button>
              </div>
            `).join('')}
          </div>
        `}

        <!-- Нижние спокойные кнопки управления этапом (как в спецификации первой версии!) -->
        ${viewStage.role === 'step' ? `
          <div class="grid-2" style="margin-top:6px;">
            ${viewStage.status !== 'completed' ? `
              <button type="button" class="btn-ghost" style="border-color:var(--good); color:var(--good); flex-direction:column; gap:2px; padding:11px;" data-act="open-complete-stage" data-id="${esc(viewStage.id)}">
                <span>✓ Этап пройден</span>
                <span style="font-size:10.5px; color:var(--muted); font-weight:400;">Сохранить в достижения</span>
              </button>
            ` : `
              <button type="button" class="btn-ghost" data-act="reopen-stage" data-id="${esc(viewStage.id)}">↩ Вернуть этап в работу</button>
            `}
            <button type="button" class="btn-ghost" style="flex-direction:column; gap:2px; padding:11px;" data-act="peek-or-add-next-stage" data-id="${esc(viewStage.id)}">
              <span>${nextStep ? 'Следующий этап →' : '+ Подготовить следующий'}</span>
              <span style="font-size:10.5px; color:var(--muted); font-weight:400;">${esc(nextStep ? nextStep.name.slice(0, 24) : 'Добавить ступень дальше')}</span>
            </button>
          </div>
        ` : ''}
      `}
    `;
  } else {
    // Вкладка «ВСЕ ЭТАПЫ» — фирменная вертикальная дорожка первой версии (.lg-levels)!
    const completedStages = allBlockStages.filter(s => s.role === 'step' && s.status === 'completed');
    const openSteps = allBlockStages.filter(s => s.role === 'step' && s.status !== 'completed');
    const optStage = allBlockStages.find(s => s.role === 'optimal');
    const unkStage = allBlockStages.find(s => s.role === 'unknown');
    const lvmgStage = allBlockStages.find(s => s.role === 'lvmg');

    innerHtml = `
      <!-- Переключатель Упрощённой / Полной стратегии блока -->
      <div class="card-2" style="display:flex; flex-direction:column; gap:7px;">
        <span style="font-size:12px; color:var(--muted);">Глубина дорожки этого блока:</span>
        <div class="seg-bar">
          <button type="button" class="seg-btn ${blk.preset !== 'full' ? 'active' : ''}" data-act="set-block-preset" data-id="${esc(blk.id)}" data-val="simple">Упрощённая (до Оптимума)</button>
          <button type="button" class="seg-btn ${blk.preset === 'full' ? 'active' : ''}" data-act="set-block-preset" data-id="${esc(blk.id)}" data-val="full">Полная (+ LVMG)</button>
        </div>
      </div>

      <!-- 1. Мои достижения (сворачиваемые пройденные этапы) -->
      ${blk.secs.ach !== false ? `
        <details class="card-2" ${completedStages.length > 0 ? 'open' : ''}>
          <summary style="cursor:pointer; font-size:12.5px; font-weight:750; color:var(--accent);">🏆 Мои достижения и пройденные этапы (${completedStages.length})</summary>
          <div style="display:flex; flex-direction:column; gap:7px; margin-top:10px;">
            ${completedStages.map(cs => `
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px;">
                <span>✓ <strong>${esc(cs.name)}</strong> <span style="color:var(--muted); font-size:11.5px;">(${cs.completedAt || ''})</span></span>
                <button type="button" class="mini-btn" data-act="inspect-stage" data-id="${esc(cs.id)}">Открыть</button>
              </div>
            `).join('')}
            <button type="button" class="mini-btn" style="align-self:flex-start;" data-act="open-modal" data-modal="add-past-stage" data-id="${esc(blk.id)}">+ Добавить уже пройденный этап</button>
          </div>
        </details>
      ` : ''}

      <!-- Фирменная вертикальная рельса этапов первой версии (.lg-levels) -->
      <div class="lg-levels">
        <!-- Фактическое состояние (Где я сейчас) -->
        <div class="lg-level">
          <div class="stage-track-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:10.5px; font-weight:750; color:var(--muted); text-transform:uppercase;">ФАКТИЧЕСКОЕ СОСТОЯНИЕ · ГДЕ Я СЕЙЧАС</span>
              <button type="button" class="mini-btn" data-act="open-modal" data-modal="edit-fact" data-id="${esc(blk.id)}">Изменить</button>
            </div>
            <div style="margin-top:5px; font-size:13.5px; color:${blk.fact ? 'var(--text)' : 'var(--muted)'};">
              ${esc(blk.fact || 'Опиши исходную точку опоры (что уже есть сейчас — это не задача).')}
            </div>
          </div>
        </div>

        <!-- Незавершённые этапы (Текущий + Планируемые) -->
        ${openSteps.map((st, idx) => {
          const isCur = st.id === blk.currentStageId;
          const cnt = getStageCounters(state, st.id);
          return `
            <div class="lg-level ${isCur ? 'is-current' : ''}">
              <div class="stage-track-card">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                  <div style="cursor:pointer; flex:1;" data-act="inspect-stage" data-id="${esc(st.id)}">
                    <span style="font-size:10.5px; font-weight:800; color:${isCur ? 'var(--accent)' : 'var(--muted)'}; text-transform:uppercase;">
                      ${isCur ? '● ТЕКУЩИЙ ЭТАП' : 'ПЛАНИРУЕМЫЙ ЭТАП'}
                    </span>
                    <div style="font-size:15.5px; font-weight:750; margin-top:2px;">${esc(st.name)}</div>
                    ${st.description ? `<div style="font-size:12px; color:var(--muted); margin-top:2px;">${esc(st.description)}</div>` : ''}
                  </div>
                  <div style="display:flex; gap:4px;">
                    ${idx > 0 ? `<button type="button" class="mini-btn" data-act="move-stage-order" data-id="${esc(st.id)}" data-dir="-1" title="Выше">↑</button>` : ''}
                    ${idx < openSteps.length - 1 ? `<button type="button" class="mini-btn" data-act="move-stage-order" data-id="${esc(st.id)}" data-dir="1" title="Ниже">↓</button>` : ''}
                  </div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:9px; padding-top:8px; border-top:1px solid var(--border); font-size:11.5px; color:var(--muted); flex-wrap:wrap; gap:6px;">
                  <span>активно: ${cnt.active} · завершено: ${cnt.completed} · в дне: ${cnt.inToday}</span>
                  <div style="display:flex; gap:5px;">
                    ${!isCur ? `<button type="button" class="mini-btn" style="color:var(--accent);" data-act="make-stage-current" data-id="${esc(st.id)}">Сделать текущим</button>` : ''}
                    <button type="button" class="mini-btn" data-act="inspect-stage" data-id="${esc(st.id)}">Открыть →</button>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}

        <div>
          <button type="button" class="btn-ghost" style="width:100%; border-style:dashed;" data-act="open-stage-editor" data-block="${esc(blk.id)}" data-id="">+ Добавить планируемый этап</button>
        </div>

        <!-- Оптимальный ориентир («Достаточно хорошо») -->
        ${optStage ? `
          <div class="lg-level is-optimal">
            <div class="stage-track-card" style="border-color:rgba(74,222,128,0.35);">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <span style="font-size:10.5px; font-weight:800; color:var(--good); text-transform:uppercase;">🌿 ОПТИМАЛЬНЫЙ ОРИЕНТИР (ДОСТАТОЧНО ХОРОШО)</span>
                <button type="button" class="mini-btn" data-act="toggle-opt-reached" data-id="${esc(optStage.id)}">
                  ${optStage.reached ? '✓ В поддержании' : 'Отметить достигнутым'}
                </button>
              </div>
              <div style="font-size:15px; font-weight:750; margin-top:4px; cursor:pointer;" data-act="inspect-stage" data-id="${esc(optStage.id)}">${esc(optStage.name)}</div>
              ${optStage.description ? `<div style="font-size:12px; color:var(--muted); margin-top:2px;">${esc(optStage.description)}</div>` : ''}
            </div>
          </div>
        ` : ''}

        <!-- Дальние горизонты Полной стратегии: Неизвестное и LVMG -->
        ${blk.preset === 'full' && unkStage ? `
          <div class="lg-level is-horizon">
            <div class="stage-track-card dashed" style="cursor:pointer;" data-act="open-stage-editor" data-id="${esc(unkStage.id)}">
              <div style="font-size:10.5px; font-weight:750; color:var(--muted); text-transform:uppercase;">НЕИЗВЕСТНОЕ · ГИПОТЕЗА ПУТИ ✎</div>
              <div style="font-size:14px; font-weight:650; margin-top:3px;">${esc(unkStage.name)}</div>
              ${unkStage.description ? `<div style="font-size:12px; color:var(--muted); margin-top:2px;">${esc(unkStage.description)}</div>` : ''}
            </div>
          </div>
        ` : ''}

        ${blk.preset === 'full' && lvmgStage ? `
          <div class="lg-level is-horizon">
            <div class="stage-track-card dashed" style="border-color:var(--accent-border); cursor:pointer;" data-act="open-stage-editor" data-id="${esc(lvmgStage.id)}">
              <div style="font-size:10.5px; font-weight:800; color:var(--accent); text-transform:uppercase;">✦ ВСЕГДА ВОЗМОЖНО ЛУЧШЕЕ (LVMG) ✎</div>
              <div style="font-size:14.5px; font-weight:700; margin-top:3px;">${esc(lvmgStage.name)}</div>
              ${lvmgStage.description ? `<div style="font-size:12px; color:var(--muted); margin-top:2px;">${esc(lvmgStage.description)}</div>` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  return `
    <div class="page-wrap">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
        <div style="display:flex; align-items:center; gap:10px; min-width:0;">
          <span style="font-size:24px;">${esc(blk.icon || '📌')}</span>
          <div style="min-width:0;">
            <h1 style="margin:0; font-size:20px; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(blk.name)}</h1>
            ${blk.subtitle ? `<div style="font-size:12px; color:var(--muted);">${esc(blk.subtitle)}</div>` : ''}
          </div>
        </div>
        <button type="button" class="mini-btn" data-act="open-modal" data-modal="block-settings" data-id="${esc(blk.id)}">⚙ Блок</button>
      </div>

      <div class="seg-bar">
        <button type="button" class="seg-btn ${tab === 'current' ? 'active' : ''}" data-act="set-block-tab" data-val="current">Текущий этап</button>
        <button type="button" class="seg-btn ${tab === 'all' ? 'active' : ''}" data-act="set-block-tab" data-val="all">Все этапы</button>
      </div>

      ${innerHtml}
    </div>
  `;
}
