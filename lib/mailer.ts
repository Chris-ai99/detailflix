import nodemailer from "nodemailer";

function getMailConfig() {
  const host = (process.env.SMTP_HOST ?? "").trim();
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = (process.env.SMTP_USER ?? "").trim();
  const pass = process.env.SMTP_PASS ?? "";
  const from = (process.env.MAIL_FROM ?? "").trim();

  return { host, port, user, pass, from };
}

export function isMailConfigured(): boolean {
  const cfg = getMailConfig();
  return !!cfg.host && !!cfg.port && !!cfg.user && !!cfg.pass && !!cfg.from;
}

export async function sendRegistrationMail(params: {
  to: string;
  verifyUrl: string;
  workspaceName: string;
}) {
  const cfg = getMailConfig();
  if (!isMailConfigured()) {
    throw new Error("MAIL_NOT_CONFIGURED");
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });

  await transporter.sendMail({
    from: cfg.from,
    to: params.to,
    subject: "Bitte bestaetige deine Registrierung",
    text: [
      `Hallo,`,
      ``,
      `du hast ein neues Konto fuer "${params.workspaceName}" angelegt.`,
      `Bitte bestaetige deine E-Mail-Adresse mit diesem Link:`,
      params.verifyUrl,
      ``,
      `Falls du das nicht warst, ignoriere diese E-Mail.`,
    ].join("\n"),
  });
}
