import type { OrderEmailEvent, OrderRecord } from '@k_suite/shared';
import type { EmailMessage } from './EmailService.js';

const EVENT_SUBJECTS: Record<OrderEmailEvent, string> = {
  order_created: 'We received your Kaylie\'s Creations order',
  order_fulfilled: 'Your Kaylie\'s Creations order is fulfilled',
  order_shipped: 'Your Kaylie\'s Creations order has shipped',
  order_cancelled: 'Your Kaylie\'s Creations order was cancelled',
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
  if (event === 'order_created' && (order.status === 'paid' || order.status === 'fulfilled')) return `Thanks for your order ${order.orderId}. We have received payment. Total: ${total}.`;
  if (event === 'order_created') return `Thanks for your order ${order.orderId}. We have received it and it is pending payment confirmation. Total: ${total}.`;
  if (event === 'order_shipped') return `Good news — order #${order.orderId}  for ${formatShippedItems(order)} is on its way. It was sent on ${formatOrderDate(order)}, please give it at least 5 business days to ship. Please reach out if there are any issues.`;
  if (event === 'order_cancelled') return `Order ${order.orderId} has been cancelled. If this looks wrong, please reply to this email.`;
  return `Order ${order.orderId} has been fulfilled.`;
}

function formatOrderDate(order: OrderRecord): string {
  const date = order.createdAt ? new Date(order.createdAt) : null;
  if (!date || Number.isNaN(date.getTime())) return 'the order date';
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}

function formatShippedItems(order: OrderRecord): string {
  const lineItems = Array.isArray(order.details.lineItems) ? order.details.lineItems : [];
  const plushies = lineItems
    .filter((item): item is { productType?: unknown; title?: unknown; quantity?: unknown } => !!item && typeof item === 'object' && (item as { productType?: unknown }).productType !== 'pattern')
    .map((item) => `${Number(item.quantity ?? 1) > 1 ? `${Number(item.quantity)} ` : ''}${String(item.title ?? 'your plushie')}`);
  if (!plushies.length) return 'your plushie';
  return plushies.join(', ');
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}
