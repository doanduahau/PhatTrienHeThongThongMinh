import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter = null;

const getTransporter = () => {
  if (!env.smtpHost) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
    });
  }
  return transporter;
};

/** Thiếu cấu hình SMTP thì in mail ra console để dev vẫn test được luồng. */
export const sendMail = async ({ to, subject, text }) => {
  const transport = getTransporter();
  if (!transport) {
    console.log(`[MAIL:console] To: ${to} | Subject: ${subject}\n${text}`);
    return;
  }
  await transport.sendMail({ from: env.mailFrom, to, subject, text });
};