/**
 * CanMed hero vessel — ports Lovable Vessel3D (R3F) to vanilla Three.js.
 * Desktop (>=768px): WebGL canvas. Mobile uses VesselEcho markup in Liquid.
 */
(function () {
  var PINE = 0x7a28a0;
  var AMBER = 0xc850d1;
  var AMBER_LIGHT = 0xfae8f8;

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function buildBodyProfile() {
    var pts = [];
    for (var i = 0; i <= 34; i++) {
      var u = i / 34;
      var y = -1.15 + u * 2.3;
      var r;
      if (u < 0.06) r = 0.68 * Math.pow(u / 0.06, 0.4);
      else if (u < 0.62) r = 0.68;
      else if (u < 0.78) r = 0.68 - (0.68 - 0.24) * Math.pow((u - 0.62) / 0.16, 1.4);
      else r = 0.24;
      pts.push(new THREE.Vector2(Math.max(r, 0.02), y));
    }
    return pts;
  }

  function mountVessel(container) {
    if (!container || container.dataset.cmVesselReady) return;
    if (typeof THREE === 'undefined') {
      var tries = 0;
      var timer = setInterval(function () {
        tries += 1;
        if (typeof THREE !== 'undefined') {
          clearInterval(timer);
          mountVessel(container);
        } else if (tries > 80) {
          clearInterval(timer);
        }
      }, 50);
      return;
    }
    container.dataset.cmVesselReady = '1';

    var count = Number(container.dataset.particles || 72);
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var progress = reduced ? 1 : 0;
    var start = performance.now();
    var duration = 1600;

    var width = container.clientWidth || 400;
    var height = container.clientHeight || 500;

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height, false);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.1, 4.4);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    var key = new THREE.DirectionalLight(0xfff0fd, 1.6);
    key.position.set(3, 4, 3);
    scene.add(key);
    var fill = new THREE.DirectionalLight(AMBER_LIGHT, 0.8);
    fill.position.set(-4, 1, -2);
    scene.add(fill);

    var floatGroup = new THREE.Group();
    scene.add(floatGroup);

    var vesselGroup = new THREE.Group();
    floatGroup.add(vesselGroup);

    var bodyGeo = new THREE.LatheGeometry(buildBodyProfile(), 64);
    var glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xf6daf7,
      transmission: 1,
      thickness: 0.9,
      roughness: 0.08,
      ior: 1.45,
      transparent: true,
      opacity: 1,
      metalness: 0,
      reflectivity: 0.5,
      side: THREE.DoubleSide,
    });
    vesselGroup.add(new THREE.Mesh(bodyGeo, glassMat));

    var fillMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 1.35, 48),
      new THREE.MeshPhysicalMaterial({
        color: AMBER,
        transparent: true,
        opacity: 0.62,
        roughness: 0.25,
        transmission: 0.5,
        thickness: 0.6,
      })
    );
    fillMesh.position.set(0, -0.42, 0);
    vesselGroup.add(fillMesh);

    var cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.26, 48),
      new THREE.MeshStandardMaterial({ color: PINE, roughness: 0.45, metalness: 0.15 })
    );
    cap.position.set(0, 1.24, 0);
    vesselGroup.add(cap);

    var dummy = new THREE.Object3D();
    var seeds = [];
    for (var i = 0; i < count; i++) {
      var a = (i / count) * Math.PI * 2 * 5.2;
      var y = -1.1 + (i / count) * 2.3;
      var r = 0.52 + 0.16 * Math.sin(i * 1.7);
      seeds.push({
        start: new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 4),
        target: new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r),
        scale: 0.02 + Math.random() * 0.035,
        phase: Math.random() * Math.PI * 2,
      });
    }

    var particleGeo = new THREE.SphereGeometry(1, 10, 10);
    var particleMat = new THREE.MeshStandardMaterial({
      color: AMBER_LIGHT,
      emissive: AMBER,
      emissiveIntensity: 0.35,
    });
    var particles = new THREE.InstancedMesh(particleGeo, particleMat, count);
    floatGroup.add(particles);

    var pointer = { x: 0, y: 0 };
    function onPointer(e) {
      var rect = container.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    }
    window.addEventListener('pointermove', onPointer, { passive: true });

    function resize() {
      var w = container.clientWidth || 400;
      var h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    window.addEventListener('resize', resize);

    var clock = new THREE.Clock();
    var floatPhase = 0;

    function animate() {
      var now = performance.now();
      if (!reduced) {
        var p = Math.min(1, (now - start) / duration);
        progress = easeOutCubic(p);
      }

      var t = clock.getElapsedTime();
      floatPhase = t;
      floatGroup.position.y = Math.sin(floatPhase * 1.1) * 0.08;
      floatGroup.rotation.y = Math.sin(floatPhase * 0.35) * 0.06;

      vesselGroup.scale.setScalar(progress * 0.35 + 0.65);
      vesselGroup.rotation.y = t * 0.16 + pointer.x * 0.25;
      vesselGroup.rotation.x = pointer.y * -0.1;
      fillMesh.material.opacity = 0.62 * progress;

      for (var i = 0; i < count; i++) {
        var s = seeds[i];
        var drift = Math.sin(t * 0.4 + s.phase) * 0.06 * (1 - progress * 0.7);
        dummy.position.lerpVectors(s.start, s.target, progress);
        dummy.position.y += drift;
        dummy.scale.setScalar(s.scale * (0.4 + progress * 0.6));
        dummy.updateMatrix();
        particles.setMatrixAt(i, dummy.matrix);
      }
      particles.instanceMatrix.needsUpdate = true;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    resize();
    animate();
  }

  function boot() {
    if (!window.matchMedia('(min-width: 768px)').matches) return;
    document.querySelectorAll('[data-cm-vessel]').forEach(mountVessel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', boot);
})();
