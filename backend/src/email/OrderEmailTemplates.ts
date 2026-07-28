import type { OrderEmailEvent, OrderRecord } from '@k_suite/shared';
import type { EmailMessage } from './EmailService.js';

const EVENT_SUBJECTS: Record<OrderEmailEvent, string> = {
  order_created: 'We received your K Suite order',
  order_fulfilled: 'Your K Suite order is fulfilled',
  order_shipped: 'Your K Suite order has shipped',
  order_cancelled: 'Your K Suite order was cancelled',
};

export function createOrderEmailMessage(event: OrderEmailEvent, order: OrderRecord): EmailMessage {
  return {
    to: order.clientEmail,
    subject: EVENT_SUBJECTS[event],
    text: renderOrderEmailText(event, order),
  };
}

function renderOrderEmailText(event: OrderEmailEvent, order: OrderRecord): string {
  const total = formatCurrency(order.chargedAmount);
  if (event === 'order_created' && order.status === 'paid') return `Thanks for your order ${order.orderId}. We have received payment. Total: ${total}.`;
  if (event === 'order_created') return `Thanks for your order ${order.orderId}. We have received it and it is pending payment confirmation. Total: ${total}.`;
  if (event === 'order_shipped') return `Good news — order ${order.orderId} has shipped.`;
  if (event === 'order_cancelled') return `Order ${order.orderId} has been cancelled. If this looks wrong, please contact support.`;
  return `Order ${order.orderId} has been fulfilled.`;
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}
