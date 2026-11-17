import { useContext, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import CartContext from '../context/CartContext.js';
import { paymentRequest } from '../services/paymentService.js';
import { auth } from '../firebase.js';
import { formatMoney } from '../utils/salesUtils.js';

function CartCheckout() {
  const { cartItems, handleRemoveFromCart } = useContext(CartContext);
  const demoItems = cartItems.filter((item) => typeof item.id === 'number');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const itemCount = cartItems.reduce((total, item) => total + (item.quantity || 1), 0);
  const total = cartItems.reduce(
    (sum, item) => sum + Number(item.price) * (item.quantity || 1),
    0,
  );

  async function checkout() {
    setLoading(true);
    setError('');
    try {
      const { url } = await paymentRequest('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ items: cartItems.map((item) => ({ id: item.id, quantity: item.quantity || 1 })) }),
      });
      window.location.assign(url);
    } catch (failure) {
      setError(failure.message);
      setLoading(false);
    }
  }

  return (
    <Card sx={{ borderRadius: 3, mt: 3 }}>
      <CardContent>
        <Typography component="h2" variant="h6" gutterBottom>Order summary</Typography>
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography color="text.secondary">
              {itemCount === 1 ? '1 item' : `${itemCount} items`}
            </Typography>
            <Typography>{formatMoney(total)}</Typography>
          </Box>
          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography fontWeight="bold">Total</Typography>
            <Typography fontWeight="bold">{formatMoney(total)}</Typography>
          </Box>
        </Stack>
        {demoItems.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {demoItems.map((item) => item.name).join(', ')}: demo items cannot be purchased.
            Remove them and choose a listing added by another user.
            <Button color="inherit" onClick={() => {
              for (const item of demoItems) handleRemoveFromCart(item.id);
              setError('');
            }}>Remove demo items</Button>
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!auth.currentUser && <Alert severity="info" sx={{ mb: 2 }}>Log in to pay for your items.</Alert>}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Secure card payment in CAD. Featured demo items cannot be purchased.
        </Typography>
        <Button
          fullWidth
          size="large"
          variant="contained"
          startIcon={<ShoppingCartCheckoutIcon />}
          onClick={checkout}
          disabled={loading || !auth.currentUser || demoItems.length > 0}
        >
          {loading ? 'Opening secure checkout…' : 'Pay with Stripe'}
        </Button>
      </CardContent>

    </Card>
  );
}

export default CartCheckout;
