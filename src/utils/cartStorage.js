import { getStock } from './stock.js';

const STORAGE_KEY = 'notmarketplace-carts';
const OLD_PRODUCT_IDS = { 1: 'bicycle', 2: 'desk-chair', 3: 'books' };

function validItem(item) {
  return item && (typeof item.id === 'string' || typeof item.id === 'number')
    && typeof item.name === 'string'
    && Number.isFinite(Number(item.price)) && Number(item.price) >= 0
    && Number.isSafeInteger(item.quantity) && item.quantity > 0;
}

export function loadCarts(storage) {
  try {
    const data = JSON.parse((storage || localStorage).getItem(STORAGE_KEY));
    const saved = data?.carts || data;
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
    return Object.fromEntries(Object.entries(saved)
      .filter(([, items]) => Array.isArray(items))
      .map(([owner, items]) => [owner, items.filter(validItem)
        .filter((item) => getStock(item) > 0)
        .map((item) => ({
          ...item,
          id: OLD_PRODUCT_IDS[item.id] || item.id,
          cartEntryId: item.cartEntryId || crypto.randomUUID(),
          requestedQuantity: Number.isSafeInteger(item.requestedQuantity)
            ? item.requestedQuantity : item.quantity,
          quantity: Math.min(item.quantity, getStock(item)),
        }))]));
  } catch {
    return {};
  }
}

export function loadCartState(storage) {
  let checkouts = {};
  try {
    const saved = JSON.parse((storage || localStorage).getItem(STORAGE_KEY));
    if (saved?.checkouts && typeof saved.checkouts === 'object') checkouts = saved.checkouts;
  } catch {
    checkouts = {};
  }
  return { carts: loadCarts(storage), checkouts };
}

export function saveCarts(carts, storage) {
  try {
    (storage || localStorage).setItem(STORAGE_KEY, JSON.stringify(carts));
    return true;
  } catch {
    return false;
  }
}

export function addCartItem(items, item, quantity = 1) {
  if (!Number.isSafeInteger(quantity) || quantity < 1) return items;
  const stock = getStock(item);
  if (stock === 0) return items.filter((entry) => entry.id !== item.id);
  const existing = items.find((entry) => entry.id === item.id);
  if (existing) {
    return items.map((entry) => entry.id === item.id
      ? {
        ...entry, ...item,
        cartEntryId: entry.cartEntryId || crypto.randomUUID(),
        quantity: Math.min(entry.quantity + quantity, stock),
        requestedQuantity: Math.min(entry.quantity + quantity, stock),
      }
      : entry);
  }
  return [...items, {
    ...item, cartEntryId: crypto.randomUUID(),
    quantity: Math.min(quantity, stock), requestedQuantity: Math.min(quantity, stock),
  }];
}

export function rememberCheckout(state, buyerId, sessionId, items) {
  return {
    ...state,
    checkouts: {
      ...state.checkouts,
      [buyerId]: {
        ...state.checkouts[buyerId],
        [sessionId]: {
          items: items.map((item) => ({
            id: item.id,
            cartEntryId: item.cartEntryId,
            requestedQuantity: item.requestedQuantity || item.quantity,
          })),
          removed: false,
        },
      },
    },
  };
}

export function removeCheckoutItems(state, buyerId, sessionId) {
  const checkout = state.checkouts[buyerId]?.[sessionId];
  if (!checkout || checkout.removed) return state;
  const items = (state.carts[buyerId] || []).flatMap((item) => {
    const purchased = checkout.items.find((entry) => entry.id === item.id
      && entry.cartEntryId === item.cartEntryId);
    if (!purchased) return [item];
    const remaining = Math.min(
      (item.requestedQuantity || item.quantity) - purchased.requestedQuantity,
      getStock(item),
    );
    return remaining > 0 ? [{ ...item, quantity: remaining, requestedQuantity: remaining }] : [];
  });
  return {
    carts: { ...state.carts, [buyerId]: items },
    checkouts: {
      ...state.checkouts,
      [buyerId]: { ...state.checkouts[buyerId], [sessionId]: { removed: true } },
    },
  };
}

export function reconcileCartStock(carts, products) {
  const available = new Map(products.map((product) => [product.id, product]));
  return Object.fromEntries(Object.entries(carts).map(([owner, items]) => [owner,
    items.flatMap((item) => {
      const product = available.get(item.id);
      if (!product || getStock(product) === 0) return [];
      return [{ ...item, ...product, quantity: Math.min(item.quantity, getStock(product)) }];
    }),
  ]));
}

export function mergeGuestCart(carts, userId) {
  const guestItems = carts.guest || [];
  if (guestItems.length === 0) return carts;
  const userItems = guestItems.reduce(
    (items, item) => addCartItem(items, item, item.quantity),
    carts[userId] || [],
  );
  return { ...carts, [userId]: userItems, guest: [] };
}
