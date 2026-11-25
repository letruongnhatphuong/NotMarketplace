import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { db } from './firebase.js';
import { deleteProduct, getUserProducts } from './services/productService.js';
import { markAsSold } from './services/salesService.js';
import MyProductList from './components/MyProductList.jsx';

function Selling({ user, authReady }) {
  // "ownerId" remembers whose products are loaded, so switching accounts never shows the wrong list.
  const [userProducts, setUserProducts] = useState({ ownerId: null, items: [], error: '' });

  useEffect(() => {
    if (!user || !db) return;
    let ignore = false; // skip stale results if the user changes before loading finishes

    getUserProducts(user.uid)
      .then((items) => {
        if (!ignore) setUserProducts({ ownerId: user.uid, items, error: '' });
      })
      .catch(() => {
        if (!ignore) setUserProducts({ ownerId: user.uid, items: [], error: 'Unable to load your items. Please refresh and try again.' });
      });

    return () => { ignore = true; };
  }, [user]);

  async function handleDelete(product) {
    await deleteProduct(product.id);
    setUserProducts((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== product.id),
    }));
  }

  // Records the sale (Revenue + Sold history) and removes the item from the listings.
  async function handleMarkSold(product) {
    await markAsSold(product.id);
    setUserProducts((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== product.id),
    }));
  }

  const loading = Boolean(user && db) && userProducts.ownerId !== user.uid;

  function renderContent() {
    if (!authReady) {
      return <CircularProgress aria-label="Checking your login" />;
    }
    if (!user) {
      return (
        <Alert severity="info" action={<Button component={Link} to="/" color="inherit">Log in</Button>}>
          Log in to see the items you are selling.
        </Alert>
      );
    }
    if (!db) {
      return <Alert severity="warning">The product database is not configured yet. Please try again later.</Alert>;
    }
    if (loading) {
      return <CircularProgress aria-label="Loading your items" />;
    }
    if (userProducts.error) {
      return <Alert severity="error">{userProducts.error}</Alert>;
    }

    return <MyProductList products={userProducts.items} onDelete={handleDelete} onMarkSold={handleMarkSold} />;
  }

  const showCount = user && !loading && !userProducts.error;

  return (
    <Box component="section">
      <Button component={Link} to="/marketplace" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Back to Not Marketplace
      </Button>
      <Typography variant="h5" component="h1" gutterBottom>
        Selling{showCount && ` (${userProducts.items.length})`}
      </Typography>
      <Typography color="textSecondary" sx={{ mb: 3 }}>
        Items you are selling right now.
      </Typography>

      {renderContent()}
    </Box>
  );
}

export default Selling;
