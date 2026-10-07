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
      if (id === 'cm-addresses') initCountryProvince(panel);
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
      if (panel) initCountryProvince(panel);
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
        if (!window.confirm(msg)) e.preventDefault();
      });
    });

    var hash = (window.location.hash || '').replace(/^#/, '');
    if (hash && root.querySelector('[data-cm-rx-detail="' + hash + '"]')) {
      showDetail(hash);
    }

    // After address form submit, Shopify may return to /account/addresses — bounce back
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
