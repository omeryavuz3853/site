import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import svgCaptcha from 'svg-captcha';
import validator from 'validator';

const RECIPIENT = 'bilgi@omeryavuz.net';
const SUBJECT = 'İletişim Formundan Mesajınız Var';
export function createContactServer({ sendMail, sender, origins, proxyHops = 0, now = Date.now,
  generateCaptcha = () => svgCaptcha.create({ size: 6, noise: 4, color: false, background: '#f6f7f8', width: 180, height: 60, ignoreChars: '0oO1iIl' }) }) {
  const challenges = new Map(), rates = new Map();
  function cleanup() {
    const time = now();
    for (const [key, entry] of challenges) if (entry.expires <= time) challenges.delete(key);
    for (const [key, entry] of rates) if (entry.expires <= time) rates.delete(key);
  }
  function limited(key, limit, windowMs) {
    let entry = rates.get(key);
    if (!entry || entry.expires <= now()) {
      if (rates.size >= 10000) return true;
      entry = { count: 0, expires: now() + windowMs };
      rates.set(key, entry);
    }
    return ++entry.count > limit;
  }
  const server = createServer(async (req, res) => {
    cleanup();
    const respond = (status, body) => { res.writeHead(status); res.end(JSON.stringify(body)); };
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.url === '/health' && req.method === 'GET') return respond(200, { ok: true });
    const origin = req.headers.origin;
    if (!origins.includes(origin)) return respond(403, { error: 'Bu kaynaktan gönderime izin verilmiyor.' });
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return respond(204, {});
    // Use forwarded addresses only behind exactly the configured number of trusted proxies.
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').map(x => x.trim()).filter(Boolean);
    const chain = [...forwarded, req.socket.remoteAddress];
    const ip = chain[Math.max(0, chain.length - 1 - proxyHops)];
    if (req.url === '/captcha' && req.method === 'GET') {
      if (limited('captcha:' + ip, 20, 600000) || challenges.size >= 5000) return respond(429, { error: 'Çok fazla kod istendi. Lütfen birkaç dakika sonra yeniden deneyin.' });
      const id = randomBytes(24).toString('hex');
      const captcha = generateCaptcha();
      challenges.set(id, { answer: captcha.text.toUpperCase(), ip, expires: now() + 300000 });
      return respond(200, { id, image: captcha.data });
    }
    if (req.url !== '/contact' || req.method !== 'POST') return respond(404, { error: 'Bulunamadı.' });
    if (limited('submit:' + ip, 5, 900000)) return respond(429, { error: 'Gönderim sınırına ulaştınız. Lütfen 15 dakika sonra yeniden deneyin.' });
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return respond(415, { error: 'Geçersiz gönderim biçimi.' });
    let data;
    try {
      const chunks = []; let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 24000) { respond(413, { error: 'Mesaj çok uzun.' }); return; }
        chunks.push(chunk);
      }
      data = JSON.parse(Buffer.concat(chunks).toString('utf8')); 
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    } catch { return respond(400, { error: 'Form verisi okunamadı.' }); }
    const fields = ['name', 'email', 'message', 'code', 'challengeId'];
    if (fields.some(key => typeof data[key] !== 'string' || !data[key].trim())) return respond(400, { error: 'Lütfen tüm alanları doldurun.' });
    const { name, email, message, code, challengeId } = Object.fromEntries(fields.map(key => [key, data[key].trim()]));
    if (name.length < 2 || name.length > 100 || /[\r\n\x00]/.test(name) || email.length > 254 || !validator.isEmail(email) || message.length > 5000 || message.includes('\x00') || code.length !== 6 || challengeId.length !== 48)
      return respond(400, { error: 'Lütfen ad soyad, mail adresi, mesaj ve doğrulama kodunu kontrol edin.' });
    const challenge = challenges.get(challengeId);
    challenges.delete(challengeId); // Consume before mail awaits, including failed guesses.
    const answer = Buffer.from(code.toUpperCase());
    const expected = Buffer.from(challenge?.answer || '');
    if (!challenge || challenge.expires <= now() || challenge.ip !== ip || answer.length !== expected.length || !timingSafeEqual(answer, expected))
      return respond(400, { error: 'Doğrulama kodu hatalı veya süresi doldu. Lütfen yeni kodla tekrar deneyin.' });
    try {
      const result = await sendMail({
        from: { name: 'Ömer Yavuz İletişim', address: sender },
        to: RECIPIENT,
        replyTo: { name, address: email },
        subject: SUBJECT,
        text: `${SUBJECT}\n\nGönderen: ${name}\nMail adresi: ${email}\nMesajı: ${message}`,
        disableFileAccess: true, disableUrlAccess: true
      });
      if (!result.accepted?.some(address => address.toLowerCase() === RECIPIENT)) throw new Error('Recipient rejected');
      return respond(200, { ok: true });
    } catch {
      // No message bodies, personal data or SMTP error/credential details in logs or responses.
      console.error('Contact email delivery failed');
      return respond(502, { error: 'Mesaj gönderilemedi. Lütfen yeni kodla yeniden deneyin veya bilgi@omeryavuz.net adresine yazın.' });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return server;
}
