(function () {
  function setOpen(root, toggle, drawer, open) {
    var iconOpen = toggle.querySelector('.cm-header__icon-open');
    var iconClose = toggle.querySelector('.cm-header__icon-close');
    if (open) {
      drawer.removeAttribute('hidden');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
      root.classList.add('is-menu-open');
      if (iconOpen) iconOpen.setAttribute('hidden', '');
      if (iconClose) iconClose.removeAttribute('hidden');
    } else {
      drawer.setAttribute('hidden', '');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      root.classList.remove('is-menu-open');
      if (iconOpen) iconOpen.removeAttribute('hidden');
      if (iconClose) iconClose.setAttribute('hidden', '');
    }
  }

  function initCartToggle(root) {
    root.querySelectorAll('[data-cm-cart-toggle]').forEach(function (btn) {
      if (btn.dataset.cmCartBound) return;
      btn.dataset.cmCartBound = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (window.CanMedCart && typeof CanMedCart.openDrawer === 'function') {
          CanMedCart.openDrawer();
        } else {
          var root = (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';
          window.location.href = root + 'cart';
        }
      });
    });
  }

  function initHeader(root) {
    if (!root || root.dataset.cmHeaderReady) return;
    root.dataset.cmHeaderReady = '1';

    var onScroll = function () {
      root.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    initCartToggle(root);

    var toggle = root.querySelector('[data-cm-menu-toggle]');
    var drawer = root.querySelector('[data-cm-menu-drawer]');
    if (toggle && drawer) {
      toggle.addEventListener('click', function () {
        var open = drawer.hasAttribute('hidden');
        setOpen(root, toggle, drawer, open);
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && !drawer.hasAttribute('hidden')) {
          setOpen(root, toggle, drawer, false);
        }
      });

      var mq = window.matchMedia('(min-width: 1024px)');
      var onMq = function () {
        if (mq.matches) setOpen(root, toggle, drawer, false);
      };
      if (mq.addEventListener) mq.addEventListener('change', onMq);
      else if (mq.addListener) mq.addListener(onMq);
    }
  }

  document.querySelectorAll('[data-cm-header]').forEach(initHeader);
  document.addEventListener('shopify:section:load', function (event) {
    var header = event.target.querySelector('[data-cm-header]') || event.target.closest('[data-cm-header]');
    if (header) {
      header.dataset.cmHeaderReady = '';
      initHeader(header);
    }
  });
})();
