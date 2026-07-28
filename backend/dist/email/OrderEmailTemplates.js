const EVENT_SUBJECTS = {
    order_created: 'We received your K Suite order',
    order_fulfilled: 'Your K Suite order is fulfilled',
    order_shipped: 'Your K Suite order has shipped',
    order_cancelled: 'Your K Suite order was cancelled',
};
export function createOrderEmailMessage(event, order) {
    return {
        to: order.clientEmail,
        subject: EVENT_SUBJECTS[event],
        text: renderOrderEmailText(event, order),
    };
}
function renderOrderEmailText(event, order) {
    const total = formatCurrency(order.chargedAmount);
    if (event === 'order_created' && (order.status === 'paid' || order.status === 'fulfilled'))
        return `Thanks for your order ${order.orderId}. We have received payment. Total: ${total}.`;
    if (event === 'order_created')
        return `Thanks for your order ${order.orderId}. We have received it and it is pending payment confirmation. Total: ${total}.`;
    if (event === 'order_shipped')
        return `Good news — order #${order.orderId} made on ${formatOrderDate(order)} for ${formatShippedItems(order)} is on its way.`;
    if (event === 'order_cancelled')
        return `Order ${order.orderId} has been cancelled. If this looks wrong, please contact support.`;
    return `Order ${order.orderId} has been fulfilled.`;
}
function formatOrderDate(order) {
    const date = order.createdAt ? new Date(order.createdAt) : null;
    if (!date || Number.isNaN(date.getTime()))
        return 'the order date';
    return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}
function formatShippedItems(order) {
    const lineItems = Array.isArray(order.details.lineItems) ? order.details.lineItems : [];
    const plushies = lineItems
        .filter((item) => !!item && typeof item === 'object' && item.productType !== 'pattern')
        .map((item) => `${Number(item.quantity ?? 1) > 1 ? `${Number(item.quantity)} ` : ''}${String(item.title ?? 'your plushie')}`);
    if (!plushies.length)
        return 'your plushie';
    return plushies.join(', ');
}
function formatCurrency(value) {
    return `$${value.toFixed(2)}`;
}
