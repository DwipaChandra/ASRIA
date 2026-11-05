import { storage } from '../foundation/storage.js';
import { records, EXPERIMENTS_KEY, recordActivity } from '../foundation/account.js';
import { STORAGE_KEYS } from '../foundation/constants.js';
import { VEHICLES, VEHICLE_ORDER, calculateFootprint, formatDecimal, allowedOccupancy } from './jejak-model.js';
import { createScene } from './jejak-scene.js';

const $ = (selector) => document.querySelector(selector);

function savedJourney() {
  const vehicle = storage.get(STORAGE_KEYS.vehicle);
  if (!VEHICLES[vehicle]) return null;
  const state = {
    vehicle,
    distance: Number(storage.get(STORAGE_KEYS.distance)),
    frequency: Number(storage.get(STORAGE_KEYS.frequency)),
    occupancy: Number(storage.get(STORAGE_KEYS.occupancy)),
  };
  return calculateFootprint(state) ? state : null;
}

function compareView(scenario) {
  return {
    vehicle: scenario.vehicle,
    distance: scenario.distance,
    frequency: scenario.frequency,
    occupancy: scenario.occupancy,
    showRoute: true,
    showFrequency: true,
    showOccupancy: true,
  };
}

export function initLabPage() {
  const baseline = savedJourney() || { vehicle: 'car', distance: 8, frequency: 5, occupancy: 1 };
  const state = { ...baseline };
  const before = calculateFootprint(baseline);
  const vehicle = $('#lab-vehicle');
  const distance = $('#lab-distance');
  const frequency = $('#lab-frequency');
  const occupancy = $('#lab-occupancy');
  if (!vehicle || !before) return;

  const beforeStage = $('[data-lab-scene="before"]');
  const afterStage = $('[data-lab-scene="after"]');
  const beforeLabel = $('[data-lab-compare-label="before"]');
  const afterLabel = $('[data-lab-compare-label="after"]');
  const beforeScene = beforeStage
    ? createScene(beforeStage, { theme: 'light', label: 'Ilustrasi contoh awal perjalanan' })
    : null;
  const afterScene = afterStage
    ? createScene(afterStage, { theme: 'light', label: 'Ilustrasi contoh alternatif perjalanan' })
    : null;
  if (beforeScene) beforeScene.update(compareView(baseline));
  if (beforeLabel) beforeLabel.textContent = VEHICLES[baseline.vehicle].label.toLowerCase();

  vehicle.innerHTML = VEHICLE_ORDER.map((id) => `<option value="${id}">${VEHICLES[id].label}</option>`).join('');
  $('#lab-source').textContent = savedJourney()
    ? 'Perbandingan dimulai dari perjalanan terakhir yang kamu ukur di Jejak.'
    : 'Memakai contoh perjalanan 8 km dengan mobil, 5 kali seminggu. Ukur perjalananmu di Jejak untuk perbandingan pribadi.';

  function occupancyOptions() {
    occupancy.innerHTML = allowedOccupancy(state.vehicle).map((number) => `<option value="${number}">${number} orang</option>`).join('');
    state.occupancy = Math.min(state.occupancy, allowedOccupancy(state.vehicle).at(-1));
    occupancy.value = String(state.occupancy);
    $('#lab-occupancy-note').textContent = VEHICLES[state.vehicle].basis === 'passenger'
      ? 'Faktor contoh untuk moda ini sudah dihitung per penumpang.'
      : VEHICLES[state.vehicle].basis === 'none'
        ? 'Moda ini tidak menghasilkan emisi langsung dari kendaraan.'
        : 'Emisi kendaraan dibagi sesuai jumlah orang di dalamnya.';
  }

  function render() {
    const after = calculateFootprint(state);
    if (!after) return;
    if (afterScene) afterScene.update(compareView(state));
    if (afterLabel) afterLabel.textContent = VEHICLES[state.vehicle].label.toLowerCase();
    vehicle.value = state.vehicle;
    distance.value = String(state.distance);
    frequency.value = String(state.frequency);
    occupancy.value = String(state.occupancy);
    $('#lab-distance-value').textContent = `${state.distance} km`;
    $('#lab-frequency-value').textContent = `${state.frequency} kali`;
    $('#lab-before').textContent = formatDecimal(before.perWeek, 1);
    $('#lab-after').textContent = formatDecimal(after.perWeek, 1);
    const maximum = Math.max(before.perWeek, after.perWeek, 0.1);
    $('#lab-before-bar').style.width = `${before.perWeek / maximum * 100}%`;
    $('#lab-after-bar').style.width = `${after.perWeek / maximum * 100}%`;
    const difference = after.perWeek - before.perWeek;
    $('#lab-delta').textContent = Math.abs(difference) < 0.005
      ? 'Belum ada perubahan pada perkiraan emisi mingguan.'
      : difference < 0
        ? `Perkiraan turun ${formatDecimal(Math.abs(difference), 1)} kg CO₂e per minggu.`
        : `Perkiraan naik ${formatDecimal(difference, 1)} kg CO₂e per minggu.`;
    storage.set(STORAGE_KEYS.scenarioEmission, Number(after.perWeek.toFixed(3)));
  }

  $('#lab-save').addEventListener('click', () => {
    const after = calculateFootprint(state);
    const item = { from: { ...baseline }, to: { ...state }, date: new Date().toISOString() };
    const saved = storage.set(EXPERIMENTS_KEY, [item, ...records(EXPERIMENTS_KEY)].slice(0, 50));
    $('#lab-save-status').textContent = saved ? 'Skenario tersimpan di profil perangkat ini.' : 'Penyimpanan browser tidak tersedia.';
    if (saved) recordActivity('lab', 'Skenario disimpan', `${VEHICLES[state.vehicle].label}, ${state.distance} km, ${after.perWeek.toFixed(2)} kg CO₂e per minggu`);
  });
  occupancyOptions();
  render();
  vehicle.addEventListener('change', () => { state.vehicle = vehicle.value; occupancyOptions(); render(); });
  distance.addEventListener('input', () => { state.distance = Number(distance.value); render(); });
  frequency.addEventListener('input', () => { state.frequency = Number(frequency.value); render(); });
  occupancy.addEventListener('change', () => { state.occupancy = Number(occupancy.value); render(); });
  $('#lab-reset').addEventListener('click', () => { Object.assign(state, baseline); occupancyOptions(); render(); });
}
