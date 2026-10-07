(function () {
  function init(root) {
    if (!root || root.dataset.ready) return;
    root.dataset.ready = '1';

    var form = root.querySelector('[data-cm-product-form]') || root.querySelector('form[action*="/cart/add"]');
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

    if (!form || !addBtn) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (addBtn.disabled || addBtn.getAttribute('aria-busy') === 'true') return;
      if (!window.CanMedCart || typeof CanMedCart.addFromForm !== 'function') {
        form.submit();
        return;
      }

      var label = addBtn.getAttribute('data-cm-add-label') || addBtn.textContent.trim();
      addBtn.setAttribute('data-cm-add-label', label);
      addBtn.setAttribute('aria-busy', 'true');
      addBtn.textContent = 'Adding…';
      addBtn.disabled = true;

      CanMedCart.addFromForm(form)
        .catch(function (err) {
          window.alert(err && err.message ? err.message : 'Could not add to cart');
        })
        .then(function () {
          addBtn.removeAttribute('aria-busy');
          addBtn.textContent = label;
          addBtn.disabled = false;
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
