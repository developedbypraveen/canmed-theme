(function () {
  function init(root) {
    if (!root || root.dataset.cmHiwReady) return;
    root.dataset.cmHiwReady = '1';

    var list = root.querySelector('.cm-hiw__steps');
    var steps = [].slice.call(root.querySelectorAll('.cm-hiw__step'));
    var nodes = steps.map(function (s) {
      return s.querySelector('.cm-hiw__node');
    });
    var track = root.querySelector('.cm-hiw__track');
    var capsule = root.querySelector('.cm-hiw__capsule');
    if (!list || !track || !capsule || steps.length < 2) return;

    var last = steps.length - 1;
    var MOVE = 1100;
    var HOLD = 2500;
    var END_HOLD = 3400;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var points = [];
    var vertical = false;
    var current = 0;
    var loopT = null;
    var arriveT = null;
    var inView = false;
    var held = false;
    var started = false;

    function measure() {
      var box = list.getBoundingClientRect();
      points = nodes.map(function (n) {
        var r = n.getBoundingClientRect();
        return {
          x: r.left - box.left + r.width / 2,
          y: r.top - box.top + r.height / 2,
        };
      });
      vertical = Math.abs(points[1].x - points[0].x) < 4;
      root.classList.toggle('is-vertical', vertical);

      var a = points[0];
      var b = points[last];
      if (vertical) {
        track.style.cssText =
          'list-style:none;left:' +
          (a.x - 1) +
          'px;top:' +
          a.y +
          'px;width:2px;height:' +
          (b.y - a.y) +
          'px';
      } else {
        track.style.cssText =
          'list-style:none;left:' +
          a.x +
          'px;top:' +
          (a.y - 1) +
          'px;height:2px;width:' +
          (b.x - a.x) +
          'px';
      }
      jump(current);
    }

    function capsuleTransform(i) {
      var p = points[i];
      var a = points[0];
      var dx = vertical ? 1 : p.x - a.x;
      var dy = vertical ? p.y - a.y : 1;
      return (
        'translate(' +
        dx +
        'px,' +
        dy +
        'px) translate(-50%,-50%) rotate(' +
        (vertical ? 90 : 0) +
        'deg)'
      );
    }

    function setProgress(i) {
      root.style.setProperty('--cm-p', reduce ? '1' : String(i / last));
      capsule.style.transform = capsuleTransform(i);
    }

    function setState(i) {
      steps.forEach(function (s, k) {
        s.classList.toggle('is-done', reduce ? true : k < i);
        s.classList.toggle('is-active', !reduce && k === i);
      });
    }

    function jump(i) {
      root.classList.add('no-anim');
      setProgress(i);
      void root.offsetWidth;
      root.classList.remove('no-anim');
    }

    function goTo(i) {
      current = i;
      setProgress(i);
      clearTimeout(arriveT);
      arriveT = setTimeout(function () {
        setState(i);
      }, MOVE * 0.8);
    }

    function restart() {
      root.classList.add('is-resetting');
      setTimeout(function () {
        setState(-1);
        current = 0;
        jump(0);
        root.classList.remove('is-resetting');
        setTimeout(function () {
          setState(0);
        }, 350);
      }, 650);
    }

    function tick() {
      if (current >= last) restart();
      else goTo(current + 1);
      schedule();
    }

    function schedule() {
      clearTimeout(loopT);
      if (!inView || held || reduce) return;
      loopT = setTimeout(tick, current >= last ? END_HOLD : HOLD);
    }

    steps.forEach(function (s, k) {
      function pick() {
        held = true;
        clearTimeout(loopT);
        if (k !== current) goTo(k);
      }
      s.addEventListener('mouseenter', pick);
      s.addEventListener('focus', pick);
      s.addEventListener('click', pick);
    });

    list.addEventListener('mouseleave', function () {
      held = false;
      schedule();
    });
    list.addEventListener('focusout', function (e) {
      if (!list.contains(e.relatedTarget)) {
        held = false;
        schedule();
      }
    });

    function begin() {
      started = true;
      root.classList.add('is-in');
      if (reduce) {
        setState(0);
        setProgress(last);
        return;
      }
      setTimeout(function () {
        root.classList.add('is-running');
        setState(0);
        schedule();
      }, 1200);
    }

    setState(-1);
    measure();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        function (entries) {
          inView = entries[0].isIntersecting;
          if (inView && !started) begin();
          else schedule();
        },
        { threshold: 0.3 },
      ).observe(root);
    } else {
      inView = true;
      begin();
    }

    var rT;
    window.addEventListener('resize', function () {
      clearTimeout(rT);
      rT = setTimeout(measure, 120);
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measure);
    }
  }

  function boot() {
    document.querySelectorAll('[data-cm-hiw]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', function (event) {
    var el =
      event.target.querySelector('[data-cm-hiw]') ||
      event.target.closest('[data-cm-hiw]');
    if (el) {
      el.dataset.cmHiwReady = '';
      init(el);
    }
  });
})();
