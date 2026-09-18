(function () {
  function init(root) {
    if (!root || root.dataset.ready) return;
    root.dataset.ready = '1';
    var pills = root.querySelectorAll('[data-cm-contact-pill]');
    var hint = root.querySelector('[data-cm-contact-hint]');
    pills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        pills.forEach(function (p) { p.classList.remove('is-active'); });
        pill.classList.add('is-active');
        var input = pill.querySelector('[data-cm-contact-loc]');
        if (input && hint) {
          hint.textContent = 'Goes to ' + input.getAttribute('data-pharmacist') + ' · ' + input.getAttribute('data-phone');
        }
      });
    });
  }
  document.querySelectorAll('[data-cm-contact]').forEach(init);
  document.addEventListener('shopify:section:load', function (e) {
    var el = e.target.querySelector('[data-cm-contact]') || e.target.closest('[data-cm-contact]');
    if (el) { el.dataset.ready = ''; init(el); }
  });
})();
