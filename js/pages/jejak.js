import { qs, qsa, on } from '../foundation/helpers.js';
import { storage } from '../foundation/storage.js';
import { recordJourney } from '../foundation/account.js';
import { STORAGE_KEYS } from '../foundation/constants.js';
import {
  LIMITS,
  VEHICLES,
  VEHICLE_ORDER,
  FREQUENCY_NOTES,
  createState,
  allowedOccupancy,
  occupancyLabel,
  distanceLabel,
  distanceDescriptor,
  frequencyLabel,
  setVehicle,
  setDistance,
  setFrequency,
  setOccupancy,
  isStepValid,
  isJourneyValid,
  calculateFootprint,
  formatDecimal,
  formatMonthly,
  formatFactor,
  persistJourney,
} from './jejak-model.js';
import { createScene, vehicleGlyph, lanesGraphic } from './jejak-scene.js';

const STEPS = [
  {
    id: 'vehicle',
    title: 'Kamu biasanya naik apa?',
    help: 'Pilih kendaraan atau moda yang paling sering kamu gunakan untuk perjalanan ini.',
  },
  {
    id: 'distance',
    title: 'Seberapa jauh perjalananmu?',
    help: 'Masukkan perkiraan jarak untuk satu kali perjalanan.',
  },
  {
    id: 'frequency',
    title: 'Seberapa sering kamu melakukannya?',
    help: 'Berapa kali perjalanan seperti ini biasanya terjadi dalam satu minggu?',
  },
  {
    id: 'occupancy',
    title: 'Biasanya kamu bepergian dengan siapa?',
    help: '',
  },
];

const HERO_VIEW = {
  vehicle: 'car',
  distance: 8,
  frequency: 5,
  occupancy: 1,
  showRoute: true,
  showFrequency: true,
  showOccupancy: true,
};

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function collectElements() {
  const root = qs('[data-panel]');
  return {
    root,
    title: qs('[data-q-title]', root),
    help: qs('[data-q-help]', root),
    stepNumber: qs('[data-step-number]', root),
    progressSteps: qsa('[data-goto]', root),
    stageScene: qs('[data-stage-scene]', root),
    readoutItems: qsa('[data-readout-item]', root),
    panels: qsa('[data-step-panel]', root),
    vehicles: qs('[data-vehicles]', root),
    range: qs('#jk-distance', root),
    distanceOut: qs('[data-distance-out]', root),
    distanceNote: qs('[data-distance-note]', root),
    distanceButtons: qsa('[data-distance-step]', root),
    freq: qs('[data-freq]', root),
    freqNote: qs('[data-freq-note]', root),
    occupancy: qs('[data-occupancy]', root),
    status: qs('[data-status]', root),
    back: qs('[data-back]', root),
    next: qs('[data-next]', root),
    nextLabel: qs('[data-next-label]', root),
    heroScene: qs('[data-hero-scene]'),
    resultScene: qs('[data-result-scene]'),
    labScene: qs('[data-lab-scene]'),
    labChips: qs('[data-lab-chips]'),
    afterSections: qsa('[data-after]'),
    resultSection: qs('#hasil'),
    resultTitle: qs('#jk-result-title'),
    resultWeekly: qs('[data-r-weekly]'),
    resultTrip: qs('[data-r-trip]'),
    resultMonth: qs('[data-r-month]'),
    resultNote: qs('[data-r-note]'),
    resultEquation: qs('[data-r-equation]'),
    resultWho: qs('[data-r-who]'),
    rows: qs('[data-rows]'),
    ledgerOneMeta: qs('[data-l-one-meta]'),
    ledgerOneLanes: qs('[data-l-one-lanes]'),
    ledgerOneValue: qs('[data-l-one-value]'),
    ledgerRoutineName: qs('[data-l-routine-name]'),
    ledgerRoutineMeta: qs('[data-l-routine-meta]'),
    ledgerRoutineLanes: qs('[data-l-routine-lanes]'),
    ledgerRoutineValue: qs('[data-l-routine-value]'),
    ledger: qs('[data-ledger]'),
    routineNote: qs('[data-routine-note]'),
    dialog: qs('#jk-method'),
    factors: qs('[data-factors]'),
  };
}

function createContext() {
  return {
    state: createState(),
    step: 0,
    els: collectElements(),
    scenes: { hero: null, stage: null, result: null, lab: null },
    occupancyFor: null,
    ledgerSeen: false,
  };
}

function stageView(state) {
  return {
    vehicle: state.vehicle,
    distance: state.distance,
    frequency: state.frequency,
    occupancy: state.occupancy,
    showRoute: Boolean(state.vehicle) && state.reached >= 1,
    showFrequency: Boolean(state.vehicle) && state.reached >= 2,
    showOccupancy: Boolean(state.vehicle) && state.reached >= 3,
  };
}

function completeView(state) {
  return { ...stageView(state), showRoute: true, showFrequency: true, showOccupancy: true };
}

function occupancyHelp(state) {
  if (!state.vehicle) return 'Pilih jumlah orang yang ikut dalam perjalanan ini, termasuk kamu.';
  return VEHICLES[state.vehicle].occupancyHelp;
}

function vehicleOptionMarkup(id) {
  const vehicle = VEHICLES[id];
  return `<label class="jk-vopt"><input class="jk-vopt__input" type="radio" name="vehicle" value="${id}" /><span class="jk-vopt__card"><span class="jk-vopt__glyph">${vehicleGlyph(id)}</span><span class="jk-vopt__name">${vehicle.label}</span><span class="jk-vopt__check" aria-hidden="true"><svg class="icon" viewBox="0 0 24 24" focusable="false"><use href="#ic-check"/></svg></span></span></label>`;
}

function renderVehicleOptions(ctx) {
  ctx.els.vehicles.innerHTML = VEHICLE_ORDER.map(vehicleOptionMarkup).join('');
}

function renderFrequencyOptions(ctx) {
  const { min, max } = LIMITS.frequency;
  const items = [];
  for (let value = min; value <= max; value += 1) {
    items.push(`<label class="jk-fopt"><input class="jk-fopt__input" type="radio" name="frequency" value="${value}" /><span class="jk-fopt__card">${value}×</span></label>`);
  }
  ctx.els.freq.innerHTML = items.join('');
}

function renderOccupancyOptions(ctx) {
  const { state, els } = ctx;
  if (!state.vehicle) {
    els.occupancy.innerHTML = '';
    ctx.occupancyFor = null;
    return;
  }
  const items = allowedOccupancy(state.vehicle).map((value) => `<label class="jk-oopt"><input class="jk-oopt__input" type="radio" name="occupancy" value="${value}" /><span class="jk-oopt__card">${occupancyLabel(state.vehicle, value)}</span></label>`);
  els.occupancy.innerHTML = items.join('');
  els.occupancy.dataset.count = String(items.length);
  ctx.occupancyFor = state.vehicle;
}

function renderControlValues(ctx) {
  const { state, els } = ctx;

  qsa('input[name="vehicle"]', els.vehicles).forEach((input) => {
    input.checked = input.value === state.vehicle;
  });

  const { min, max } = LIMITS.distance;
  els.range.value = String(state.distance);
  els.range.style.setProperty('--fill', `${((state.distance - min) / (max - min)) * 100}%`);
  els.range.setAttribute('aria-valuetext', `${state.distance} kilometer`);
  els.distanceOut.textContent = distanceLabel(state.distance);
  els.distanceNote.textContent = distanceDescriptor(state.distance);
  els.distanceButtons.forEach((button) => {
    const delta = Number(button.dataset.distanceStep);
    button.disabled = (delta < 0 && state.distance <= min) || (delta > 0 && state.distance >= max);
  });

  qsa('input[name="frequency"]', els.freq).forEach((input) => {
    input.checked = Number(input.value) === state.frequency;
  });
  els.freqNote.textContent = FREQUENCY_NOTES[state.frequency];

  if (ctx.occupancyFor !== state.vehicle) renderOccupancyOptions(ctx);
  qsa('input[name="occupancy"]', els.occupancy).forEach((input) => {
    input.checked = Number(input.value) === state.occupancy;
  });
}

function renderStep(ctx) {
  const { state, els } = ctx;
  const step = STEPS[ctx.step];

  els.title.textContent = step.title;
  els.help.textContent = step.id === 'occupancy' ? occupancyHelp(state) : step.help;
  els.stepNumber.textContent = String(ctx.step + 1).padStart(2, '0');
  els.root.dataset.step = step.id;

  els.panels.forEach((panel) => {
    panel.hidden = panel.dataset.stepPanel !== step.id;
  });

  els.progressSteps.forEach((button, index) => {
    const isCurrent = index === ctx.step;
    button.disabled = index > state.reached;
    button.classList.toggle('is-current', isCurrent);
    button.classList.toggle('is-done', !isCurrent && index <= state.reached);
    if (isCurrent) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
    button.setAttribute('aria-label', `Langkah ${index + 1}, ${button.textContent.trim()}`);
  });
}

function renderReadout(ctx) {
  const { state, els } = ctx;
  const values = {
    vehicle: state.vehicle ? VEHICLES[state.vehicle].label : null,
    distance: state.reached >= 1 ? `${state.distance} KM` : null,
    frequency: state.reached >= 2 ? frequencyLabel(state.frequency) : null,
    occupancy: state.reached >= 3 && state.vehicle ? occupancyLabel(state.vehicle, state.occupancy) : null,
  };
  const empty = {
    vehicle: 'Belum dipilih',
    distance: 'Belum diisi',
    frequency: 'Belum diisi',
    occupancy: 'Belum diisi',
  };

  els.readoutItems.forEach((item) => {
    const key = item.dataset.readoutItem;
    const value = qs('[data-readout-value]', item);
    const filled = values[key] !== null;
    value.textContent = filled ? values[key] : empty[key];
    item.classList.toggle('is-filled', filled);
    item.classList.toggle('is-current', key === STEPS[ctx.step].id);
  });
}

function renderNav(ctx) {
  const { state, els } = ctx;
  const stepId = STEPS[ctx.step].id;
  const isLast = ctx.step === STEPS.length - 1;
  const valid = isStepValid(stepId, state);

  els.back.classList.toggle('is-hidden', ctx.step === 0);
  els.back.tabIndex = ctx.step === 0 ? -1 : 0;
  els.next.disabled = !valid;
  els.nextLabel.textContent = isLast ? 'Lihat Jejakku' : 'Lanjut';
  els.status.textContent = !valid && stepId === 'vehicle' ? 'Pilih satu kendaraan untuk lanjut.' : '';
}

function renderStage(ctx) {
  ctx.scenes.stage.update(stageView(ctx.state));
}

function sync(ctx) {
  renderStep(ctx);
  renderControlValues(ctx);
  renderReadout(ctx);
  renderNav(ctx);
  renderStage(ctx);
  if (ctx.state.revealed) renderResult(ctx);
}

function goToStep(ctx, index, { focus = true } = {}) {
  const target = Math.min(Math.max(index, 0), STEPS.length - 1);
  if (target > ctx.state.reached) ctx.state.reached = target;
  ctx.step = target;
  sync(ctx);
  if (focus) ctx.els.title.focus({ preventScroll: true });
}

function handleNext(ctx) {
  const stepId = STEPS[ctx.step].id;
  if (!isStepValid(stepId, ctx.state)) return;
  if (ctx.step < STEPS.length - 1) {
    goToStep(ctx, ctx.step + 1);
    return;
  }
  if (isJourneyValid(ctx.state)) revealResult(ctx);
}

function handleBack(ctx) {
  if (ctx.step > 0) goToStep(ctx, ctx.step - 1);
}

function selectVehicle(ctx, id) {
  setVehicle(ctx.state, id);
  sync(ctx);
}

function changeDistance(ctx, value) {
  setDistance(ctx.state, value);
  sync(ctx);
}

function selectFrequency(ctx, value) {
  setFrequency(ctx.state, value);
  sync(ctx);
}

function selectOccupancy(ctx, value) {
  setOccupancy(ctx.state, value);
  sync(ctx);
}

function bindControls(ctx) {
  const { els } = ctx;

  on(els.vehicles, 'change', (event) => {
    if (event.target.name === 'vehicle') selectVehicle(ctx, event.target.value);
  });

  on(els.range, 'input', () => changeDistance(ctx, els.range.value));

  els.distanceButtons.forEach((button) => {
    on(button, 'click', () => changeDistance(ctx, ctx.state.distance + Number(button.dataset.distanceStep)));
  });

  on(els.freq, 'change', (event) => {
    if (event.target.name === 'frequency') selectFrequency(ctx, event.target.value);
  });

  on(els.occupancy, 'change', (event) => {
    if (event.target.name === 'occupancy') selectOccupancy(ctx, event.target.value);
  });

  on(els.next, 'click', () => handleNext(ctx));
  on(els.back, 'click', () => handleBack(ctx));

  els.progressSteps.forEach((button) => {
    on(button, 'click', () => goToStep(ctx, Number(button.dataset.goto)));
  });
}

function animateNumber(element, target, digits, duration) {
  if (prefersReducedMotion() || target === 0) {
    element.textContent = target === 0 ? '0' : formatDecimal(target, digits);
    return;
  }
  const startTime = performance.now();
  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = formatDecimal(target * eased, digits);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function resultNote(state, footprint) {
  const vehicle = VEHICLES[state.vehicle];
  if (footprint.isZero) return 'Perjalanan ini tidak menghasilkan emisi langsung dari kendaraannya.';
  if (vehicle.basis === 'passenger') {
    return `Faktor ${vehicle.label.toLowerCase()} dihitung per penumpang, jadi jumlah orang dalam rombongan tidak mengubah bagianmu.`;
  }
  if (state.occupancy > 1) return `Emisi kendaraan dibagi ${state.occupancy} orang, jadi angka ini adalah bagianmu.`;
  return 'Seluruh emisi kendaraan dihitung sebagai bagianmu karena kamu bepergian sendiri.';
}

function renderResultCopy(ctx, footprint, animate) {
  const { state, els } = ctx;
  const weeklyText = footprint.isZero ? '0' : formatDecimal(footprint.perWeek, 1);

  if (animate) animateNumber(els.resultWeekly, footprint.perWeek, 1, 1000);
  else els.resultWeekly.textContent = weeklyText;

  els.resultTrip.textContent = `${footprint.isZero ? '0' : formatDecimal(footprint.perTrip, 2)} kg`;
  els.resultMonth.textContent = `${footprint.isZero ? '0' : `≈ ${formatMonthly(footprint.perMonth)}`} kg`;
  els.resultNote.textContent = resultNote(state, footprint);
  els.resultEquation.textContent = `${state.distance} KM × ${state.frequency}× / minggu = ${footprint.weeklyDistance} KM`;
  els.resultWho.textContent = `${VEHICLES[state.vehicle].label}, ${occupancyLabel(state.vehicle, state.occupancy).toLowerCase()}`;
}

function breakdownRows(state, footprint) {
  const vehicle = VEHICLES[state.vehicle];
  const factorText = vehicle.basis === 'none'
    ? 'Tanpa emisi langsung dari kendaraannya.'
    : `Faktor contoh ${formatFactor(vehicle.factor)} kg CO₂e per km, ${vehicle.factorNote}.`;

  let occupancyNote = 'Faktor sudah dihitung per penumpang, jadi angkanya tidak berubah.';
  if (vehicle.basis === 'vehicle') {
    occupancyNote = state.occupancy > 1
      ? `Emisi kendaraan dibagi ${state.occupancy} orang.`
      : 'Emisi kendaraan ditanggung satu orang.';
  }
  if (vehicle.basis === 'none') occupancyNote = 'Tidak memengaruhi angka karena tanpa emisi langsung.';

  return [
    { label: 'Kendaraan', value: vehicle.label, note: factorText, glyph: vehicleGlyph(state.vehicle) },
    { label: 'Jarak', value: `${state.distance} KM / perjalanan`, note: `Satu kali perjalanan menempuh ${state.distance} KM.` },
    {
      label: 'Frekuensi',
      value: frequencyLabel(state.frequency),
      note: `${state.frequency} perjalanan × ${state.distance} KM = ${footprint.weeklyDistance} KM dalam seminggu.`,
    },
    { label: 'Penumpang', value: occupancyLabel(state.vehicle, state.occupancy), note: occupancyNote },
  ];
}

function renderBreakdown(ctx, footprint) {
  const rows = breakdownRows(ctx.state, footprint);
  ctx.els.rows.innerHTML = rows.map((row, index) => `<li class="jk-row"><span class="jk-row__num">${String(index + 1).padStart(2, '0')}</span><div class="jk-row__main"><p class="jk-row__label">${row.label}</p><p class="jk-row__value">${row.glyph ? `<span class="jk-row__glyph">${row.glyph}</span>` : ''}<span>${row.value}</span></p></div><p class="jk-row__note">${row.note}</p><button type="button" class="jk-textbtn" data-edit-step="${index}" aria-label="Ubah ${row.label.toLowerCase()}">Ubah</button></li>`).join('');
}

function routineNote(state, footprint) {
  if (state.frequency === 1) return 'Kamu mengisi satu perjalanan per minggu, jadi angkanya sama.';
  if (footprint.isZero) return 'Rutinitas ini tidak menambah emisi langsung. Yang bertambah hanya kebiasaan yang bisa kamu bandingkan di Lab.';
  return `Perjalanan yang sama terjadi ${state.frequency}× dalam seminggu, jadi angkanya menjadi ${state.frequency} kali lipat.`;
}

function renderLedger(ctx, footprint) {
  const { state, els } = ctx;
  const oneValue = footprint.isZero ? '0' : formatDecimal(footprint.perTrip, 2);
  const routineValue = footprint.isZero ? '0' : formatDecimal(footprint.perWeek, 1);

  els.ledgerOneMeta.textContent = `${state.distance} KM`;
  els.ledgerOneLanes.innerHTML = lanesGraphic(1);
  els.ledgerOneValue.textContent = oneValue;
  els.ledgerRoutineName.textContent = frequencyLabel(state.frequency);
  els.ledgerRoutineMeta.textContent = `${footprint.weeklyDistance} KM dalam seminggu`;
  els.ledgerRoutineLanes.innerHTML = lanesGraphic(state.frequency);
  els.ledgerRoutineValue.textContent = routineValue;
  els.routineNote.textContent = routineNote(state, footprint);

  if (ctx.ledgerSeen) requestAnimationFrame(() => els.ledger.classList.add('is-in'));
  else els.ledger.classList.remove('is-in');
}

function renderLabChips(ctx) {
  const { state, els } = ctx;
  const items = [
    VEHICLES[state.vehicle].label,
    `${state.distance} KM`,
    frequencyLabel(state.frequency),
    occupancyLabel(state.vehicle, state.occupancy),
  ];
  els.labChips.innerHTML = items.map((text, index) => `<li class="jk-lab__chip" style="--i:${index}">${text}</li>`).join('');
}

function ensureResultScenes(ctx) {
  if (!ctx.scenes.result) {
    ctx.scenes.result = createScene(ctx.els.resultScene, { theme: 'dark' });
  }
  if (!ctx.scenes.lab) {
    ctx.scenes.lab = createScene(ctx.els.labScene, { theme: 'dark', probe: true });
  }
}

function renderResult(ctx, { animate = false } = {}) {
  const { state } = ctx;
  const footprint = calculateFootprint(state);
  if (!footprint) return;

  ensureResultScenes(ctx);
  renderResultCopy(ctx, footprint, animate);
  ctx.scenes.result.update(completeView(state));
  ctx.scenes.lab.update(completeView(state));
  renderBreakdown(ctx, footprint);
  renderLedger(ctx, footprint);
  renderLabChips(ctx);
  persistJourney(state, footprint);
}

function setAfterSectionsHidden(ctx, hidden) {
  ctx.els.afterSections.forEach((section) => {
    section.hidden = hidden;
  });
}

function revealResult(ctx) {
  const firstReveal = !ctx.state.revealed;
  ctx.state.revealed = true;
  setAfterSectionsHidden(ctx, false);
  renderResult(ctx, { animate: firstReveal });
  recordJourney(ctx.state);
  ctx.els.resultSection.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  ctx.els.resultTitle.focus({ preventScroll: true });
}

function scrollToPanel(ctx) {
  ctx.els.root.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

function editJourney(ctx, index = 0) {
  goToStep(ctx, index);
  scrollToPanel(ctx);
}

function clearStoredJourney() {
  [
    STORAGE_KEYS.vehicle,
    STORAGE_KEYS.distance,
    STORAGE_KEYS.frequency,
    STORAGE_KEYS.occupancy,
    STORAGE_KEYS.weeklyEmission,
    STORAGE_KEYS.monthlyEmission,
    STORAGE_KEYS.yearlyEmission,
  ].forEach((key) => storage.remove(key));
}

function resetJourney(ctx) {
  ctx.state = createState();
  ctx.step = 0;
  ctx.occupancyFor = null;
  ctx.ledgerSeen = false;
  setAfterSectionsHidden(ctx, true);
  clearStoredJourney();
  sync(ctx);
  ctx.els.title.focus({ preventScroll: true });
  scrollToPanel(ctx);
}

function bindResultActions(ctx) {
  on(document, 'click', (event) => {
    const editButton = event.target.closest('[data-edit]');
    if (editButton) editJourney(ctx, 0);

    const stepButton = event.target.closest('[data-edit-step]');
    if (stepButton) editJourney(ctx, Number(stepButton.dataset.editStep));

    const resetButton = event.target.closest('[data-reset]');
    if (resetButton) resetJourney(ctx);
  });
}

function initLedgerObserver(ctx) {
  if (!('IntersectionObserver' in window)) {
    ctx.ledgerSeen = true;
    ctx.els.ledger.classList.add('is-in');
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          ctx.ledgerSeen = true;
          ctx.els.ledger.classList.add('is-in');
        }
      });
    },
    { threshold: 0.35 }
  );
  observer.observe(ctx.els.ledger);
}

function factorRows() {
  return VEHICLE_ORDER.map((id) => {
    const vehicle = VEHICLES[id];
    const value = vehicle.basis === 'none' ? 'Tanpa emisi langsung' : `${formatFactor(vehicle.factor)} kg CO₂e per km`;
    const note = vehicle.basis === 'none' ? '' : `<span>${vehicle.factorNote}</span>`;
    return `<div><dt>${vehicle.label}</dt><dd>${value}${note}</dd></div>`;
  }).join('');
}

function initMethodDialog(ctx) {
  const { dialog, factors } = ctx.els;
  if (!dialog) return;
  factors.innerHTML = factorRows();

  function open() {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    document.body.classList.add('no-scroll');
  }

  function close() {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    document.body.classList.remove('no-scroll');
  }

  on(document, 'click', (event) => {
    if (event.target.closest('[data-open-method]')) open();
    if (event.target.closest('[data-close-method]')) close();
    if (event.target === dialog) close();
  });

  on(dialog, 'close', () => document.body.classList.remove('no-scroll'));
}

function initStartLink(ctx) {
  const link = qs('[data-start]');
  if (!link) return;
  on(link, 'click', () => {
    window.setTimeout(() => ctx.els.title.focus({ preventScroll: true }), 450);
  });
}

export function initJejakPage() {
  const ctx = createContext();
  if (!ctx.els.root) return;

  ctx.scenes.hero = createScene(ctx.els.heroScene, {
    theme: 'light',
    label: 'Ilustrasi contoh perjalanan: mobil menempuh 8 KM, 5 kali dalam seminggu',
  });
  ctx.scenes.hero.update(HERO_VIEW);

  ctx.scenes.stage = createScene(ctx.els.stageScene, {
    theme: 'dark',
    label: 'Ilustrasi kendaraan dan rute perjalananmu',
  });

  renderVehicleOptions(ctx);
  renderFrequencyOptions(ctx);
  bindControls(ctx);
  bindResultActions(ctx);
  initLedgerObserver(ctx);
  initMethodDialog(ctx);
  initStartLink(ctx);
  sync(ctx);
}
