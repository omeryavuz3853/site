(() => {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const status = document.getElementById('contact-status');
  const submit = document.getElementById('contact-submit');
  const success = document.getElementById('contact-success');
  const captchaNote = document.getElementById('captcha-note');
  let widget, token = '', busy = false, started = false;
  function say(message, error = false) {
    status.textContent = message;
    status.dataset.error = String(error);
  }
  function resetCaptcha() {
    token = '';
    submit.disabled = true;
    if (widget !== undefined && window.turnstile) window.turnstile.reset(widget);
  }
  window.oyContactCaptchaReady = () => {
    widget = window.turnstile.render('#contact-captcha', {
      sitekey: window.CONTACT_TURNSTILE_SITEKEY,
      theme: 'light', size: 'flexible', language: 'tr', appearance: 'always',
      callback: value => { token = value; submit.disabled = busy; captchaNote.textContent = ''; },
      'expired-callback': () => { token = ''; submit.disabled = true; captchaNote.textContent = 'Doğrulamanın süresi doldu. Lütfen yeniden doğrulayın.'; },
      'error-callback': () => { token = ''; submit.disabled = true; captchaNote.textContent = 'Doğrulama yüklenemedi. Sayfayı yenileyebilir veya e-posta ile ulaşabilirsiniz.'; }
    });
    captchaNote.textContent = '';
  };
  function loadCaptcha() {
    if (location.hash !== '#contact' || started) return;
    started = true;
    if (!window.CONTACT_TURNSTILE_SITEKEY || !/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(window.CONTACT_FORM_ENDPOINT || '')) {
      captchaNote.textContent = 'Form şu anda kullanılamıyor. Lütfen e-posta ile ulaşın.';
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=oyContactCaptchaReady&render=explicit';
    script.async = true;
    script.defer = true;
    script.onerror = () => { captchaNote.textContent = 'Doğrulama yüklenemedi. Sayfayı yenileyebilir veya e-posta ile ulaşabilirsiniz.'; };
    document.head.appendChild(script);
    setTimeout(() => { if (widget === undefined) script.onerror(); }, 15000);
  }
  form.addEventListener('input', event => event.target.setCustomValidity?.(''));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    for (const key of ['name', 'email', 'message']) {
      const input = form.elements.namedItem(key);
      input.value = input.value.trim();
      input.setCustomValidity(input.value ? '' : 'Lütfen bu alanı doldurun.');
    }
    if (!form.reportValidity()) return;
    if (!token || !window.turnstile?.getResponse(widget)) {
      say('Lütfen güvenlik doğrulamasını tamamlayın.', true);
      return;
    }
    const payload = {
      subject: 'İletişim Formundan Mesajınız Var',
      email: form.elements.namedItem('email').value,
      'Gönderen': form.elements.namedItem('name').value,
      'Mail adresi': form.elements.namedItem('email').value,
      'Mesajı': form.elements.namedItem('message').value,
      'cf-turnstile-response': token
    };
    busy = true;
    submit.disabled = true;
    form.setAttribute('aria-busy', 'true');
    for (const input of form.querySelectorAll('input, textarea')) input.readOnly = true;
    say('Mesajınız gönderiliyor…');
    try {
      const response = await fetch(window.CONTACT_FORM_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(25000)
      });
      const result = await response.json();
      if (!response.ok || result.ok === false || result.errors?.length) {
        say(response.status === 429 ? 'Gönderim sınırına ulaşıldı. Lütfen daha sonra deneyin veya e-posta ile ulaşın.' : 'Mesajınız gönderilemedi. Lütfen doğrulamayı tekrar tamamlayıp yeniden deneyin veya e-posta ile ulaşın.', true);
        return;
      }
      form.reset();
      say('');
      form.hidden = true;
      success.hidden = false;
      if (location.hash === '#contact') document.getElementById('success-title').focus();
    } catch {
      say('Gönderim sonucu doğrulanamadı. Yazdıklarınız korunuyor. Lütfen hemen tekrar göndermeyin; daha sonra deneyin veya e-posta ile ulaşın.', true);
    } finally {
      busy = false;
      form.removeAttribute('aria-busy');
      for (const input of form.querySelectorAll('input, textarea')) input.readOnly = false;
      resetCaptcha();
    }
  });
  document.getElementById('new-message').addEventListener('click', () => {
    success.hidden = true;
    form.hidden = false;
    say('');
    resetCaptcha();
    document.getElementById('contact-name').focus();
  });
  window.addEventListener('hashchange', loadCaptcha);
  loadCaptcha();
})();
