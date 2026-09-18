/* =========================================================
   Inquiry form, CTA counters, reveals, footer
   ========================================================= */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- reveal on scroll ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        e.target.querySelectorAll('[data-count]').forEach(countUp);
        io.unobserve(e.target);
      });
    }, { threshold: 0.18 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => {
      el.classList.add('is-in');
      el.querySelectorAll('[data-count]').forEach((n) => { n.textContent = n.dataset.count + (n.dataset.suffix || ''); });
    });
  }

  function countUp(el) {
    const end = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const dur = 1600;
    const t0 = performance.now();
    const fmt = new Intl.NumberFormat('en-IN');
    (function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt.format(Math.round(end * eased)) + suffix;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------- inquiry form ---------- */
  const form = document.getElementById('inquiryForm');
  if (form) {
    const success = form.querySelector('.form-success');
    const submit = form.querySelector('.btn--submit');
    const label = submit.querySelector('.btn__label');
    const consent = form.querySelector('#fConsent');
    const consentError = form.querySelector('#consentError');
    const date = form.querySelector('#fDate');

    // no past visit dates
    const today = new Date();
    date.min = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

    const messages = {
      parent: 'Please enter your name.',
      phone: 'Please enter a valid phone number (10–15 digits).',
      email: 'Please enter a valid email address.',
      child: 'Please enter your child’s name.',
      grade: 'Please choose a class.',
      visit: 'Please pick today or a future date.',
    };

    function validateField(input) {
      const field = input.closest('.field');
      if (!field) return true;
      const error = field.querySelector('.field__error');
      if (input.type !== 'date') input.value = input.value.replace(/^\s+/, '');
      const ok = input.checkValidity();
      field.classList.toggle('has-error', !ok);
      input.setAttribute('aria-invalid', String(!ok));
      if (error) error.textContent = ok ? '' : messages[input.name] || 'Please check this field.';
      return ok;
    }

    form.querySelectorAll('input:not([type=checkbox]), select').forEach((input) => {
      input.addEventListener('blur', () => { if (input.value || input.required) validateField(input); });
      input.addEventListener('input', () => { if (input.closest('.field').classList.contains('has-error')) validateField(input); });
      input.addEventListener('change', () => validateField(input));
    });
    consent.addEventListener('change', () => { if (consent.checked) consentError.textContent = ''; });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let firstInvalid = null;
      form.querySelectorAll('input:not([type=checkbox]), select').forEach((input) => {
        if (!validateField(input) && !firstInvalid) firstInvalid = input;
      });
      if (!consent.checked) {
        consentError.textContent = 'Please agree so we can contact you.';
        if (!firstInvalid) firstInvalid = consent;
      }
      if (firstInvalid) {
        firstInvalid.focus({ preventScroll: true });
        firstInvalid.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        return;
      }

      const data = Object.fromEntries(new FormData(form));
      submit.classList.add('is-loading');
      label.textContent = 'Sending…';

      /*
        Connect your backend here, for example:
        fetch('https://your-endpoint.example/enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      */
      setTimeout(() => {
        submit.classList.remove('is-loading');
        label.textContent = 'Send enquiry';
        document.getElementById('successName').textContent = (data.parent || 'there').split(' ')[0];
        success.hidden = false;
        success.querySelector('button').focus({ preventScroll: true });
      }, 900);
    });

    document.getElementById('inquiryReset').addEventListener('click', () => {
      form.reset();
      form.querySelectorAll('.field').forEach((f) => f.classList.remove('has-error'));
      form.querySelectorAll('.field__error').forEach((f) => { f.textContent = ''; });
      success.hidden = true;
      form.querySelector('#fParent').focus();
    });
  }

  /* ---------- footer ---------- */
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
  const toTop = document.getElementById('toTop');
  if (toTop) {
    toTop.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.lenis) window.lenis.scrollTo(0, { duration: 1.6 });
      else window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }
})();
