import { initNavbar } from './components/navbar.js';
import { initProfileDropdown } from './components/profile.js';
import { initButtons } from './components/buttons.js';
import { initInteractions } from './components/interactions.js';

document.addEventListener('DOMContentLoaded', async () => {
  initNavbar();
  initProfileDropdown();
  initButtons();
  initInteractions();

  const page = document.body.dataset.page;

  if (page === 'home') {
    const { initHomePage } = await import('./pages/home.js');
    initHomePage();
  }

  if (page === 'emisi') {
    const { initEmisiPage } = await import('./pages/emisi.js');
    initEmisiPage();
  }

  if (page === 'jejak') {
    const { initJejakPage } = await import('./pages/jejak.js');
    initJejakPage();
  }

  if (page === 'lab') {
    const { initLabPage } = await import('./pages/lab.js');
    initLabPage();
  }

  if (page === 'aksi') {
    const { initAksiPage } = await import('./pages/aksi.js');
    initAksiPage();
  }

  if (page === 'profile') {
    const { initProfilePage } = await import('./pages/profile.js');
    initProfilePage();
  }
});
