import { Link } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { formatPrice } from '../utils/salesUtils.js';
import { getStock } from '../utils/stock.js';

function ProductDetails({ product, sellerName, onClose }) {
  if (!product) return null;
  const stock = getStock(product);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="product-details-title">
      <DialogTitle id="product-details-title">{product.name}</DialogTitle>
      <DialogContent>
        {product.image && (
          <Box
            component="img"
            src={product.image}
            alt={product.name}
            sx={{ width: '100%', maxHeight: 360, objectFit: 'contain', bgcolor: 'grey.100', borderRadius: 1, display: 'block', mb: 2 }}
          />
        )}
        <Typography variant="h6" component="p" sx={{ color: 'primary.main' }}>{formatPrice(product.price)}</Typography>
        <Typography variant="body2" color="text.secondary">
          {stock === 0 ? 'Out of stock' : `${stock} available`}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 1.5 }}>
          {product.condition && <Chip size="small" label={product.condition} />}
          {product.category && <Chip size="small" variant="outlined" label={product.category} />}
        </Box>
        {product.description && <Typography sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{product.description}</Typography>}
        {product.location && <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>📍 {product.location}</Typography>}
        {product.ownerId && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Sold by <Link to={`/user/profile/${product.ownerId}`}>{sellerName || 'seller'}</Link>
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ProductDetails;
