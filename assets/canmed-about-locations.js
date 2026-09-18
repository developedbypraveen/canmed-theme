(function () {
  function init(root) {
    if (!root || root.dataset.ready) return;
    root.dataset.ready = '1';
    var tabs = root.querySelectorAll('[data-cm-loc-tab]');
    var panels = root.querySelectorAll('[data-cm-loc-panel]');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var id = tab.getAttribute('data-cm-loc-tab');
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-checked', on ? 'true' : 'false');
        });
        panels.forEach(function (p) {
          if (p.getAttribute('data-cm-loc-panel') === id) p.removeAttribute('hidden');
          else p.setAttribute('hidden', '');
        });
      });
    });
  }
  document.querySelectorAll('[data-cm-about-locations]').forEach(init);
  document.addEventListener('shopify:section:load', function (e) {
    var el = e.target.querySelector('[data-cm-about-locations]') || e.target.closest('[data-cm-about-locations]');
    if (el) { el.dataset.ready = ''; init(el); }
  });
})();
