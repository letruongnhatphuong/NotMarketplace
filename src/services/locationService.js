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

// A short name for the area around a point, e.g. "Kitsilano, Vancouver".
// Uses OpenStreetMap's free Nominatim service (one request per button click).
// If it is unavailable, the location still works with a generic name.
export async function getAreaName(point) {
  try {
    const query = new URLSearchParams({
      format: 'jsonv2',
      lat: String(point.lat),
      lon: String(point.lng),
      zoom: '14',
      addressdetails: '1',
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query}`, {
      headers: { 'Accept-Language': navigator.language || 'en' },
    });
    if (!response.ok) return 'Your area';
    const place = await response.json();
    const a = place.address || {};
    const area = a.neighbourhood || a.suburb || a.quarter || a.city_district;
    const city = a.city || a.town || a.village || a.municipality || a.county;
    const parts = [...new Set([area, city].filter(Boolean))];
    return parts.length > 0 ? parts.join(', ') : 'Your area';
  } catch {
    return 'Your area';
  }
}
