import { randomUUID } from 'node:crypto';
import { getLoggedInUser, sendPaymentError, completePayment, getPaymentServices } from './_lib/payments.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).end();
  try {
    const { db, stripe } = getPaymentServices();
    const user = await getLoggedInUser(req);
    if (req.method === 'GET') {
      const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
      if (session.client_reference_id !== user.uid) return res.status(403).json({ error: 'This checkout belongs to another account.' });
      const result = await completePayment(session, db, stripe);
      const checkout = (await db.collection('checkouts').doc(session.metadata.checkoutId).get()).data();
      return res.json({ ...result, items: checkout.items.map(({ productId, quantity }) => ({ productId, quantity })) });
    }
    const entries = req.body?.items;

    if (!Array.isArray(entries) || !entries.length || entries.length > 50) return res.status(400).json({ error: 'Choose between 1 and 50 items.' });
    const productIds = [];
    const items = [];

    for (const entry of entries) {
      if (typeof entry.id !== 'string' || !entry.id || entry.id.includes('/') || productIds.includes(entry.id) || !Number.isInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > 9999) {
        return res.status(400).json({ error: 'Some cart details are invalid. Please refresh your cart.' });
      }
      productIds.push(entry.id);
      const snap = await db.collection('products').doc(entry.id).get();
      const product = snap.data();
      if (!product || (product.stock ?? 1) < entry.quantity) return res.status(409).json({ error: 'An item is no longer available in that quantity. Please refresh your cart.' });
      if (!product.ownerId || product.ownerId === user.uid) return res.status(400).json({ error: 'You cannot purchase your own listing.' });
      const cents = Math.round(Number(product.price) * 100);
      if (!Number.isSafeInteger(cents) || cents < 50 || cents > 99999999) return res.status(400).json({ error: 'An item has an unsupported price (minimum CAD $0.50).' });
      items.push({
        productId: entry.id,
        productName: product.name,
        sellerId: product.ownerId,
        unitPrice: cents / 100,
        quantity: entry.quantity,
        image: product.image || '',
        category: product.category || '',
        condition: product.condition || '',
      });
    }
    const origin = process.env.APP_URL;
    if (!origin || !/^https?:\/\//.test(origin)) throw new Error('APP_URL is required.');
    const checkoutId = randomUUID();
    const ref = db.collection('checkouts').doc(checkoutId);
    let total = 0;
    const lineItems = [];
    for (const item of items) {
      const unitAmount = Math.round(item.unitPrice * 100);
      total += unitAmount * item.quantity;
      lineItems.push({
        quantity: item.quantity,
        price_data: {
          currency: 'cad',
          unit_amount: unitAmount,
          product_data: { name: item.productName },
        },
      });
    }

    await ref.set({
      buyerId: user.uid,
      items,
      total,
      status: 'pending',
      createdAt: Date.now(),
    });
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: user.uid,
      customer_email: user.email || undefined,
      metadata: { checkoutId },
      line_items: lineItems,
      success_url: `${origin.replace(/\/$/, '')}/payment?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin.replace(/\/$/, '')}/cart?payment=cancelled`,
    }, { idempotencyKey: checkoutId });
    await ref.update({ sessionId: session.id });
    res.json({ url: session.url });
  } catch (error) {
    sendPaymentError(res, error);
  }
}
