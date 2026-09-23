(function () {
  function init(root) {
    if (!root || root.dataset.ready) return;
    root.dataset.ready = '1';
    var tabs = root.querySelectorAll('[data-cm-shop-tier]');
    var panels = root.querySelectorAll('[data-cm-shop-panel]');
    var sort = root.querySelector('[data-cm-shop-sort]');
    var originalOrder = new WeakMap();

    panels.forEach(function (panel) {
      var grid = panel.querySelector('[data-cm-shop-grid]');
      if (grid) {
        originalOrder.set(
          grid,
          Array.prototype.slice.call(grid.querySelectorAll('[data-cm-shop-card]')),
        );
      }
    });

    function activate(tier) {
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-cm-shop-tier') === tier;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      panels.forEach(function (p) {
        if (p.getAttribute('data-cm-shop-panel') === tier) p.removeAttribute('hidden');
        else p.setAttribute('hidden', '');
      });
      if (sort) applySort(sort.value);
    }

    function applySort(mode) {
      panels.forEach(function (panel) {
        if (panel.hasAttribute('hidden')) return;
        var grid = panel.querySelector('[data-cm-shop-grid]');
        if (!grid) return;
        var cards = Array.prototype.slice.call(grid.querySelectorAll('[data-cm-shop-card]'));
        if (mode === 'manual') {
          var orig = originalOrder.get(grid) || cards;
          orig.forEach(function (c) {
            if (c.parentNode === grid || grid.contains(c)) grid.appendChild(c);
          });
          return;
        }
        cards.sort(function (a, b) {
          if (mode === 'price-asc') {
            return (Number(a.dataset.price) || 0) - (Number(b.dataset.price) || 0);
          }
          if (mode === 'latest') {
            return (Number(b.dataset.created) || 0) - (Number(a.dataset.created) || 0);
          }
          return (a.dataset.title || '').localeCompare(b.dataset.title || '');
        });
        cards.forEach(function (c) {
          grid.appendChild(c);
        });
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        activate(tab.getAttribute('data-cm-shop-tier'));
      });
    });
    if (sort) {
      sort.addEventListener('change', function () {
        applySort(sort.value);
      });
    }
  }

  document.querySelectorAll('[data-cm-shop]').forEach(init);
  document.addEventListener('shopify:section:load', function (e) {
    var el = e.target.querySelector('[data-cm-shop]') || e.target.closest('[data-cm-shop]');
    if (el) {
      el.dataset.ready = '';
      init(el);
    }
  });
})();
