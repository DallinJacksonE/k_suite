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
    if (event === 'order_created')
        return `Thanks for your order ${order.orderId}. We have received it and it is pending payment confirmation. Total: ${total}.`;
    if (event === 'order_shipped')
        return `Good news — order ${order.orderId} has shipped.`;
    if (event === 'order_cancelled')
        return `Order ${order.orderId} has been cancelled. If this looks wrong, please contact support.`;
    return `Order ${order.orderId} has been fulfilled.`;
}
function formatCurrency(cents) {
    return `$${(cents / 100).toFixed(2)}`;
}
