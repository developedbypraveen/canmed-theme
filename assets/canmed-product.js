(function () {
  function init(root) {
    if (!root || root.dataset.ready) return;
    root.dataset.ready = '1';

    var variantInput = root.querySelector('[data-cm-variant-id]');
    var priceEl = root.querySelector('[data-cm-product-price]');
    var skuEl = root.querySelector('[data-cm-product-sku]');
    var pills = root.querySelectorAll('[data-cm-variant-btn]');
    var addBtn = root.querySelector('[data-cm-add-cart]');

    pills.forEach(function (btn) {
      btn.addEventListener('click', function () {
        pills.forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
        });
        if (variantInput) variantInput.value = btn.getAttribute('data-variant-id');
        if (priceEl) priceEl.textContent = btn.getAttribute('data-variant-price') || '';
        if (skuEl) skuEl.textContent = btn.getAttribute('data-variant-sku') || '';
        if (addBtn) {
          addBtn.disabled = btn.getAttribute('data-variant-available') === 'false';
        }
      });
    });
  }

  document.querySelectorAll('[data-cm-product]').forEach(init);
  document.addEventListener('shopify:section:load', function (e) {
    var el = e.target.querySelector('[data-cm-product]') || e.target.closest('[data-cm-product]');
    if (el) {
      el.dataset.ready = '';
      init(el);
    }
  });
})();
