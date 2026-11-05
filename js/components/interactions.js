import { qsa } from '../foundation/helpers.js';
import { initScrollReveal, animateCount } from '../foundation/helpers.js';

export function initInteractions() {
  initScrollReveal();
  initCountUps();
}

function initCountUps() {
  const counters = qsa('[data-count-to]');
  if (!counters.length || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = Number(el.dataset.countTo);
          animateCount(el, target);
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((el) => observer.observe(el));
}
