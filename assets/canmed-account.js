(function () {
  function initCountryProvince(root) {
    if (!window.Shopify || typeof Shopify.CountryProvinceSelector !== 'function') return;
    root.querySelectorAll('[data-cm-addr-country]').forEach(function (countryEl) {
      var prefix = countryEl.id.replace('cm-addr-country-', '');
      var provinceEl = root.querySelector('#cm-addr-province-' + prefix);
      var wrap = root.querySelector('#cm-addr-province-wrap-' + prefix);
      if (!provinceEl) return;
      try {
        new Shopify.CountryProvinceSelector(countryEl.id, provinceEl.id, {
          hideElement: wrap ? wrap.id : null,
        });
      } catch (e) {
        /* selector already bound */
      }
      var defCountry = countryEl.getAttribute('data-default') || 'Australia';
      var defProvince = provinceEl.getAttribute('data-default');
      if (defCountry) {
        countryEl.value = defCountry;
        countryEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (!countryEl.value || countryEl.value === '---') {
        countryEl.value = 'Australia';
        countryEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (defProvince) {
        setTimeout(function () {
          provinceEl.value = defProvince;
        }, 50);
      }
    });
  }

  function ensureCountry(form) {
    var country = form.querySelector('[name="address[country]"]');
    if (!country) return;
    if (!country.value || country.value === '---') {
      country.value = 'Australia';
      country.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function brandedReturn(root, form) {
    var fromForm = form && form.getAttribute('data-cm-addr-return');
    if (fromForm) return fromForm;
    var base = root.getAttribute('data-cm-account-return') || '/pages/my-account';
    return base + '#cm-addresses';
  }

  function setFormBusy(form, busy) {
    form.setAttribute('data-cm-addr-busy', busy ? '1' : '');
    form.querySelectorAll('button[type="submit"]').forEach(function (btn) {
      if (busy) {
        if (!btn.getAttribute('data-cm-addr-label')) {
          btn.setAttribute('data-cm-addr-label', btn.textContent.trim());
        }
        var isDelete = btn.hasAttribute('data-cm-addr-delete');
        btn.textContent = isDelete ? 'Deleting…' : 'Saving…';
        btn.disabled = true;
      } else {
        var label = btn.getAttribute('data-cm-addr-label');
        if (label) btn.textContent = label;
        btn.disabled = false;
      }
    });
  }

  /**
   * Stay on branded My Account — New Customer Accounts ignore return_to and
   * dump users onto shopify.com profile. POST then reload this layout only.
   */
  function submitAddressForm(root, form) {
    if (form.getAttribute('data-cm-addr-busy') === '1') return;

    ensureCountry(form);
    var returnTo = brandedReturn(root, form);
    var body = new FormData(form);
    var methods = body.getAll('_method');
    if (methods.indexOf('delete') !== -1) {
      body.delete('_method');
      body.append('_method', 'delete');
    }

    setFormBusy(form, true);

    fetch(form.action, {
      method: 'POST',
      body: body,
      credentials: 'same-origin',
      redirect: 'manual',
      headers: { Accept: 'text/html' },
    })
      .catch(function () {
        /* opaque redirect / network — mutation may still have succeeded */
      })
      .then(function () {
        // Must hard-navigate: replace() to the same hash URL does not reload Liquid.
        var base = (returnTo || '/pages/my-account#cm-addresses').split('#')[0];
        window.location.replace(base + (base.indexOf('?') >= 0 ? '&' : '?') + 'addr=' + Date.now() + '#cm-addresses');
      });
  }

  function bindAddressForms(root) {
    var panel = root.querySelector('[data-cm-rx-detail="cm-addresses"]');
    if (!panel) return;

    panel.querySelectorAll('form').forEach(function (form) {
      var action = (form.getAttribute('action') || '').toLowerCase();
      if (action.indexOf('/account/addresses') === -1) return;
      if (form.dataset.cmAddrBound) return;
      form.dataset.cmAddrBound = '1';
      form.setAttribute('data-cm-addr-form', '');
      var parentReturn = form.closest('[data-cm-addr-return]');
      if (parentReturn && parentReturn.getAttribute('data-cm-addr-return')) {
        form.setAttribute('data-cm-addr-return', parentReturn.getAttribute('data-cm-addr-return'));
      } else if (!form.getAttribute('data-cm-addr-return')) {
        form.setAttribute('data-cm-addr-return', brandedReturn(root, form));
      }

      form.addEventListener(
        'submit',
        function (e) {
          e.preventDefault();
          e.stopPropagation();
          submitAddressForm(root, form);
        },
        true
      );
    });
  }

  function init(root) {
    if (!root || root.dataset.cmAccountReady) return;
    root.dataset.cmAccountReady = '1';

    var listView = root.querySelector('[data-cm-account-list]');
    var details = root.querySelectorAll('[data-cm-rx-detail]');

    function showList() {
      if (listView) listView.hidden = false;
      details.forEach(function (el) {
        el.hidden = true;
      });
      if (window.history && window.history.replaceState) {
        var url = window.location.pathname + window.location.search;
        window.history.replaceState({}, '', url);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function showDetail(id) {
      if (!id) return;
      var panel = root.querySelector('[data-cm-rx-detail="' + id + '"]');
      if (!panel) return;
      if (listView) listView.hidden = true;
      details.forEach(function (el) {
        el.hidden = el !== panel;
      });
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, '', '#' + id);
      }
      if (id === 'cm-addresses') {
        initCountryProvince(panel);
        bindAddressForms(root);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function closeAddrPanels() {
      root.querySelectorAll('[data-cm-addr-panel]').forEach(function (el) {
        el.hidden = true;
      });
      root.querySelectorAll('[data-cm-addr-summary]').forEach(function (el) {
        el.hidden = false;
      });
    }

    function openAddrPanel(id) {
      closeAddrPanels();
      var panel = root.querySelector('[data-cm-addr-panel="' + id + '"]');
      var summary = root.querySelector('[data-cm-addr-summary="' + id + '"]');
      if (panel) panel.hidden = false;
      if (summary) summary.hidden = true;
      if (panel) {
        initCountryProvince(panel);
        bindAddressForms(root);
        var focusEl = panel.querySelector(
          'input:not([type="hidden"]):not([type="checkbox"]), select, textarea'
        );
        if (focusEl) {
          setTimeout(function () {
            focusEl.focus({ preventScroll: false });
            panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 40);
        }
      }
    }

    root.querySelectorAll('[data-cm-rx-open]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        showDetail(btn.getAttribute('data-cm-rx-open'));
      });
    });

    root.querySelectorAll('[data-cm-rx-back]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        closeAddrPanels();
        showList();
      });
    });

    root.querySelectorAll('[data-cm-addr-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openAddrPanel(btn.getAttribute('data-cm-addr-toggle'));
      });
    });

    root.querySelectorAll('[data-cm-addr-cancel]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-cm-addr-cancel');
        var panel = root.querySelector('[data-cm-addr-panel="' + id + '"]');
        var summary = root.querySelector('[data-cm-addr-summary="' + id + '"]');
        if (panel) panel.hidden = true;
        if (summary) summary.hidden = false;
      });
    });

    root.querySelectorAll('[data-cm-addr-delete]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var msg = btn.getAttribute('data-confirm') || 'Delete this address?';
        if (!window.confirm(msg)) {
          e.preventDefault();
          e.stopPropagation();
        }
      });
    });

    bindAddressForms(root);

    var hash = (window.location.hash || '').replace(/^#/, '');
    if (hash && root.querySelector('[data-cm-rx-detail="' + hash + '"]')) {
      showDetail(hash);
    }

    // Classic /account/addresses → branded addresses panel
    if (hash === 'cm-addresses' || /account\/addresses/i.test(window.location.pathname)) {
      showDetail('cm-addresses');
    }
  }

  document.querySelectorAll('[data-cm-account]').forEach(init);
  document.addEventListener('shopify:section:load', function (e) {
    var el = e.target.querySelector('[data-cm-account]') || e.target.closest('[data-cm-account]');
    if (el) {
      el.dataset.cmAccountReady = '';
      init(el);
    }
  });
})();
