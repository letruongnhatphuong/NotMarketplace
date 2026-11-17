import { auth } from '../firebase.js';

export async function paymentRequest(path, options = {}) {
  if (!auth.currentUser) throw new Error('Please log in to pay.');
  const token = await auth.currentUser.getIdToken();
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to connect to checkout. Please try again.');
  return data;
}
