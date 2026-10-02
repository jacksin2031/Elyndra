// Decorative layers never participate in screen geometry or hit testing.
export function initWorldAmbience() {
  for (const root of document.querySelectorAll('#landing,#creator,#worldBackdrop')) {
    if (root.querySelector(':scope > .world-ambience')) continue;
    const layer = document.createElement('div');
    layer.className = 'world-ambience';
    layer.setAttribute('aria-hidden', 'true');
    root.prepend(layer);
  }
  const pause = () => document.documentElement.classList.toggle('ambience-paused', document.hidden);
  document.addEventListener('visibilitychange', pause);
  pause();
}
