import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

// Lazy-load Twilio only if configured
function getTwilioClient() {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio não configurado');
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const twilio = require('twilio') as (sid: string, token: string) => TwilioClient;
  return twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
}

interface TwilioClient {
  messages: {
    create: (opts: { body: string; from: string; to: string }) => Promise<{ sid: string }>;
  };
}

export async function sendSms(to: string, body: string): Promise<void> {
  if (!env.TWILIO_PHONE_NUMBER) {
    logger.warn('Twilio phone not configured, skipping SMS');
    return;
  }
  const client = getTwilioClient();
  await client.messages.create({ body, from: env.TWILIO_PHONE_NUMBER, to });
  logger.info({ to }, 'SMS sent');
}

export async function sendWhatsApp(to: string, body: string): Promise<void> {
  if (!env.TWILIO_WHATSAPP_NUMBER) {
    logger.warn('Twilio WhatsApp not configured, skipping');
    return;
  }
  const client = getTwilioClient();
  await client.messages.create({
    body,
    from: env.TWILIO_WHATSAPP_NUMBER,
    to: `whatsapp:${to}`,
  });
  logger.info({ to }, 'WhatsApp message sent');
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!env.SMTP_HOST || !env.SMTP_USER) {
    logger.warn('SMTP not configured, skipping email');
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodemailer = require('nodemailer') as {
    createTransport: (opts: unknown) => { sendMail: (opts: unknown) => Promise<unknown> };
  };

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  await transporter.sendMail({ from: env.SMTP_FROM, to, subject, html });
  logger.info({ to, subject }, 'Email sent');
}
