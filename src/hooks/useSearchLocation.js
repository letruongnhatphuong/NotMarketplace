import { useEffect, useState } from 'react';
import { isValidCoords } from '../utils/geo.js';

// The buyer's chosen search location { label, lat, lng, radiusKm }, kept in this
// browser only (it never goes to the database), so it is remembered between visits.
const STORAGE_KEY = 'notmarketplace-search-location';

function loadLocation() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (isValidCoords(saved) && Number.isFinite(saved.radiusKm) && saved.radiusKm > 0) return saved;
  } catch {
    // Missing or unreadable: no location chosen yet.
  }
  return null;
}

function useSearchLocation() {
  const [location, setLocation] = useState(loadLocation);

  useEffect(() => {
    try {
      if (location) localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage blocked (private window): the location still works until the page closes.
    }
  }, [location]);

  return [location, setLocation];
}

export default useSearchLocation;
