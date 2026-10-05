export const ORDER_STATUS_LABEL = {
  ORDER_PLACED: 'Order Placed',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CUSTOMER_CANCELLED: 'Cancelled by Customer',
  CANCELLED: 'Cancelled',
  OUT_OF_STOCK: 'Out of Stock',
};

export const PAYMENT_STATUS_LABEL = {
  PAYMENT_PENDING: 'Payment Pending',
  PAYMENT_RECEIVED: 'Payment Received',
  REFUNDED: 'Refunded',
};

export const isCancelled = (s) => ['CANCELLED', 'CUSTOMER_CANCELLED', 'OUT_OF_STOCK'].includes(s);

const AFTER = {
  CONFIRMED: ['CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED'],
  PROCESSING: ['PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  DELIVERED: ['DELIVERED'],
};

// Order status and payment status are independent, so each step is derived on its own.
export function timelineSteps(order) {
  const s = order.order_status;
  const paid = order.payment_status === 'PAYMENT_RECEIVED';
  const steps = [
    { label: 'Order Placed', done: true },
    { label: 'Order Confirmed', done: AFTER.CONFIRMED.includes(s) },
    { label: 'Payment Received', done: paid },
    { label: 'Preparing Order', done: AFTER.PROCESSING.includes(s) },
    { label: 'Out for Delivery', done: AFTER.OUT_FOR_DELIVERY.includes(s) },
    { label: 'Delivered', done: AFTER.DELIVERED.includes(s) },
  ];
  const current = steps.findIndex((x) => !x.done);
  return steps.map((x, i) => ({ ...x, current: i === current }));
}
