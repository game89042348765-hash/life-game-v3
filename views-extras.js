// LifeGame 3.0 — Дополнительная Карта-обзор, Квесты/Календарь, Магазин экземпляров, Виджеты первой версии, Тихий вечер/Пересмотр, Настройки и Диалоги

function pickEveningReplyV3(state, mood) {
  const todayEvs = state.events.filter(e => e.active && e.date === state.lastDay);
  const todayMins = state.timeSessions.filter(t => t.date === state.lastDay).reduce((s, t) => s + (Number(t.minutes) || 0), 0);
  let pool = EVENING_GROUPS_3.small;
  if (mood === 'rest' || (todayEvs.length === 0 && todayMins === 0)) {
    pool = EVENING_GROUPS_3.rest.concat(EVENING_EXTRA_3.slice(0, 7));
  } else if (todayEvs.some(e => e.kind === 'quest' || e.kind === 'stage')) {
    pool = EVENING_GROUPS_3.progress;
  } else if (todayEvs.length >= 4) {
    pool = EVENING_GROUPS_3.full;
  } else if (todayEvs.some(e => e.kind === 'habit') || todayMins > 0) {
    pool = EVENING_GROUPS_3.habit.concat(EVENING_EXTRA_3.slice(7));
  }
  const seed = state.lastDay.split('').reduce((a, c) => a + c.charCodeAt(0), state.reviews.length + todayEvs.length + todayMins);
  return pool[seed % pool.length];
}

// ============================================================================
// 1. КАРТА ЖИЗНИ — СТРОГО КАК ДОПОЛНЕНИЕ К БЛОКАМ ВРЕМЕНИ!
// ============================================================================
function renderMapOverview(state) {
  const mode = UI3.mapMode || 'now'; // 'now' | 'horizons'
  const liveBlocks = state.blocks.filter(b => !b.archivedAt).sort((a, b) => (b.priority || 2) - (a.priority || 2));

  return `
    <div class="page-wrap">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <div>
          <h1 style="margin:0; font-size:21px; font-weight:800;">🗺 Карта-обзор блоков</h1>
          <div style="font-size:12.5px; color:var(--muted); margin-top:2px;">Дополнительный взгляд сверху · вся работа ведётся внутри самих Блоков времени</div>
        </div>
        <button type="button" class="btn-ghost" style="padding:7px 12px; font-size:12.5px;" data-act="go" data-route="blocks">← К блокам</button>
      </div>

      <div class="seg-bar">
        <button type="button" class="seg-btn ${mode === 'now' ? 'active' : ''}" data-act="set-map-mode" data-val="now">Где я сейчас</button>
        <button type="button" class="seg-btn ${mode === 'horizons' ? 'active' : ''}" data-act="set-map-mode" data-val="horizons">Панорама горизонтов</button>
      </div>

      ${mode === 'now' ? `
        <div class="supp-map-board">
          <div style="font-size:11px; font-weight:750; letter-spacing:0.12em; color:var(--accent); text-transform:uppercase;">
            ТЕКУЩИЕ ЭТАПЫ ПО НАПРАВЛЕНИЯМ (${liveBlocks.length})
          </div>
          <div style="display:grid; gap:10px;">
            ${liveBlocks.map(b => {
              const cur = state.stages.find(s => s.id === b.currentStageId);
              const opt = state.stages.find(s => s.blockId === b.id && s.role === 'optimal');
              const cnt = cur ? getStageCounters(state, cur.id) : { active: 0, inToday: 0 };
              return `
                <button type="button" class="horizon-lane" style="text-align:left; border-left:3px solid ${esc(b.color)};" data-act="open-block" data-id="${esc(b.id)}">
                  <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                    <span style="font-weight:750; font-size:15px;">${esc(b.icon)} ${esc(b.name)}</span>
                    <span style="font-size:11px; color:var(--muted);">приоритет ${b.priority || 2} · в дне: ${cnt.inToday} ›</span>
                  </div>
                  ${b.fact ? `<div style="font-size:12px; color:var(--muted); margin-top:4px;">Опора: ${esc(b.fact)}</div>` : ''}
                  <div style="font-size:13px; margin-top:4px; color:var(--accent); font-weight:650;">
                    Сейчас: ${esc(cur ? cur.name : 'Не выбран')}
                  </div>
                  ${opt && opt.reached ? `<div style="font-size:11.5px; color:var(--good); margin-top:3px;">🌿 Оптимальный ориентир достигнут (поддержание)</div>` : ''}
                </button>
              `;
            }).join('')}
          </div>
        </div>
      ` : `
        <div class="supp-map-board">
          <div style="font-size:12px; color:var(--muted); line-height:1.45;">
            Сплошная линия соединяет <strong>Факт</strong>, <strong>Текущий этап</strong> и <strong>Оптимальный ориентир</strong> («достаточно хорошо»). Дальний маяк <strong>LVMG</strong> отделён пунктиром — его можно видеть, даже когда дорога к нему ещё не известна.
          </div>
          ${liveBlocks.map(b => {
            const cur = state.stages.find(s => s.id === b.currentStageId);
            const opt = state.stages.find(s => s.blockId === b.id && s.role === 'optimal');
            const lvmg = state.stages.find(s => s.blockId === b.id && s.role === 'lvmg');
            const full = b.preset === 'full';
            return `
              <div class="horizon-lane" style="display:flex; flex-direction:column; gap:7px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <strong style="color:${esc(b.color)};">${esc(b.icon)} ${esc(b.name)}</strong>
                  <button type="button" class="mini-btn" data-act="open-block" data-id="${esc(b.id)}">Открыть этапы →</button>
                </div>
                <div style="display:flex; flex-wrap:wrap; align-items:center; gap:6px; font-size:12px;">
                  <span class="pill" style="font-size:11px;">🪨 ${esc((b.fact || 'Исходная точка').slice(0, 26))}</span>
                  <span style="color:var(--accent);">──▶</span>
                  <span class="pill active" style="font-size:11px;">● ${esc((cur ? cur.name : 'Сейчас'))}</span>
                  <span style="color:var(--good);">──▶</span>
                  <span class="pill" style="font-size:11px; border-color:rgba(74,222,128,0.4); color:var(--good);">🌿 ${esc((opt ? opt.name : 'Оптимум'))}</span>
                  ${full && lvmg ? `
                    <span style="color:var(--muted); letter-spacing:2px;">${b.routeKnownToLvmg ? '──▶' : '· · ? · ·▶'}</span>
                    <span class="pill" style="font-size:11px; border-style:dashed; border-color:var(--accent-border); color:var(--accent);">✦ ${esc(lvmg.name)}</span>
                  ` : ''}
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
// 2. КВЕСТЫ, ВСЕ ДЕЙСТВИЯ, КАЛЕНДАРЬ, РЕШЕНИЯ, НЕВЫПОЛНЕННЫЕ И ИСТОРИЯ
// ============================================================================
function renderQuestsAndActionsView(state, forcedSub) {
  const sub = forcedSub || UI3.actionsSub || 'quests';
  const qSearch = (UI3.searchText || '').trim().toLowerCase();
  const match = (s) => !qSearch || String(s || '').toLowerCase().includes(qSearch);

  const tabs = [
    ['quests', `Квесты (${state.quests.filter(q => !q.archivedAt).length})`],
    ['tasks', 'Задания'],
    ['habits', 'Привычки'],
    ['calendar', 'Календарь'],
    ['decisions', 'Решения'],
    ['missed', `Пропуски${state.missed.filter(m => m.status === 'open').length ? ' · ' + state.missed.filter(m => m.status === 'open').length : ''}`],
    ['history', 'История']
  ];

  let body = '';

  if (sub === 'quests') {
    const list = state.quests.filter(q => !q.archivedAt && match(q.title));
    body = `
      <div style="display:flex; justify-content:flex-end;">
        <button type="button" class="btn-primary" data-act="open-modal" data-modal="quest-editor" data-id="">+ Новый квест</button>
      </div>
      ${list.length === 0 ? `<div class="card" style="color:var(--muted); text-align:center;">Квестов пока нет.</div>` : list.map(q => {
        const blk = q.blockId ? state.blocks.find(b => b.id === q.blockId) : null;
        const bon = q.linkedBonusId ? state.bonuses.find(b => b.id === q.linkedBonusId) : null;
        return `
          <div class="card" style="display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
              <div>
                <div style="font-size:11px; color:var(--accent); font-weight:750;">
                  ${q.qtype === 'counter' ? 'КВЕСТ-СЧЁТЧИК' : 'КВЕСТ С ЭТАПАМИ'} · финал +${q.finalReward} ●
                </div>
                <div style="font-size:16px; font-weight:750; margin-top:2px;">${esc(q.title)}</div>
                <div style="font-size:12px; color:var(--muted); margin-top:2px;">
                  ${blk ? `${esc(blk.icon)} ${esc(blk.name)} · ` : ''}${bon ? `🎁 Награда финала: ${esc(bon.title)}` : 'Самостоятельный квест'}
                </div>
              </div>
              <button type="button" class="mini-btn" data-act="open-modal" data-modal="quest-editor" data-id="${esc(q.id)}">⋯</button>
            </div>

            ${q.qtype === 'counter' ? `
              <div class="card-2" style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:750;">Продвижение: ${q.progress} / ${q.target}</span>
                <div style="display:flex; gap:6px;">
                  ${q.progress > 0 && q.status !== 'completed' ? `<button type="button" class="mini-btn" data-act="quest-step-delta" data-id="${esc(q.id)}" data-d="-1">−1</button>` : ''}
                  ${q.status !== 'completed'
                    ? `<button type="button" class="pill active" data-act="quest-step-delta" data-id="${esc(q.id)}" data-d="1">+1 шаг (+${q.stepReward} ●)</button>`
                    : `<span style="color:var(--good); font-weight:750;">✓ Выполнен</span>`}
                </div>
              </div>
            ` : `
              <div style="display:flex; flex-direction:column; gap:6px;">
                ${(q.steps || []).map(st => `
                  <button type="button" class="card-2" style="display:flex; align-items:center; gap:9px; text-align:left;" data-act="toggle-quest-check" data-id="${esc(q.id)}" data-sid="${esc(st.id)}">
                    <span style="color:${st.done ? 'var(--good)' : 'var(--muted)'}; font-weight:800;">${st.done ? '☑' : '☐'}</span>
                    <span style="${st.done ? 'text-decoration:line-through; opacity:0.65;' : ''}">${esc(st.title)}</span>
                  </button>
                `).join('')}
              </div>
            `}
          </div>
        `;
      }).join('')}
    `;
  } else if (sub === 'tasks' || sub === 'habits') {
    const targetKind = sub === 'habits' ? 'habit' : 'task';
    const items = state.items.filter(i => !i.archivedAt && i.kind === targetKind && match(i.title));
    body = `
      <div style="display:flex; justify-content:flex-end;">
        <button type="button" class="btn-primary" data-act="open-item-editor" data-kind="${targetKind}" data-id="">+ ${sub === 'habits' ? 'Новая привычка' : 'Новое задание'}</button>
      </div>
      ${items.length === 0 ? `<div class="card" style="color:var(--muted); text-align:center;">Список пока пуст.</div>` : `
        <div style="display:flex; flex-direction:column; gap:9px;">
          ${items.map(it => {
            const doneOnce = isOneOffEverDoneInCurrentCycle(state, it);
            return doneOnce ? `
              <div class="card-2" style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <div>
                  <div style="text-decoration:line-through; opacity:0.7;">${esc(it.title)}</div>
                  <div style="font-size:11px; color:var(--muted);">Выполнено ранее</div>
                </div>
                <button type="button" class="pill active" data-act="restart-oneoff-cycle" data-id="${esc(it.id)}">↻ Ещё раз</button>
              </div>
            ` : renderActionRow(state, it);
          }).join('')}
        </div>
      `}
    `;
  } else if (sub === 'calendar') {
    const daysOut = [];
    for (let k = 0; k < 10; k++) {
      const iso = shiftLocalDays(state.lastDay, k);
      const calItems = state.items.filter(i => !i.archivedAt && (i.kind === 'calendar' || (i.schedule && i.schedule.date)) && isScheduledOnDate(i, iso) && match(i.title));
      if (calItems.length || k === 0) daysOut.push({ iso, calItems, isToday: k === 0 });
    }
    body = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <span style="font-size:12.5px; color:var(--muted);">Встречи и дела на точную дату</span>
        <button type="button" class="btn-primary" data-act="open-item-editor" data-kind="calendar" data-id="">+ Событие</button>
      </div>
      ${daysOut.map(dObj => `
        <div class="card" style="display:flex; flex-direction:column; gap:8px;">
          <div style="font-size:12px; font-weight:750; color:${dObj.isToday ? 'var(--accent)' : 'var(--muted)'};">
            ${dObj.isToday ? 'СЕГОДНЯ · ' : ''}${humanDateWithWeekday(dObj.iso)}
          </div>
          ${dObj.calItems.length === 0 ? `<div style="font-size:12.5px; color:var(--dim);">Свободный от назначенных встреч день</div>` : dObj.calItems.map(ci => `
            <div class="card-2" style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
              <div>
                <div style="font-weight:650;">${ci.schedule?.time ? `<span style="color:var(--accent); margin-right:5px;">${esc(ci.schedule.time)}</span>` : ''}${esc(ci.title)}</div>
                <div style="font-size:11px; color:var(--muted);">Повтор: ${{once:'разово',daily:'каждый день',weekly:'еженедельно',monthly:'ежемесячно'}[ci.schedule?.type || 'once']}</div>
              </div>
              <div style="display:flex; gap:5px;">
                <button type="button" class="mini-btn" data-act="open-cal-move" data-id="${esc(ci.id)}" data-occ="${esc(dObj.iso)}">Перенести</button>
                <button type="button" class="mini-btn" data-act="open-item-editor" data-id="${esc(ci.id)}">⋯</button>
              </div>
            </div>
          `).join('')}
        </div>
      `).join('')}
    `;
  } else if (sub === 'decisions') {
    body = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:12.5px; color:var(--muted);">Добровольная «Цена слова» (ручной исход без автоштрафа ночью)</span>
        <button type="button" class="btn-primary" style="padding:8px 12px;" data-act="open-modal" data-modal="new-decision">+ Решение</button>
      </div>
      ${state.decisions.length === 0 ? `<div class="card" style="color:var(--muted); font-size:13px;">Активных ставок слова пока нет.</div>` : state.decisions.map(dc => `
        <div class="card" style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
          <div>
            <div style="font-weight:700;">${esc(dc.title)}</div>
            <div style="font-size:11.5px; color:var(--muted);">Срок: ${humanDateShort(dc.deadline)} · ставка ${dc.coinsStake} ● / +${dc.xpReward || 25} XP · ${esc(dc.status)}</div>
          </div>
          ${dc.status === 'active' ? `
            <div style="display:flex; gap:6px;">
              <button type="button" class="pill active" data-act="resolve-decision" data-id="${esc(dc.id)}" data-out="kept">Сдержал</button>
              <button type="button" class="mini-btn" style="color:var(--danger);" data-act="resolve-decision" data-id="${esc(dc.id)}" data-out="broken">Нарушил (−${dc.coinsStake} ●)</button>
            </div>
          ` : `<button type="button" class="mini-btn" data-act="resolve-decision" data-id="${esc(dc.id)}" data-out="reopen">Вернуть активным</button>`}
        </div>
      `).join('')}
    `;
  } else if (sub === 'missed') {
    const openMisses = state.missed.filter(m => m.status === 'open');
    body = `
      <div class="card">
        <strong>Невыполненные датированные дела (${openMisses.length})</strong>
        <div style="font-size:12px; color:var(--muted); margin-top:3px;">Нейтральная история дат без морального давления: выполни сейчас или убери в архив (сама привычка или серия не удалится).</div>
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:12px;">
          ${openMisses.length === 0 ? `<div style="color:var(--dim); font-size:13px;">Неразобранных пропусков нет.</div>` : openMisses.map(ms => `
            <div class="card-2" style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
              <div>
                <div style="font-weight:650;">${esc(ms.title)}</div>
                <div style="font-size:11px; color:var(--muted);">Исходная дата: ${humanDateShort(ms.date)}</div>
              </div>
              <div style="display:flex; gap:5px;">
                <button type="button" class="pill active" data-act="handle-miss" data-id="${esc(ms.id)}" data-how="done">Выполнить сейчас</button>
                <button type="button" class="mini-btn" data-act="handle-miss" data-id="${esc(ms.id)}" data-how="archive">В архив</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else {
    const totalMins = state.timeSessions.reduce((s, t) => s + (Number(t.minutes) || 0), 0);
    const archivedItems = state.items.filter(i => i.archivedAt);
    body = `
      <div class="card" style="display:flex; flex-direction:column; gap:8px;">
        <strong>История фактов (${state.events.filter(e=>e.active).length}) и времени (${totalMins} мин)</strong>
        ${state.timeSessions.slice().reverse().slice(0, 15).map(ts => `
          <div class="card-2" style="font-size:12.5px;">⏱ <strong>${ts.minutes} мин</strong> · ${esc(ts.itemName)} <span style="color:var(--muted);">(${ts.date})</span></div>
        `).join('')}
        ${state.events.filter(e => e.active).slice().reverse().slice(0, 20).map(ev => `
          <div class="card-2" style="font-size:12.5px;">✓ <strong>${esc(ev.name)}</strong> · +${ev.coins || 0} ● <span style="color:var(--muted);">(${ev.date})</span></div>
        `).join('')}
      </div>
      ${archivedItems.length > 0 ? `
        <details class="card-2">
          <summary style="cursor:pointer; font-size:12.5px; font-weight:700;">Архив дел (${archivedItems.length})</summary>
          <div style="display:flex; flex-direction:column; gap:6px; margin-top:8px;">
            ${archivedItems.map(ai => `
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px;">
                <span>${esc(ai.title)}</span>
                <button type="button" class="mini-btn" data-act="unarchive-item" data-id="${esc(ai.id)}">Восстановить</button>
              </div>
            `).join('')}
          </div>
        </details>
      ` : ''}
    `;
  }

  return `
    <div class="page-wrap">
      <div>
        <h1 style="margin:0; font-size:22px; font-weight:800;">${forcedSub === 'calendar' ? 'Календарь' : 'Квесты и все действия'}</h1>
        <div style="font-size:12.5px; color:var(--muted); margin-top:2px;">Единая база записей — изменения сразу видны и в этапах, и в дне</div>
      </div>

      ${!forcedSub ? `
        <input id="lg3SearchField" type="search" class="field" placeholder="🔍 Быстрый поиск по названию..." value="${esc(UI3.searchText || '')}" data-input="lg3-search"/>
        <div class="pills">
          ${tabs.map(([id, lbl]) => `
            <button type="button" class="pill ${sub === id ? 'active' : ''}" data-act="set-actions-sub" data-val="${id}">${lbl}</button>
          `).join('')}
        </div>
      ` : `
        <div class="pills">
          <button type="button" class="pill ${sub === 'calendar' ? 'active' : ''}" data-act="set-actions-sub" data-val="calendar">Даты и повторы</button>
          <button type="button" class="pill ${sub === 'decisions' ? 'active' : ''}" data-act="go" data-route="quests" data-sub="decisions">Принятые решения</button>
          <button type="button" class="pill ${sub === 'missed' ? 'active' : ''}" data-act="go" data-route="quests" data-sub="missed">Невыполненные</button>
        </div>
      `}

      ${body}
    </div>
  `;
}

// ============================================================================
// 3. МАГАЗИН БОНУСОВ, ОТДЕЛЬНЫЕ ЭКЗЕМПЛЯРЫ (INSTANCES) И НИШТЯКИ
// ============================================================================
function renderBonusesView(state, forcedSub) {
  const w = calcWallet(state);
  const sub = forcedSub || UI3.bonusSub || 'shop'; // 'shop' | 'instances' | 'treats'
  const liveBonuses = state.bonuses.filter(b => !b.archivedAt);
  const activeInstances = state.instances.filter(ins => !ins.refundedAt && ins.uses < (ins.limit || 999999));

  return `
    <div class="page-wrap">
      <div>
        <h1 style="margin:0; font-size:22px; font-weight:800;">${sub === 'treats' ? 'Ништяки' : 'Бонусы и вознаграждения'}</h1>
        <div style="font-size:12.5px; color:var(--muted); margin-top:2px;">На балансе: <strong style="color:var(--accent);">${w.coins} ●</strong> · честная радость за реальные шаги</div>
      </div>

      <div class="pills">
        <button type="button" class="pill ${sub === 'shop' ? 'active' : ''}" data-act="set-bonus-sub" data-val="shop">Магазин (${liveBonuses.length})</button>
        <button type="button" class="pill ${sub === 'instances' ? 'active' : ''}" data-act="set-bonus-sub" data-val="instances">Мои награды (${activeInstances.length})</button>
        <button type="button" class="pill ${sub === 'treats' ? 'active' : ''}" data-act="set-bonus-sub" data-val="treats">Ништяки ☕</button>
      </div>

      ${sub === 'shop' ? `
        <div style="display:flex; justify-content:flex-end;">
          <button type="button" class="btn-primary" data-act="open-modal" data-modal="bonus-editor" data-id="">+ Создать свой бонус</button>
        </div>
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${liveBonuses.map(b => {
            const isTarget = state.rewardTargetId === b.id;
            return `
              <div class="card" style="border-color:${isTarget ? 'var(--accent)' : 'var(--border)'};">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                  <div>
                    <div style="font-size:15.5px; font-weight:750;">🎁 ${esc(b.title)}</div>
                    <div style="font-size:12px; color:var(--muted); margin-top:2px;">Цена: <strong style="color:var(--accent);">${b.cost} ●</strong>${b.limit === 1 ? ' · одноразовый экземпляр' : ''}</div>
                  </div>
                  <div style="display:flex; gap:5px;">
                    <button type="button" class="mini-btn" data-act="set-reward-target" data-id="${esc(b.id)}">${isTarget ? '✦ Моя цель' : 'В цель'}</button>
                    <button type="button" class="mini-btn" data-act="open-modal" data-modal="bonus-editor" data-id="${esc(b.id)}">✎</button>
                  </div>
                </div>
                <button type="button" class="btn-primary" style="width:100%; margin-top:11px;" data-act="buy-bonus-instance" data-id="${esc(b.id)}" ${w.coins < b.cost ? 'disabled' : ''}>
                  Купить экземпляр за ${b.cost} ●
                </button>
              </div>
            `;
          }).join('')}
        </div>
      ` : sub === 'instances' ? `
        <div style="display:flex; flex-direction:column; gap:9px;">
          ${state.instances.length === 0 ? `<div class="card" style="color:var(--muted); font-size:13px;">Купленные и полученные за квесты экземпляры появятся здесь.</div>` : state.instances.slice().reverse().map(ins => {
            const exhausted = ins.uses >= (ins.limit || 1);
            return `
              <div class="card" style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
                <div>
                  <div style="font-weight:750; ${exhausted || ins.refundedAt ? 'text-decoration:line-through; opacity:0.6;' : ''}">🎁 ${esc(ins.name)}</div>
                  <div style="font-size:11.5px; color:var(--muted);">
                    ${ins.refundedAt ? 'Возврат выполнен' : (exhausted ? 'Использовано' : `Готов к использованию (${ins.paid > 0 ? 'куплено за ' + ins.paid + ' ●' : 'награда за достижение'})`)}
                  </div>
                </div>
                ${(!exhausted && !ins.refundedAt) ? `
                  <div style="display:flex; gap:6px;">
                    <button type="button" class="pill active" data-act="use-instance" data-id="${esc(ins.id)}">Использовать</button>
                    ${ins.uses === 0 && ins.paid > 0 ? `<button type="button" class="mini-btn" data-act="refund-instance" data-id="${esc(ins.id)}">Вернуть +${ins.paid} ●</button>` : ''}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <div class="card" style="display:flex; gap:8px;">
          <input id="newTreatField" class="field" placeholder="Простая бесплатная радость для отдыха..."/>
          <button type="button" class="btn-primary" data-act="add-treat">＋</button>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${state.treats.map(t => `
            <div class="card-2" style="display:flex; justify-content:space-between; align-items:center;">
              <span>☕ ${esc(t.title)}</span>
              <button type="button" class="mini-btn" data-act="del-treat" data-id="${esc(t.id)}">✕</button>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

// ============================================================================
// 4. ВИДЖЕТЫ ПЕРВОЙ ВЕРСИИ (Время для важного с подтверждением минут, Первый шаг 2 мин, Игра в счастье 200, Ритм недели)
// ============================================================================
function renderWidgetsView(state) {
  const ft = state.focusTimer;
  const spark = HAPPINESS_200[UI3.sparkIndex % HAPPINESS_200.length];
  const liveItems = state.items.filter(i => !i.archivedAt && !isOneOffEverDoneInCurrentCycle(state, i));

  // Подсчёт спокойного ритма 7 дней
  const wds = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  const weekDays = [];
  for (let i = 6; i >= 0; i--) {
    const iso = shiftLocalDays(state.lastDay, -i);
    const evCount = state.events.filter(e => e.active && e.date === iso).length;
    const minSum = state.timeSessions.filter(t => t.date === iso).reduce((s, t) => s + (Number(t.minutes) || 0), 0);
    weekDays.push({ iso, wd: wds[localWeekday(iso)], evCount, minSum, active: evCount > 0 || minSum > 0 });
  }

  return `
    <div class="page-wrap">
      <div>
        <h1 style="margin:0; font-size:22px; font-weight:800;">Мои виджеты</h1>
        <div style="font-size:12.5px; color:var(--muted); margin-top:2px;">Добровольные инструменты первой версии для старта и тепла</div>
      </div>

      <!-- 1. Время для важного (Таймер подхода с раздельным подтверждением минут!) -->
      <div class="card" style="display:flex; flex-direction:column; gap:10px;">
        <div style="font-size:15.5px; font-weight:750;">⏱ Время для важного (подход с подтверждением минут)</div>
        <div style="font-size:12.5px; color:var(--muted);">
          Окончание таймера не ставит галочку само — ты сам подтверждаешь фактические минуты подхода.
        </div>
        ${ft ? `
          <div class="card-2" style="text-align:center;">
            <div style="font-size:12px; color:var(--muted);">${esc(ft.itemName || 'Свободный подход')}</div>
            <div id="fullTimerClock" style="font-size:30px; font-weight:800; font-family:var(--font-mono); color:var(--accent); margin:6px 0;">
              ${formatTimerClock(ft)}
            </div>
            <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
              ${ft.status === 'running' ? `<button type="button" class="btn-ghost" data-act="timer-pause">Пауза</button>` : ''}
              ${ft.status === 'paused' ? `<button type="button" class="btn-ghost" data-act="timer-resume">Продолжить</button>` : ''}
              <button type="button" class="btn-primary" data-act="timer-finish">Завершить и записать минуты</button>
              <button type="button" class="mini-btn" data-act="timer-reset">Сброс</button>
            </div>
          </div>
        ` : `
          <select id="focusItemPick" class="field">
            <option value="">Свободный подход без привязки</option>
            ${liveItems.map(i => `<option value="${esc(i.id)}">${esc(i.title)}</option>`).join('')}
          </select>
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn-ghost" style="flex:1;" data-act="timer-start" data-min="5">5 мин</button>
            <button type="button" class="btn-primary" style="flex:1;" data-act="timer-start" data-min="15">15 мин</button>
            <button type="button" class="btn-ghost" style="flex:1;" data-act="timer-start" data-min="25">25 мин</button>
          </div>
        `}
      </div>

      <!-- 2. Первый шаг (2 минуты) -->
      <div class="card" style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
        <div>
          <div style="font-size:15px; font-weight:750;">🚀 Первый шаг (правило 2 минут)</div>
          <div style="font-size:12px; color:var(--muted); margin-top:2px;">Начни на 2 лёгкие минуты — после них честно можно остановиться.</div>
        </div>
        <button type="button" class="pill active" data-act="timer-start" data-min="2">Начать 2 мин</button>
      </div>

      <!-- 3. Ритм недели (без требования идеальной непрерывной серии!) -->
      <div class="card" style="display:flex; flex-direction:column; gap:9px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-size:15px;">📊 Ритм недели</strong>
          <span style="font-size:12px; color:var(--accent); font-weight:700;">Активных дней: ${weekDays.filter(d => d.active).length} из 7</span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:6px; text-align:center;">
          ${weekDays.map(d => `
            <div class="card-2" style="padding:8px 4px; border-color:${d.active ? 'var(--accent-border)' : 'var(--border)'};">
              <div style="font-size:11px; color:var(--muted);">${d.wd}</div>
              <div style="font-size:13px; font-weight:800; color:${d.active ? 'var(--accent)' : 'var(--dim)'}; margin-top:3px;">${d.evCount || '·'}</div>
              <div style="font-size:9.5px; color:var(--amber);">${d.minSum ? d.minSum + 'м' : ''}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 4. Игра в счастье (200 реплик + личная коллекция хорошего) -->
      <div class="card" style="display:flex; flex-direction:column; gap:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-size:15px;">☀ Игра в счастье</strong>
          <button type="button" class="pill active" data-act="next-spark">Ещё тёплая реплика ✨</button>
        </div>
        <div class="card-2" style="font-size:13.5px; line-height:1.48;">
          «${esc(spark.text)}»
          <div style="font-size:11px; color:var(--muted); margin-top:4px;">— ${esc(spark.name)} · ${esc(spark.cat)}</div>
        </div>
        <div style="display:flex; gap:8px;">
          <input id="momentInput" class="field" placeholder="Записать свой хороший момент сегодня..."/>
          <button type="button" class="btn-ghost" data-act="save-moment">＋</button>
        </div>
        ${state.moments.slice().reverse().slice(0, 4).map(m => `
          <div style="font-size:12.5px; color:var(--muted);">💛 ${esc(m.date)}: ${esc(m.text)}</div>
        `).join('')}
      </div>
    </div>
  `;
}

// ============================================================================
// 5. ТИХИЙ ВЕЧЕР И ПЕРЕСМОТР (С настройкой блоков прямо рядом со сводкой периода!)
// ============================================================================
function renderEveningAndReviewView(state) {
  const sub = UI3.reviewSub || 'evening'; // 'evening' | 'periodic'
  const todayEvs = state.events.filter(e => e.active && e.date === state.lastDay);
  const todayMins = state.timeSessions.filter(t => t.date === state.lastDay).reduce((s, t) => s + (Number(t.minutes) || 0), 0);
  const liveBlocks = state.blocks.filter(b => !b.archivedAt);

  return `
    <div class="page-wrap">
      <div>
        <h1 style="margin:0; font-size:22px; font-weight:800;">Тихий вечер и пересмотр</h1>
        <div style="font-size:12.5px; color:var(--muted); margin-top:2px;">Сегодня: ${todayEvs.length} выполнений и ${todayMins} мин записанной практики</div>
      </div>

      <div class="seg-bar">
        <button type="button" class="seg-btn ${sub === 'evening' ? 'active' : ''}" data-act="set-review-sub" data-val="evening">Вечер сегодня</button>
        <button type="button" class="seg-btn ${sub === 'periodic' ? 'active' : ''}" data-act="set-review-sub" data-val="periodic">Пересмотр этапов и блоков</button>
      </div>

      ${sub === 'evening' ? `
        <div class="card" style="display:flex; flex-direction:column; gap:11px;">
          <div style="font-weight:700; font-size:14px;">Как ощущается завершение этого дня?</div>
          <div class="pills-wrap">
            ${[['calm','🌿 Спокойно'],['warm','✨ Наполненно'],['tired','🌙 Приятная усталость'],['rest','🫂 Нужен отдых']].map(([id, lbl]) => `
              <button type="button" class="pill ${UI3.eveningMood === id ? 'active' : ''}" data-act="set-evening-mood" data-val="${id}">${lbl}</button>
            `).join('')}
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button type="button" class="btn-ghost" style="padding:7px 12px; font-size:12px;" data-act="voice-evening">
              🎤 ${UI3.recording ? 'Остановить запись...' : 'Надиктовать голосом'}
            </button>
            <span style="font-size:11.5px; color:var(--muted);">минимум усилий</span>
          </div>
          <textarea id="evNoteField" class="field" rows="3" placeholder="Пару слов для себя: что сегодня получилось или порадовало?...">${esc(UI3.eveningDraft || '')}</textarea>
          <button type="button" class="btn-primary" data-act="save-evening-reflection">Завершить день и получить отклик</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:9px;">
          ${state.reviews.filter(r => r.scale === 'daily').slice().reverse().slice(0, 7).map(r => `
            <div class="card">
              <div style="font-size:11.5px; color:var(--muted);">${esc(r.date)} · <strong>${esc(r.moodLabel)}</strong></div>
              <div style="margin-top:5px;">${esc(r.text)}</div>
              <div style="margin-top:8px; padding:9px 12px; border-radius:12px; background:var(--accent-soft); font-size:12.5px;">
                💛 <em>${esc(r.reply)}</em>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <!-- Пересмотр со сводкой периода и непосредственным изменением приоритетов блоков (лучшая практика из сравнения!) -->
        <div class="card" style="display:flex; flex-direction:column; gap:10px;">
          <strong>Сводка за последние 30 дней</strong>
          <div style="font-size:13px; color:var(--muted);">
            Выполнено действий: <strong style="color:var(--text);">${state.events.filter(e => e.active).length}</strong> ·
            Записано минут: <strong style="color:var(--amber);">${state.timeSessions.reduce((s,t)=>s+(Number(t.minutes)||0),0)} мин</strong> ·
            Пройдено этапов: <strong style="color:var(--good);">${state.stages.filter(s=>s.status==='completed').length}</strong>
          </div>
          <div style="font-size:12.5px; color:var(--muted); border-top:1px solid var(--border); padding-top:8px;">
            Посмотри на свои Блоки времени прямо здесь и подстрой их приоритет на следующий период:
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${liveBlocks.map(b => {
              const cur = state.stages.find(s => s.id === b.currentStageId);
              return `
                <div class="card-2" style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
                  <div>
                    <div style="font-weight:700;">${esc(b.icon)} ${esc(b.name)}</div>
                    <div style="font-size:11.5px; color:var(--muted);">Этап: ${esc(cur ? cur.name : '—')}</div>
                  </div>
                  <div style="display:flex; gap:4px; align-items:center;">
                    ${[[1,'Тихо'],[2,'Обычно'],[3,'Приоритет']].map(([p, lbl]) => `
                      <button type="button" class="mini-btn" style="${(b.priority || 2) === p ? 'border-color:var(--accent); color:var(--accent); font-weight:750;' : ''}" data-act="set-block-prio" data-id="${esc(b.id)}" data-prio="${p}">${lbl}</button>
                    `).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `}
    </div>
  `;
}

// ============================================================================
// 6. НАСТРОЙКИ, ГИБКАЯ СЛОЖНОСТЬ И LIFEGAME AI
// ============================================================================
function renderSettingsAndAiView(state, openAiTab) {
  const tab = openAiTab ? 'ai' : (UI3.settingsTab || 'general');
  const liveBlocks = state.blocks.filter(b => !b.archivedAt);

  let aiPreview = '';
  if (tab === 'ai') {
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
    aiPreview = lines.join('\n');
  }

  return `
    <div class="page-wrap">
      <div>
        <h1 style="margin:0; font-size:22px; font-weight:800;">Настройки и LifeGame AI</h1>
        <div style="font-size:12.5px; color:var(--muted); margin-top:2px;">Уровень сложности, пространства жизни, резервные копии и ИИ-партнёр</div>
      </div>

      <div class="seg-bar">
        <button type="button" class="seg-btn ${tab !== 'ai' ? 'active' : ''}" data-act="set-settings-tab" data-val="general">Настройки и данные</button>
        <button type="button" class="seg-btn ${tab === 'ai' ? 'active' : ''}" data-act="set-settings-tab" data-val="ai">✨ LifeGame AI</button>
      </div>

      ${tab !== 'ai' ? `
        <!-- 1. Пространство: Моя жизнь vs Живой пример с Гитарой -->
        <div class="card" style="display:flex; flex-direction:column; gap:10px;">
          <div style="font-weight:750;">Пространство данных</div>
          <div class="grid-2">
            <button type="button" class="pill ${UI3.space === 'my' ? 'active' : ''}" style="padding:10px;" data-act="switch-space" data-val="my">🌱 Моя жизнь</button>
            <button type="button" class="pill ${UI3.space === 'demo' ? 'active' : ''}" style="padding:10px;" data-act="switch-space" data-val="demo">🎸 Пример (Гитара)</button>
          </div>
          ${UI3.space === 'demo' ? `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:var(--muted);">
              <span>Тестовая дата примера: <strong>${state.lastDay}</strong></span>
              <button type="button" class="mini-btn" style="color:var(--accent);" data-act="step-demo-date">+1 день вперёд ⏭</button>
            </div>
          ` : ''}
        </div>

        <!-- 2. Гибкая сложность: Базовый vs Полный режим + Особые периоды -->
        <div class="card" style="display:flex; flex-direction:column; gap:10px;">
          <div style="font-weight:750;">Глубина интерфейса (Гибкая сложность)</div>
          <div class="grid-2">
            <button type="button" class="pill ${state.complexity === 'basic' ? 'active' : ''}" style="padding:10px;" data-act="set-complexity" data-val="basic">Базовый (простой день)</button>
            <button type="button" class="pill ${state.complexity === 'full' ? 'active' : ''}" style="padding:10px;" data-act="set-complexity" data-val="full">Полный (Блоки и Этапы)</button>
          </div>

          <div style="font-size:12px; color:var(--muted); padding-top:4px;">Особый период жизни:</div>
          <div class="pills">
            <button type="button" class="pill ${state.specialMode === 'none' ? 'active' : ''}" data-act="set-special-mode" data-val="none">Обычный ход</button>
            <button type="button" class="pill ${state.specialMode === 'pause' ? 'active' : ''}" data-act="set-special-mode" data-val="pause">🎨 Творческая пауза</button>
            <button type="button" class="pill ${state.specialMode === 'red' ? 'active' : ''}" data-act="set-special-mode" data-val="red">🔴 Мобилизация на 1 блоке</button>
          </div>

          ${state.specialMode === 'red' ? `
            <div class="card-2" style="border-color:rgba(248,113,113,0.4);">
              <select class="field" data-change="set-red-block">
                ${liveBlocks.map(b => `<option value="${esc(b.id)}" ${state.redBlockId === b.id ? 'selected' : ''}>Приоритетный блок: ${esc(b.icon)} ${esc(b.name)}</option>`).join('')}
              </select>
              <div class="pills" style="margin-top:8px;">
                <button type="button" class="pill ${state.redCare.sleep ? 'active' : ''}" data-act="toggle-red-care" data-k="sleep">😴 Сон</button>
                <button type="button" class="pill ${state.redCare.water ? 'active' : ''}" data-act="toggle-red-care" data-k="water">💧 Вода</button>
                <button type="button" class="pill ${state.redCare.rest ? 'active' : ''}" data-act="toggle-red-care" data-k="rest">🌿 Выдох</button>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- 3. Палитра и комфорт -->
        <div class="card" style="display:flex; flex-direction:column; gap:10px;">
          <div style="font-weight:750;">Оформление и комфорт</div>
          <div class="pills">
            <button type="button" class="pill ${state.settings.theme === 'night' ? 'active' : ''}" data-act="set-theme" data-val="night">Ночной графит (v1)</button>
            <button type="button" class="pill ${state.settings.theme === 'dawn' ? 'active' : ''}" data-act="set-theme" data-val="dawn">Тихий рассвет</button>
            <button type="button" class="pill ${state.settings.theme === 'slate' ? 'active' : ''}" data-act="set-theme" data-val="slate">Сланец</button>
          </div>
          <div class="pills">
            <button type="button" class="pill ${state.settings.sound ? 'active' : ''}" data-act="toggle-setting" data-k="sound">${state.settings.sound ? '🔊 Звук вкл' : '🔇 Без звука'}</button>
            <button type="button" class="pill ${state.settings.showMotivation ? 'active' : ''}" data-act="toggle-setting" data-k="showMotivation">Мотивация на Главной</button>
            <button type="button" class="pill ${UI3.wide ? 'active' : ''}" data-act="toggle-wide">📱 / 🖥 Ширина</button>
          </div>
        </div>

        <!-- 4. Резервные копии, Чистый лист без потери опыта и Полный сброс -->
        <div class="card" style="display:flex; flex-direction:column; gap:10px;">
          <div style="font-weight:750;">Сохранность прогресса и копии</div>
          <div class="grid-2">
            <button type="button" class="btn-primary" data-act="export-json">⬇ Скачать JSON</button>
            <button type="button" class="btn-ghost" data-act="open-modal" data-modal="import-json">⬆ Импорт JSON</button>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" class="mini-btn" data-act="clean-plans-keep-xp">🌱 Чистый лист планов (опыт и достижения сохранятся)</button>
            <button type="button" class="mini-btn" style="color:var(--danger);" data-act="open-modal" data-modal="hard-reset">Полный сброс</button>
          </div>
        </div>
      ` : `
        <!-- LifeGame AI (прозрачный пакет контекста + согласие + безопасный импорт предложений) -->
        <div class="card" style="display:flex; flex-direction:column; gap:10px;">
          <strong>1. Пакет контекста для ИИ-партнёра</strong>
          <textarea class="field" rows="6" readonly style="font-size:11.5px; font-family:var(--font-mono);">${esc(aiPreview)}</textarea>
          <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; cursor:pointer;">
            <input type="checkbox" ${UI3.aiConsent ? 'checked' : ''} data-change="toggle-ai-consent"/>
            <span>Я проверил состав данных перед копированием</span>
          </label>
          <button type="button" class="btn-primary" data-act="copy-ai-context" ${!UI3.aiConsent ? 'disabled' : ''}>📋 Скопировать контекст</button>
        </div>

        <div class="card" style="display:flex; flex-direction:column; gap:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>2. Принять предложения ИИ</strong>
            <button type="button" class="mini-btn" data-act="fill-sample-ai">Пример JSON</button>
          </div>
          <textarea id="aiJsonInput" class="field" rows="3" placeholder='{"proposals":[{"title":"...","blockId":"b_guitar","kind":"habit"}]}'>${esc(UI3.aiDraft || '')}</textarea>
          <button type="button" class="btn-ghost" data-act="apply-ai-json">Добавить одобренные шаги (со страховочным снимком)</button>
        </div>
      `}
    </div>
  `;
}

// ============================================================================
// 7. ЧИСТЫЕ МОДАЛЬНЫЕ ОКНА С ПОСТЕПЕННЫМ РАСКРЫТИЕМ (<details> для доп. полей!)
// ============================================================================
function renderModalDialog(state) {
  const m = UI3.modal;
  if (!m) return '';

  let content = '';
  const liveBlocks = state.blocks.filter(b => !b.archivedAt);

  if (m.name === 'item-editor') {
    const existing = m.id ? state.items.find(i => i.id === m.id) : null;
    const f = UI3.itemForm;
    const selBlkStages = f.blockId ? state.stages.filter(s => s.blockId === f.blockId && !s.archivedAt && (s.role === 'step' || s.role === 'optimal')) : [];
    const selStageGoals = f.stageId ? state.goals.filter(g => g.stageId === f.stageId && g.status === 'active') : [];

    content = `
      <h3 style="margin:0 0 12px;">${existing ? 'Редактировать действие' : 'Новое действие'}</h3>
      <div style="display:grid; gap:10px;">
        <input id="ieTitle" class="field" maxlength="120" placeholder="Название действия*" value="${esc(f.title)}"/>

        <div class="pills">
          ${[['task','Задание'],['habit','Привычка'],['calendar','Встреча в календаре']].map(([k, lbl]) => `
            <button type="button" class="pill ${f.kind === k ? 'active' : ''}" data-act="ie-set-kind" data-val="${k}">${lbl}</button>
          `).join('')}
        </div>

        ${f.kind === 'habit' ? `
          <div class="grid-2">
            <label style="font-size:12px; color:var(--muted);">Повтор:
              <select id="ieSchedType" class="field" style="margin-top:4px;">
                <option value="daily" ${f.schedType === 'daily' ? 'selected' : ''}>Каждый день</option>
                <option value="weekly" ${f.schedType === 'weekly' ? 'selected' : ''}>Раз в неделю</option>
              </select>
            </label>
            <label style="font-size:12px; color:var(--muted);">Норма в день:
              <input id="ieTarget" type="number" min="1" max="50" class="field" style="margin-top:4px;" value="${f.dailyTarget || 1}"/>
            </label>
          </div>
        ` : `
          <div class="grid-2">
            <label style="font-size:12px; color:var(--muted);">Дата (необязательно):
              <input id="ieDate" type="date" class="field" style="margin-top:4px;" value="${esc(f.date || '')}"/>
            </label>
            ${f.kind === 'calendar' ? `
              <label style="font-size:12px; color:var(--muted);">Время:
                <input id="ieTime" type="time" class="field" style="margin-top:4px;" value="${esc(f.time || '15:00')}"/>
              </label>
            ` : `
              <label style="font-size:12px; color:var(--muted);">Повтор:
                <select id="ieSchedType" class="field" style="margin-top:4px;">
                  <option value="once" ${f.schedType === 'once' ? 'selected' : ''}>Разово</option>
                  <option value="daily" ${f.schedType === 'daily' ? 'selected' : ''}>Каждый день</option>
                  <option value="weekly" ${f.schedType === 'weekly' ? 'selected' : ''}>Еженедельно</option>
                  <option value="monthly" ${f.schedType === 'monthly' ? 'selected' : ''}>Ежемесячно</option>
                </select>
              </label>
            `}
          </div>
        `}

        <!-- Независимые галочки (Инвариант #4: Ключевое НЕ включает принудительно Конструктор при снятии!) -->
        <div style="display:flex; gap:12px; flex-wrap:wrap; font-size:13px; padding:4px 0;">
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
            <input type="checkbox" id="ieInDay" ${f.inDay ? 'checked' : ''} data-change="ie-toggle-inday"/> В Конструктор дня
          </label>
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
            <input type="checkbox" id="ieKey" ${f.isKey ? 'checked' : ''} data-change="ie-toggle-key"/> ★ Ключевое
          </label>
        </div>

        <div class="grid-2">
          <label style="font-size:12px; color:var(--muted);">Награда (0 = без монет):
            <input id="ieReward" type="number" min="0" max="10000" class="field" style="margin-top:4px;" value="${f.reward ?? 10}"/>
          </label>
          <label style="font-size:12px; color:var(--muted);">Темп нагрузки:
            <select id="ieLoad" class="field" style="margin-top:4px;">
              <option value="gentle" ${f.load === 'gentle' ? 'selected' : ''}>Лёгкая (все темпы)</option>
              <option value="normal" ${f.load === 'normal' ? 'selected' : ''}>Обычная</option>
              <option value="intense" ${f.load === 'intense' ? 'selected' : ''}>Для «Фигачу»</option>
            </select>
          </label>
        </div>

        <!-- Раскрываемые стратегические и дополнительные настройки (ноль перегруза!) -->
        <details class="card-2" ${f.blockId || f.ifTrigger ? 'open' : ''}>
          <summary style="cursor:pointer; font-size:12.5px; font-weight:700; color:var(--accent);">Блок, этап, цель и план «Если — то»</summary>
          <div style="display:grid; gap:8px; margin-top:10px;">
            <select id="ieBlock" class="field" data-change="ie-change-block">
              <option value="">Без блока (Быстрое добавление)</option>
              ${liveBlocks.map(b => `<option value="${esc(b.id)}" ${f.blockId === b.id ? 'selected' : ''}>${esc(b.icon)} ${esc(b.name)}</option>`).join('')}
            </select>

            ${f.blockId ? `
              <select id="ieStage" class="field" data-change="ie-change-stage">
                ${selBlkStages.map(s => `<option value="${esc(s.id)}" ${f.stageId === s.id ? 'selected' : ''}>Этап: ${esc(s.name)}</option>`).join('')}
              </select>
            ` : ''}

            ${f.stageId ? `
              <select id="ieGoal" class="field">
                <option value="">Без привязки к цели этапа</option>
                ${selStageGoals.map(g => `<option value="${esc(g.id)}" ${f.goalId === g.id ? 'selected' : ''}>🎯 ${esc(g.title)}</option>`).join('')}
              </select>
              <input id="ieNewGoalTitle" class="field" placeholder="Или создать новую цель прямо в этом этапе..." value="${esc(f.newGoalTitle || '')}"/>
            ` : ''}

            <input id="ieIfTrig" class="field" placeholder="Если возникнет помеха (напр. устал вечером)..." value="${esc(f.ifTrigger || '')}"/>
            <input id="ieIfAct" class="field" placeholder="То сделаю минимум (напр. 2 минуты практики)..." value="${esc(f.ifAction || '')}"/>
          </div>
        </details>

        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:4px;">
          ${existing ? `<button type="button" class="btn-ghost" style="color:var(--danger);" data-act="archive-item" data-id="${esc(existing.id)}">В архив</button>` : '<span></span>'}
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn-ghost" data-act="close-modal">Отмена</button>
            <button type="button" class="btn-primary" data-act="save-item-editor" data-id="${esc(existing ? existing.id : '')}">Сохранить</button>
          </div>
        </div>
      </div>
    `;
  } else if (m.name === 'stage-editor') {
    const st = m.id ? state.stages.find(s => s.id === m.id) : null;
    content = `
      <h3 style="margin:0 0 10px;">${st ? 'Изменить этап' : 'Новый планируемый этап'}</h3>
      <div style="display:grid; gap:9px;">
        <input id="seName" class="field" maxlength="120" placeholder="Название этапа*" value="${esc(st ? st.name : '')}"/>
        <input id="seDesc" class="field" placeholder="Короткое пояснение (необязательно)" value="${esc(st ? st.description : '')}"/>
        <textarea id="seMeaning" class="field" rows="3" placeholder="Смысл: зачем мне этот этап и что он даст в жизни?">${esc(st ? st.meaning : '')}</textarea>
        <div style="display:flex; justify-content:space-between; gap:8px; margin-top:4px;">
          ${(st && st.role === 'step' && st.id !== state.blocks.find(b=>b.id===st.blockId)?.currentStageId)
            ? `<button type="button" class="btn-ghost" style="color:var(--danger);" data-act="archive-stage" data-id="${esc(st.id)}">В архив</button>` : '<span></span>'}
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn-ghost" data-act="close-modal">Отмена</button>
            <button type="button" class="btn-primary" data-act="save-stage-editor" data-id="${esc(st ? st.id : '')}" data-block="${esc(m.blockId || (st && st.blockId) || '')}">Сохранить</button>
          </div>
        </div>
      </div>
    `;
  } else if (m.name === 'complete-stage') {
    const st = state.stages.find(s => s.id === m.id);
    if (!st) return '';
    const unfinished = state.items.filter(i => !i.archivedAt && i.stageId === st.id && !isOneOffEverDoneInCurrentCycle(state, i));
    content = `
      <h3 style="margin:0 0 8px;">🏆 Отметить этап пройденным</h3>
      <div style="font-size:13px; color:var(--muted); margin-bottom:12px;">
        Этап <strong>«${esc(st.name)}»</strong> перейдёт в «Мои достижения» этого блока, а рабочим станет следующий незавершённый этап.
      </div>
      ${unfinished.length > 0 ? `
        <div class="card-2" style="margin-bottom:12px; font-size:13px;">
          <div style="font-weight:700; margin-bottom:6px;">В этапе есть активные дела (${unfinished.length}) — как с ними поступить?</div>
          <label style="display:flex; gap:7px; align-items:center; margin-bottom:6px; cursor:pointer;">
            <input type="radio" name="stageCarryRule" value="next" checked/> Перенести в следующий этап (по умолчанию)
          </label>
          <label style="display:flex; gap:7px; align-items:center; cursor:pointer;">
            <input type="radio" name="stageCarryRule" value="keep"/> Оставить самостоятельными в блоке
          </label>
        </div>
      ` : ''}
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button type="button" class="btn-ghost" data-act="close-modal">Отмена</button>
        <button type="button" class="btn-primary" data-act="confirm-complete-stage" data-id="${esc(st.id)}">Подтвердить завершение</button>
      </div>
    `;
  } else if (m.name === 'goal-editor') {
    const g = m.id ? state.goals.find(x => x.id === m.id) : null;
    content = `
      <h3 style="margin:0 0 10px;">${g ? 'Изменить цель этапа' : 'Новая цель этапа'}</h3>
      <div style="display:grid; gap:9px;">
        <input id="geTitle" class="field" placeholder="Желаемый результат этапа*" value="${esc(g ? g.title : '')}"/>
        <input id="geCrit" class="field" placeholder="Как поймёшь, что цель достигнута? (критерий)" value="${esc(g ? g.criterion : '')}"/>
        <input id="geIfT" class="field" placeholder="Если возникнет препятствие (напр. устал вечером)..." value="${esc(g ? g.ifTrigger : '')}"/>
        <input id="geIfA" class="field" placeholder="То сделаю минимальный шаг..." value="${esc(g ? g.ifAction : '')}"/>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:4px;">
          <button type="button" class="btn-ghost" data-act="close-modal">Отмена</button>
          <button type="button" class="btn-primary" data-act="save-goal-editor" data-id="${esc(g ? g.id : '')}" data-stage="${esc(m.stageId || (g && g.stageId) || '')}">Сохранить цель</button>
        </div>
      </div>
    `;
  } else if (m.name === 'abandon-goal') {
    const g = state.goals.find(x => x.id === m.id);
    if (!g) return '';
    content = `
      <h3 style="margin:0 0 8px;">Осознанно отказаться от цели</h3>
      <div style="font-size:13px; color:var(--muted); margin-bottom:10px;">
        Отказ от цели <strong>«${esc(g.title)}»</strong> не даёт никаких штрафов, а связанные действия остаются сохранёнными.
      </div>
      <input id="abGoalReason" class="field" placeholder="Почему пересмотрел или отпустил цель? (по желанию)" value="${esc(g.reason || '')}"/>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
        <button type="button" class="btn-ghost" data-act="close-modal">Отмена</button>
        <button type="button" class="btn-primary" data-act="confirm-abandon-goal" data-id="${esc(g.id)}">Отказаться без штрафа</button>
      </div>
    `;
  } else if (m.name === 'new-block' || m.name === 'block-settings') {
    const b = m.id ? state.blocks.find(x => x.id === m.id) : null;
    content = `
      <h3 style="margin:0 0 10px;">${b ? 'Настройки блока времени' : 'Новый блок времени'}</h3>
      <div style="display:grid; gap:9px;">
        <div style="display:grid; grid-template-columns:72px 1fr; gap:8px;">
          <input id="bsIcon" class="field" style="text-align:center; font-size:20px;" value="${esc(b ? b.icon : '🎸')}" placeholder="🎸"/>
          <input id="bsName" class="field" placeholder="Название направления (напр. Гитара)*" value="${esc(b ? b.name : '')}"/>
        </div>
        <input id="bsSub" class="field" placeholder="Короткая подпись (необязательно)" value="${esc(b ? b.subtitle : '')}"/>
        <textarea id="bsMeaning" class="field" rows="2" placeholder="Зачем мне это направление в жизни?">${esc(b ? b.meaning : '')}</textarea>
        <select id="bsPreset" class="field">
          <option value="simple" ${(!b || b.preset !== 'full') ? 'selected' : ''}>Упрощённая стратегия (Достижения → Факт → Этапы → Оптимум)</option>
          <option value="full" ${(b && b.preset === 'full') ? 'selected' : ''}>Полная стратегия (+ Неизвестное и LVMG)</option>
        </select>
        ${b && b.preset === 'full' ? `
          <label style="font-size:12.5px; display:flex; align-items:center; gap:7px;">
            <input type="checkbox" id="bsKnownLvmg" ${b.routeKnownToLvmg ? 'checked' : ''}/> Примерный маршрут до LVMG уже понятен
          </label>
        ` : ''}
        <div style="display:flex; justify-content:space-between; gap:8px; margin-top:4px;">
          ${b && liveBlocks.length > 1 ? `<button type="button" class="btn-ghost" style="color:var(--danger);" data-act="archive-block" data-id="${esc(b.id)}">В архив</button>` : '<span></span>'}
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn-ghost" data-act="close-modal">Отмена</button>
            <button type="button" class="btn-primary" data-act="save-block-modal" data-id="${esc(b ? b.id : '')}">Сохранить</button>
          </div>
        </div>
      </div>
    `;
  } else if (m.name === 'edit-fact') {
    const b = state.blocks.find(x => x.id === m.id);
    if (!b) return '';
    content = `
      <h3 style="margin:0 0 8px;">Где я сейчас · ${esc(b.name)}</h3>
      <div style="font-size:12.5px; color:var(--muted); margin-bottom:8px;">Опиши честное фактическое состояние сейчас (это отправная точка, а не задача).</div>
      <textarea id="efText" class="field" rows="3">${esc(b.fact || '')}</textarea>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
        <button type="button" class="btn-ghost" data-act="close-modal">Отмена</button>
        <button type="button" class="btn-primary" data-act="save-fact" data-id="${esc(b.id)}">Сохранить</button>
      </div>
    `;
  } else if (m.name === 'add-past-stage') {
    content = `
      <h3 style="margin:0 0 8px;">🏆 Добавить прошлый пройденный этап</h3>
      <input id="apsName" class="field" placeholder="Что важного уже пройдено в этом направлении?"/>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
        <button type="button" class="btn-ghost" data-act="close-modal">Отмена</button>
        <button type="button" class="btn-primary" data-act="save-past-stage" data-id="${esc(m.id)}">Сохранить</button>
      </div>
    `;
  } else if (m.name === 'focus-for-item') {
    const it = state.items.find(i => i.id === m.id);
    content = `
      <h3 style="margin:0 0 6px;">⏱ Время и подход</h3>
      <div style="font-size:12.5px; color:var(--muted); margin-bottom:12px;">${esc(it ? it.title : '')} — минуты сохраняются отдельно от галочки выполнения.</div>
      <div style="font-size:12px; font-weight:700; margin-bottom:6px;">Запустить живой таймер:</div>
      <div style="display:flex; gap:8px; margin-bottom:12px;">
        <button type="button" class="btn-ghost" style="flex:1;" data-act="timer-start-item" data-id="${esc(m.id)}" data-min="5">▶ 5 мин</button>
        <button type="button" class="btn-primary" style="flex:1;" data-act="timer-start-item" data-id="${esc(m.id)}" data-min="15">▶ 15 мин</button>
        <button type="button" class="btn-ghost" style="flex:1;" data-act="timer-start-item" data-id="${esc(m.id)}" data-min="25">▶ 25 мин</button>
      </div>
      <div style="font-size:12px; font-weight:700; margin-bottom:6px;">Или сразу записать уже уделённые минуты:</div>
      <div class="pills">
        ${[5, 10, 15, 25, 45].map(mn => `<button type="button" class="pill active" data-act="quick-log-mins" data-id="${esc(m.id)}" data-min="${mn}">+${mn} мин</button>`).join('')}
      </div>
      <div style="display:flex; justify-content:flex-end; margin-top:12px;">
        <button type="button" class="btn-ghost" data-act="close-modal">Закрыть</button>
      </div>
    `;
  } else if (m.name === 'confirm-timer-mins') {
    const ft = state.focusTimer;
    const suggested = ft ? Math.max(1, Math.min(180, Math.round((ft.elapsedSec || 60) / 60) || ft.targetMin || 5)) : 10;
    content = `
      <h3 style="margin:0 0 6px;">Подтвердить время подхода</h3>
      <div style="font-size:12.5px; color:var(--muted); margin-bottom:10px;">
        ${esc(ft?.itemName || 'Практика')} · запись минут не закрывает само задание автоматически.
      </div>
      <label style="font-size:12px; color:var(--muted);">Фактические минуты (1–180):
        <input id="ctmInput" type="number" min="1" max="180" class="field" style="margin-top:4px;" value="${suggested}"/>
      </label>
      <div style="display:flex; justify-content:space-between; gap:8px; margin-top:12px;">
        <button type="button" class="btn-ghost" data-act="timer-reset">Не записывать</button>
        <button type="button" class="btn-primary" data-act="confirm-save-timer-mins">Записать минуты</button>
      </div>
    `;
  } else if (m.name === 'quest-editor') {
    const q = m.id ? state.quests.find(x => x.id === m.id) : null;
    content = `
      <h3 style="margin:0 0 10px;">${q ? 'Настроить квест' : 'Новый квест'}</h3>
      <div style="display:grid; gap:9px;">
        <input id="qeTitle" class="field" placeholder="Название квеста*" value="${esc(q ? q.title : '')}"/>
        ${!q ? `
          <select id="qeType" class="field">
            <option value="counter">Квест-счётчик (накопить N раз)</option>
            <option value="checklist">Квест с шагами (чек-лист)</option>
          </select>
        ` : ''}
        <input id="qeTargetOrSteps" class="field" placeholder="Число шагов (напр. 7) или пункты через запятую" value="${esc(q ? (q.qtype === 'counter' ? q.target : q.steps.map(s=>s.title).join(', ')) : '7')}"/>
        <select id="qeBlock" class="field">
          <option value="">Без привязки к блоку</option>
          ${liveBlocks.map(b => `<option value="${esc(b.id)}" ${(q && q.blockId === b.id) ? 'selected' : ''}>${esc(b.icon)} ${esc(b.name)}</option>`).join('')}
        </select>
        <select id="qeBonus" class="field">
          <option value="">Без предметного бонуса в финале</option>
          ${state.bonuses.filter(b => !b.archivedAt).map(b => `<option value="${esc(b.id)}" ${(q && q.linkedBonusId === b.id) ? 'selected' : ''}>🎁 ${esc(b.title)}</option>`).join('')}
        </select>
        <div style="display:flex; justify-content:space-between; gap:8px; margin-top:4px;">
          ${q ? `<button type="button" class="btn-ghost" style="color:var(--danger);" data-act="archive-quest" data-id="${esc(q.id)}">В архив</button>` : '<span></span>'}
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn-ghost" data-act="close-modal">Отмена</button>
            <button type="button" class="btn-primary" data-act="save-quest-modal" data-id="${esc(q ? q.id : '')}">Сохранить</button>
          </div>
        </div>
      </div>
    `;
  } else if (m.name === 'bonus-editor') {
    const b = m.id ? state.bonuses.find(x => x.id === m.id) : null;
    content = `
      <h3 style="margin:0 0 10px;">${b ? 'Изменить бонус' : 'Новый бонус в магазине'}</h3>
      <div style="display:grid; gap:9px;">
        <input id="beTitle" class="field" placeholder="Чем приятным порадовать себя?*" value="${esc(b ? b.title : '')}"/>
        <input id="beCost" type="number" min="5" max="50000" class="field" value="${b ? b.cost : 50}" placeholder="Цена в монетах"/>
        <div style="display:flex; justify-content:space-between; gap:8px;">
          ${b ? `<button type="button" class="btn-ghost" style="color:var(--danger);" data-act="archive-bonus" data-id="${esc(b.id)}">В архив</button>` : '<span></span>'}
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn-ghost" data-act="close-modal">Отмена</button>
            <button type="button" class="btn-primary" data-act="save-bonus-modal" data-id="${esc(b ? b.id : '')}">Сохранить</button>
          </div>
        </div>
      </div>
    `;
  } else if (m.name === 'cal-move') {
    const it = state.items.find(i => i.id === m.id);
    if (!it) return '';
    const nextD = shiftLocalDays(m.occ || state.lastDay, 1);
    content = `
      <h3 style="margin:0 0 8px;">Перенос даты: ${esc(it.title)}</h3>
      <div style="display:grid; gap:9px;">
        <input id="cmDate" type="date" class="field" value="${esc(nextD)}"/>
        <input id="cmTime" type="time" class="field" value="${esc(it.schedule?.time || '15:00')}"/>
        ${it.schedule?.type && it.schedule.type !== 'once' ? `
          <button type="button" class="btn-primary" data-act="confirm-cal-move" data-id="${esc(it.id)}" data-occ="${esc(m.occ)}" data-scope="single">Перенести только это появление</button>
          <button type="button" class="btn-ghost" data-act="confirm-cal-move" data-id="${esc(it.id)}" data-occ="${esc(m.occ)}" data-scope="all">Перенести всю серию</button>
        ` : `
          <button type="button" class="btn-primary" data-act="confirm-cal-move" data-id="${esc(it.id)}" data-occ="${esc(m.occ)}" data-scope="all">Сохранить новую дату</button>
        `}
        <button type="button" class="btn-ghost" data-act="close-modal">Отмена</button>
      </div>
    `;
  } else if (m.name === 'new-decision') {
    content = `
      <h3 style="margin:0 0 10px;">Принятое решение (Цена слова)</h3>
      <div style="display:grid; gap:9px;">
        <input id="ndTitle" class="field" placeholder="Какое важное решение фиксируешь?*"/>
        <div class="grid-2">
          <input id="ndDate" type="date" class="field" value="${esc(shiftLocalDays(state.lastDay, 7))}"/>
          <input id="ndStake" type="number" min="0" max="5000" class="field" value="30" placeholder="Ставка ●"/>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" class="btn-ghost" data-act="close-modal">Отмена</button>
          <button type="button" class="btn-primary" data-act="save-new-decision">Зафиксировать</button>
        </div>
      </div>
    `;
  } else if (m.name === 'motivation') {
    content = `
      <h3 style="margin:0 0 8px;">Личная мотивация на Главной</h3>
      <textarea id="motField" class="field" rows="3">${esc(state.settings.motivationText || '')}</textarea>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
        <button type="button" class="btn-ghost" data-act="close-modal">Отмена</button>
        <button type="button" class="btn-primary" data-act="save-motivation">Сохранить</button>
      </div>
    `;
  } else if (m.name === 'import-json') {
    content = `
      <h3 style="margin:0 0 8px;">Импорт сохранения JSON</h3>
      <div style="font-size:12px; color:var(--muted); margin-bottom:8px;">Принимаются файлы LifeGame 3.0, первой версии Root v1, Personal 1.2.0 и промежуточных сборок.</div>
      <input type="file" accept=".json,application/json" class="field" style="margin-bottom:8px; font-size:12px;" data-change="import-file-pick"/>
      <textarea id="impTextArea" class="field" rows="5" placeholder="Или вставь JSON сюда..."></textarea>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
        <button type="button" class="btn-ghost" data-act="close-modal">Отмена</button>
        <button type="button" class="btn-primary" data-act="confirm-import-json">Проверить и заменить прогресс</button>
      </div>
    `;
  } else if (m.name === 'hard-reset') {
    content = `
      <h3 style="margin:0 0 8px; color:var(--danger);">Полный сброс пространства</h3>
      <div style="font-size:12.5px; color:var(--muted); margin-bottom:10px;">Чтобы случайно не потерять прогресс, введи слово <strong>СБРОС</strong> заглавными буквами:</div>
      <input id="resetWordInput" class="field" placeholder="СБРОС"/>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
        <button type="button" class="btn-ghost" data-act="close-modal">Отмена</button>
        <button type="button" class="btn-primary" style="background:var(--danger); color:#fff;" data-act="confirm-hard-reset">Сбросить</button>
      </div>
    `;
  } else if (m.name === 'return-bridge') {
    content = `
      <h3 style="margin:0 0 8px;">🌿 С возвращением в LifeGame</h3>
      <div style="font-size:13px; color:var(--muted); line-height:1.48; margin-bottom:12px;">
        Прошло несколько дней с прошлого входа. Система бережно перевела дату на сегодня (${humanDateShort(state.lastDay)}) без лавины штрафов — все твои Блоки времени, Этапы и опыт в полной сохранности.
      </div>
      <div style="display:flex; gap:8px;">
        <button type="button" class="btn-primary" style="flex:1;" data-act="close-modal">Продолжить в сегодняшнем дне</button>
        <button type="button" class="btn-ghost" data-act="switch-to-basic-welcome">Войти через Базовый ритм</button>
      </div>
    `;
  }

  return `
    <div class="modal-backdrop" data-act="backdrop-dismiss">
      <div class="modal-sheet">${content}</div>
    </div>
  `;
}

function formatTimerClock(ft) {
  if (!ft) return '0:00';
  const totalSec = (Number(ft.targetMin) || 15) * 60;
  const rem = Math.max(0, totalSec - (Number(ft.elapsedSec) || 0));
  return `${Math.floor(rem / 60)}:${String(rem % 60).padStart(2, '0')}`;
}
