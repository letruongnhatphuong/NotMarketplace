import { useState } from 'react';
import { getApproximatePosition, getAreaName } from '../services/locationService.js';

// Custom hook shared by the Sell form and the Marketplace: asks the browser for
// the user's approximate location and tracks the "finding…" and error states.
function useBrowserLocation() {
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState('');

  // Returns { label, lat, lng }, or null if the location could not be found.
  async function findLocation() {
    setFinding(true);
    setError('');
    try {
      const point = await getApproximatePosition();
      const label = await getAreaName(point);
      return { label, ...point };
    } catch (locationError) {
      setError(locationError.message);
      return null;
    } finally {
      setFinding(false);
    }
  }

  return { findLocation, finding, error, clearError: () => setError('') };
}

export default useBrowserLocation;
