import { vehicleGlyph } from './jejak-scene.js';
import { storage } from '../foundation/storage.js';

import { STORAGE_KEYS } from '../foundation/constants.js';
import { VEHICLES, calculateFootprint } from './jejak-model.js';
import { activeAccount, account, startSession, logout, records, JOURNEYS_KEY, EXPERIMENTS_KEY, ACTIVITY_KEY } from '../foundation/account.js';

// Profile summaries are derived only from measurements and actions saved on this device.
const history = records(JOURNEYS_KEY).filter(item => calculateFootprint(item) && !Number.isNaN(Date.parse(item.date)));
const measured = history.map(item => ({ ...item, footprint: calculateFootprint(item) }));
const experiments = records(EXPERIMENTS_KEY).filter(item => calculateFootprint(item.from) && calculateFootprint(item.to));
const actions = storage.get(STORAGE_KEYS.actionProgress, []);
const actionCount = Array.isArray(actions) ? new Set(actions.filter(i => Number.isInteger(i) && i >= 0 && i < 7)).size : 0;
const last = measured[0];
const storedJourney = { vehicle: storage.get(STORAGE_KEYS.vehicle), distance: storage.get(STORAGE_KEYS.distance), frequency: storage.get(STORAGE_KEYS.frequency), occupancy: storage.get(STORAGE_KEYS.occupancy) };
const current = last || (calculateFootprint(storedJourney) ? storedJourney : null);
const user = activeAccount();
const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
const profileData = {
  name: user?.name || 'Profilmu', joinedDate: user ? dateFormat.format(new Date(user.joined)) : 'Belum dimulai',
  journeyCount: measured.length, estimatedCo2: current ? calculateFootprint(current).perWeek : 0,
  experiments: experiments.length, actions: actionCount,
};
const explored = storage.get('asria_emisi_complete') === true;
const asriaStages = [
  { id: 'tahu', label: 'Tahu', done: explored }, { id: 'paham', label: 'Paham', done: explored },
  { id: 'ukur', label: 'Ukur', done: !!current }, { id: 'coba', label: 'Coba', done: experiments.length > 0 },
  { id: 'ubah', label: 'Ubah', done: actionCount > 0 },
];
const currentJourney = current ? { ...current, mode: VEHICLES[current.vehicle].label, estimate: calculateFootprint(current).perWeek } : null;
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const recentActivities = records(ACTIVITY_KEY).filter(item => !Number.isNaN(Date.parse(item.date))).slice(0, 8).map(item => ({ ...item, title: escape(item.title), description: escape(item.description), date: new Intl.DateTimeFormat('id-ID', {day:'numeric',month:'short'}).format(new Date(item.date)) }));
const savedExperiments = experiments.map(item => ({
  title: `${VEHICLES[item.from.vehicle].label} → ${VEHICLES[item.to.vehicle].label}`,
  from: item.from, to: item.to, distance: item.to.distance, frequency: item.to.frequency,
  change: `${item.to.occupancy} orang, ${item.to.distance} km, ${item.to.frequency} kali per minggu`,
  estimate: calculateFootprint(item.to).perWeek,
}));
const currentAction = { title: 'Langkah yang sudah dicoba', target: 'Catat langkah yang benar-benar kamu lakukan', progress: actionCount, total: 7, status: actionCount === 7 ? 'Selesai' : actionCount ? 'Sedang dicoba' : 'Belum dimulai' };
const counts = new Map();
measured.forEach(item => counts.set(item.vehicle, (counts.get(item.vehicle) || 0) + 1));
const modeCounts = [...counts].sort((a,b) => b[1]-a[1]);
const mean = key => measured.length ? measured.reduce((sum,item) => sum + item[key],0)/measured.length : 0;
const journeyPatterns = { topMode: modeCounts.length ? VEHICLES[modeCounts[0][0]].label : 'Belum ada', averageDistance: mean('distance'), frequency: mean('frequency'), averageOccupancy: mean('occupancy'), modes: modeCounts.map(([id,count]) => ({label:VEHICLES[id].label,count})) };
const now = new Date();
const thisMonth = measured.filter(item => {const date=new Date(item.date);return date.getMonth()===now.getMonth() && date.getFullYear()===now.getFullYear();});
const tripsByDay = {};
thisMonth.forEach(item => {const day=new Date(item.date).getDate();tripsByDay[day]=(tripsByDay[day]||0)+1;});
const monthlySummary = { label: new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(now), daysInMonth: new Date(now.getFullYear(),now.getMonth()+1,0).getDate(), today: now.getDate(), tripsByDay, distance: thisMonth.reduce((sum,item)=>sum+item.distance,0), estimatedCo2: thisMonth.reduce((sum,item)=>sum+item.footprint.perTrip,0) };
const milestones = [
  { icon:'kenali',title:'Kenali Jejak',description:'Menyelesaikan kuis Emisi',done:explored },
  { icon:'ukur',title:'Ukur Perjalanan',description:'Menyelesaikan pengukuran pertama',done:!!current },
  { icon:'coba',title:'Coba Kemungkinan',description:'Menyimpan skenario pertama',done:experiments.length>0 },
  { icon:'gerak',title:'Mulai Bergerak',description:'Mencatat aksi pertama',done:actionCount>0 },
  { icon:'jelajah',title:'Jelajahi Lagi',description:'Menyimpan 3 skenario di Lab',done:experiments.length>=3 },
];
const badges = [
  {icon:'ukur',title:'Jejak Pertama',earned:!!current}, {icon:'jelajah',title:'Penjelajah Lab',earned:experiments.length>=3},
  {icon:'bersama',title:'Perjalanan Bersama',earned:measured.some(item=>item.occupancy>1)}, {icon:'gerak',title:'Mulai Bergerak',earned:actionCount>0},
];
const settingsItems = [
  {id:'edit',label:'Edit Profil',hint:'Ubah nama tampilan'}, {id:'prefs',label:'Preferensi Perjalanan',hint:'Ukur atau perbarui perjalanan'},
  {id:'privacy',label:'Data & Privasi',hint:'Penyimpanan di perangkat ini'}, {id:'logout',label:'Logout',hint:'Akhiri sesi, catatan tetap tersimpan'},
];

const $ = (selector, scope = document) => scope.querySelector(selector);
const SVG_NS = 'http://www.w3.org/2000/svg';
const fmt = (value, digits = 1) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
const fmtInt = (value) => new Intl.NumberFormat('id-ID').format(value);
const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>';

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}

function glyphFor(side) {
  return vehicleGlyph(side.vehicle);
}

const ICONS = {
  jejak: '<path d="M4 18c3 0 3-6 7-6s4 6 9 6"/><circle cx="5" cy="18" r="1.6"/><circle cx="19" cy="18" r="1.6"/>',
  lab: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M8 15h8"/>',
  aksi: '<path d="M5 12l4 4 9-9"/><path d="M4 3h16v18H4z"/>',
  emisi: '<path d="M12 2c4 5 6 8 6 11a6 6 0 1 1-12 0c0-3 2-6 6-11z"/>',
};

const MILE_ICONS = {
  kenali: '<circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/><path d="M8.5 11h5"/>',
  ukur: '<path d="M4 18c3 0 3-6 7-6s4 6 9 6"/><circle cx="5" cy="18" r="1.6"/><circle cx="19" cy="18" r="1.6"/><path d="M12 5v4"/>',
  coba: '<path d="M4 8h9l-2.5-2.5M20 16h-9l2.5 2.5"/>',
  gerak: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  jelajah: '<circle cx="12" cy="12" r="8"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  bersama: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2 21c0-3.5 2.7-6 6-6s6 2.5 6 6"/><path d="M13 21c.3-2.6 1.8-4.6 4-5.3"/>',
};

const icon = (paths, cls = 'icon icon--md') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;

/* ---------------------------- renderers ---------------------------- */

function renderHeader() {
  $('[data-pf-name]').textContent = profileData.name;
  $('[data-pf-joined]').textContent = profileData.joinedDate;
  $('[data-pf-avatar]').textContent = initials(profileData.name);
  $('[data-pf-fp-count]').textContent = fmtInt(profileData.journeyCount);

  const svg = $('[data-pf-fingerprint]');
  svg.replaceChildren();
  const d = 'M8 62C36 62 40 24 74 24S112 66 142 46S186 14 220 30S246 44 252 40';
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('class', 'pf-fp__line');
  svg.appendChild(path);

  const total = path.getTotalLength();
  const count = profileData.journeyCount;
  for (let i = 0; i < count; i += 1) {
    const point = path.getPointAtLength((total * i) / Math.max(count - 1, 1));
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('cx', point.x.toFixed(1));
    dot.setAttribute('cy', point.y.toFixed(1));
    dot.setAttribute('r', i === count - 1 ? '6' : '4');
    dot.setAttribute('class', i === count - 1 ? 'pf-fp__dot pf-fp__dot--last' : 'pf-fp__dot');
    svg.appendChild(dot);
  }
}

function renderSnapshot() {
  const items = [
    { value: fmtInt(profileData.journeyCount), label: 'Pengukuran tersimpan' },
    { value: `${fmt(profileData.estimatedCo2)}<small> kg</small>`, label: 'CO₂e terakhir / minggu' },
    { value: fmtInt(profileData.experiments), label: 'Eksperimen' },
    { value: fmtInt(profileData.actions), label: 'Aksi dipilih' },
  ];
  $('[data-pf-snapshot]').innerHTML = items
    .map((item) => `<div class="pf-metric"><dt class="pf-metric__label">${item.label}</dt><dd class="pf-metric__value num">${item.value}</dd></div>`)
    .join('');
}

function renderProgress() {
  const firstOpen = asriaStages.findIndex((stage) => !stage.done);
  const current = firstOpen === -1 ? asriaStages.length - 1 : firstOpen;
  const doneCount = asriaStages.filter((stage) => stage.done).length;

  $('[data-pf-progress-copy]').textContent = firstOpen === -1
    ? 'Kamu sudah melewati kelima tahap. Perjalanan tetap bisa diulang kapan saja.'
    : `Kamu sudah melewati ${doneCount} dari ${asriaStages.length} tahap. Tahap ${asriaStages[current].label} menunggu langkah nyatamu.`;

  const check = '<path d="M8.5 14.2l3.2 3.2 6-6.4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
  $('[data-pf-progress]').innerHTML = asriaStages.map((stage, index) => {
    const state = stage.done ? 'done' : (index === current ? 'current' : 'todo');
    const status = state === 'done' ? 'Selesai' : (state === 'current' ? 'Saat ini' : 'Belum');
    const segment = index < asriaStages.length - 1
      ? `<svg class="pf-step__line" viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true" focusable="false"><line class="pf-step__base" x1="0" y1="2" x2="100" y2="2" vector-effect="non-scaling-stroke"/>${stage.done && asriaStages[index + 1].done ? '<line class="pf-step__run" x1="0" y1="2" x2="100" y2="2" vector-effect="non-scaling-stroke"/>' : ''}</svg>`
      : '';
    const node = `<svg class="pf-step__node" viewBox="0 0 28 28" aria-hidden="true" focusable="false"><circle cx="14" cy="14" r="${state === 'current' ? 11 : 10}"/>${state === 'done' ? check : ''}${state === 'current' ? '<circle class="pf-step__pulse" cx="14" cy="14" r="4"/>' : ''}</svg>`;
    return `<li class="pf-step is-${state}"${state === 'current' ? ' aria-current="step"' : ''}>${segment}${node}<span class="pf-step__label">${stage.label}</span><span class="pf-step__status">${status}</span></li>`;
  }).join('');
}

function renderJourney() {
  if (!currentJourney) {
    $('[data-pf-journey]').innerHTML = '<p>Belum ada perjalanan yang diukur. Mulai dari halaman Jejak.</p>';
    $('[data-pf-scene]').hidden = true;
    return;
  }
  const rows = [
    ['Moda', currentJourney.mode],
    ['Jarak', `${fmtInt(currentJourney.distance)} KM / perjalanan`],
    ['Frekuensi', `${fmtInt(currentJourney.frequency)}× / minggu`],
    ['Penumpang', `${fmtInt(currentJourney.occupancy)} orang`],
    ['Estimasi', `${fmt(currentJourney.estimate)} kg CO₂e / minggu`],
  ];
  $('[data-pf-journey]').innerHTML = rows
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
    .join('');
  $('[data-pf-scene-vehicle]').innerHTML = vehicleGlyph(currentJourney.vehicle);
  $('[data-pf-scene-distance]').textContent = `${fmtInt(currentJourney.distance)} KM`;
  $('[data-pf-scene]').setAttribute('aria-label', `Ilustrasi perjalanan terakhir dengan ${currentJourney.mode.toLowerCase()}, ${currentJourney.distance} kilometer`);
}

function renderActivity() {
  if (!recentActivities.length) { $('[data-pf-activity]').innerHTML = '<li>Belum ada aktivitas. Ukur perjalanan, simpan skenario, atau catat aksi untuk memulai.</li>'; return; }
  $('[data-pf-activity]').innerHTML = recentActivities.map((item) => `
    <li class="pf-tl">
      <span class="pf-tl__icon">${icon(ICONS[item.type] || ICONS.jejak, 'icon icon--sm')}</span>
      <div class="pf-tl__body"><p class="pf-tl__title">${item.title}</p><p class="pf-tl__desc">${item.description}</p></div>
      <time class="pf-tl__date">${item.date}</time>
    </li>`).join('');
}

function renderExperiments() {
  if (!savedExperiments.length) { $('[data-pf-experiments]').innerHTML = '<li>Belum ada skenario tersimpan. Bandingkan perjalanan di Lab, lalu pilih Simpan skenario.</li>'; return; }
  $('[data-pf-experiments]').innerHTML = savedExperiments.slice(0, 3).map((exp, index) => `
    <li class="pf-exp">
      <p class="pf-exp__index">${String(index + 1).padStart(2, '0')}</p>
      <div class="pf-exp__art jv-theme-light">
        <span class="pf-exp__glyph">${glyphFor(exp.from)}</span>
        <svg class="pf-exp__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15"/><path d="M14 7l5 5-5 5"/></svg>
        <span class="pf-exp__glyph">${glyphFor(exp.to)}</span>
      </div>
      <h3 class="pf-exp__title">${exp.title}</h3>
      <p class="pf-exp__scenario">${fmtInt(exp.distance)} KM · ${fmtInt(exp.frequency)}× / minggu</p>
      <p class="pf-exp__change">${exp.change}</p>
      <p class="pf-exp__estimate"><strong class="num">${fmt(exp.estimate)}</strong> kg CO₂e / minggu <span>estimasi skenario</span></p>
    </li>`).join('');
}

function renderAction() {
  const { title, target, progress, total, status } = currentAction;
  const statusClass = status === 'Selesai' ? 'is-done' : (status === 'Sedang dicoba' ? 'is-active' : 'is-idle');
  const nodes = Array.from({ length: total }, (_, index) => {
    const x = 20 + index * (220 / Math.max(total - 1, 1));
    return { x, on: index < progress };
  });
  const runTo = nodes.filter((node) => node.on).length > 1 ? nodes[Math.min(progress, total) - 1].x : 20;
  const svg = `<svg viewBox="0 0 260 40" role="img" aria-label="${progress} dari ${total} langkah tercatat"><line class="pf-act__base" x1="20" y1="20" x2="240" y2="20"/><line class="pf-act__run" x1="20" y1="20" x2="${runTo}" y2="20"/>${nodes.map((node) => `<circle class="pf-act__node${node.on ? ' is-on' : ''}" cx="${node.x}" cy="20" r="9"/>`).join('')}</svg>`;

  $('[data-pf-action]').innerHTML = `
    <div class="pf-act__top"><h3>${title}</h3><span class="pf-status-pill ${statusClass}">${status}</span></div>
    <p class="pf-act__target">Target: ${target}</p>
    ${svg}
    <p class="pf-act__count"><strong class="num">${progress} / ${total}</strong> <span>langkah tercatat</span></p>
    <a href="../pages/aksi.html" class="btn btn--secondary btn--sm">Lihat Aksiku ${ARROW}</a>`;
}

function renderPatterns() {
  if (!measured.length) { $('[data-pf-pattern-facts]').textContent = 'Pola akan muncul setelah kamu menyimpan pengukuran perjalanan.'; $('[data-pf-bars]').textContent = 'Belum ada pengukuran tersimpan.'; return; }
  const facts = [
    ['Moda paling sering', journeyPatterns.topMode],
    ['Rata-rata jarak', `${fmt(journeyPatterns.averageDistance)} KM`],
    ['Frekuensi', `${fmt(journeyPatterns.frequency)}× / minggu`],
    ['Rata-rata penumpang', `${fmt(journeyPatterns.averageOccupancy)} orang`],
  ];
  $('[data-pf-pattern-facts]').innerHTML = facts.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');

  const max = Math.max(...journeyPatterns.modes.map((mode) => mode.count));
  $('[data-pf-bars]').innerHTML = journeyPatterns.modes.map((mode) => `
    <li>
      <div class="pf-bar__meta"><span>${mode.label}</span><span class="num">${fmtInt(mode.count)} perjalanan</span></div>
      <div class="pf-bar__rail" aria-hidden="true"><span style="--w:${(mode.count / max) * 100}%"></span></div>
    </li>`).join('');
}

function renderMonth() {
  const trips = Object.values(monthlySummary.tripsByDay).reduce((sum, value) => sum + value, 0);
  $('[data-pf-month-name]').textContent = monthlySummary.label;
  $('[data-pf-month]').innerHTML = [
    [fmtInt(trips), 'Pengukuran'],
    [`${fmt(monthlySummary.distance)}<small> KM</small>`, 'Jarak rute diukur'],
    [`${fmt(monthlySummary.estimatedCo2)}<small> kg</small>`, 'CO₂e sekali jalan'],
  ].map(([value, label]) => `<div><dt>${label}</dt><dd class="num">${value}</dd></div>`).join('');

  const svg = $('[data-pf-days]');
  const cols = 10;
  svg.setAttribute('viewBox', `0 0 300 ${Math.ceil(monthlySummary.daysInMonth / cols) * 32}`);
  svg.innerHTML = Array.from({ length: monthlySummary.daysInMonth }, (_, index) => {
    const day = index + 1;
    const count = monthlySummary.tripsByDay[day] || 0;
    const cx = 15 + (index % cols) * 30;
    const cy = 16 + Math.floor(index / cols) * 32;
    const cls = count ? 'pf-day pf-day--on' : (day > monthlySummary.today ? 'pf-day pf-day--future' : 'pf-day');
    return `<circle class="${cls}" cx="${cx}" cy="${cy}" r="${count >= 2 ? 9 : (count === 1 ? 6 : 3)}"><title>${day} ${monthlySummary.label}: ${count} pengukuran</title></circle>`;
  }).join('');
}

function renderInsights() {
  const total = journeyPatterns.modes.reduce((sum, mode) => sum + mode.count, 0);
  const privateTrips = journeyPatterns.modes.filter((mode) => mode.label === 'Mobil' || mode.label === 'Motor').reduce((sum, mode) => sum + mode.count, 0);
  const insights = measured.length ? [
    { text: 'Moda kendaraan pribadi pada rute yang kamu ukur.', data: `${privateTrips} dari ${total} pengukuran tersimpan` },
    { text: 'Skenario alternatif yang sudah kamu simpan.', data: `${profileData.experiments} skenario di Lab` },
  ] : [{ text: 'Belum cukup data untuk membaca pola perjalananmu.', data: 'Mulai dengan mengukur satu perjalanan di Jejak.' }];
  $('[data-pf-insights]').innerHTML = insights.map((item) => `<li><p class="pf-insight__text">${item.text}</p><p class="pf-insight__data">${item.data}</p></li>`).join('');
}

function renderMilestones() {
  $('[data-pf-milestones]').innerHTML = milestones.map((item) => `
    <li class="pf-mile${item.done ? ' is-done' : ''}">
      <span class="pf-mile__icon">${icon(MILE_ICONS[item.icon])}</span>
      <div><p class="pf-mile__title">${item.title}</p><p class="pf-mile__desc">${item.description}</p></div>
      <span class="pf-mile__state">${item.done ? 'Selesai' : 'Belum'}</span>
    </li>`).join('');

  $('[data-pf-badges]').innerHTML = badges.map((badge) => `
    <li class="pf-badge${badge.earned ? '' : ' is-locked'}">${icon(MILE_ICONS[badge.icon], 'icon icon--sm')}<span>${badge.title}</span>${badge.earned ? '' : '<span class="visually-hidden"> (belum diraih)</span>'}</li>`).join('');
}

function renderSettings() {
  const chevron = '<svg class="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  $('[data-pf-settings]').innerHTML = settingsItems.map((item) => `
    <li><button class="pf-setting${item.id === 'logout' ? ' pf-setting--quiet' : ''}" type="button" data-pf-setting="${item.id}"><span><strong>${item.label}</strong><small>${item.hint}</small></span>${chevron}</button></li>`).join('');
}

/* ---------------------------- interaction ---------------------------- */

function initActions() {
  const statuses = document.querySelectorAll('[data-pf-status]');
  const timers = new WeakMap();
  const say = (target, message) => {
    target.textContent = message;
    clearTimeout(timers.get(target));
    timers.set(target, setTimeout(() => { target.textContent = ''; }, 4000));
  };
  const [headStatus] = statuses;
  const dialog = document.createElement('dialog');
  dialog.className = 'profile-dialog';
  dialog.setAttribute('aria-labelledby', 'profile-dialog-title');
  dialog.innerHTML = `<h2 id="profile-dialog-title">Edit profil</h2>
    <form data-profile-form><label for="profile-local-name">Nama tampilan</label>
    <input id="profile-local-name" name="name" required minlength="2" maxlength="60" autocomplete="nickname">
    <p>Nama dan catatan disimpan di browser ini. Logout mengakhiri sesi tanpa menghapus catatan.</p>
    <div class="profile-dialog__actions"><button type="button" data-profile-cancel class="btn btn--secondary">Batal</button>
    <button type="submit" class="btn btn--primary">Simpan nama</button></div></form>
    <div data-profile-privacy hidden><p>Jejak, skenario Lab, nama tampilan, dan catatan Aksi disimpan di localStorage browser ini. Profil merangkum pengukuran dan catatan yang kamu simpan. Angka emisi adalah estimasi edukatif, bukan pengukuran langsung. ASRIA tidak mengirim data perjalanan ke server.</p>
    <p>Font Google Fonts dimuat dari layanan eksternal. Kamu dapat menghapus penyimpanan ASRIA melalui pengaturan data situs di browser.</p>
    <button type="button" class="btn btn--primary" data-privacy-close>Tutup</button></div>`;
  document.body.append(dialog);
  const form = $('[data-profile-form]', dialog);
  const privacy = $('[data-profile-privacy]', dialog);
  function openDialog(mode) {
    const editing = mode === 'edit';
    form.hidden = !editing;
    privacy.hidden = editing;
    $('#profile-dialog-title', dialog).textContent = editing ? 'Edit profil' : 'Data dan privasi';
    $('#profile-local-name', dialog).value = profileData.name;
    dialog.showModal();
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = $('#profile-local-name', dialog);
    const name = input.value.trim();
    if (name.length < 2) { input.setCustomValidity('Isi nama dengan sedikitnya dua karakter.'); input.reportValidity(); return; }
    profileData.name = name;
    const saved = startSession(name);
    renderHeader();
    dialog.close();
    say(headStatus, saved ? 'Nama tampilan tersimpan di browser ini.' : 'Nama diperbarui untuk sesi ini. Penyimpanan browser tidak tersedia.');
  });
  $('#profile-local-name', dialog).addEventListener('input', (event) => event.target.setCustomValidity(''));
  $('[data-profile-cancel]', dialog).addEventListener('click', () => dialog.close());
  $('[data-privacy-close]', dialog).addEventListener('click', () => dialog.close());
  $('[data-pf-soon]').addEventListener('click', () => openDialog('edit'));
  $('[data-pf-logout]').addEventListener('click', logout);
  document.querySelectorAll('[data-pf-setting]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.pfSetting;
      if (id === 'logout') logout();
      else if (id === 'prefs') window.location.href = './jejak.html#ukur';
      else openDialog(id);
    });
  });
}

export function initProfilePage() {
  if (!document.querySelector('[data-pf-snapshot]')) return;
  if (!activeAccount()) {
    document.querySelectorAll('.pf-section, .pf-hero__layout, .pf-status').forEach(element => { element.hidden = true; });
    const gate = document.createElement('div');
    gate.className = 'profile-entry';
    gate.innerHTML = `<h1>Perjalananmu, dalam satu profil.</h1><p>Simpan pengukuran, skenario, dan catatan aksimu di perangkat ini. Profil ini tidak memakai kata sandi atau sinkronisasi antar perangkat.</p>
      <form><label for="profile-start-name">Nama tampilan</label><input id="profile-start-name" required minlength="2" maxlength="60" autocomplete="nickname"><button class="btn btn--primary" type="submit">Gunakan profil</button><p role="status" data-entry-status></p></form>`;
    $('.pf-hero .container').append(gate);
    $('#profile-start-name', gate).value = account()?.name || '';
    $('form', gate).addEventListener('submit', event => {
      event.preventDefault();
      const name = $('#profile-start-name', gate).value.trim();
      if (name.length < 2) { $('[data-entry-status]',gate).textContent = 'Isi nama dengan sedikitnya dua karakter.'; return; }
      if (startSession(name)) window.location.reload();
      else $('[data-entry-status]',gate).textContent = 'Penyimpanan browser tidak tersedia. Aktifkan penyimpanan situs untuk memakai profil.';
    });
    return;
  }
  renderHeader();
  renderSnapshot();
  renderProgress();
  renderJourney();
  renderActivity();
  renderExperiments();
  renderAction();
  renderPatterns();
  renderMonth();
  renderInsights();
  renderMilestones();
  renderSettings();
  initActions();
}
