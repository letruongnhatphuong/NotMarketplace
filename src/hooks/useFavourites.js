import { useEffect, useState } from 'react';

// Favourites (the heart icon) are saved in this browser per account, the same
// way the cart is: { guest: [ids], <user id>: [ids] }.
const STORAGE_KEY = 'notmarketplace-favourites';

function loadFavourites() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
    return Object.fromEntries(Object.entries(saved).filter(([, ids]) => Array.isArray(ids)));
  } catch {
    return {};
  }
}

function saveFavourites(all) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Storage full or blocked (private window): favourites still work until the page closes.
  }
}

// Custom hook: the current account's favourite product ids, plus functions to change them.
function useFavourites(user, authReady) {
  const [all, setAll] = useState(loadFavourites);

  useEffect(() => {
    saveFavourites(all);
  }, [all]);

  const owner = user ? user.uid : 'guest';
  // Hearts clicked before logging in are added to the account's list.
  const guestIds = user ? all.guest || [] : [];
  const favouriteIds = authReady ? [...new Set([...(all[owner] || []), ...guestIds])] : [];

  // Writes the new list for this account (and folds in any guest hearts).
  function saveList(nextIds) {
    setAll((current) => {
      const next = { ...current, [owner]: nextIds };
      if (user) delete next.guest;
      return next;
    });
  }

  function isFavourite(productId) {
    return favouriteIds.includes(productId);
  }

  function toggleFavourite(productId) {
    if (!authReady) return;
    saveList(isFavourite(productId)
      ? favouriteIds.filter((id) => id !== productId)
      : [...favouriteIds, productId]);
  }

  function removeFavourites(productIds) {
    saveList(favouriteIds.filter((id) => !productIds.includes(id)));
  }

  return { favouriteIds, isFavourite, toggleFavourite, removeFavourites };
}

export default useFavourites;
