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
  MenuItem,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import CheckIcon from '@mui/icons-material/Check';
import StorefrontIcon from '@mui/icons-material/Storefront';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import PlaceIcon from '@mui/icons-material/Place';
import CartContext from './context/CartContext'
import FavouritesContext from './context/FavouritesContext.js';
import { Link } from 'react-router-dom';
import { getUsername } from './services/profileService.js';
import { formatPrice } from './utils/salesUtils.js';
import { getStock } from './utils/stock.js';
import ProductDetails from './components/ProductDetails.jsx';
import useBrowserLocation from './hooks/useBrowserLocation.js';
import useSearchLocation from './hooks/useSearchLocation.js';
import usePlaceCoordinates from './hooks/usePlaceCoordinates.js';
import { filterByDistance, formatDistance, isValidCoords } from './utils/geo.js';

const DISTANCE_OPTIONS = [5, 10, 25, 50, 100]; // km
const DEFAULT_DISTANCE = 25;


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

  const [searchLocation, setSearchLocation] = useSearchLocation();
  const { findLocation, finding, error: locationError, clearError } = useBrowserLocation();
  const [showUnlocated, setShowUnlocated] = useState(false);

  const filtered = products.filter((product) => matchesFilters(product, filters));

  // Most listings were posted with only a typed location ("Burnaby, BC") and no
  // coordinates. While the distance filter is on, those places are looked up once
  // (and remembered in this browser) so they can be measured too.
  const typedPlaces = searchLocation
    ? filtered.filter((product) => !isValidCoords(product.coordinates) && product.location).map((product) => product.location)
    : [];
  const { coordsFor, checking } = usePlaceCoordinates(typedPlaces, searchLocation);

  // With the buyer's location known: only items within the distance, nearest first.
  // Listings with no usable location can't be measured, so they are listed only when asked for.
  let items = filtered;
  let unlocatedCount = 0;
  if (searchLocation) {
    const measurable = filtered.map((product) => {
      if (isValidCoords(product.coordinates)) return product;
      const placePoint = coordsFor(product.location);
      return placePoint ? { ...product, coordinates: placePoint } : product;
    });
    const { nearby, unlocated } = filterByDistance(measurable, searchLocation, searchLocation.radiusKm);
    unlocatedCount = unlocated.length;
    items = showUnlocated ? [...nearby, ...unlocated] : nearby;
  }
  const widerDistance = searchLocation && DISTANCE_OPTIONS.find((km) => km > searchLocation.radiusKm);

  // Asks the browser where the buyer is (it shows a permission prompt the first time).
  async function handleUseMyLocation() {
    const found = await findLocation();
    if (found) {
      setSearchLocation({ ...found, radiusKm: searchLocation ? searchLocation.radiusKm : DEFAULT_DISTANCE });
    }
  }

  function handleDistanceChange(event) {
    setSearchLocation({ ...searchLocation, radiusKm: Number(event.target.value) });
  }

  function handleClearLocation() {
    setSearchLocation(null);
    setShowUnlocated(false);
    clearError();
  }

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
      <Typography color="text.secondary" sx={{ mb: 1.5 }}>
        Items for sale{productsLoaded && ` (${items.length})`}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: locationError ? 1.5 : 3 }}>
        {searchLocation ? (
          <>
            <Chip
              icon={<PlaceIcon />}
              label={`Near ${searchLocation.label}`}
              color="primary"
              onDelete={handleClearLocation}
              aria-label={`Showing items near ${searchLocation.label}. Press Delete to show items everywhere.`}
            />
            <TextField
              select
              size="small"
              label="Within"
              value={searchLocation.radiusKm}
              onChange={handleDistanceChange}
              sx={{ minWidth: 110 }}
            >
              {DISTANCE_OPTIONS.map((km) => (
                <MenuItem key={km} value={km}>{km} km</MenuItem>
              ))}
            </TextField>
            <Button size="small" startIcon={<MyLocationIcon />} onClick={handleUseMyLocation} disabled={finding}>
              {finding ? 'Finding…' : 'Update location'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outlined" startIcon={<MyLocationIcon />} onClick={handleUseMyLocation} disabled={finding}>
              {finding ? 'Finding your location…' : 'Use my location'}
            </Button>
            <Typography variant="body2" color="text.secondary">
              See items for sale near you. Your location stays in this browser.
            </Typography>
          </>
        )}
        {searchLocation && checking > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} aria-hidden="true" />
            <Typography variant="body2" color="text.secondary" role="status">
              Finding where {checking === 1 ? '1 listing is' : `${checking} listings are`}…
            </Typography>
          </Box>
        )}
        {searchLocation && checking === 0 && unlocatedCount > 0 && (
          <>
            <Typography variant="body2" color="text.secondary">
              {showUnlocated
                ? `Also showing ${unlocatedCount} without a location.`
                : `${unlocatedCount} ${unlocatedCount === 1 ? 'item has' : 'items have'} no location.`}
            </Typography>
            <Button size="small" onClick={() => setShowUnlocated(!showUnlocated)}>
              {showUnlocated ? 'Hide them' : 'Show them'}
            </Button>
          </>
        )}
      </Box>
      {locationError && <Alert severity="warning" onClose={clearError} sx={{ mb: 3 }}>{locationError}</Alert>}
      {loadError && <Alert severity="warning" sx={{ mb: 2 }}>{loadError}</Alert>}
      {!productsLoaded && !loadError && <CircularProgress aria-label="Loading items" />}
      {productsLoaded && products.length === 0 && (
        <Typography color="text.secondary">Nothing is listed yet. Be the first to sell an item.</Typography>
      )}
      {productsLoaded && filtered.length === 0 && products.length > 0 && (
        <Box>
          <Typography color="text.secondary" sx={{ mb: 2 }}>No items match your search.</Typography>
          <Button variant="outlined" onClick={onClearFilters}>Clear filters</Button>
        </Box>
      )}
      {productsLoaded && searchLocation && filtered.length > 0 && items.length === 0 && checking === 0 && (
        <Box>
          <Typography color="text.secondary" sx={{ mb: unlocatedCount > 0 ? 0.5 : 2 }}>
            No items within {searchLocation.radiusKm} km of {searchLocation.label}.
          </Typography>
          {unlocatedCount > 0 && (
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {unlocatedCount === 1 ? '1 item has' : `${unlocatedCount} items have`} no location, so {unlocatedCount === 1 ? 'its' : 'their'} distance is unknown.
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {widerDistance && (
              <Button variant="contained" onClick={() => setSearchLocation({ ...searchLocation, radiusKm: widerDistance })}>
                Search within {widerDistance} km
              </Button>
            )}
            {unlocatedCount > 0 && (
              <Button variant="outlined" onClick={() => setShowUnlocated(true)}>
                Show {unlocatedCount === 1 ? 'it' : `the ${unlocatedCount}`} without a location
              </Button>
            )}
            <Button variant={widerDistance ? 'outlined' : 'contained'} onClick={handleClearLocation}>Show items everywhere</Button>
          </Box>
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
                    {(item.distanceKm !== undefined || item.location) && (
                      <Typography variant="body2" color="text.secondary">
                        📍 {[item.distanceKm !== undefined && `${formatDistance(item.distanceKm)} away`, item.location].filter(Boolean).join(' · ')}
                      </Typography>
                    )}
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
                      to="/selling"
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
