/**
 * CanMed cart helpers — AJAX add + branded header count + open Horizon cart drawer.
 */
(function (window) {
  var SECTION_ID = 'cart-drawer-section';

  function root() {
    return (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';
  }

  function openDrawer() {
    var drawer = document.querySelector('theme-drawer#cart-drawer');
    if (drawer && typeof drawer.open === 'function') {
      drawer.open();
      return true;
    }
    var dialog = document.querySelector('#cart-drawer dialog, theme-drawer#cart-drawer dialog');
    if (dialog && typeof dialog.showModal === 'function' && !dialog.open) {
      dialog.showModal();
      return true;
    }
    window.location.href = root() + 'cart';
    return false;
  }

  function setCount(count) {
    var n = Number(count) || 0;
    document.querySelectorAll('[data-cm-cart-count]').forEach(function (el) {
      el.textContent = n > 99 ? '99+' : String(n);
      if (n < 1) el.setAttribute('hidden', '');
      else el.removeAttribute('hidden');
    });
    document.querySelectorAll('[data-cm-cart-toggle]').forEach(function (btn) {
      btn.classList.toggle('has-items', n > 0);
      btn.setAttribute('aria-label', n > 0 ? 'Cart, ' + n + ' items' : 'Cart');
    });
  }

  function replaceDrawerSections(sectionsHtml) {
    if (!sectionsHtml || !sectionsHtml[SECTION_ID]) return;
    var current = document.getElementById('shopify-section-' + SECTION_ID);
    if (!current) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = sectionsHtml[SECTION_ID];
    var next = tmp.querySelector('#shopify-section-' + SECTION_ID) || tmp.firstElementChild;
    if (next) current.replaceWith(next);
  }

  async function fetchCart() {
    var res = await fetch(root() + 'cart.js', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
    if (!res.ok) throw new Error('Could not load cart');
    return res.json();
  }

  async function addFromForm(form) {
    var fd = new FormData(form);
    var id = fd.get('id');
    if (!id) throw new Error('Missing variant');
    var quantity = Number(fd.get('quantity') || 1) || 1;

    var res = await fetch(root() + 'cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        items: [{ id: Number(id), quantity: quantity }],
        sections: SECTION_ID,
        sections_url: window.location.pathname,
      }),
    });

    var data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) {
      throw new Error(data.description || data.message || 'Could not add to cart');
    }

    replaceDrawerSections(data.sections);
    var cart = await fetchCart();
    setCount(cart.item_count);
    openDrawer();
    return { data: data, cart: cart };
  }

  window.CanMedCart = {
    openDrawer: openDrawer,
    setCount: setCount,
    addFromForm: addFromForm,
    fetchCart: fetchCart,
  };
})(window);
