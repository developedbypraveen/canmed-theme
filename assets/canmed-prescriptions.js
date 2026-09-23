(function () {
  var TITLES = ['Your details', 'Delivery + dispensary', 'Prescription type', 'Notes + upload'];

  function init(root) {
    if (!root || root.dataset.ready) return;
    root.dataset.ready = '1';

    var step = 0;
    var method = 'delivery';
    var locationId = '';
    var rxType = null;
    var file = null;
    var variantId = root.getAttribute('data-variant-id');

    var wizard = root.querySelector('[data-cm-rx-wizard]');
    var success = root.querySelector('[data-cm-rx-success]');
    var caption = root.querySelector('[data-cm-rx-caption]');
    var fill = root.querySelector('[data-cm-rx-fill]');
    var backBtn = root.querySelector('[data-cm-rx-back]');
    var nextBtn = root.querySelector('[data-cm-rx-next]');
    var submitErr = root.querySelector('[data-cm-rx-submit-error]');
    var locMeta = root.querySelector('[data-cm-rx-loc-meta]');
    var deliveryWrap = root.querySelector('[data-cm-rx-delivery]');
    var drop = root.querySelector('[data-cm-rx-drop]');
    var fileInput = root.querySelector('[data-cm-rx-file]');
    var fileName = root.querySelector('[data-cm-rx-file-name]');
    var chooseBtn = root.querySelector('[data-cm-rx-choose]');

    var locBtns = root.querySelectorAll('[data-cm-rx-location]');
    if (locBtns[0]) {
      locationId = locBtns[0].getAttribute('data-cm-rx-location');
      updateLocMeta(locBtns[0]);
    }

    function $(sel) {
      return root.querySelector(sel);
    }
    function clearErrors() {
      root.querySelectorAll('[data-err]').forEach(function (el) {
        el.hidden = true;
        el.textContent = '';
      });
    }
    function setError(key, msg) {
      var el = root.querySelector('[data-err="' + key + '"]');
      if (!el) return;
      el.hidden = false;
      el.textContent = msg;
    }
    function updateLocMeta(btn) {
      if (!locMeta || !btn) return;
      locMeta.textContent =
        (btn.getAttribute('data-address') || '') +
        ' · ' +
        (btn.getAttribute('data-phone') || '') +
        ' · ' +
        (btn.getAttribute('data-pharmacist') || '');
    }
    function progress() {
      var pct = ((step + 1) / 4) * 100;
      if (fill) fill.style.setProperty('--cm-rx-fill', pct + '%');
      root.querySelectorAll('[data-step-label]').forEach(function (li) {
        var i = Number(li.getAttribute('data-step-label'));
        li.classList.toggle('is-current', i === step);
        li.classList.toggle('is-done', i < step);
      });
      if (caption) {
        caption.textContent =
          'Step ' + String(step + 1).padStart(2, '0') + ' / 04 — ' + TITLES[step];
      }
      if (backBtn) backBtn.disabled = step === 0;
      if (nextBtn) nextBtn.textContent = step === 3 ? 'Send to a pharmacist' : 'Continue';
      root.querySelectorAll('[data-cm-rx-step]').forEach(function (panel) {
        var on = panel.getAttribute('data-cm-rx-step') === String(step);
        if (on) panel.removeAttribute('hidden');
        else panel.setAttribute('hidden', '');
      });
    }

    function validate() {
      clearErrors();
      var ok = true;
      if (step === 0) {
        if (!($('[data-cm-rx-name]') || {}).value || !$('[data-cm-rx-name]').value.trim()) {
          setError('name', 'We need a name to match this to your record.');
          ok = false;
        }
        var email = ($('[data-cm-rx-email]') || {}).value || '';
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          setError('email', 'Enter an email we can send the confirmation to.');
          ok = false;
        }
        var phone = (($('[data-cm-rx-phone]') || {}).value || '').replace(/\D/g, '');
        if (phone.length < 8) {
          setError('phone', 'Enter a contact number with at least 8 digits.');
          ok = false;
        }
        if (!($('[data-cm-rx-dob]') || {}).value) {
          setError('dob', 'Date of birth is required to dispense.');
          ok = false;
        }
      }
      if (step === 1) {
        if (method === 'delivery') {
          if (!($('[data-cm-rx-address]') || {}).value || !$('[data-cm-rx-address]').value.trim()) {
            setError('address', "Add the address we're delivering to.");
            ok = false;
          }
          if (!($('[data-cm-rx-state]') || {}).value) {
            setError('state', 'Select your state.');
            ok = false;
          }
        }
        if (!locationId) {
          ok = false;
        }
      }
      if (step === 2 && !rxType) {
        setError('rxType', "Choose the closest match — we'll route it correctly.");
        ok = false;
      }
      if (step === 3 && !file) {
        setError('file', 'Attach your script, or email it using the address on the left.');
        ok = false;
      }
      return ok;
    }

    function takeFile(f) {
      if (!f) return;
      var okTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf'];
      if (okTypes.indexOf(f.type) === -1 && !/\.(jpe?g|png|heic|heif|pdf)$/i.test(f.name)) {
        setError('file', "That file type won't open on our side. Use JPG, PNG, HEIC or PDF.");
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        setError('file', 'That file is over 10 MB. Please compress or email it instead.');
        return;
      }
      clearErrors();
      file = f;
      if (fileName) {
        fileName.hidden = false;
        fileName.textContent = f.name + ' · ' + (f.size / 1024).toFixed(0) + ' KB attached';
      }
    }

    async function submitOrder() {
      if (!variantId) {
        if (submitErr) {
          submitErr.hidden = false;
          submitErr.textContent = 'Intake product is not configured. Contact the pharmacy.';
        }
        return;
      }
      if (nextBtn) {
        nextBtn.disabled = true;
        nextBtn.textContent = 'Sending…';
      }
      if (submitErr) submitErr.hidden = true;

      var name = $('[data-cm-rx-name]').value.trim();
      var email = $('[data-cm-rx-email]').value.trim();
      var phone = $('[data-cm-rx-phone]').value.trim();
      var dob = $('[data-cm-rx-dob]').value;
      var address = ($('[data-cm-rx-address]') || {}).value || '';
      var state = ($('[data-cm-rx-state]') || {}).value || '';
      var notes = ($('[data-cm-rx-notes]') || {}).value || '';
      var locBtn = root.querySelector('[data-cm-rx-location].is-active') || locBtns[0];
      var pharmacist = locBtn ? locBtn.getAttribute('data-pharmacist') : '';
      var locName = locBtn ? locBtn.textContent.trim() : locationId;

      var properties = {
        _rx_intake: 'true',
        'Full name': name,
        Email: email,
        Phone: phone,
        'Date of birth': dob,
        Method: method === 'delivery' ? 'Courier delivery' : 'Collect in store',
        Dispensary: locName,
        '_rx_location': locationId,
        'Prescription type': rxType,
        '_rx_type': rxType,
        State: state || (method === 'pickup' ? 'N/A (pickup)' : ''),
        'Delivery address': method === 'delivery' ? address.trim() : 'Pickup — ' + locName,
        Notes: notes.trim() || '—',
        'Script file': file ? file.name + ' (' + Math.round(file.size / 1024) + ' KB)' : 'Not attached',
        Status: 'received',
      };

      try {
        await fetch('/cart/clear.js', { method: 'POST', credentials: 'same-origin' });
        var res = await fetch('/cart/add.js', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            items: [
              {
                id: Number(variantId),
                quantity: 1,
                properties: properties,
              },
            ],
          }),
        });
        var data = await res.json();
        if (!res.ok) throw new Error((data && data.description) || 'Could not create order');

        // Update cart attributes for Flow / staff
        await fetch('/cart/update.js', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attributes: {
              rx_location: locationId,
              rx_type: rxType,
              rx_status: 'received',
              rx_script_file: file ? file.name : '',
            },
            note:
              'Prescription intake — ' +
              locName +
              ' — ' +
              rxType +
              (file ? ' — file: ' + file.name : '') +
              (notes ? ' — notes: ' + notes : ''),
          }),
        });

        if (wizard) wizard.hidden = true;
        if (success) {
          success.hidden = false;
          var copy = success.querySelector('[data-cm-rx-success-copy]');
          var ref = success.querySelector('[data-cm-rx-ref]');
          if (copy) {
            copy.textContent =
              (pharmacist || 'A pharmacist') +
              ' at ' +
              locName +
              ' reviews it next. You will get an email at ' +
              email +
              ' when the status changes — finish checkout to lock in the order, then track it under My Prescriptions.';
          }
          if (ref) {
            ref.textContent =
              'Continue to checkout to confirm. Attach/email your script if needed: ' +
              (root.getAttribute('data-fallback-email') || 'scripts@canmed.com.au');
          }
        }

        // Works like an order: send to checkout
        window.location.href = '/checkout';
      } catch (err) {
        if (submitErr) {
          submitErr.hidden = false;
          submitErr.textContent = err.message || 'Something went wrong. Please try again or email your script.';
        }
        if (nextBtn) {
          nextBtn.disabled = false;
          nextBtn.textContent = 'Send to a pharmacist';
        }
      }
    }

    root.querySelectorAll('[data-cm-rx-method]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        method = btn.getAttribute('data-cm-rx-method');
        root.querySelectorAll('[data-cm-rx-method]').forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
        });
        if (deliveryWrap) {
          if (method === 'delivery') deliveryWrap.removeAttribute('hidden');
          else deliveryWrap.setAttribute('hidden', '');
        }
      });
    });

    locBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        locationId = btn.getAttribute('data-cm-rx-location');
        locBtns.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-checked', on ? 'true' : 'false');
        });
        updateLocMeta(btn);
      });
    });

    root.querySelectorAll('[data-cm-rx-type]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        rxType = btn.getAttribute('data-cm-rx-type');
        root.querySelectorAll('[data-cm-rx-type]').forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
        });
      });
    });

    if (chooseBtn && fileInput) {
      chooseBtn.addEventListener('click', function () {
        fileInput.click();
      });
      fileInput.addEventListener('change', function () {
        takeFile(fileInput.files && fileInput.files[0]);
      });
    }
    if (drop) {
      drop.addEventListener('dragover', function (e) {
        e.preventDefault();
        drop.classList.add('is-drag');
      });
      drop.addEventListener('dragleave', function () {
        drop.classList.remove('is-drag');
      });
      drop.addEventListener('drop', function (e) {
        e.preventDefault();
        drop.classList.remove('is-drag');
        takeFile(e.dataTransfer.files && e.dataTransfer.files[0]);
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', function () {
        step = Math.max(0, step - 1);
        progress();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        if (!validate()) return;
        if (step === 3) {
          submitOrder();
          return;
        }
        step += 1;
        progress();
      });
    }

    progress();
  }

  document.querySelectorAll('[data-cm-rx]').forEach(init);
  document.addEventListener('shopify:section:load', function (e) {
    var el = e.target.querySelector('[data-cm-rx]') || e.target.closest('[data-cm-rx]');
    if (el) {
      el.dataset.ready = '';
      init(el);
    }
  });
})();
