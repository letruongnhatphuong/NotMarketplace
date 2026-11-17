import test from 'node:test';
import assert from 'node:assert/strict';
import { completePayment } from '../api/_lib/payments.js';

function fixture(stock = 2) {
  const records = new Map([
    ['checkouts/c1', { buyerId: 'buyer', status: 'pending', total: 1000, items: [{ productId: 'p1', productName: 'Book', sellerId: 'seller', unitPrice: 5, quantity: 2 }] }],
    ['products/p1', { ownerId: 'seller', stock }],
  ]);
  const ref = (path) => ({ id: path.split('/')[1], path, update: async (data) => records.set(path, { ...records.get(path), ...data }) });
  const db = {
    collection: (name) => ({ doc: (id) => ref(`${name}/${id}`) }),
    runTransaction: async (callback) => {
      const writes = [];
      const result = await callback({
        get: async (r) => ({ exists: records.has(r.path), data: () => records.get(r.path), ref: r }),
        set: (r, data) => writes.push(() => records.set(r.path, data)),
        update: (r, data) => writes.push(() => records.set(r.path, { ...records.get(r.path), ...data })),
      });
      writes.forEach((write) => write());
      return result;
    },
  };
  const refunds = [];
  const stripe = { refunds: { create: async (...args) => refunds.push(args) } };
  const session = { id: 'cs_test', metadata: { checkoutId: 'c1' }, client_reference_id: 'buyer', payment_status: 'paid', amount_total: 1000, currency: 'cad', payment_intent: 'pi_test' };
  return { records, db, stripe, session, refunds };
}

test('paid checkout saves buyer order and public summary once, decrementing stock once', async () => {
  const f = fixture();
  assert.equal((await completePayment(f.session, f.db, f.stripe)).status, 'completed');
  await completePayment(f.session, f.db, f.stripe);
  assert.equal(f.records.get('products/p1').stock, 0);
  assert.equal(f.records.get('orders/c1_0').buyerId, 'buyer');
  assert.equal(f.records.get('orders/c1_0').price, 10);
  assert.equal('buyerId' in f.records.get('publicSales/c1_0'), false);
  assert.equal(f.refunds.length, 0);
});
test('unpaid checkout does not create orders', async () => {
  const f = fixture();
  assert.equal((await completePayment({ ...f.session, payment_status: 'unpaid' }, f.db, f.stripe)).status, 'pending');
  assert.equal(f.records.has('orders/c1_0'), false);
});
test('stock conflict refunds once without creating orders', async () => {
  const f = fixture(1);
  assert.equal((await completePayment(f.session, f.db, f.stripe)).status, 'refunded');
  await completePayment(f.session, f.db, f.stripe);
  assert.equal(f.refunds.length, 1);
  assert.equal(f.refunds[0][1].idempotencyKey, 'stock-refund-c1');
  assert.equal(f.records.has('orders/c1_0'), false);
  assert.equal(f.records.get('products/p1').stock, 1);
});
test('mismatched amount is rejected before writes', async () => {
  const f = fixture();
  await assert.rejects(completePayment({ ...f.session, amount_total: 1 }, f.db, f.stripe));
  assert.equal(f.records.get('checkouts/c1').status, 'pending');
});
