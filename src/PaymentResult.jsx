import { useContext, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { paymentRequest } from './services/paymentService.js';
import CartContext from './context/CartContext.js';

export default function PaymentResult({ user, authReady }) {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  return (
    <PaymentStatus
      key={`${user?.uid || 'guest'}:${sessionId || ''}`}
      user={user}
      authReady={authReady}
      sessionId={sessionId}
    />
  );
}

function PaymentStatus({ user, authReady, sessionId }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [removed, setRemoved] = useState(false);
  const { cartItems, handleRemoveFromCart, handleUpdateQuantity } = useContext(CartContext);

  useEffect(() => {
    if (!authReady || !user || !sessionId) return;
    let active = true;

    async function checkPayment() {
      try {
        const data = await paymentRequest(`/api/checkout?session_id=${encodeURIComponent(sessionId)}`);
        if (active) {
          setResult(data);
          setError('');
        }
      } catch (error) {
        if (active) setError(error.message);
      }
    }

    checkPayment();
    return () => {
      active = false;
    };
  }, [user, authReady, sessionId, attempt]);

  function removePurchasedItems() {
    for (const purchasedItem of result.items) {
      const cartItem = cartItems.find((item) => item.id === purchasedItem.productId);
      if (!cartItem) continue;

      const remaining = (cartItem.quantity || 1) - purchasedItem.quantity;
      if (remaining <= 0) {
        handleRemoveFromCart(purchasedItem.productId);
      } else {
        handleUpdateQuantity(purchasedItem.productId, remaining);
      }
    }
    setRemoved(true);
  }

  function renderPaymentStatus() {
    if (!authReady) return <CircularProgress />;
    if (!user) {
      return <Alert severity="info">Log in with the account used at checkout to view this payment.</Alert>;
    }
    if (!sessionId) {
      return <Alert severity="error">No checkout session was provided.</Alert>;
    }
    if (error) return <Alert severity="error">{error}</Alert>;
    if (!result) return <CircularProgress aria-label="Verifying payment" />;
    if (result.status === 'completed') {
      return <Alert severity="success">Payment confirmed! Your orders have been saved.</Alert>;
    }
    if (result.status === 'refunded') {
      return <Alert severity="warning">An item became unavailable. Your payment has been refunded.</Alert>;
    }
    return <Alert severity="warning">Your payment is still being confirmed. Check again shortly.</Alert>;
  }

  const status = result?.status;
  return (
    <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto' }}>
      <Typography component="h1" variant="h5">Payment status</Typography>
      {renderPaymentStatus()}
      {user && sessionId && (error || status === 'pending') && (
        <Button onClick={() => setAttempt(attempt + 1)}>Check again</Button>
      )}
      {authReady && user && status === 'completed' && !removed && (
        <Button onClick={removePurchasedItems}>Remove purchased items from cart</Button>
      )}
      <Button component={Link} to="/orders" variant="contained">View orders</Button>
      <Button component={Link} to="/cart">Back to cart</Button>
    </Stack>
  );
}
