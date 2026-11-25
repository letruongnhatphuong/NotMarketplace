import { approximateCoords } from '../utils/geo.js';

// Finds the user's approximate location with the browser's Geolocation API.
// The browser asks the user for permission first; nothing is shared without it.

const ERROR_MESSAGES = {
  1: 'Location access was blocked. Allow location for this site in your browser settings, then try again.',
  2: 'Your location is not available right now. Check that location services are on, then try again.',
  3: 'Finding your location took too long. Please try again.',
};

// The device's position, rounded to about 1 km: { lat, lng }.
// enableHighAccuracy: false asks for a quick, approximate fix (Wi-Fi or network)
// instead of GPS, which is all a marketplace needs. maximumAge: 0 means a fresh
// reading every time, so "Update location" works after the user moves.
export function getApproximatePosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This browser cannot share its location.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(approximateCoords({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      })),
      (error) => reject(new Error(ERROR_MESSAGES[error.code] || 'Unable to get your location.')),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 },
    );
  });
}

// --- OpenStreetMap's free Nominatim service ---
// Its usage policy allows at most one request per second, so every request
// waits for its turn and they are spaced at least 1.1 s apart.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const MIN_REQUEST_GAP_MS = 1100;
let nextRequestAt = 0;

async function nominatim(path, params) {
  const waitMs = Math.max(0, nextRequestAt - Date.now());
  nextRequestAt = Math.max(Date.now(), nextRequestAt) + MIN_REQUEST_GAP_MS;
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));

  const query = new URLSearchParams({ format: 'jsonv2', ...params });
  const response = await fetch(`${NOMINATIM_URL}/${path}?${query}`, {
    headers: { 'Accept-Language': navigator.language || 'en' },
  });
  if (!response.ok) throw new Error('The address service is not responding.');
  return response.json();
}

// A short name for the area around a point, e.g. "Kitsilano, Vancouver".
// If the service is unavailable, the location still works with a generic name.
export async function getAreaName(point) {
  try {
    const place = await nominatim('reverse', {
      lat: String(point.lat),
      lon: String(point.lng),
      zoom: '14',
      addressdetails: '1',
    });
    const a = place.address || {};
    const area = a.neighbourhood || a.suburb || a.quarter || a.city_district;
    const city = a.city || a.town || a.village || a.municipality || a.county;
    const parts = [...new Set([area, city].filter(Boolean))];
    return parts.length > 0 ? parts.join(', ') : 'Your area';
  } catch {
    return 'Your area';
  }
}

// Requests already on their way, so the same place is never looked up twice at once.
const placeRequests = new Map();

// The approximate point for a typed place such as "Burnaby, BC" (rounded to about
// 1 km), or null if the service doesn't know it. Used for listings that were
// posted with a typed location but no coordinates. Results near the buyer are
// preferred, so "Richmond" finds Richmond, BC for a buyer in Vancouver.
// Throws if the service can't be reached, so the caller can try again later.
export function findPlace(text, near) {
  const key = `${text}|${near ? `${near.lat},${near.lng}` : ''}`;
  if (!placeRequests.has(key)) {
    const params = { q: text, limit: '1' };
    if (near) {
      params.viewbox = [near.lng - 1, near.lat + 1, near.lng + 1, near.lat - 1].join(',');
    }
    const request = nominatim('search', params)
      .then((results) => (results.length > 0
        ? approximateCoords({ lat: Number(results[0].lat), lng: Number(results[0].lon) })
        : null))
      .finally(() => placeRequests.delete(key));
    placeRequests.set(key, request);
  }
  return placeRequests.get(key);
}
