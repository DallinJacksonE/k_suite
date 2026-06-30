import type { OrderEmailEvent, OrderRecord } from '@k_suite/shared';

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

export interface OrderEmailContext {
  event: OrderEmailEvent;
  order: OrderRecord;
}
