import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import CartContext from './context/CartContext.js';
import FavouritesContext from './context/FavouritesContext.js';
import useFavourites from './hooks/useFavourites.js';
import Navbar from './components/Navbar.jsx';
import Sidebar from './components/Sidebar.jsx';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase.js';
import {
  Alert,
  Box,
  Button,
  Container,
  Typography,
} from '@mui/material';
import Login from './Login.jsx';
import Marketplace from './Marketplace.jsx';
import Cart from './Cart.jsx';
import PaymentResult from './PaymentResult.jsx';
import Sell from './Sell.jsx';
import Orders from './Orders.jsx';
import UserProfile from './UserProfile.jsx';
import Revenue from './Revenue.jsx';
import Sold from './Sold.jsx';
import Favourites from './Favourites.jsx';
import { ensureUserProfile } from './services/profileService.js';
import { addCartItem, loadCartState, mergeGuestCart, reconcileCartStock, rememberCheckout, removeCheckoutItems, saveCarts } from './utils/cartStorage.js';
import { getStock } from './utils/stock.js';
import { subscribeToProducts } from './services/productService.js';

const PAGE_TITLES = {
  '/': 'Log in',
  '/marketplace': 'Items for sale',
  '/cart': 'Your cart',
  '/payment': 'Payment status',
  '/sell': 'Sell',
  '/orders': 'Your orders',
  '/revenue': 'Revenue',
  '/sold': 'Sold',
  '/favourites': 'Favourites',
  '/user/profile': 'Profile',
};

const EMPTY_FILTERS = { item: '', category: '', minPrice: '', maxPrice: '', condition: '' };

function App() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const page = pathname.replace(/\/+$/, '') || '/';
  const [cartState, setCartState] = useState(() => loadCartState());
  const { carts } = cartState;
  function setCarts(update) {
    setCartState((current) => ({ ...current, carts: update(current.carts) }));
  }
  const [products, setProducts] = useState([]);
  const [productsError, setProductsError] = useState('');
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);

  function handleHome() {
    setFilters(EMPTY_FILTERS);
    setDraftFilters(EMPTY_FILTERS);
  }
  function handleAddToCart(item) {
    if (!authReady) return;
    if (user && item.ownerId === user.uid) return; // sellers can't buy their own listing
    const owner = user ? user.uid : 'guest';
    setCarts((current) => ({
      ...current,
      [owner]: addCartItem(current[owner] || [], item),
    }));
  }
  function handleClearCart() {
    const owner = user ? user.uid : 'guest';
    setCarts((current) => ({ ...current, [owner]: [] }));
  }
  function handleUpdateQuantity(itemId, quantity) {
    const owner = user ? user.uid : 'guest';
    setCarts((current) => ({
      ...current,
      [owner]: (current[owner] || []).map((entry) => {
        if (entry.id !== itemId) return entry;
        const product = products.find((candidate) => candidate.id === itemId);
        const stock = getStock(product || entry);
        const nextQuantity = Math.max(1, Math.min(quantity, stock));
        return { ...entry, ...(product || {}), quantity: nextQuantity, requestedQuantity: nextQuantity };
      }),
    }));
  }
  function handleRemoveFromCart(itemId) {
    const owner = user ? user.uid : 'guest';
    setCarts((current) => ({
      ...current,
      [owner]: (current[owner] || []).filter((entry) => entry.id !== itemId),
    }));
  }
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!auth);
  const [loggingOut, setLoggingOut] = useState(false);
  const [authError, setAuthError] = useState('');
  const cartItems = authReady ? carts[user ? user.uid : 'guest'] || [] : [];
  const favourites = useFavourites(user, authReady);

  function handleRememberCheckout(buyerId, sessionId, items) {
    if (auth.currentUser?.uid !== buyerId) throw new Error('Please log in again before checkout.');
    const saved = rememberCheckout(loadCartState(), buyerId, sessionId, items);
    if (!saveCarts(saved)) throw new Error('Unable to save your checkout. Please allow browser storage and try again.');
    setCartState((current) => rememberCheckout(current, buyerId, sessionId, items));
  }

  function handleRemovePurchasedItems(sessionId) {
    if (!user || auth.currentUser?.uid !== user.uid) return;
    const next = removeCheckoutItems(cartState, user.uid, sessionId);
    if (!saveCarts(next)) return;
    setCartState(next);
  }

  useEffect(() => {
    return subscribeToProducts((listedProducts, fromCache) => {
      const availableProducts = listedProducts;
      setProducts(availableProducts);
      setProductsError('');
      if (!fromCache || listedProducts.length > 0) setProductsLoaded(true);
      if (!fromCache) setCarts((current) => reconcileCartStock(current, availableProducts));
    }, () => {
      setProductsError('Unable to load marketplace items. Please refresh and try again.');
    });
  }, []);

  useEffect(() => {
    const pageTitle = page.startsWith('/user/profile/') ? 'Seller profile' : PAGE_TITLES[page] || 'Page not found';
    document.title = `${pageTitle} | Not Marketplace`;
  }, [page]);

  useEffect(() => {
    saveCarts(cartState);
  }, [cartState]);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthError('');
      if (currentUser) {
        setCarts((current) => mergeGuestCart(current, currentUser.uid));
        ensureUserProfile(currentUser).catch((error) => {
          if (auth.currentUser?.uid === currentUser.uid) {
            const reason = error.code === 'permission-denied'
              ? 'The database denied access to save your public profile. Please contact the project owner.'
              : 'Your public profile could not be saved. Check your connection and refresh to retry.';
            setAuthError(`You are logged in. ${reason}`);
          }
        });
      }
      setAuthReady(true);
    }, () => {
      setUser(null);
      setAuthReady(true);
      setAuthError('Unable to check your login status. Please refresh and try again.');
    });
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    setAuthError('');
    try {
      await signOut(auth);
      setLoggingOut(false);
      navigate('/');
    } catch {
      setAuthError('Unable to log out. Please try again.');
      setLoggingOut(false);
    }
  }

  return (
    <CartContext.Provider value={{ cartItems, products, handleAddToCart, handleClearCart, handleUpdateQuantity, handleRemoveFromCart, handleRememberCheckout, handleRemovePurchasedItems, checkoutCarts: cartState.checkouts[user?.uid] || {}, cartReady: authReady }}>
    <FavouritesContext.Provider value={favourites}>
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {page !== '/' && (
          <Navbar
            user={user}
            authReady={authReady}
            loggingOut={loggingOut}
            onLogout={handleLogout}
            onHome={handleHome}
          />
        )}

        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
          {page === '/marketplace' && <Sidebar filters={draftFilters} onChange={setDraftFilters} onApply={setFilters} />}

          <Container component="main" maxWidth={page === '/marketplace' ? 'xl' : 'lg'} sx={{ py: 4, minWidth: 0 }}>
            {authError && <Alert severity="error" sx={{ mb: 2 }}>{authError}</Alert>}
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/marketplace" element={<Marketplace filters={filters} products={products} productsLoaded={productsLoaded} loadError={productsError} onClearFilters={handleHome} user={user} />} />
              <Route path="/payment" element={<PaymentResult user={user} authReady={authReady} />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/sell" element={<Sell user={user} authReady={authReady} />} />
              <Route path="/orders" element={<Orders user={user} authReady={authReady} />} />
              <Route path="/revenue" element={<Revenue user={user} authReady={authReady} />} />
              <Route path="/sold" element={<Sold user={user} authReady={authReady} />} />
              <Route path="/favourites" element={<Favourites user={user} productsLoaded={productsLoaded} loadError={productsError} />} />
              <Route path="/user/profile" element={<UserProfile user={user} authReady={authReady} />} />
              <Route path="/user/profile/:userId" element={<UserProfile user={user} authReady={authReady} />} />
              <Route
                path="*"
                element={(
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography component="h1" variant="h5" gutterBottom>Page not found</Typography>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>This page doesn&apos;t exist or was moved.</Typography>
                    <Button component={Link} to="/marketplace" variant="contained">Browse marketplace</Button>
                  </Box>
                )}
              />
            </Routes>
          </Container>
        </Box>

        <Box
          component="footer"
          sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', px: 2, py: 2, textAlign: 'center' }}
        >
          <Typography variant="body2">Not Marketplace — a place to find your next favorite thing.</Typography>
        </Box>
      </Box>
    </FavouritesContext.Provider>
    </CartContext.Provider>
  );
}

export default App;
