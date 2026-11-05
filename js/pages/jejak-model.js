import { storage } from '../foundation/storage.js';
import { STORAGE_KEYS } from '../foundation/constants.js';

export const LIMITS = {
  distance: { min: 1, max: 30, step: 1, initial: 8 },
  frequency: { min: 1, max: 7, initial: 1 },
};

export const WEEKS_PER_YEAR = 52;
export const WEEKS_PER_MONTH = WEEKS_PER_YEAR / 12;

export const VEHICLE_ORDER = ['car', 'motorcycle', 'bus', 'train', 'bicycle', 'walking'];

export const VEHICLES = {
  car: {
    id: 'car',
    label: 'Mobil',
    maxOccupancy: 4,
    plusOccupancy: false,
    factor: 0.19,
    basis: 'vehicle',
    factorNote: 'per kendaraan, dibagi jumlah orang di dalamnya',
    occupancyHelp: 'Pilih jumlah orang di dalam mobil, termasuk kamu.',
  },
  motorcycle: {
    id: 'motorcycle',
    label: 'Motor',
    maxOccupancy: 2,
    plusOccupancy: false,
    factor: 0.08,
    basis: 'vehicle',
    factorNote: 'per kendaraan, dibagi jumlah orang di atasnya',
    occupancyHelp: 'Motor membawa satu atau dua orang, termasuk kamu.',
  },
  bus: {
    id: 'bus',
    label: 'Bus',
    maxOccupancy: 5,
    plusOccupancy: true,
    factor: 0.05,
    basis: 'passenger',
    factorNote: 'per penumpang',
    occupancyHelp: 'Pilih jumlah orang dalam rombonganmu, termasuk kamu.',
  },
  train: {
    id: 'train',
    label: 'Kereta',
    maxOccupancy: 5,
    plusOccupancy: true,
    factor: 0.035,
    basis: 'passenger',
    factorNote: 'per penumpang',
    occupancyHelp: 'Pilih jumlah orang dalam rombonganmu, termasuk kamu.',
  },
  bicycle: {
    id: 'bicycle',
    label: 'Sepeda',
    maxOccupancy: 1,
    plusOccupancy: false,
    factor: 0,
    basis: 'none',
    factorNote: 'tanpa emisi langsung',
    occupancyHelp: 'Sepeda dipakai sendiri.',
  },
  walking: {
    id: 'walking',
    label: 'Jalan kaki',
    maxOccupancy: 1,
    plusOccupancy: false,
    factor: 0,
    basis: 'none',
    factorNote: 'tanpa emisi langsung',
    occupancyHelp: 'Perjalanan ini kamu tempuh sendiri.',
  },
};

export const STEP_ORDER = ['vehicle', 'distance', 'frequency', 'occupancy'];

export const FREQUENCY_NOTES = {
  1: 'Perjalanan sesekali.',
  2: 'Terjadi dua kali dalam seminggu.',
  3: 'Muncul di beberapa hari dalam seminggu.',
  4: 'Cukup sering terjadi dalam seminggu.',
  5: 'Menjadi bagian dari rutinitas mingguanmu.',
  6: 'Terjadi hampir setiap hari.',
  7: 'Terjadi setiap hari dalam seminggu.',
};

export function createState() {
  return {
    vehicle: null,
    distance: LIMITS.distance.initial,
    frequency: LIMITS.frequency.initial,
    occupancy: 1,
    reached: 0,
    revealed: false,
  };
}

export function isVehicle(id) {
  return Object.prototype.hasOwnProperty.call(VEHICLES, id);
}

export function allowedOccupancy(vehicleId) {
  if (!isVehicle(vehicleId)) return [1];
  const max = VEHICLES[vehicleId].maxOccupancy;
  return Array.from({ length: max }, (_, index) => index + 1);
}

export function clampInteger(value, min, max) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

export function normalizeOccupancy(vehicleId, value) {
  const allowed = allowedOccupancy(vehicleId);
  return clampInteger(value, allowed[0], allowed[allowed.length - 1]);
}

export function occupancyLabel(vehicleId, value) {
  if (value <= 1) return 'Sendiri';
  const vehicle = isVehicle(vehicleId) ? VEHICLES[vehicleId] : null;
  const plus = vehicle && vehicle.plusOccupancy && value >= vehicle.maxOccupancy;
  return plus ? `${value}+ orang` : `${value} orang`;
}

export function distanceLabel(value) {
  return `${String(value).padStart(2, '0')} KM`;
}

export function distanceDescriptor(value) {
  if (value <= 3) return 'Perjalanan dekat';
  if (value <= 10) return 'Perjalanan sedang';
  if (value <= 20) return 'Perjalanan cukup jauh';
  return 'Perjalanan jauh';
}

export function frequencyLabel(value) {
  return `${value}× / minggu`;
}

export function setVehicle(state, vehicleId) {
  if (!isVehicle(vehicleId)) return state;
  state.vehicle = vehicleId;
  state.occupancy = normalizeOccupancy(vehicleId, state.occupancy);
  return state;
}

export function setDistance(state, value) {
  const { min, max } = LIMITS.distance;
  state.distance = clampInteger(value, min, max);
  return state;
}

export function setFrequency(state, value) {
  const { min, max } = LIMITS.frequency;
  state.frequency = clampInteger(value, min, max);
  return state;
}

export function setOccupancy(state, value) {
  if (!isVehicle(state.vehicle)) return state;
  state.occupancy = normalizeOccupancy(state.vehicle, value);
  return state;
}

export function isStepValid(stepId, state) {
  if (stepId === 'vehicle') return isVehicle(state.vehicle);
  if (stepId === 'distance') {
    const { min, max } = LIMITS.distance;
    return Number.isInteger(state.distance) && state.distance >= min && state.distance <= max;
  }
  if (stepId === 'frequency') {
    const { min, max } = LIMITS.frequency;
    return Number.isInteger(state.frequency) && state.frequency >= min && state.frequency <= max;
  }
  if (stepId === 'occupancy') {
    return isVehicle(state.vehicle) && allowedOccupancy(state.vehicle).includes(state.occupancy);
  }
  return false;
}

export function isJourneyValid(state) {
  return STEP_ORDER.every((stepId) => isStepValid(stepId, state));
}

export function calculateFootprint(state) {
  if (!isJourneyValid(state)) return null;
  const vehicle = VEHICLES[state.vehicle];
  const sharedBy = vehicle.basis === 'vehicle' ? state.occupancy : 1;
  const vehicleTrip = state.distance * vehicle.factor;
  const perTrip = vehicleTrip / sharedBy;
  const perWeek = perTrip * state.frequency;

  return {
    perTrip,
    perWeek,
    perMonth: perWeek * WEEKS_PER_MONTH,
    perYear: perWeek * WEEKS_PER_YEAR,
    weeklyDistance: state.distance * state.frequency,
    sharedBy,
    isZero: vehicle.factor === 0,
  };
}

export function formatDecimal(value, digits = 1) {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatMonthly(value) {
  return formatDecimal(value, value >= 10 ? 0 : 1);
}

export function formatFactor(value) {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(value);
}

export function persistJourney(state, footprint) {
  if (!footprint) return;
  storage.set(STORAGE_KEYS.vehicle, state.vehicle);
  storage.set(STORAGE_KEYS.distance, state.distance);
  storage.set(STORAGE_KEYS.frequency, state.frequency);
  storage.set(STORAGE_KEYS.occupancy, state.occupancy);
  storage.set(STORAGE_KEYS.weeklyEmission, Number(footprint.perWeek.toFixed(3)));
  storage.set(STORAGE_KEYS.monthlyEmission, Number(footprint.perMonth.toFixed(3)));
  storage.set(STORAGE_KEYS.yearlyEmission, Number(footprint.perYear.toFixed(3)));
}
