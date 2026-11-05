import { qs, on } from '../foundation/helpers.js';
import { activeAccount, logout } from '../foundation/account.js';

export function initProfileDropdown() {
  const avatar = qs('.navbar__avatar');
  const dropdown = qs('.navbar__dropdown');
  if (!avatar || !dropdown) return;
  function paintAccount() {
    const user = activeAccount();
    avatar.textContent = user ? user.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() : 'A';
    const item = dropdown.querySelector('[data-action="logout"]');
    if (item) { item.hidden = !user; item.lastChild.textContent = ' Logout'; }
    const link = dropdown.querySelector('a');
    if (link) link.lastChild.textContent = user ? ' Profil saya' : ' Gunakan profil';
  }
  paintAccount();
  window.addEventListener('asria:account', paintAccount);
  window.addEventListener('storage', paintAccount);

  function close() {
    dropdown.classList.remove('is-open');
    avatar.setAttribute('aria-expanded', 'false');
  }

  on(avatar, 'click', (event) => {
    event.stopPropagation();
    const isOpen = dropdown.classList.toggle('is-open');
    avatar.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) dropdown.querySelector('[role="menuitem"]')?.focus();
  });

  document.addEventListener('click', (event) => {
    if (!dropdown.contains(event.target) && !avatar.contains(event.target)) {
      close();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && dropdown.classList.contains('is-open')) {
      close();
      avatar.focus();
    }
    if (dropdown.classList.contains('is-open') && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      const items = [...dropdown.querySelectorAll('[role="menuitem"]')].filter(item => !item.hidden);
      const index = items.indexOf(document.activeElement);
      items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
    }
  });

  const logoutItem = qs('[data-action="logout"]', dropdown);
  if (logoutItem) {
    on(logoutItem, 'click', () => {
      close();
      logout();
    });
  }
}
