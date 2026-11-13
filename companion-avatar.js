// LifeGame 3.0.2 — Сменный модуль визуализации и 60-FPS анимации внеэкранных спутников (window.LG3CompanionAvatar)
// Архитектурный принцип: вся графика и пластика изолированы здесь. Чтобы заменить вектор на внешние SVG, спрайты или Rive,
// достаточно обновить только этот модуль, не меняя логику приложения и базу companion-db.js.

const LG3_SPRITE_STORAGE_KEY = 'lifegame_v3_custom_sprite';

const LG3_COMPANION_ARCHETYPES = [
  {
    id: 'wayfarer',
    name: 'Путник',
    pillar: 'Верность своему пути',
    shortDesc: 'Звёздно-сапфировый плащ и живой золотой шарф — напоминает идти в своём темпе без чужих гонок.',
    voices: {
      lite: 'Идём налегке — сегодня важен один спокойный шаг.',
      pro: 'Вижу весь маршрут этапа и держу твой курс.',
      tired: 'Пять дней идём против ветра… Привал или берём рубеж?',
      fierce: 'Шарф затянут, взгляд собран — держу строй рядом!',
      rest: 'Тёплый привал — законная часть большой дороги.'
    }
  },
  {
    id: 'hearth',
    name: 'Живой Очаг',
    pillar: 'Желание жить',
    shortDesc: 'Танцующее пламя в кованой бронзовой чаше — бережёт внутренний огонь от выгорания.',
    voices: {
      lite: 'Берегу тёплый огонёк внутри без спешки и гонки.',
      pro: 'Пламя маяка собрано ровно — горизонт ясный.',
      tired: 'Жар гудит пятый день подряд… Подбросим дров или дадим остыть?',
      fierce: 'Горн раздут в один чистый луч — работаем мощно и бережно!',
      rest: 'Тихий уголёк под золой спокойно копит силы до утра.'
    }
  },
  {
    id: 'sprout',
    name: 'Росток Древа',
    pillar: 'Рост без насилия',
    shortDesc: 'Живой побег цвета лесного нефрита — растёт к свету от корней, а не от рывков за верхушку.',
    voices: {
      lite: 'Даже пять минут внимания сегодня уже питают корни.',
      pro: 'Крона этапов крепнет и спокойно тянется к свету.',
      tired: 'Пять дней бурного роста… Дадим корням напиться тишины?',
      fierce: 'Все соки собраны в верхушку прорыва — тянемся к свету!',
      rest: 'Листья сложены на ночь — корни растут в тишине.'
    }
  },
  {
    id: 'kintsugi',
    name: 'Кинцуги',
    pillar: 'Сила возвращений',
    shortDesc: 'Дымчато-голубая керамика с золотыми швами — паузы и пересмотры делают тебя только крепче.',
    voices: {
      lite: 'Никаких долгов за живую жизнь — просто продолжаем.',
      pro: 'Золотые швы опыта держат форму надёжнее брони.',
      tired: 'Пять суток плотного напряжения… Снимем нагрузку со швов?',
      fierce: 'Пластины сомкнуты в монолит — проходим этот участок вместе!',
      rest: 'Тишина лечит и наполняет швы мягким светом.'
    }
  },
  {
    id: 'astrolabe',
    name: 'Хранитель Курса',
    pillar: 'Мечта и шаг',
    shortDesc: 'Старинный латунный компас со светлым циферблатом — соединяет дальний смысл с делом сегодня.',
    voices: {
      lite: 'Стрелка спокойна: одно нужное дело прямо перед тобой.',
      pro: 'Кольца астролябии сведены — Оптимум и этап в фокусе.',
      tired: 'Пять дней стрелка зажата в зените… Отпустим в свободный ход?',
      fierce: 'Курс заперт на главном приоритете — ни градуса в сторону!',
      rest: 'Крышка прикрыта, звёзды чистые — время выдохнуть.'
    }
  }
];

function getCompanionArchetype(id) {
  return LG3_COMPANION_ARCHETYPES.find(a => a.id === id) || LG3_COMPANION_ARCHETYPES[0];
}

// Определение текущей визуальной позы спутника по реальному состоянию LifeGame 3.0
function resolveCompanionPosture(state, previewOverride) {
  if (previewOverride && ['lite', 'pro', 'tired', 'fierce', 'rest'].includes(previewOverride)) {
    return previewOverride;
  }
  if (!state) return 'pro';
  const dayRec = (state.days && state.days[state.lastDay]) || {};
  if (state.specialMode === 'pause' || dayRec.tempo === 'rest') {
    return 'rest';
  }
  if (state.specialMode === 'red') {
    const comp = state.companion || {};
    if (comp.fierceUntilDate && comp.fierceUntilDate >= state.lastDay) {
      return 'fierce';
    }
    const redDays = Number(comp.redDaysCount) || 1;
    const extUntil = comp.redExtendedUntil || '';
    if (redDays >= 5 && (!extUntil || state.lastDay > extUntil)) {
      return 'tired';
    }
    return 'fierce';
  }
  if (state.complexity === 'basic') {
    return 'lite';
  }
  return 'pro';
}

function countRedCareDone(state) {
  if (!state || !state.redCare) return 0;
  return (state.redCare.sleep ? 1 : 0) + (state.redCare.water ? 1 : 0) + (state.redCare.rest ? 1 : 0);
}

const LG3CompanionAvatar = {
  rafId: null,
  pointerX: 0.4,
  pointerY: 0.45,
  celebrateUntil: 0,
  customSpriteCache: undefined,

  getCustomSprite() {
    if (this.customSpriteCache !== undefined) return this.customSpriteCache;
    try {
      this.customSpriteCache = window.localStorage.getItem(LG3_SPRITE_STORAGE_KEY) || null;
    } catch (e) {
      this.customSpriteCache = null;
    }
    return this.customSpriteCache;
  },

  setCustomSprite(dataUrl) {
    try {
      if (!dataUrl) {
        window.localStorage.removeItem(LG3_SPRITE_STORAGE_KEY);
        this.customSpriteCache = null;
      } else {
        window.localStorage.setItem(LG3_SPRITE_STORAGE_KEY, dataUrl);
        this.customSpriteCache = dataUrl;
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  celebrate() {
    this.celebrateUntil = performance.now() + 1850;
  },

  drawEyes(cx1, cx2, cy, lookX, lookY, blinkScale, color, posture, joyful) {
    if (posture === 'rest') {
      return `<path d="M ${cx1 - 4.5} ${cy} Q ${cx1} ${cy + 3.6} ${cx1 + 4.5} ${cy}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>` +
             `<path d="M ${cx2 - 4.5} ${cy} Q ${cx2} ${cy + 3.6} ${cx2 + 4.5} ${cy}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>`;
    }
    if (joyful) {
      return `<path d="M ${cx1 - 4.5} ${cy + 1.5} Q ${cx1} ${cy - 4.8} ${cx1 + 4.5} ${cy + 1.5}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>` +
             `<path d="M ${cx2 - 4.5} ${cy + 1.5} Q ${cx2} ${cy - 4.8} ${cx2 + 4.5} ${cy + 1.5}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>`;
    }
    if (posture === 'fierce') {
      return `<polygon points="${cx1 - 5},${cy - 3.5} ${cx1 + 4.5},${cy - 0.3} ${cx1 - 3.5},${cy + 3.2}" fill="${color}"/>` +
             `<polygon points="${cx2 + 5},${cy - 3.5} ${cx2 - 4.5},${cy - 0.3} ${cx2 + 3.5},${cy + 3.2}" fill="${color}"/>`;
    }
    if (posture === 'tired') {
      return `<ellipse cx="${(cx1 + lookX * 0.5).toFixed(1)}" cy="${(cy + 1).toFixed(1)}" rx="3.4" ry="2.1" fill="${color}"/>` +
             `<ellipse cx="${(cx2 + lookX * 0.5).toFixed(1)}" cy="${(cy + 1).toFixed(1)}" rx="3.4" ry="2.1" fill="${color}"/>` +
             `<path d="M ${cx1 - 5} ${cy - 3.8} L ${cx1 + 4} ${cy - 2.1}" stroke="${color}" stroke-width="1.6" stroke-linecap="round"/>` +
             `<path d="M ${cx2 + 5} ${cy - 3.8} L ${cx2 - 4} ${cy - 2.1}" stroke="${color}" stroke-width="1.6" stroke-linecap="round"/>`;
    }
    return `<ellipse cx="${(cx1 + lookX).toFixed(1)}" cy="${(cy + lookY).toFixed(1)}" rx="3.3" ry="${(3.7 * blinkScale).toFixed(2)}" fill="${color}"/>` +
           `<ellipse cx="${(cx2 + lookX).toFixed(1)}" cy="${(cy + lookY).toFixed(1)}" rx="3.3" ry="${(3.7 * blinkScale).toFixed(2)}" fill="${color}"/>`;
  },

  renderSVGContent(opts, t) {
    const arch = opts.archetype || 'wayfarer';
    const posture = opts.posture || 'pro';
    const xpLevel = Math.max(1, Number(opts.xpLevel) || 1);
    const careCount = Math.max(0, Math.min(3, Number(opts.careCount) || 0));
    const joyful = !!opts.joyful;
    const withPaws = opts.withPaws !== false;

    const isPro = posture === 'pro';
    const isTired = posture === 'tired';
    const isFierce = posture === 'fierce';
    const isRest = posture === 'rest';

    const blinkCycle = (t * 0.95) % 4.3;
    const blinkScale = (blinkCycle > 4.08 && blinkCycle < 4.24) ? 0.12 : 1;
    const lookX = (this.pointerX - 0.5) * 3.2;
    const lookY = (this.pointerY - 0.5) * 2.2;

    const breath = isRest ? Math.sin(t * 1.4) * 1.5 : (isTired ? Math.sin(t * 4.8) * 2.6 : Math.sin(t * 2.4) * 2.2);
    const bounceY = joyful ? -Math.abs(Math.sin(t * 6.8)) * 9 : breath;
    const tilt = isTired ? -4 + Math.sin(t * 2.2) * 1.8 : (isFierce ? 2.5 : Math.sin(t * 1.5) * 1.6);

    // Ореол опыта XP (несгораемый поверх любого режима!)
    let xpCrown = '';
    if (xpLevel >= 8) {
      const r = 42 + 1.4 * Math.sin(t * 2.1);
      xpCrown += `<circle cx="56" cy="58" r="${r.toFixed(1)}" fill="none" stroke="#ffd54a" stroke-width="1.25" stroke-dasharray="3 6" opacity="0.82"/>`;
    }
    if (xpLevel >= 4) {
      const p = 1 + 0.12 * Math.sin(t * 3.1);
      const sx = 56, sy = 13;
      xpCrown += `<polygon points="${sx},${(sy - 6 * p).toFixed(1)} ${sx + 2},${sy - 2} ${(sx + 6 * p).toFixed(1)},${sy} ${sx + 2},${sy + 2} ${sx},${(sy + 6 * p).toFixed(1)} ${sx - 2},${sy + 2} ${(sx - 6 * p).toFixed(1)},${sy} ${sx - 2},${sy - 2}" fill="#ffd54a"/>`;
    }

    // Контур Мобилизации (рубиново-янтарный фокус + 3 огонька базы Сон · Вода · Выдох)
    let redAura = '';
    if (isFierce) {
      const flameR = 39 + Math.sin(t * 5.5) * 2.2;
      redAura = `<circle cx="56" cy="60" r="${flameR.toFixed(1)}" fill="rgba(248,113,113,0.14)" stroke="#fb923c" stroke-width="1.8" stroke-dasharray="6 4"/>`;
    } else if (isTired) {
      redAura = `<circle cx="56" cy="62" r="37" fill="rgba(248,113,113,0.08)" stroke="rgba(248,113,113,0.45)" stroke-width="1.3" stroke-dasharray="3 5"/>`;
    } else if (isRest) {
      redAura = `<circle cx="56" cy="62" r="36" fill="rgba(129,140,248,0.13)"/>`;
    }

    const sweatDrop = isTired
      ? `<path d="M 79 ${34 + Math.sin(t * 3.5) * 2} C 79 34 84 41 84 44 A 4.8 4.8 0 1 1 74.4 44 C 74.4 41 79 34 79 34 Z" fill="#60a5fa" stroke="#dbeafe" stroke-width="1"/>`
      : '';

    const careOrbs = (isFierce || isTired)
      ? [0, 1, 2].map(idx => {
          const lit = idx < careCount;
          const ox = 36 + idx * 20;
          const oy = 98 + (idx === 1 ? 3 : 0);
          return `<circle cx="${ox}" cy="${oy}" r="${lit ? 4.2 : 3.2}" fill="${lit ? '#ffd54a' : 'rgba(255,255,255,0.18)'}" stroke="${lit ? '#fb923c' : 'rgba(248,113,113,0.45)'}" stroke-width="1.2"/>`;
        }).join('')
      : '';

    const joySparks = joyful
      ? `<circle cx="22" cy="${(34 - ((t * 28) % 20)).toFixed(1)}" r="3" fill="#ffd54a"/>` +
        `<circle cx="88" cy="${(38 - (((t + 0.3) * 26) % 20)).toFixed(1)}" r="2.6" fill="#34d399"/>` +
        `<circle cx="56" cy="${(24 - (((t + 0.6) * 24) % 18)).toFixed(1)}" r="2.5" fill="#fb923c"/>`
      : '';

    let body = '';
    if (arch === 'wayfarer') {
      const scarfY = 69 + Math.sin(t * 4.1) * 4.5;
      const cloakFill = isRest ? '#273252' : '#2c3e66';
      const rimColor = isFierce ? '#fb923c' : (isPro ? '#ffd54a' : '#7aa2f7');
      body = `
        <path d="M 44 66 Q 22 ${scarfY.toFixed(1)} 15 ${(scarfY + 7).toFixed(1)}" fill="none" stroke="#ffd54a" stroke-width="${isFierce || isPro ? 6 : 4.5}" stroke-linecap="round"/>
        <path d="M 30 92 L 37 44 Q 56 21 75 44 L 82 92 Q 56 99 30 92 Z" fill="${cloakFill}" stroke="${rimColor}" stroke-width="2"/>
        <path d="M 36 50 Q 56 20 76 50 Q 56 44 36 50 Z" fill="#3b5284"/>
        <ellipse cx="56" cy="54" rx="16" ry="12.5" fill="#131926"/>
        ${this.drawEyes(49, 63, 54, lookX, lookY, blinkScale, '#ffd54a', posture, joyful)}
        <path d="M 38 64 Q 56 72 74 64" fill="none" stroke="#ffd54a" stroke-width="${isRest ? 7.5 : 5.5}" stroke-linecap="round"/>
        ${isPro ? `<polygon points="28,66 40,60 39,74" fill="#ffd54a"/><polygon points="84,66 72,60 73,74" fill="#ffd54a"/><circle cx="56" cy="76" r="4" fill="#ffd54a"/><circle cx="44" cy="83" r="1.5" fill="#ffd54a"/><circle cx="67" cy="82" r="1.5" fill="#ffd54a"/>` : ''}
        ${isFierce ? `<path d="M 74 64 Q 90 54 88 42" fill="none" stroke="#fb923c" stroke-width="3.2" stroke-linecap="round"/>` : ''}
      `;
    } else if (arch === 'hearth') {
      const tipX = 56 + Math.sin(t * (isFierce ? 7 : 4.6)) * (isRest ? 2 : 5);
      const tipY = (isRest ? 44 : (isFierce ? 19 : 25)) + Math.cos(t * 4.2) * 2.8;
      const outerFlame = isFierce ? '#f97316' : (isRest ? '#d97706' : '#f59e0b');
      const innerFlame = isRest ? '#fde68a' : '#fff7ed';
      body = `
        <path d="M ${tipX.toFixed(1)} ${tipY.toFixed(1)} C 79 40 81 62 76 78 C 72 88 64 92 56 92 C 47 92 40 88 36 78 C 31 62 33 40 ${tipX.toFixed(1)} ${tipY.toFixed(1)} Z" fill="${outerFlame}"/>
        <path d="M ${(56 + Math.cos(t * 5.2) * 2.5).toFixed(1)} ${(tipY + 13).toFixed(1)} C 70 49 71 64 68 76 C 65 83 61 86 56 86 C 51 86 47 83 44 76 C 41 64 42 49 ${(56 + Math.cos(t * 5.2) * 2.5).toFixed(1)} ${(tipY + 13).toFixed(1)} Z" fill="#ffd54a"/>
        <ellipse cx="56" cy="68" rx="11" ry="9" fill="${innerFlame}" opacity="0.45"/>
        ${this.drawEyes(49, 63, 64, lookX, lookY, blinkScale, '#3b1d0a', posture, joyful)}
        <path d="M 34 80 L 78 80 L 72 93 Q 56 97 40 93 Z" fill="#8c5530" stroke="${isPro || isFierce ? '#ffd54a' : '#c28356'}" stroke-width="2"/>
        ${isPro ? `<polygon points="40,32 48,22 56,29 64,22 72,32" fill="#ffd54a"/>` : ''}
      `;
    } else if (arch === 'sprout') {
      const sway = Math.sin(t * 2.8) * (isRest ? 1.8 : 4.5);
      const bodyColor = isPro ? '#255c47' : '#1f6f54';
      const rim = isFierce ? '#fb923c' : (isPro ? '#ffd54a' : '#6ee7b7');
      body = `
        <path d="M 56 42 Q ${(54 + sway).toFixed(1)} 25 ${(40 + sway).toFixed(1)} 21 Q ${(51 + sway).toFixed(1)} 32 56 42 Z" fill="#34d399"/>
        <path d="M 56 42 Q ${(58 + sway).toFixed(1)} 24 ${(73 + sway).toFixed(1)} 19 Q ${(61 + sway).toFixed(1)} 32 56 42 Z" fill="${isFierce ? '#fbbf24' : '#34d399'}"/>
        ${(isPro || isFierce) ? `<circle cx="${(56 + sway * 0.6).toFixed(1)}" cy="21" r="4.3" fill="#ffd54a"/>` : ''}
        <rect x="35" y="42" width="42" height="49" rx="20" fill="${bodyColor}" stroke="${rim}" stroke-width="2"/>
        ${(isPro || isFierce) ? `<path d="M 34 68 L 46 62 L 56 69 L 66 62 L 78 68 L 75 90 L 37 90 Z" fill="#8b5e3c" stroke="#ffd54a" stroke-width="1.6"/>` : ''}
        ${this.drawEyes(48, 64, 58, lookX, lookY, blinkScale, '#ecfdf5', posture, joyful)}
        ${!isRest && !isFierce ? `<path d="M 52 67 Q 56 70 60 67" fill="none" stroke="#ecfdf5" stroke-width="1.9" stroke-linecap="round"/>` : ''}
      `;
    } else if (arch === 'kintsugi') {
      const fl = Math.sin(t * 3) * 3;
      const seamColor = isFierce ? '#fb923c' : '#ffd54a';
      body = `
        ${isPro ? `<polygon points="24,${(54 + fl).toFixed(1)} 32,${(44 + fl).toFixed(1)} 32,${(66 + fl).toFixed(1)}" fill="#ffd54a"/><polygon points="88,${(54 - fl).toFixed(1)} 80,${(44 - fl).toFixed(1)} 80,${(66 - fl).toFixed(1)}" fill="#ffd54a"/>` : ''}
        <rect x="34" y="37" width="44" height="54" rx="21" fill="#475266" stroke="${isPro || isFierce ? seamColor : '#94a3b8'}" stroke-width="2"/>
        <path d="M 38 49 L 50 55 L 58 43 L 72 52" fill="none" stroke="${seamColor}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M 40 79 L 54 73 L 64 81 L 74 75" fill="none" stroke="${seamColor}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
        ${this.drawEyes(48, 64, 61, lookX, lookY, blinkScale, '#fef08a', posture, joyful)}
      `;
    } else {
      const wing = isPro || isFierce ? (5 + Math.sin(t * 3) * 3) : 0;
      const needle = isFierce ? 0 : (isRest ? -28 : Math.sin(t * 1.9) * 20);
      body = `
        ${(isPro || isFierce) ? `<path d="M 33 60 L ${(17 - wing * 0.5).toFixed(1)} ${(44 - wing).toFixed(1)} L 24 69 Z" fill="#ffd54a"/><path d="M 79 60 L ${(95 + wing * 0.5).toFixed(1)} ${(44 - wing).toFixed(1)} L 88 69 Z" fill="#ffd54a"/>` : ''}
        <circle cx="56" cy="62" r="24" fill="#b8863b" stroke="${isFierce ? '#fb923c' : '#ffd54a'}" stroke-width="2.4"/>
        <circle cx="56" cy="62" r="19" fill="#e5dec9"/>
        <g transform="translate(56, 40) rotate(${needle.toFixed(1)})">
          <polygon points="0,-9 3.5,0 -3.5,0" fill="${isFierce ? '#ef4444' : '#b45309'}"/>
        </g>
        ${this.drawEyes(48, 64, 62, lookX, lookY, blinkScale, '#292524', posture, joyful)}
        ${!isRest && !isFierce ? `<path d="M 52 70 Q 56 73 60 70" fill="none" stroke="#292524" stroke-width="1.9" stroke-linecap="round"/>` : ''}
      `;
    }

    // Передний слой лапок, которыми спутник держится за кромку экрана (слева — за правый борт ПК-колонки)
    const paws = (withPaws && !isRest)
      ? `<ellipse cx="14" cy="56" rx="5.8" ry="4.2" fill="#ffd54a" stroke="#78350f" stroke-width="1"/>` +
        `<ellipse cx="14" cy="76" rx="5.8" ry="4.2" fill="#ffd54a" stroke="#78350f" stroke-width="1"/>`
      : '';

    return `
      ${joySparks}
      ${redAura}
      <g transform="translate(0, ${bounceY.toFixed(2)}) rotate(${tilt.toFixed(2)}, 56, 68)">
        ${xpCrown}
        ${body}
        ${sweatDrop}
      </g>
      ${careOrbs}
      ${paws}
    `;
  },

  renderStaticPreviewSVG(archetype, posture, xpLevel, careCount) {
    const inner = this.renderSVGContent({
      archetype,
      posture: posture || 'pro',
      xpLevel: xpLevel || 5,
      careCount: careCount || 2,
      joyful: false,
      withPaws: false
    }, 1.2);
    return `<svg viewBox="0 0 112 108" width="56" height="54" aria-hidden="true">${inner}</svg>`;
  },

  startLoop(getStateFn) {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (!this._pointerBound) {
      this._pointerBound = true;
      window.addEventListener('pointermove', (e) => {
        this.pointerX = Math.max(0, Math.min(1, e.clientX / Math.max(1, window.innerWidth)));
        this.pointerY = Math.max(0, Math.min(1, e.clientY / Math.max(1, window.innerHeight)));
      }, { passive: true });
    }

    const tick = (ms) => {
      this.rafId = requestAnimationFrame(tick);
      if (document.hidden) return;
      const svgEl = document.getElementById('lg3OffscreenSvg');
      if (!svgEl) return;
      const state = typeof getStateFn === 'function' ? getStateFn() : null;
      if (!state || !state.companion || state.companion.enabled === false || state.companion.tucked) return;

      const w = typeof calcWallet === 'function' ? calcWallet(state) : { level: 1 };
      const posture = resolveCompanionPosture(state, window.UI3 ? window.UI3.previewPosture : null);
      const joyful = ms < this.celebrateUntil;
      svgEl.innerHTML = this.renderSVGContent({
        archetype: state.companion.archetype || 'wayfarer',
        posture,
        xpLevel: w.level,
        careCount: countRedCareDone(state),
        joyful,
        withPaws: true
      }, ms * 0.001);
    };
    this.rafId = requestAnimationFrame(tick);
  }
};

window.LG3CompanionAvatar = LG3CompanionAvatar;
