import { sendPaymentError, completePayment, getPaymentServices } from './_lib/payments.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { db, stripe } = getPaymentServices();
    const chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    let event;
    try {
      event = stripe.webhooks.constructEvent(Buffer.concat(chunks), req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
    } catch { return res.status(400).json({ error: 'Invalid webhook signature.' }); }
    if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
      await completePayment(event.data.object, db, stripe);
    }
    res.json({ received: true });
  } catch (error) { sendPaymentError(res, error); }
}
