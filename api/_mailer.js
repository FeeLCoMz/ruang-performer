/**
 * Single mail transport for both runtimes.
 *
 * - Node (Vercel / local): SMTP through nodemailer, loaded lazily.
 * - Cloudflare Workers: `nodemailer` is stubbed by the Workers build, so the
 *   HTTP API provider (`nodemailer.createTransport({ service: 'resend' })`-style
 *   HTTP endpoint) is used instead:
 *     MAIL_PROVIDER=resend  (+ RESEND_API_KEY, optional MAIL_FROM)
 *     MAIL_PROVIDER=postmark (+ POSTMARK_SERVER_TOKEN, optional MAIL_FROM)
 *   If no provider is configured, `smokeOnly` is set and sendMail rejects with
 *   a clear error instead of silently dropping the message.
 */

import { getReqEnv } from './_core/env.js';

const loadNodemailer = () => import('nodemailer');

export function getMailConfig(req) {
  return {
    host: getReqEnv(req, 'SMTP_HOST') || getReqEnv(req, 'EMAIL_HOST') || 'smtp.gmail.com',
    port: Number(getReqEnv(req, 'SMTP_PORT') || getReqEnv(req, 'EMAIL_PORT') || 587),
    user: getReqEnv(req, 'SMTP_USER') || getReqEnv(req, 'EMAIL_USER'),
    pass: getReqEnv(req, 'SMTP_PASS') || getReqEnv(req, 'EMAIL_PASSWORD'),
    from: getReqEnv(req, 'MAIL_FROM') || getReqEnv(req, 'SMTP_USER') || getReqEnv(req, 'EMAIL_USER'),
    provider: getReqEnv(req, 'MAIL_PROVIDER'),
    resendKey: getReqEnv(req, 'RESEND_API_KEY'),
    postmarkToken: getReqEnv(req, 'POSTMARK_SERVER_TOKEN'),
  };
}

async function sendViaHttp(config, message) {
  if (config.provider === 'resend' && config.resendKey) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.resendKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: message.from || config.from,
        to: Array.isArray(message.to) ? message.to : [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    if (!response.ok) throw new Error(`Resend error: HTTP ${response.status}`);
    return response.json();
  }

  if (config.provider === 'postmark' && config.postmarkToken) {
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'x-postmark-server-token': config.postmarkToken,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        From: message.from || config.from,
        To: Array.isArray(message.to) ? message.to.join(',') : message.to,
        Subject: message.subject,
        HtmlBody: message.html,
        TextBody: message.text,
      }),
    });
    if (!response.ok) throw new Error(`Postmark error: HTTP ${response.status}`);
    return response.json();
  }

  throw new Error(
    'No email transport available: configure SMTP_HOST/SMTP_USER/SMTP_PASS (Node) ' +
      'or MAIL_PROVIDER + provider API key (Cloudflare).',
  );
}

/**
 * Send an email.
 * @param {object} req - request carrying `rpEnv` (Cloudflare) — optional
 * @param {{ to: string|string[], subject: string, html?: string, text?: string, from?: string }} message
 */
export async function sendMail(req, message) {
  const config = getMailConfig(req);
  const nodemailer = await loadNodemailer();
  const factory = nodemailer?.createTransport;
  const isStub = !factory || (nodemailer && nodemailer.__rpStub);

  if (isStub) return sendViaHttp(config, message);

  const transporter = factory({
    host: config.host,
    port: config.port,
    secure: false,
    auth: { user: config.user, pass: config.pass },
  });
  return transporter.sendMail({ ...message, from: message.from || config.from });
}
