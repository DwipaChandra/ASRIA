import { qs, on } from '../foundation/helpers.js';
import { SCROLL_THRESHOLD } from '../foundation/constants.js';

export function initNavbar() {
  const navbar = qs('.navbar');
  if (!navbar) return;

  const burger = qs('.navbar__burger', navbar);
  const mobileMenu = qs('.navbar__mobile-menu');

  function handleScroll() {
    const scrolled = window.scrollY > SCROLL_THRESHOLD;
    navbar.classList.toggle('is-scrolled', scrolled);
  }

  handleScroll();
  on(window, 'scroll', handleScroll, { passive: true });

  if (burger && mobileMenu) {
    function closeMenu(returnFocus = false) {
      mobileMenu.classList.remove('is-open');
      mobileMenu.setAttribute('aria-hidden', 'true');
      burger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('no-scroll');
      if (returnFocus) burger.focus();
    }

    on(burger, 'click', () => {
      const isOpen = mobileMenu.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(isOpen));
      mobileMenu.setAttribute('aria-hidden', String(!isOpen));
      document.body.classList.toggle('no-scroll', isOpen);
      if (isOpen) mobileMenu.querySelector('a')?.focus();
    });

    on(document, 'keydown', (event) => {
      if (event.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
        closeMenu(true);
      }
      if (event.key === 'Tab' && mobileMenu.classList.contains('is-open')) {
        const controls = [burger, ...mobileMenu.querySelectorAll('a')];
        const current = controls.indexOf(document.activeElement);
        const next = (current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
        event.preventDefault();
        controls[next].focus();
      }
    });

    document.addEventListener('click', (event) => {
      if (
        mobileMenu.classList.contains('is-open') &&
        !mobileMenu.contains(event.target) &&
        !burger.contains(event.target)
      ) {
        closeMenu();
      }
    });

    mobileMenu.querySelectorAll('a').forEach((link) => on(link, 'click', () => closeMenu()));
    const desktop = window.matchMedia('(min-width: 1025px)');
    on(desktop, 'change', () => { if (desktop.matches) closeMenu(); });
  }
}
