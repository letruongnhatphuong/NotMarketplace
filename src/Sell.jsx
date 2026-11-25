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
import { addProduct } from './services/productService.js';
import ProductForm from './components/ProductForm.jsx';

function Sell({ user, authReady }) {
  async function handleCreate(product) {
    try {
      await addProduct(user.uid, product);
    } catch {
      throw new Error('Unable to list your item. Please try again.');
    }
  }

  function renderContent() {
    if (!authReady) {
      return <CircularProgress aria-label="Checking your login" />;
    }
    if (!user) {
      return (
        <Alert severity="info" action={<Button component={Link} to="/" color="inherit">Log in</Button>}>
          Log in to list items for sale.
        </Alert>
      );
    }
    if (!db) {
      return <Alert severity="warning">The product database is not configured yet. Please try again later.</Alert>;
    }

    return (
      <>
        <ProductForm onCreate={handleCreate} />
        <Button component={Link} to="/selling" fullWidth sx={{ mt: 2 }}>View items you are selling</Button>
      </>
    );
  }

  return (
    <Box component="section" sx={{ maxWidth: 560, mx: 'auto' }}>
      <Button component={Link} to="/marketplace" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Back to Not Marketplace
      </Button>
      <Typography variant="h5" component="h1" gutterBottom>
        Sell on Not Marketplace
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        List your item for sale.
      </Typography>

      {renderContent()}
    </Box>
  );
}

export default Sell;
