(function () {
  function haversineKm(aLat, aLng, bLat, bLng) {
    var R = 6371;
    var dLat = ((bLat - aLat) * Math.PI) / 180;
    var dLng = ((bLng - aLng) * Math.PI) / 180;
    var lat1 = (aLat * Math.PI) / 180;
    var lat2 = (bLat * Math.PI) / 180;
    var h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function parseStores(root) {
    var el = root.querySelector('[data-cm-stores]');
    if (!el) return [];
    try {
      return JSON.parse(el.textContent);
    } catch (e) {
      return [];
    }
  }

  function init(root) {
    if (!root || root.dataset.ready) return;
    root.dataset.ready = '1';

    var form = root.querySelector('[data-cm-product-form]');
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

    // S3: require phone before submit
    var s3Phone = root.querySelector('[data-cm-s3-phone]');
    var s3Msg = root.querySelector('[data-cm-s3-msg]');
    if (form && s3Phone) {
      form.addEventListener('submit', function (e) {
        var phone = (s3Phone.value || '').trim();
        if (phone.length < 8) {
          e.preventDefault();
          if (s3Msg) {
            s3Msg.hidden = false;
            s3Msg.textContent = 'Please enter a phone number so a pharmacist can call you.';
          }
          s3Phone.focus();
          return;
        }
        if (s3Msg) {
          s3Msg.hidden = false;
          s3Msg.textContent = 'Adding to order — a pharmacist will call you before supply.';
        }
      });
    }

    // OTC nearest store
    var postcodeInput = root.querySelector('[data-cm-postcode]');
    var nearestBtn = root.querySelector('[data-cm-nearest-btn]');
    var nearestResult = root.querySelector('[data-cm-nearest-result]');
    var stores = parseStores(root);
    var productTitle = root.getAttribute('data-product-title') || 'This medicine';

    function renderNearest(store, km, place) {
      if (!nearestResult) return;
      nearestResult.hidden = false;
      nearestResult.innerHTML =
        '<p class="cm-product__nearest-yes"><strong>' +
        productTitle +
        '</strong> is available at CanMed.</p>' +
        '<p class="cm-product__nearest-store"><strong>Your nearest dispensary:</strong> ' +
        store.name +
        '</p>' +
        '<p class="cm-mono-data">' +
        store.address +
        (km != null ? ' · ~' + km.toFixed(1) + ' km' : '') +
        (place ? ' from ' + place : '') +
        '</p>' +
        '<p class="cm-mono-data"><a href="' +
        store.phoneHref +
        '">' +
        store.phone +
        '</a></p>';
    }

    function findNearest(lat, lng, placeLabel) {
      var best = null;
      stores.forEach(function (s) {
        var km = haversineKm(lat, lng, Number(s.lat), Number(s.lng));
        if (!best || km < best.km) best = { store: s, km: km };
      });
      if (best) renderNearest(best.store, best.km, placeLabel);
    }

    function lookupPostcode(pc) {
      if (!nearestResult) return;
      nearestResult.hidden = false;
      nearestResult.innerHTML = '<p class="cm-mono-data">Checking…</p>';

      // Prefer Zippopotam (AU postcodes). Fallback: VIC numeric proximity to known stores.
      fetch('https://api.zippopotam.us/au/' + encodeURIComponent(pc))
        .then(function (r) {
          if (!r.ok) throw new Error('not found');
          return r.json();
        })
        .then(function (data) {
          var place = (data.places && data.places[0]) || null;
          if (!place) throw new Error('no place');
          var lat = parseFloat(place.latitude);
          var lng = parseFloat(place.longitude);
          var label = (place['place name'] || '') + ' ' + pc;
          findNearest(lat, lng, label);
        })
        .catch(function () {
          // Fallback without geocode: pick by postcode distance to store zips
          var zipMap = { kensington: 3031, hawthorn: 3122, geelong: 3220 };
          var n = parseInt(pc, 10);
          var best = null;
          stores.forEach(function (s) {
            var z = zipMap[s.id] || 3000;
            var d = Math.abs(z - n);
            if (!best || d < best.d) best = { store: s, d: d };
          });
          if (best) {
            renderNearest(best.store, null, 'postcode ' + pc);
          } else if (nearestResult) {
            nearestResult.innerHTML =
              '<p class="cm-mono-data">Could not find that postcode. Try a 4-digit Australian postcode.</p>';
          }
        });
    }

    if (nearestBtn && postcodeInput) {
      nearestBtn.addEventListener('click', function () {
        var pc = (postcodeInput.value || '').replace(/\D/g, '');
        if (pc.length !== 4) {
          if (nearestResult) {
            nearestResult.hidden = false;
            nearestResult.innerHTML = '<p class="cm-mono-data">Enter a 4-digit Australian postcode.</p>';
          }
          postcodeInput.focus();
          return;
        }
        lookupPostcode(pc);
      });
      postcodeInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          nearestBtn.click();
        }
      });
    }
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
