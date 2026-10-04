(function () {
  function reveal(el) {
    if (!el || el.classList.contains('is-in')) return;
    el.classList.add('is-in');
  }

  function initLocations(root) {
    if (!root || root.dataset.ready === '1') return;
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
        var on = p.getAttribute('data-cm-loc-panel') === id;
        p.classList.toggle('is-active', on);
        if (on) p.removeAttribute('hidden');
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

  function initStandards(std) {
    if (!std || std.dataset.ready === '1') return;
    std.dataset.ready = '1';
    var buttons = Array.prototype.slice.call(std.querySelectorAll('[data-std-step]'));
    if (!buttons.length) return;

    var steps = buttons.map(function (btn) {
      return {
        num: btn.getAttribute('data-std-num') || '',
        name: btn.getAttribute('data-std-name') || '',
        copy: btn.getAttribute('data-std-copy') || '',
        icon: btn.getAttribute('data-std-icon') || ''
      };
    });

    var bench = std.querySelector('.cm-au-std__bench');
    var numEl = std.querySelector('[data-std-num]');
    var nameEl = std.querySelector('[data-std-name]');
    var copyEl = std.querySelector('[data-std-copy]');
    var iconEl = std.querySelector('[data-std-icon] svg');
    var current = 0;
    var timer = null;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function setStep(i, user) {
      current = (i + steps.length) % steps.length;
      var step = steps[current];
      if (bench) bench.style.setProperty('--step', String(current));
      if (numEl) numEl.textContent = step.num;
      if (nameEl) nameEl.textContent = step.name;
      if (copyEl) copyEl.textContent = step.copy;
      if (iconEl && step.icon) iconEl.innerHTML = step.icon;
      buttons.forEach(function (btn, idx) {
        var on = idx === current;
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      if (user && timer) {
        clearInterval(timer);
        timer = null;
        if (!reduce) timer = setInterval(function () { setStep(current + 1, false); }, 4200);
      }
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setStep(parseInt(btn.getAttribute('data-std-step'), 10) || 0, true);
      });
    });

    function startAuto() {
      if (reduce || timer) return;
      timer = setInterval(function () { setStep(current + 1, false); }, 4200);
    }

    if ('IntersectionObserver' in window) {
      var sio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) startAuto();
          else if (timer) { clearInterval(timer); timer = null; }
        });
      }, { threshold: 0.35 });
      sio.observe(std);
    } else {
      startAuto();
    }
  }

  function boot() {
    document.querySelectorAll('.cm-au-hero[data-reveal], .cm-au-hero').forEach(function (el) {
      requestAnimationFrame(function () { reveal(el); });
    });
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      if (el.classList.contains('cm-au-hero')) return;
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              reveal(entry.target);
              io.unobserve(entry.target);
            }
          });
        }, { threshold: 0.22, rootMargin: '0px 0px -8% 0px' });
        io.observe(el);
      } else {
        reveal(el);
      }
    });
    document.querySelectorAll('[data-cm-about-locations]').forEach(function (el) {
      el.dataset.ready = '';
      initLocations(el);
    });
    document.querySelectorAll('[data-cm-std]').forEach(function (el) {
      el.dataset.ready = '';
      initStandards(el);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  document.addEventListener('shopify:section:load', function () { boot(); });
})();
