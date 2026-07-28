import type { OrderEmailEvent, OrderRecord } from '@k_suite/shared';
import nodemailer from 'nodemailer';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailService {
  send(message: EmailMessage): Promise<void>;
}

export class NoopEmailService implements EmailService {
  async send(): Promise<void> {}
}

export interface SmtpEmailConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  password?: string;
  from?: string;
}

export class SmtpEmailService implements EmailService {
  private readonly from: string;
  private readonly transport: nodemailer.Transporter;

  constructor(config: SmtpEmailConfig) {
    if (!config.user || !config.password) throw new Error('Email user and password are required to send order emails.');
    this.from = config.from ?? config.user;
    this.transport = nodemailer.createTransport({
      host: config.host ?? 'smtp.gmail.com',
      port: config.port ?? 587,
      secure: config.secure ?? false,
      auth: { user: config.user, pass: config.password },
    });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transport.sendMail({ from: this.from, to: message.to, subject: message.subject, text: message.text });
  }
}

export interface OrderEmailContext {
  event: OrderEmailEvent;
  order: OrderRecord;
}
