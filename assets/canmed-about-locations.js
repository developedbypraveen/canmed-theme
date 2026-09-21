(function () {
  function init(root) {
    if (!root || root.dataset.ready) return;
    root.dataset.ready = '1';
    var tabs = root.querySelectorAll('[data-cm-loc-tab]');
    var panels = root.querySelectorAll('[data-cm-loc-panel]');
    if (!tabs.length) return;

    function activate(id) {
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-cm-loc-tab') === id;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (p) {
        if (p.getAttribute('data-cm-loc-panel') === id) p.removeAttribute('hidden');
        else p.setAttribute('hidden', '');
      });
    }

    tabs.forEach(function (tab, index) {
      tab.tabIndex = index === 0 ? 0 : -1;
      tab.addEventListener('click', function () {
        activate(tab.getAttribute('data-cm-loc-tab'));
      });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[index + 1] || tabs[0];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[index - 1] || tabs[tabs.length - 1];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (!next) return;
        e.preventDefault();
        next.focus();
        activate(next.getAttribute('data-cm-loc-tab'));
      });
    });
  }

  document.querySelectorAll('[data-cm-about-locations]').forEach(init);
  document.addEventListener('shopify:section:load', function (e) {
    var el = e.target.querySelector('[data-cm-about-locations]') || e.target.closest('[data-cm-about-locations]');
    if (el) {
      el.dataset.ready = '';
      init(el);
    }
  });
})();
