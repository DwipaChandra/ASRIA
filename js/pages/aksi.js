import { storage } from '../foundation/storage.js';
import { recordActivity } from '../foundation/account.js';
import { STORAGE_KEYS } from '../foundation/constants.js';
import { vehicleArtwork } from './jejak-scene.js';

export function initAksiPage() {
  document.querySelectorAll('[data-action-vehicle]').forEach((element) => {
    element.innerHTML = vehicleArtwork(element.dataset.actionVehicle);
    element.querySelectorAll('.jv-p').forEach((person) => person.classList.add('is-on'));
  });
  const boxes = [...document.querySelectorAll('[data-action-step]')];
  if (!boxes.length) return;
  const saved = storage.get(STORAGE_KEYS.actionProgress, []);
  const completed = Array.isArray(saved) ? saved.filter((step) => Number.isInteger(step) && step >= 0 && step < boxes.length) : [];
  boxes.forEach((box, index) => { box.checked = completed.includes(index); });

  function render() {
    const checked = boxes.filter((box) => box.checked);
    document.querySelector('#aksi-count').textContent = `${checked.length} dari ${boxes.length}`;
    document.querySelector('#aksi-bar').style.width = `${checked.length / boxes.length * 100}%`;
    storage.set(STORAGE_KEYS.actionProgress, checked.map((box) => Number(box.dataset.actionStep)));
  }

  boxes.forEach((box) => box.addEventListener('change', () => {
    render();
    recordActivity('aksi', box.checked ? 'Aksi dicatat' : 'Catatan aksi dibatalkan', box.closest('label')?.textContent.trim().slice(0, 100) || 'Daftar langkah diperbarui');
  }));
  document.querySelector('#aksi-clear').addEventListener('click', () => {
    boxes.forEach((box) => { box.checked = false; });
    render();
  });
  render();
}
