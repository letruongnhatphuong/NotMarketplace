import { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  IconButton,
  Snackbar,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import CheckIcon from '@mui/icons-material/Check';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CartContext from './context/CartContext.js';
import FavouritesContext from './context/FavouritesContext.js';
import { formatMoney } from './utils/salesUtils.js';
import { getStock } from './utils/stock.js';

// The wish list: every product saved with the heart icon on the marketplace.
function Favourites({ user }) {
  const { cartItems, products, handleAddToCart, cartReady } = useContext(CartContext);
  const { favouriteIds, toggleFavourite, removeFavourites } = useContext(FavouritesContext);
  const [addedItem, setAddedItem] = useState(null);

  // Saved products that are still for sale, in the order they were saved (newest first).
  const savedProducts = [...favouriteIds]
    .reverse()
    .map((id) => products.find((product) => product.id === id))
    .filter(Boolean);

  // Saved ids that are no longer listed (sold out or removed by the seller).
  // Only known once the marketplace has loaded.
  const unavailableIds = products.length > 0
    ? favouriteIds.filter((id) => !products.some((product) => product.id === id))
    : [];

  return (
    <Box component="section">
      <Button component={Link} to="/marketplace" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Back to Not Marketplace
      </Button>
      <Typography variant="h5" component="h1" gutterBottom>
        Favourites
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Items you saved with the heart icon. Click the heart again to remove one.
      </Typography>

      {unavailableIds.length > 0 && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={<Button color="inherit" size="small" onClick={() => removeFavourites(unavailableIds)}>Remove</Button>}
        >
          {unavailableIds.length === 1
            ? '1 saved item is no longer for sale.'
            : `${unavailableIds.length} saved items are no longer for sale.`}
        </Alert>
      )}

      {savedProducts.length === 0 ? (
        <Card sx={{ borderRadius: 3, p: 4, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 48 }}>🤍</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No favourites yet. Tap the heart on any listing to save it here.
          </Typography>
          <Button component={Link} to="/marketplace" variant="contained">Browse marketplace</Button>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          {savedProducts.map((item) => {
            const cartEntry = cartItems.find((cartItem) => cartItem.id === item.id);
            const stock = getStock(item);
            const limitReached = (cartEntry?.quantity || 0) >= stock;
            const isOwnListing = Boolean(user && item.ownerId === user.uid);
            const isDemo = typeof item.id === 'number';

            let cartLabel = 'Add to cart';
            if (isDemo) cartLabel = 'Demo item';
            else if (stock === 0) cartLabel = 'Out of stock';
            else if (cartEntry) cartLabel = 'Added to cart';

            return (
              <Card component="article" key={item.id} sx={{ display: 'flex', flexDirection: 'column' }}>
                {item.image ? (
                  <Box
                    component="img"
                    src={item.image}
                    alt={item.name}
                    sx={{ width: '100%', height: 144, objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <Box sx={{ bgcolor: 'grey.100', textAlign: 'center', p: 3, fontSize: 64 }}>
                    {item.emoji || '📦'}
                  </Box>
                )}
                <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexGrow: 1 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight="bold">{formatMoney(Number(item.price))}</Typography>
                    <Typography component="h3" variant="subtitle1">{item.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stock === 0 ? 'Out of stock' : `${stock} available`}
                    </Typography>
                    {item.condition && <Chip size="small" label={item.condition} sx={{ my: 0.5 }} />}
                  </Box>
                  <IconButton
                    color="error"
                    aria-label={`Remove ${item.name} from favourites`}
                    onClick={() => toggleFavourite(item.id)}
                  >
                    <FavoriteIcon />
                  </IconButton>
                </CardContent>
                <CardActions>
                  {isOwnListing ? (
                    <Button fullWidth component={Link} to="/sell" variant="outlined" startIcon={<StorefrontIcon />}>
                      Your listing
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      variant="contained"
                      color={cartEntry ? 'success' : 'primary'}
                      startIcon={cartEntry ? <CheckIcon /> : <AddShoppingCartIcon />}
                      disabled={!cartReady || limitReached || isDemo}
                      onClick={() => {
                        handleAddToCart(item);
                        setAddedItem(item);
                      }}
                    >
                      {cartLabel}
                    </Button>
                  )}
                </CardActions>
              </Card>
            );
          })}
        </Box>
      )}

      <Snackbar
        open={Boolean(addedItem)}
        autoHideDuration={3000}
        onClose={() => setAddedItem(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert variant="filled" severity="success" onClose={() => setAddedItem(null)} sx={{ width: '100%' }}>
          {addedItem && `Added ${addedItem.name} to cart`}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Favourites;
