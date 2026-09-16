(function () {
  function initHeader(root) {
    if (!root || root.dataset.cmHeaderReady) return;
    root.dataset.cmHeaderReady = '1';

    var onScroll = function () {
      root.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var toggle = root.querySelector('[data-cm-menu-toggle]');
    var drawer = root.querySelector('[data-cm-menu-drawer]');
    if (!toggle || !drawer) return;

    toggle.addEventListener('click', function () {
      var open = drawer.hasAttribute('hidden');
      if (open) {
        drawer.removeAttribute('hidden');
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', 'Close menu');
      } else {
        drawer.setAttribute('hidden', '');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open menu');
      }
    });
  }

  document.querySelectorAll('[data-cm-header]').forEach(initHeader);
  document.addEventListener('shopify:section:load', function (event) {
    var header = event.target.querySelector('[data-cm-header]') || event.target.closest('[data-cm-header]');
    if (header) initHeader(header);
  });
})();
