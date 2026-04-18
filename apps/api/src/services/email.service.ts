import { Resend } from 'resend';
import { logger } from '../lib/logger.js';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? 'CasaGeri <noreply@casageriatrica.com.br>';

async function send(to: string | string[], subject: string, html: string) {
  if (!resend) {
    logger.warn({ to, subject }, 'Email não enviado — RESEND_API_KEY não configurado');
    return;
  }
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) logger.error({ error }, 'Resend error');
    else logger.info({ to, subject }, 'Email enviado');
  } catch (err) {
    logger.error({ err }, 'Falha ao enviar email');
  }
}

export const emailService = {
  async sendPaymentReminder(opts: {
    to: string;
    residentName: string;
    amount: number;
    dueDate: string;
    houseName: string;
  }) {
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(opts.amount);
    await send(
      opts.to,
      `Lembrete de Pagamento — ${opts.houseName}`,
      `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#2563EB">Lembrete de Pagamento</h2>
        <p>Prezado(a) responsável por <strong>${opts.residentName}</strong>,</p>
        <p>Este é um lembrete de que há uma mensalidade pendente:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border:1px solid #e5e7eb">Valor</td><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold">${formatted}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb">Vencimento</td><td style="padding:8px;border:1px solid #e5e7eb">${opts.dueDate}</td></tr>
        </table>
        <p>Em caso de dúvidas, entre em contato com a administração de <strong>${opts.houseName}</strong>.</p>
      </div>
      `,
    );
  },

  async sendScheduleConfirmation(opts: {
    to: string;
    userName: string;
    shift: string;
    date: string;
    houseName: string;
  }) {
    await send(
      opts.to,
      `Confirmação de Escala — ${opts.houseName}`,
      `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#2563EB">Confirmação de Escala</h2>
        <p>Olá, <strong>${opts.userName}</strong>!</p>
        <p>Por favor confirme sua disponibilidade para o turno abaixo:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border:1px solid #e5e7eb">Data</td><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold">${opts.date}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb">Turno</td><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold">${opts.shift}</td></tr>
        </table>
        <p>Acesse o sistema para confirmar sua escala.</p>
      </div>
      `,
    );
  },

  async sendMedicationAlert(opts: {
    to: string;
    residentName: string;
    medications: string[];
    houseName: string;
  }) {
    await send(
      opts.to,
      `Alerta de Medicação — ${opts.residentName}`,
      `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#DC2626">Alerta de Medicação</h2>
        <p>Os seguintes medicamentos de <strong>${opts.residentName}</strong> não foram administrados:</p>
        <ul>${opts.medications.map((m) => `<li>${m}</li>`).join('')}</ul>
        <p>Verifique no sistema <strong>${opts.houseName}</strong>.</p>
      </div>
      `,
    );
  },

  async sendWelcome(opts: { to: string; name: string; houseName: string; tempPassword: string }) {
    await send(
      opts.to,
      `Bem-vindo ao ${opts.houseName}`,
      `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#2563EB">Bem-vindo, ${opts.name}!</h2>
        <p>Seu acesso ao sistema <strong>${opts.houseName}</strong> foi criado.</p>
        <p>Credenciais de acesso:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border:1px solid #e5e7eb">Email</td><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold">${opts.to}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb">Senha temporária</td><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold">${opts.tempPassword}</td></tr>
        </table>
        <p style="color:#6B7280;font-size:12px">Altere sua senha no primeiro acesso.</p>
      </div>
      `,
    );
  },
};
