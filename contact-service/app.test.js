import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createContactServer } from './app.js';
import svgCaptcha from 'svg-captcha';

async function setup(t, overrides = {}) {
  let time = 1000000;
  const mails = [];
  const server = createContactServer({
    sender: 'omer@omeryavuz.net', origins: ['https://omeryavuz.net'], now: () => time,
    generateCaptcha: () => ({ text: 'ABC234', data: '<svg></svg>' }),
    sendMail: async mail => { mails.push(mail); return { accepted: ['bilgi@omeryavuz.net'] }; }, ...overrides
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, body, origin = 'https://omeryavuz.net') {
    const res = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  }
  return { mails, request, advance: ms => time += ms, async payload() {
    const { body } = await request('/captcha');
    return { name: 'Ad Soyad', email: 'adsoyad@example.com', message: 'Merhaba.\nİletişim talebi.', code: 'abc234', challengeId: body.id };
  } };
}
test('valid message preserves requested format and visitor Reply-To', async t => {
  const s = await setup(t), data = await s.payload();
  assert.equal((await s.request('/contact', data)).status, 200);
  assert.equal(s.mails.length, 1);
  assert.equal(s.mails[0].to, 'bilgi@omeryavuz.net');
  assert.deepEqual(s.mails[0].replyTo, { name: data.name, address: data.email });
  assert.equal(s.mails[0].subject, 'İletişim Formundan Mesajınız Var');
  assert.equal(s.mails[0].text, 'İletişim Formundan Mesajınız Var\n\nGönderen: Ad Soyad\nMail adresi: adsoyad@example.com\nMesajı: Merhaba.\nİletişim talebi.');
  assert.equal((await s.request('/contact', data)).status, 400);
  assert.equal(s.mails.length, 1);
});
for (const key of ['name', 'email', 'message', 'code']) test(`blank ${key} rejected server-side`, async t => {
  const s = await setup(t), data = await s.payload();
  data[key] = '   ';
  assert.equal((await s.request('/contact', data)).status, 400);
  assert.equal(s.mails.length, 0);
});
test('malformed email and newline header injection rejected', async t => {
  const s = await setup(t), data = await s.payload();
  assert.equal((await s.request('/contact', { ...data, email: 'invalid' })).status, 400);
  assert.equal((await s.request('/contact', { ...data, name: 'Name\r\nBcc: someone@example.com' })).status, 400);
  assert.equal(s.mails.length, 0);
});
test('wrong code consumes challenge; expired code rejected', async t => {
  const s = await setup(t), data = await s.payload();
  assert.equal((await s.request('/contact', { ...data, code: 'XXXXXX' })).status, 400);
  assert.equal((await s.request('/contact', data)).status, 400);
  const next = await s.payload(); s.advance(300001);
  assert.equal((await s.request('/contact', next)).status, 400);
  assert.equal(s.mails.length, 0);
});
test('concurrent replay sends only once', async t => {
  const s = await setup(t), data = await s.payload();
  const responses = await Promise.all([s.request('/contact', data), s.request('/contact', data)]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 400]);
  assert.equal(s.mails.length, 1);
});
test('failed SMTP never reports success', async t => {
  const s = await setup(t, { sendMail: async () => { throw new Error('SMTP private detail'); } });
  const response = await s.request('/contact', await s.payload());
  assert.equal(response.status, 502);
  assert.ok(!response.body.error.includes('private'));
});
test('unexpected origin and repeated attempts blocked', async t => {
  const s = await setup(t);
  assert.equal((await s.request('/captcha', undefined, 'https://other.example')).status, 403);
  for (let i = 0; i < 5; i++) assert.equal((await s.request('/contact', {})).status, 400);
  assert.equal((await s.request('/contact', {})).status, 429);
  s.advance(900001);
  assert.equal((await s.request('/contact', {})).status, 400);
});
test('real captcha SVG exposes paths rather than the answer string', () => {
  const captcha = svgCaptcha.create({ size: 6 });
  assert.ok(captcha.data.includes('<path'));
  assert.ok(!captcha.data.includes('<text'));
  assert.ok(!captcha.data.includes(captcha.text));
});
