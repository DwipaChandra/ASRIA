import { storage } from './storage.js';

export const ACCOUNT_KEY = 'asria_profile';
export const SESSION_KEY = 'asria_session';
export const JOURNEYS_KEY = 'asria_journey_history';
export const EXPERIMENTS_KEY = 'asria_experiments';
export const ACTIVITY_KEY = 'asria_activity';

export function account() {
  const value = storage.get(ACCOUNT_KEY);
  return value && typeof value.name === 'string' && value.name.trim().length >= 2 && !Number.isNaN(Date.parse(value.joined)) ? value : null;
}

export function activeAccount() {
  return storage.get(SESSION_KEY) === true ? account() : null;
}

export function startSession(name) {
  const previous = account();
  const value = { name: name.trim().slice(0, 60), joined: previous?.joined || new Date().toISOString() };
  if (!storage.set(ACCOUNT_KEY, value)) return false;
  storage.set('asria_profile_name', value.name);
  if (!storage.set(SESSION_KEY, true)) return false;
  window.dispatchEvent(new Event('asria:account'));
  return true;
}

export function logout() {
  storage.remove(SESSION_KEY);
  window.dispatchEvent(new Event('asria:account'));
  window.location.href = document.body.dataset.page === 'home' ? './pages/profile.html' : './profile.html';
}

export function records(key) {
  const value = storage.get(key, []);
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : [];
}

export function recordActivity(type, title, description) {
  storage.set(ACTIVITY_KEY, [{ type, title, description, date: new Date().toISOString() }, ...records(ACTIVITY_KEY)].slice(0, 50));
}

export function recordJourney(state) {
  const journey = { vehicle: state.vehicle, distance: state.distance, frequency: state.frequency, occupancy: state.occupancy };
  const history = records(JOURNEYS_KEY);
  // Reopening an unchanged result must not create another measurement.
  const latest = history[0];
  if (latest && Object.keys(journey).every(key => latest[key] === journey[key])) return;
  storage.set(JOURNEYS_KEY, [{ ...journey, date: new Date().toISOString() }, ...history].slice(0, 100));
  recordActivity('jejak', 'Perjalanan diukur', `${state.distance} km, ${state.frequency} kali per minggu`);
}
