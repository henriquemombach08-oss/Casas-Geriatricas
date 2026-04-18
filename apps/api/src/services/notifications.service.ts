import { Resend } from 'resend';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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
  if (!resendClient) {
    logger.warn({ to, subject }, 'RESEND_API_KEY não configurado — email não enviado');
    return;
  }
  const from = process.env.EMAIL_FROM ?? 'CasaGeri <noreply@casageriatrica.com.br>';
  const { error } = await resendClient.emails.send({ from, to, subject, html });
  if (error) logger.error({ error }, 'Resend error');
  else logger.info({ to, subject }, 'Email enviado');
}
