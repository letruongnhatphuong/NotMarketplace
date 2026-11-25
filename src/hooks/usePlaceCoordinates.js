import { useEffect, useState } from 'react';
import { findPlace } from '../services/locationService.js';

// Many listings were posted with a typed location ("Burnaby, BC") but no
// coordinates, so the distance filter could not measure them. This hook looks
// each typed place up once, remembers the answer in this browser, and returns
// the point for any place name.
const STORAGE_KEY = 'notmarketplace-place-coordinates';

// "  Burnaby,  BC " and "burnaby, bc" are the same place.
export function placeKey(text) {
  return typeof text === 'string' ? text.trim().replace(/\s+/g, ' ').toLowerCase() : '';
}

function loadPlaces() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch {
    return {};
  }
}

// placeNames: the typed locations to measure. near: the buyer's location, or null
// when the distance filter is off (then nothing is looked up).
// Returns coordsFor(name) → { lat, lng } or null, and how many places are still being looked up.
function usePlaceCoordinates(placeNames, near) {
  // { "burnaby, bc": { lat, lng }, "nowhere": null } — null means "not found", so it isn't asked again.
  const [places, setPlaces] = useState(loadPlaces);
  const [serviceDown, setServiceDown] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
    } catch {
      // Storage blocked: places are looked up again next visit.
    }
  }, [places]);

  const keys = [...new Set(placeNames.map(placeKey).filter(Boolean))];
  const missing = near ? keys.filter((key) => !(key in places)) : [];
  const missingList = missing.join('\n');
  const nearLat = near ? near.lat : null;
  const nearLng = near ? near.lng : null;

  useEffect(() => {
    if (!missingList) return;
    let ignore = false;
    const nearPoint = nearLat === null ? null : { lat: nearLat, lng: nearLng };

    async function lookUpPlaces() {
      for (const key of missingList.split('\n')) {
        let point;
        try {
          point = await findPlace(key, nearPoint);
        } catch {
          // Service unreachable: those listings stay unmeasured until the next visit.
          if (!ignore) setServiceDown(true);
          return;
        }
        if (ignore) return;
        setPlaces((current) => ({ ...current, [key]: point }));
      }
    }

    lookUpPlaces();
    return () => { ignore = true; };
  }, [missingList, nearLat, nearLng]);

  function coordsFor(name) {
    return places[placeKey(name)] || null;
  }

  return { coordsFor, checking: serviceDown ? 0 : missing.length };
}

export default usePlaceCoordinates;
