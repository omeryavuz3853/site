(() => {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const base = (window.CONTACT_API_BASE || '').replace(/\/$/, '');
  const status = document.getElementById('contact-status');
  const submit = document.getElementById('contact-submit');
  const refresh = document.getElementById('refresh-captcha');
  const image = document.getElementById('captcha-image');
  const code = document.getElementById('contact-code');
  let challengeId = '', busy = false, loaded = false;
  function say(message, error = false) {
    status.textContent = message;
    status.dataset.error = String(error);
  }
  async function request(path, options = {}) {
    const response = await fetch(base + path, { ...options, signal: AbortSignal.timeout(25000), credentials: 'omit' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'İşlem tamamlanamadı. Lütfen yeniden deneyin.');
    return result;
  }
  async function captcha(keepStatus = false) {
    challengeId = '';
    submit.disabled = true;
    refresh.disabled = true;
    image.hidden = true;
    code.value = '';
    if (!base) {
      say('Form şu anda kullanılamıyor. Lütfen bilgi@omeryavuz.net adresine e-posta gönderin.', true);
      return;
    }
    try {
      const result = await request('/captcha');
      challengeId = result.id;
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(result.image);
      image.hidden = false;
      if (!keepStatus) say('');
      submit.disabled = busy;
    } catch (error) {
      say(error.name === 'TimeoutError' || error instanceof TypeError ? 'Bağlantı kurulamadı. Yeni kod almayı deneyin veya e-posta ile ulaşın.' : error.message, true);
    } finally { refresh.disabled = false; }
  }
  refresh.addEventListener('click', () => { if (!busy) captcha(); });
  form.addEventListener('input', event => event.target.setCustomValidity?.(''));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    for (const key of ['name', 'email', 'message', 'code']) {
      const input = form.elements.namedItem(key);
      input.value = input.value.trim();
      input.setCustomValidity(input.value ? '' : 'Lütfen bu alanı doldurun.');
    }
    if (!form.reportValidity() || !challengeId) return;
    busy = true;
    submit.disabled = true;
    refresh.disabled = true;
    say('Mesajınız gönderiliyor…');
    try {
      const payload = Object.fromEntries(new FormData(form));
      payload.challengeId = challengeId;
      await request('/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      form.reset();
      say('Mesajınız alındı. Belirttiğiniz e-posta adresi üzerinden size dönüş yapılacaktır.');
    } catch (error) {
      say(error.name === 'TimeoutError' || error instanceof TypeError ? 'Gönderim sonucu doğrulanamadı. Lütfen hemen tekrar göndermeyin; daha sonra yeniden deneyin veya e-posta ile ulaşın.' : error.message, true);
    } finally {
      busy = false;
      await captcha(true);
    }
  });
  function enterContact() {
    if (location.hash === '#contact' && !loaded) { loaded = true; captcha(); }
  }
  window.addEventListener('hashchange', enterContact);
  enterContact();
})();
