(function () {
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        showList();
      });
    });

    var hash = (window.location.hash || '').replace(/^#/, '');
    if (hash && root.querySelector('[data-cm-rx-detail="' + hash + '"]')) {
      showDetail(hash);
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
