import { qs, qsa, on, formatNumber } from '../foundation/helpers.js';
import { storage } from '../foundation/storage.js';
import { STORAGE_KEYS } from '../foundation/constants.js';

const PATTERN_RESPONSES = {
  sendiri: 'Kendaraan pribadi punya jejak yang paling terasa dari jarak yang sama. Di Jejak, kamu bisa lihat detailnya.',
  bersama: 'Berbagi perjalanan membagi jejaknya ke lebih banyak orang. Langkah kecil yang cukup terasa.',
  umum: 'Transportasi umum biasanya punya jejak per orang yang jauh lebih rendah untuk jarak yang sama.',
  jalan: 'Jalan kaki dan sepeda nyaris tidak meninggalkan jejak emisi. Titik awal yang baik untuk dibandingkan.',
};

const PULSE_RESPONSES = {
  kurangi: 'Mengurangi satu perjalanan yang tidak perlu adalah langkah paling sederhana untuk memulai.',
  berbagi: 'Berbagi perjalanan membuat satu jejak dibagi ke lebih banyak orang.',
  umum: 'Transportasi umum mengubah pola perjalanan individual menjadi kolektif.',
  jalan: 'Jalan kaki atau sepeda cocok untuk perjalanan pendek dan hampir tidak berjejak.',
};

const ACTION_STEP_COUNT = 7;

function initPatternSelector() {
  const cards = qsa('[data-pattern]');
  const response = qs('[data-pattern-response]');
  if (!cards.length || !response) return;

  const responseText = qs('[data-pattern-response-text]', response);

  cards.forEach((card) => {
    on(card, 'click', () => {
      cards.forEach((c) => {
        c.classList.remove('is-active');
        c.setAttribute('aria-pressed', 'false');
        const label = qs('[data-select-label]', c);
        if (label) label.textContent = 'Pilih pola';
      });
      card.classList.add('is-active');
      card.setAttribute('aria-pressed', 'true');
      const selectedLabel = qs('[data-select-label]', card);
      if (selectedLabel) selectedLabel.textContent = 'Dipilih';

      const pattern = card.dataset.pattern;
      if (responseText && PATTERN_RESPONSES[pattern]) {
        responseText.textContent = PATTERN_RESPONSES[pattern];
      }
      response.classList.add('is-visible');

      storage.set(STORAGE_KEYS.homePattern, pattern);
    });
  });

  const saved = storage.get(STORAGE_KEYS.homePattern);
  if (saved) {
    const match = cards.find((c) => c.dataset.pattern === saved);
    if (match) match.click();
  }
}

function initMiniCalculator() {
  const slider = qs('#calc-distance');
  const sliderValue = qs('#calc-distance-value');
  const toggleButtons = qsa('[data-trip]');
  const results = {
    day: qs('[data-result="day"]'),
    month: qs('[data-result="month"]'),
    year: qs('[data-result="year"]'),
  };

  if (!slider || !toggleButtons.length) return;

  let tripMultiplier = 1;

  function render() {
    const distance = Number(slider.value);
    sliderValue.textContent = `${distance} KM`;

    const perDay = distance * tripMultiplier;
    const perMonth = perDay * 20;
    const perYear = perDay * 240;

    if (results.day) results.day.textContent = `${formatNumber(perDay)} KM`;
    if (results.month) results.month.textContent = `${formatNumber(perMonth)} KM`;
    if (results.year) results.year.textContent = `${formatNumber(perYear)} KM`;
  }

  on(slider, 'input', render);

  toggleButtons.forEach((btn) => {
    on(btn, 'click', () => {
      toggleButtons.forEach((b) => b.classList.remove('is-active'));
      toggleButtons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.classList.add('is-active');
      btn.setAttribute('aria-pressed', 'true');
      tripMultiplier = btn.dataset.trip === 'round' ? 2 : 1;
      render();
    });
  });

  render();
}

function initFaqAccordion() {
  const items = qsa('.faq__item');
  if (!items.length) return;

  items.forEach((item) => {
    const question = qs('.faq__question', item);
    if (!question) return;

    on(question, 'click', () => {
      const isOpen = item.classList.toggle('is-open');
      question.setAttribute('aria-expanded', String(isOpen));
    });
  });
}

function initPulse() {
  const options = qsa('[data-pulse]');
  const feedback = qs('[data-pulse-feedback]');
  if (!options.length || !feedback) return;

  options.forEach((option) => {
    on(option, 'click', () => {
      options.forEach((o) => o.classList.remove('is-active'));
      options.forEach((o) => o.setAttribute('aria-pressed', 'false'));
      option.classList.add('is-active');
      option.setAttribute('aria-pressed', 'true');

      const choice = option.dataset.pulse;
      feedback.textContent = PULSE_RESPONSES[choice] || '';
      feedback.classList.add('is-visible');

      storage.set(STORAGE_KEYS.homePulse, choice);
    });
  });

  const saved = storage.get(STORAGE_KEYS.homePulse);
  if (saved) {
    const match = options.find((o) => o.dataset.pulse === saved);
    if (match) match.click();
  }
}

function initChallenge() {
  const startButton = qs('[data-challenge-start]');
  const label = qs('[data-challenge-label]');
  const bar = qs('[data-challenge-bar]');
  const status = qs('[data-challenge-status]');
  if (!startButton || !label || !bar || !status) return;

  function render() {
    const saved = storage.get(STORAGE_KEYS.actionProgress, []);
    const completed = Array.isArray(saved) ? saved.length : 0;
    label.textContent = `LANGKAH ${String(completed).padStart(2, '0')} / ${String(ACTION_STEP_COUNT).padStart(2, '0')}`;
    bar.style.width = `${Math.min((completed / ACTION_STEP_COUNT) * 100, 100)}%`;

    if (completed <= 0) {
      status.textContent = 'Belum dimulai';
      startButton.textContent = 'Mulai mencatat';
    } else {
      status.textContent = `${completed} dari ${ACTION_STEP_COUNT} langkah sudah kamu catat.`;
      startButton.textContent = 'Lanjutkan di Aksi';
    }
  }

  render();
  on(startButton, 'click', () => {
    window.location.href = './pages/aksi.html';
  });
}

function initFlipCards() {
  const hover = window.matchMedia('(any-hover: hover)');
  qsa('.flip-card').forEach((card) => {
    const toggle = qs('.flip-card__toggle', card);
    const front = qs('.flip-card__front', card);
    const back = qs('.flip-card__back', card);
    function flip(flipped) {
      card.classList.toggle('is-flipped', flipped);
      toggle.setAttribute('aria-expanded', String(flipped));
      front.setAttribute('aria-hidden', String(flipped));
      back.setAttribute('aria-hidden', String(!flipped));
    }
    function updateHints() {
      qs('.flip-card__hint', front).textContent = hover.matches ? 'Arahkan kursor ↗' : 'Ketuk untuk lihat ↗';
      qs('.flip-card__hint', back).textContent = hover.matches ? 'Geser kursor keluar ↶' : 'Ketuk untuk kembali ↶';
    }
    on(toggle, 'pointerenter', (event) => {
      if (hover.matches && event.pointerType === 'mouse') flip(true);
    });
    on(toggle, 'pointerleave', (event) => {
      if (event.pointerType === 'mouse') flip(false);
    });
    on(toggle, 'click', (event) => {
      // Native keyboard activation has detail 0. Mouse hover already reveals
      // the card, so clicking must not immediately turn it back over.
      if (hover.matches && event.pointerType === 'mouse' && event.detail !== 0) return;
      flip(!card.classList.contains('is-flipped'));
    });
    on(toggle, 'keydown', (event) => { if (event.key === 'Escape') flip(false); });
    on(hover, 'change', () => { flip(false); updateHints(); });
    updateHints();
  });
}

function initHeroProbe() {
  const buttons = qsa('[data-hero-mode]');
  const map = qs('[data-hero-map]');
  const value = qs('[data-hero-value]');
  const note = qs('[data-hero-note]');
  if (!map || !value || !note) return;
  const route = qs('.hero__route-line', map);
  const base = qs('.hero__route-base', map);
  const play = qs('[data-map-play]');
  const zoomButton = qs('[data-map-zoom]');
  const svg = qs('svg', map);
  const routeButtons = qsa('[data-map-route]');
  const modes = { car: 0.19, motorcycle: 0.08, walking: 0 };
  const paths = { short: 'M95 280H260V176H430V78H525', long: 'M95 280H430V176H260V78H525' };
  const emissionNumber = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const travelledRoute = route.cloneNode(false);
  travelledRoute.setAttribute('class', 'hero__route-progress');
  travelledRoute.setAttribute('pathLength', '1');
  route.after(travelledRoute);
  value.innerHTML = '<span data-emission-number></span> <small>kg CO₂e</small>';
  const emissionOutput = qs('[data-emission-number]', value);
  const distanceCaption = qs('[data-map-distance]');
  let mode = 'car';
  let distance = 8;
  let progress = 0;
  let frame = null;
  let previous = null;
  let playing = false;
  let started = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let zoomed = false;
  let camera = { x: 100, y: 60 };
  let drag = null;

  function paintCamera() {
    camera.x = Math.max(0, Math.min(200, camera.x));
    camera.y = Math.max(0, Math.min(120, camera.y));
    svg.setAttribute('viewBox', zoomed ? `${camera.x} ${camera.y} 400 240` : '0 0 600 360');
    map.dataset.zoomed = String(zoomed);
    zoomButton.setAttribute('aria-pressed', String(zoomed));
    zoomButton.textContent = zoomed ? 'Lihat seluruh peta' : 'Perbesar peta';
  }
  on(zoomButton, 'click', () => {
    zoomed = !zoomed;
    camera = { x: 100, y: 60 };
    paintCamera();
  });
  on(map, 'keydown', (event) => {
    const movement = { ArrowLeft: [-25, 0], ArrowRight: [25, 0], ArrowUp: [0, -25], ArrowDown: [0, 25] }[event.key];
    if (!zoomed || !movement) return;
    event.preventDefault();
    camera.x += movement[0];
    camera.y += movement[1];
    paintCamera();
  });
  on(map, 'pointerdown', (event) => {
    if (!zoomed || event.button !== 0) return;
    drag = { x: event.clientX, y: event.clientY, camera: { ...camera } };
    map.setPointerCapture(event.pointerId);
    map.classList.add('is-dragging');
  });
  on(map, 'pointermove', (event) => {
    if (!drag) return;
    const scale = 400 / svg.getBoundingClientRect().width;
    camera.x = drag.camera.x - (event.clientX - drag.x) * scale;
    camera.y = drag.camera.y - (event.clientY - drag.y) * scale;
    paintCamera();
  });
  function endDrag() {
    drag = null;
    map.classList.remove('is-dragging');
  }
  on(map, 'pointerup', endDrag);
  on(map, 'pointercancel', endDrag);
  on(map, 'lostpointercapture', endDrag);

  function position() {
    const length = route.getTotalLength();
    const point = route.getPointAtLength(progress * length);
    const ahead = route.getPointAtLength(Math.min(length, progress * length + 1));
    const angle = Math.atan2(ahead.y - point.y, ahead.x - point.x) * 180 / Math.PI;
    qsa('.hero__map-mode', map).forEach((marker) => {
      const rotation = marker.classList.contains('hero__map-mode--car') ? angle : 0;
      marker.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${rotation})`);
    });
    travelledRoute.setAttribute('stroke-dasharray', `${started ? progress : 0} 1`);
    emissionOutput.textContent = emissionNumber.format(distance * modes[mode] * (started ? progress : 1));
    map.dataset.progress = progress.toFixed(4);
    map.dataset.journey = started ? (progress >= 1 ? 'finished' : playing ? 'running' : 'paused') : 'preview';
    distanceCaption.textContent = started
      ? `${emissionNumber.format(distance * progress)} / ${distance} km ditempuh`
      : `Rute contoh, ${distance} km sekali jalan`;
  }

  function render() {
    map.dataset.mode = mode;
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.heroMode === mode)));
    note.textContent = mode === 'walking'
      ? 'Berjalan kaki tidak menghasilkan emisi langsung dari kendaraan.'
      : `Contoh emisi langsung untuk satu perjalanan ${distance} km, satu orang.`;
    position();
  }

  function stop() {
    playing = false;
    cancelAnimationFrame(frame);
    previous = null;
    play.textContent = progress >= 1 ? 'Ulangi perjalanan' : started && progress > 0 ? 'Lanjutkan perjalanan' : 'Putar perjalanan';
    play.setAttribute('aria-pressed', 'false');
    value.setAttribute('aria-live', 'polite');
    position();
  }

  function tick(time) {
    if (!playing) return;
    if (previous !== null) progress = Math.min(1, progress + (time - previous) / (mode === 'walking' ? 10000 : 6000));
    previous = time;
    position();
    if (progress >= 1) stop();
    else frame = requestAnimationFrame(tick);
  }

  buttons.forEach((button) => on(button, 'click', () => {
    if (button.dataset.heroMode === mode) return;
    stop();
    progress = 0;
    started = false;
    mode = button.dataset.heroMode;
    render();
  }));
  routeButtons.forEach((button) => on(button, 'click', () => {
    stop();
    progress = 0;
    started = false;
    const key = button.dataset.mapRoute;
    distance = key === 'short' ? 8 : 10;
    route.setAttribute('d', paths[key]);
    base.setAttribute('d', paths[key]);
    travelledRoute.setAttribute('d', paths[key]);
    routeButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    render();
  }));
  on(play, 'click', () => {
    if (playing) { stop(); return; }
    if (reducedMotion.matches) {
      started = true;
      progress = progress >= 1 ? 0 : 1;
      position();
      play.textContent = progress >= 1 ? 'Kembali ke rumah' : 'Putar perjalanan';
      return;
    }
    if (progress >= 1) progress = 0;
    started = true;
    playing = true;
    play.textContent = 'Jeda perjalanan';
    play.setAttribute('aria-pressed', 'true');
    value.setAttribute('aria-live', 'off');
    position();
    frame = requestAnimationFrame(tick);
  });
  on(document, 'visibilitychange', () => { if (document.hidden) stop(); });
  on(reducedMotion, 'change', stop);
  render();
}

export function initHomePage() {
  initPatternSelector();
  initMiniCalculator();
  initFaqAccordion();
  initPulse();
  initChallenge();
  initHeroProbe();
  initFlipCards();
}
