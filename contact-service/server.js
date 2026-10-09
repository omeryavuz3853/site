import nodemailer from 'nodemailer';
import { createContactServer } from './app.js';
const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM', 'ALLOWED_ORIGINS'];
for (const key of required) if (!process.env[key]) throw new Error(`Missing environment variable: ${key}`);
const port = Number(process.env.SMTP_PORT || 465);
if (![465, 587].includes(port)) throw new Error('SMTP_PORT must be 465 or 587');
const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 5) throw new Error('Invalid TRUST_PROXY_HOPS');
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST, port, secure: port === 465, requireTLS: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  tls: { minVersion: 'TLSv1.2' }
});
// Fail startup if the configured mailbox cannot authenticate.
await transport.verify();
createContactServer({ sendMail: mail => transport.sendMail(mail), sender: process.env.SMTP_FROM,
  origins: process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()), proxyHops
}).listen(Number(process.env.PORT || 3000), '0.0.0.0');
