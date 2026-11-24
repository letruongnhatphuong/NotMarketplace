// Location maths for the marketplace: distances between two points on the Earth.

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function isValidCoords(point) {
  return Boolean(point)
    && Number.isFinite(point.lat) && Math.abs(point.lat) <= 90
    && Number.isFinite(point.lng) && Math.abs(point.lng) <= 180;
}

// Straight-line ("as the crow flies") distance in km, using the haversine formula.
export function distanceKm(a, b) {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// "Less than 1 km", "3.2 km", "27 km". Locations are rounded to about 1 km,
// so smaller distances would look more precise than they are.
export function formatDistance(km) {
  if (km < 1) return 'Less than 1 km';
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

// Rounds a point to about 1 km (2 decimals) so a listing shows the seller's
// area, not their exact address.
export function approximateCoords(point, decimals = 2) {
  const factor = 10 ** decimals;
  return {
    lat: Math.round(point.lat * factor) / factor,
    lng: Math.round(point.lng * factor) / factor,
  };
}

// Splits products into those within radiusKm of origin (nearest first, each with
// distanceKm added) and those that have no location.
export function filterByDistance(products, origin, radiusKm) {
  const nearby = [];
  const unlocated = [];
  for (const product of products) {
    if (!isValidCoords(product.coordinates)) {
      unlocated.push(product);
      continue;
    }
    const distance = distanceKm(origin, product.coordinates);
    if (distance <= radiusKm) nearby.push({ ...product, distanceKm: distance });
  }
  nearby.sort((a, b) => a.distanceKm - b.distanceKm);
  return { nearby, unlocated };
}
