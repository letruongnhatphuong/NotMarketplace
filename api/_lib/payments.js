import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';

export function getPaymentServices() {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('Payment service is not configured.');
  }
  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(serviceAccount) });
  }
  return { db: getFirestore(), stripe: new Stripe(process.env.STRIPE_SECRET_KEY) };
}

export async function getLoggedInUser(req) {
  const authorization = req.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) {
    const error = new Error('Please log in to pay.');
    error.status = 401;
    throw error;
  }

  const token = authorization.slice(7);
  try {
    return await getAuth().verifyIdToken(token);
  } catch {
    const error = new Error('Please log in again.');
    error.status = 401;
    throw error;
  }
}

export function sendPaymentError(res, error) {
  console.error(error);
  let message = 'Payment service unavailable. Please try again.';
  if (error.status) message = error.message;
  res.status(error.status || 500).json({ error: message });
}

// Both the signed webhook and the authenticated return page may call this.
// The transaction makes order creation and inventory changes exactly once.
export async function completePayment(session, db, stripe) {
  const checkoutRef = db.collection('checkouts').doc(session.metadata.checkoutId);
  if (session.payment_status !== 'paid') {
    const snapshot = await checkoutRef.get();
    if (!snapshot.exists) throw new Error('Checkout record missing.');
    return { status: snapshot.data().status };
  }
  const result = await db.runTransaction(async (transaction) => {
    const checkoutSnapshot = await transaction.get(checkoutRef);
    if (!checkoutSnapshot.exists) throw new Error('Checkout record missing.');
    const checkout = checkoutSnapshot.data();
    if (checkout.status === 'completed' || checkout.status === 'refunded') return checkout;
    if (session.client_reference_id !== checkout.buyerId || session.currency !== 'cad' || session.amount_total !== checkout.total) {
      throw new Error('Payment does not match checkout.');
    }
    // Read all products before making any writes in the transaction.
    const products = [];
    for (const item of checkout.items) {
      const productRef = db.collection('products').doc(item.productId);
      const productSnapshot = await transaction.get(productRef);
      products.push(productSnapshot);
    }

    let unavailable = false;
    for (let i = 0; i < checkout.items.length; i++) {
      const item = checkout.items[i];
      const product = products[i].data();
      if (!product || product.ownerId !== item.sellerId || (product.stock ?? 1) < item.quantity) {
        unavailable = true;
      }
    }
    if (unavailable || checkout.status === 'refund_pending') {
      transaction.update(checkoutRef, { status: 'refund_pending' });
      return { status: 'refund_pending' };
    }
    const createdAt = Date.now();
    for (let i = 0; i < checkout.items.length; i++) {
      const item = checkout.items[i];
      const orderId = `${checkoutRef.id}_${i}`;
      const order = {
        ...item,
        price: item.unitPrice * item.quantity,
        buyerId: checkout.buyerId,
        status: 'completed',
        createdAt,
        stripeSessionId: session.id,
      };
      transaction.set(db.collection('orders').doc(orderId), order);
      const summary = { ...order };
      delete summary.buyerId;
      delete summary.stripeSessionId;
      transaction.set(db.collection('publicSales').doc(orderId), summary);
      const stock = (products[i].data().stock ?? 1) - item.quantity;
      transaction.update(products[i].ref, { stock });
    }
    transaction.update(checkoutRef, { status: 'completed', sessionId: session.id });
    return { status: 'completed' };
  });
  if (result.status === 'refund_pending') {
    await stripe.refunds.create({ payment_intent: session.payment_intent }, { idempotencyKey: `stock-refund-${checkoutRef.id}` });
    await checkoutRef.update({ status: 'refunded' });
    return { status: 'refunded' };
  }
  return { status: result.status };
}

export async function markPaymentFailed(session, db) {
  if (session.payment_status === 'paid' || !session.metadata?.checkoutId) return;
  const checkoutRef = db.collection('checkouts').doc(session.metadata.checkoutId);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(checkoutRef);
    if (!snapshot.exists) return;
    const checkout = snapshot.data();
    if (checkout.status !== 'pending') return;
    if (session.client_reference_id !== checkout.buyerId
      || session.currency !== 'cad' || session.amount_total !== checkout.total) {
      throw new Error('Payment does not match checkout.');
    }
    transaction.update(checkoutRef, { status: 'failed' });
  });
}
