import { useContext, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Snackbar,
  Typography,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import CheckIcon from '@mui/icons-material/Check';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CartContext from './context/CartContext'
import FavouritesContext from './context/FavouritesContext.js';
import { Link } from 'react-router-dom';
import { getUsername } from './services/profileService.js';
import { formatPrice } from './utils/salesUtils.js';
import { getStock } from './utils/stock.js';
import ProductDetails from './components/ProductDetails.jsx';


function matchesFilters(product, filters) {
  if (filters.item && !product.name.toLowerCase().includes(filters.item.toLowerCase())) return false;
  if (filters.category && product.category !== filters.category) return false;
  if (filters.condition && product.condition !== filters.condition) return false;
  if (filters.minPrice !== '' && product.price < Number(filters.minPrice)) return false;
  if (filters.maxPrice !== '' && product.price > Number(filters.maxPrice)) return false;
  return true;
}

const Marketplace = ({ filters, products, productsLoaded, loadError, onClearFilters, user }) => {

  const { cartItems, handleAddToCart, cartReady } = useContext(CartContext);
  const { isFavourite, toggleFavourite } = useContext(FavouritesContext);
  const [addedItem, setAddedItem] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [openProduct, setOpenProduct] = useState(null);
  const [sellerNames, setSellerNames] = useState({});

  const items = products.filter((product) => matchesFilters(product, filters));

  useEffect(() => {
    async function loadSellerNames() {
      const names = {};
      for (const product of products) {
        if (product.ownerId && !names[product.ownerId]) {
          names[product.ownerId] = await getUsername(product.ownerId);
        }
      }
      setSellerNames(names);
    }

    loadSellerNames();
  }, [products]);

  return (
    <Box component="section">
      <Typography
        variant="h5"
        component="h1"
        gutterBottom
        sx={{ display: 'inline-block', pb: 0.5, borderBottom: '4px solid', borderColor: 'primary.main' }}
      >
        Not Marketplace
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Items for sale{productsLoaded && ` (${items.length})`}
      </Typography>
      {loadError && <Alert severity="warning" sx={{ mb: 2 }}>{loadError}</Alert>}
      {!productsLoaded && !loadError && <CircularProgress aria-label="Loading items" />}
      {productsLoaded && products.length === 0 && (
        <Typography color="text.secondary">Nothing is listed yet. Be the first to sell an item.</Typography>
      )}
      {productsLoaded && products.length > 0 && items.length === 0 && (
        <Box>
          <Typography color="text.secondary" sx={{ mb: 2 }}>No items match your search.</Typography>
          <Button variant="outlined" onClick={onClearFilters}>Clear filters</Button>
        </Box>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))',
          gap: 2,
        }}
      >
        {
          items.map((item) => {
            const isSaved = isFavourite(item.id);
            // Buying your own listing makes no sense (checkout refuses it too).
            const isOwnListing = Boolean(user && item.ownerId === user.uid);
            const cartEntry = cartItems.find((cartItem) => cartItem.id === item.id);
            const stock = getStock(item);
            const limitReached = (cartEntry?.quantity || 0) >= stock;

            return (
              <Card component="article" key={item.id} sx={{ display: 'flex', flexDirection: 'column' }}>
                <CardActionArea aria-label={`View details of ${item.name}`} onClick={() => setOpenProduct(item)}>
                  {item.image ? (
                    <Box
                      component="img"
                      src={item.image}
                      alt=""
                      sx={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <Box sx={{ bgcolor: 'grey.100', aspectRatio: '4 / 3', display: 'grid', placeItems: 'center', fontSize: 64 }}>
                      {item.emoji || '📦'}
                    </Box>
                  )}
                </CardActionArea>
                <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexGrow: 1 }}>
                  <Box sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                    <Typography fontWeight="bold" sx={{ color: 'primary.main' }}>{formatPrice(item.price)}</Typography>
                    <Typography component="h3" variant="subtitle1">{item.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stock === 0 ? 'Out of stock' : `${stock} available`}
                    </Typography>
                    {item.condition && <Chip size="small" label={item.condition} sx={{ my: 0.5 }} />}
                    {item.ownerId && (
                      <Typography variant="body2" color="text.secondary">
                        Sold by{' '}
                        <Link to={`/user/profile/${item.ownerId}`}>
                          {sellerNames[item.ownerId] || 'seller'}
                        </Link>
                      </Typography>
                    )}
                  </Box>
                  <IconButton
                    color="warning"
                    aria-label={`Favourite ${item.name}`}
                    aria-pressed={isSaved}
                    onClick={() => toggleFavourite(item.id)}
                  >
                    {isSaved ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                  </IconButton>
                </CardContent>
                <CardActions>
                  {isOwnListing ? (
                    <Button
                      fullWidth
                      component={Link}
                      to="/sell"
                      variant="outlined"
                      startIcon={<StorefrontIcon />}
                    >
                      Your listing
                    </Button>
                  ) : (
                  <Button
                    fullWidth
                    disabled={!cartReady || limitReached}
                    variant="contained"
                    color={cartEntry ? 'success' : 'primary'}
                    startIcon={cartEntry ? <CheckIcon /> : <AddShoppingCartIcon />}
                    onClick={() => {
                      handleAddToCart(item);
                      setAddedItem(item);
                      setSnackbarOpen(true);
                    }}
                  >
                    {stock === 0 ? 'Out of stock' : cartEntry
                      ? limitReached
                        ? `In cart (${cartEntry.quantity})`
                        : `In cart (${cartEntry.quantity}) · Add 1`
                      : 'Add to cart'}
                  </Button>
                  )}
                </CardActions>
              </Card>
            )
          })
        }
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          variant="filled"
          severity="success"
          onClose={() => setSnackbarOpen(false)}
          sx={{ width: '100%' }}
        >
          {addedItem && `Added ${addedItem.name} to cart`}
        </Alert>
      </Snackbar>

      <ProductDetails
        product={openProduct}
        sellerName={openProduct && sellerNames[openProduct.ownerId]}
        onClose={() => setOpenProduct(null)}
      />
    </Box>
  )
}

export default Marketplace
