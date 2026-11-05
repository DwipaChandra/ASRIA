import { qs, qsa, on } from '../foundation/helpers.js';
import { storage } from '../foundation/storage.js';
import { recordActivity } from '../foundation/account.js';

const PARTS = {
  engine: {
    index: '01',
    icon: 'engine',
    title: 'Mesin',
    text: 'Pada kendaraan berbahan bakar, proses pembakaran mengubah energi bahan bakar menjadi tenaga gerak dan menghasilkan emisi.',
    note: 'Kendaraan listrik tidak membakar bahan bakar di kendaraannya, tetapi tetap memakai energi dari sumber tertentu.',
    tags: ['Kendaraan', 'Energi'],
  },
  exhaust: {
    index: '02',
    icon: 'exhaust',
    title: 'Knalpot',
    text: 'Gas hasil pembakaran keluar melalui knalpot. Di sinilah emisi langsung dari kendaraan berbahan bakar dilepas ke udara.',
    note: 'Kendaraan listrik tidak memiliki knalpot, sehingga tidak ada emisi langsung dari kendaraannya.',
    tags: ['Kendaraan', 'Frekuensi'],
  },
  wheel: {
    index: '03',
    icon: 'wheel',
    title: 'Ban',
    text: 'Setiap putaran roda membutuhkan energi. Semakin sering kendaraan dipakai, semakin banyak energi yang terpakai sepanjang waktu.',
    note: 'Kondisi ban, seperti tekanan angin, dapat ikut memengaruhi seberapa boros kendaraan bergerak.',
    tags: ['Kendaraan', 'Frekuensi'],
  },
  route: {
    index: '04',
    icon: 'route',
    title: 'Perjalanan',
    text: 'Jarak dan frekuensi perjalanan ikut menentukan berapa banyak energi yang digunakan selama perjalanan.',
    note: 'Rute yang sama, dijalani berulang, membuat jejak terkumpul dari waktu ke waktu.',
    tags: ['Jarak', 'Frekuensi'],
  },
  fuel: {
    index: '05',
    icon: 'fuel',
    title: 'Energi',
    text: 'Jenis bahan bakar atau sumber energi berkaitan dengan karakteristik emisinya. Bensin, solar, dan listrik masing-masing berbeda.',
    note: 'Pada kendaraan listrik, jejak bergeser ke cara listrik tersebut dihasilkan.',
    tags: ['Energi', 'Kendaraan'],
  },
};

const ORDER = ['engine', 'exhaust', 'wheel', 'route', 'fuel'];

function initAnatomy() {
  const root = qs('[data-anatomy]');
  if (!root) return;

  const stage = qs('[data-stage]', root);
  const tabs = qsa('.em-tab', root);
  const spots = qsa('.em-hs', root);
  const svgParts = qsa('[data-svg-part]', root);
  const panel = qs('[data-panel]', root);
  const elIndex = qs('[data-p-index]', root);
  const elTitle = qs('[data-p-title]', root);
  const elText = qs('[data-p-text]', root);
  const elNote = qs('[data-p-note]', root);
  const elTags = qs('[data-p-tags]', root);
  const elIcon = qs('.em-panel__icon use', root);

  function activate(key, fromUser) {
    const data = PARTS[key];
    if (!data) return;

    stage.dataset.active = key;
    svgParts.forEach((part) => part.classList.toggle('is-active', part.dataset.svgPart === key));
    spots.forEach((spot) => {
      const selected = spot.dataset.part === key;
      spot.classList.toggle('is-active', selected);
      spot.setAttribute('aria-pressed', String(selected));
    });
    tabs.forEach((tab) => {
      const selected = tab.dataset.part === key;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });

    panel.setAttribute('aria-labelledby', 'em-tab-' + key);
    elIndex.textContent = data.index;
    elTitle.textContent = data.title;
    elText.textContent = data.text;
    elNote.textContent = data.note;
    elTags.innerHTML = data.tags.map((tag) => '<li>' + tag + '</li>').join('');
    elIcon.setAttribute('href', '#ic-' + data.icon);

    if (fromUser) {
      panel.classList.remove('is-in');
      void panel.offsetWidth;
      panel.classList.add('is-in');
    }
  }

  tabs.forEach((tab) => {
    on(tab, 'click', () => activate(tab.dataset.part, true));
    on(tab, 'keydown', (event) => {
      const index = ORDER.indexOf(tab.dataset.part);
      let next = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % ORDER.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + ORDER.length) % ORDER.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = ORDER.length - 1;
      if (next === null) return;
      event.preventDefault();
      activate(ORDER[next], true);
      qs('#em-tab-' + ORDER[next], root).focus();
    });
  });

  spots.forEach((spot) => on(spot, 'click', () => activate(spot.dataset.part, true)));

  activate('engine', false);
}

function initFactors() {
  const cards = qsa('.em-factor');
  cards.forEach((card) => {
    on(card, 'click', () => {
      const open = card.getAttribute('aria-expanded') === 'true';
      card.setAttribute('aria-expanded', String(!open));
    });
  });
}

function setLanes(container, count, p) {
  qsa('.em-lane', container).forEach((lane, index) => {
    lane.classList.toggle('is-off', index >= count);
    if (typeof p === 'number') lane.style.setProperty('--p', p.toFixed(3));
  });
}

function initCompare() {
  const root = qs('[data-compare]');
  if (!root) return;

  const buttons = qsa('[data-mode]', root);
  const lanes = qs('[data-c-lanes]', root);
  const freq = qs('[data-c-freq]', root);
  const total = qs('[data-c-total]', root);
  const insight = qs('[data-c-insight]', root);

  const MODES = {
    once: {
      count: 1,
      freq: '1x per minggu',
      total: '8 KM',
      text: 'Dengan satu kali perjalanan, keduanya terlihat sama. Perbedaannya baru muncul ketika rute yang sama diulang.',
    },
    repeat: {
      count: 5,
      freq: '5x per minggu',
      total: '40 KM',
      text: 'Jarak tiap perjalanan sama, tetapi Perjalanan B diulang lima kali seminggu. Jejaknya menumpuk dari kebiasaan, bukan dari satu perjalanan.',
    },
  };

  function setMode(mode) {
    const data = MODES[mode];
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    setLanes(lanes, data.count);
    freq.textContent = data.freq;
    total.textContent = data.total;
    insight.textContent = data.text;
  }

  buttons.forEach((button) => on(button, 'click', () => setMode(button.dataset.mode)));
}

function initSimulator() {
  const root = qs('[data-sim]');
  if (!root) return;

  const dist = qs('#em-dist', root);
  const freq = qs('#em-freq', root);
  const distOut = qs('[data-s-dist-out]', root);
  const freqOut = qs('[data-s-freq-out]', root);
  const distBig = qs('[data-s-dist-big]', root);
  const freqBig = qs('[data-s-freq-big]', root);
  const lanes = qs('[data-s-lanes]', root);
  const meter = qsa('i', qs('[data-s-meter]', root));
  const level = qs('[data-s-level]', root);
  const statement = qs('[data-s-statement]', root);

  const pad = (value) => String(value).padStart(2, '0');

  function paintRange(input) {
    const min = Number(input.min);
    const max = Number(input.max);
    const pct = ((Number(input.value) - min) / (max - min)) * 100;
    input.style.setProperty('--fill', pct + '%');
  }

  function render(changed) {
    const d = Number(dist.value);
    const f = Number(freq.value);
    const sum = d * f;
    const segments = Math.min(5, Math.max(1, Math.ceil(sum / 20)));
    const p = 0.28 + 0.72 * ((d - 5) / 15);

    distOut.textContent = pad(d) + ' KM';
    freqOut.textContent = f + 'x';
    distBig.textContent = pad(d);
    freqBig.textContent = f;
    setLanes(lanes, f, p);
    meter.forEach((bar, index) => bar.classList.toggle('is-on', index < segments));

    const label = segments <= 2 ? 'ringan' : segments === 3 ? 'sedang' : 'padat';
    level.textContent = 'Pola perjalanan: ' + label;

    let lead = 'Contoh pola perjalanan';
    if (changed === 'dist') lead = 'Rute yang lebih panjang membawa lebih banyak jarak di setiap perjalanan';
    if (changed === 'freq') lead = 'Frekuensi yang lebih tinggi membuat rute yang sama diulang lebih sering';
    statement.textContent = lead + ': ' + d + ' KM dijalani ' + f + 'x, sehingga terkumpul ' + sum + ' KM dalam seminggu.';

    paintRange(dist);
    paintRange(freq);
  }

  on(dist, 'input', () => render('dist'));
  on(freq, 'input', () => render('freq'));
  render(null);
}

const QUIZ = [
  {
    statement: 'Jarak perjalanan ikut memengaruhi jejak.',
    answer: 'fakta',
    explain: 'Jarak adalah salah satu faktor yang dapat memengaruhi penggunaan energi dan estimasi jejak sebuah perjalanan.',
  },
  {
    statement: 'Perjalanan pendek tidak berpengaruh, sekalipun sering diulang.',
    answer: 'mitos',
    explain: 'Perjalanan pendek yang berulang tetap terakumulasi. Frekuensi membuat jejak kecil bertambah dari waktu ke waktu.',
  },
  {
    statement: 'Berbagi perjalanan dapat membagi jejaknya ke lebih dari satu orang.',
    answer: 'fakta',
    explain: 'Ketika satu perjalanan dipakai bersama, jejak per orangnya menjadi lebih kecil dibandingkan berangkat sendiri-sendiri.',
  },
  {
    statement: 'Mengubah kebiasaan berarti harus berhenti memakai kendaraan sepenuhnya.',
    answer: 'mitos',
    explain: 'Perubahan bisa berupa frekuensi, pola, moda, berbagi, atau penggabungan perjalanan. Tidak harus berubah total.',
  },
];

function initQuiz() {
  const root = qs('[data-quiz]');
  if (!root) return;

  const main = qs('[data-q-main]', root);
  const done = qs('[data-q-done]', root);
  const count = qs('[data-q-count]', root);
  const statement = qs('[data-q-statement]', root);
  const choices = qsa('.em-choice', root);
  const answer = qs('[data-q-answer]', root);
  const verdict = qs('[data-q-verdict]', root);
  const icon = qs('[data-q-icon] use', root);
  const title = qs('[data-q-title]', root);
  const sub = qs('[data-q-sub]', root);
  const explain = qs('[data-q-explain]', root);
  const next = qs('[data-q-next]', root);
  const reset = qs('[data-q-reset]', root);
  const score = qs('[data-q-score]', root);
  const bars = qsa('.em-quiz__progress i', root);

  let index = 0;
  let correct = 0;

  function paintProgress() {
    bars.forEach((bar, i) => {
      bar.classList.toggle('is-done', i < index);
      bar.classList.toggle('is-current', i === index && index < QUIZ.length);
    });
  }

  function show(focus = false) {
    const item = QUIZ[index];
    statement.textContent = item.statement;
    count.textContent = 'Pernyataan ' + (index + 1) + ' dari ' + QUIZ.length;
    choices.forEach((choice) => {
      choice.disabled = false;
      choice.classList.remove('is-correct', 'is-wrong', 'is-muted');
      choice.removeAttribute('aria-pressed');
    });
    answer.classList.remove('is-open');
    answer.setAttribute('aria-hidden', 'true');
    answer.inert = true;
    next.firstChild.textContent = index === QUIZ.length - 1 ? 'Lihat hasil ' : 'Pertanyaan berikutnya ';
    paintProgress();
    statement.tabIndex = -1;
    if (focus) statement.focus({ preventScroll: true });
  }

  function choose(value) {
    const item = QUIZ[index];
    const isRight = value === item.answer;
    if (isRight) correct += 1;

    choices.forEach((choice) => {
      const chosen = choice.dataset.choice === value;
      choice.disabled = true;
      choice.setAttribute('aria-pressed', String(chosen));
      if (choice.dataset.choice === item.answer) choice.classList.add('is-correct');
      else if (chosen) choice.classList.add('is-wrong');
      else choice.classList.add('is-muted');
    });

    verdict.classList.toggle('is-wrong', !isRight);
    icon.setAttribute('href', isRight ? '#ic-check' : '#ic-question');
    title.textContent = item.answer === 'fakta' ? 'Fakta' : 'Mitos';
    sub.textContent = isRight ? 'Jawabanmu tepat' : 'Belum tepat, ini penjelasannya';
    explain.textContent = item.explain;
    answer.classList.add('is-open');
    answer.removeAttribute('aria-hidden');
    answer.inert = false;
    next.focus({ preventScroll: true });
  }

  function finish() {
    storage.set('asria_emisi_complete', true);
    recordActivity('emisi', 'Kuis Emisi selesai', `${correct} dari ${QUIZ.length} jawaban tepat`);
    index = QUIZ.length;
    paintProgress();
    main.hidden = true;
    done.hidden = false;
    count.textContent = 'Selesai';
    score.textContent = 'Kamu menjawab ' + correct + ' dari ' + QUIZ.length + ' dengan tepat.';
  }

  choices.forEach((choice) => on(choice, 'click', () => choose(choice.dataset.choice)));

  on(next, 'click', () => {
    if (index >= QUIZ.length - 1) {
      finish();
      return;
    }
    index += 1;
    show(true);
  });

  on(reset, 'click', () => {
    index = 0;
    correct = 0;
    main.hidden = false;
    done.hidden = true;
    show(true);
  });

  show();
}

const CHANGES = {
  frekuensi: {
    value: '18 hari',
    sub: 'Dua perjalanan lebih sedikit dalam sebulan, misalnya dengan bekerja dari rumah.',
    build: (i) => (i < 18 ? 'keep' : 'drop'),
    legend: [['keep', 'Tetap berjalan'], ['drop', 'Perjalanan dikurangi']],
  },
  gabung: {
    value: '16 hari',
    sub: 'Beberapa urusan digabung menjadi satu rute yang sama.',
    build: (i) => (i < 16 ? 'keep' : 'drop'),
    legend: [['keep', 'Perjalanan tersendiri'], ['drop', 'Perjalanan yang digabung']],
  },
  berbagi: {
    value: '20 hari',
    sub: 'Perjalanan yang sama, tetapi dibagi bersama satu orang lain.',
    build: () => 'share',
    legend: [['share', 'Perjalanan bersama, 2 orang']],
  },
  moda: {
    value: '15 hari',
    sub: 'Lima hari berpindah ke moda lain, misalnya transportasi umum.',
    build: (i) => (i < 15 ? 'keep' : 'swap'),
    legend: [['keep', 'Kendaraan pribadi'], ['swap', 'Moda lain']],
  },
};

function initChange() {
  const root = qs('[data-change]');
  if (!root) return;

  const options = qsa('.em-option', root);
  const now = qs('[data-days-now]', root);
  const next = qs('[data-days-next]', root);
  const value = qs('[data-b-value]', root);
  const sub = qs('[data-b-sub]', root);
  const legend = qs('[data-b-legend]', root);
  const keys = Object.keys(CHANGES);

  const days = (state) => Array.from({ length: 20 }, (_, i) => '<i class="em-day' + (state(i) === 'keep' ? '' : ' is-' + state(i)) + '"></i>').join('');

  now.innerHTML = days(() => 'keep');

  function select(key, focus) {
    const data = CHANGES[key];
    options.forEach((option) => {
      const active = option.dataset.change === key;
      option.classList.toggle('is-active', active);
      option.setAttribute('aria-checked', String(active));
      option.tabIndex = active ? 0 : -1;
    });
    value.textContent = data.value;
    sub.textContent = data.sub;
    next.innerHTML = days(data.build);
    legend.innerHTML = data.legend.map(([state, text]) => '<li><i' + (state === 'keep' ? '' : ' class="is-' + state + '"') + '></i>' + text + '</li>').join('');
    if (focus) qs('[data-change="' + key + '"]', root).focus();
  }

  options.forEach((option) => {
    on(option, 'click', () => select(option.dataset.change, false));
    on(option, 'keydown', (event) => {
      const index = keys.indexOf(option.dataset.change);
      let target = null;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') target = (index + 1) % keys.length;
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') target = (index - 1 + keys.length) % keys.length;
      if (target === null) return;
      event.preventDefault();
      select(keys[target], true);
    });
  });

  select('frekuensi', false);
}

export function initEmisiPage() {
  initAnatomy();
  initFactors();
  initCompare();
  initSimulator();
  initQuiz();
  initChange();
}
