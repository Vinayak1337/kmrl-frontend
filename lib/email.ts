import nodemailer from 'nodemailer';

export function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  const to = process.env.DEPLOYMENT_NOTIFY_TO || process.env.SMTP_TO;
  return { host, port, user, pass, from, to };
}

export function getTransporter() {
  const { host, port, user, pass } = getSmtpConfig();
  if (!host || !port || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: { user, pass },
  });
}

export async function sendDeploymentEmail(data: Record<string, unknown>) {
  const transporter = getTransporter();
  const { from, to } = getSmtpConfig();
  if (!transporter || !from || !to) {
    console.warn('SMTP not fully configured; skipping email notification');
    return;
  }
  const subject = `New Deployment Request: ${data['organizationName'] ?? 'Unknown org'}`;
  const body = `A new deployment request has been submitted.\n\n${JSON.stringify(data, null, 2)}`;
  await transporter.sendMail({ from, to, subject, text: body });
}

