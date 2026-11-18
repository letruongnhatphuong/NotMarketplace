import { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppBar, Badge, Box, Button, Container, Divider, IconButton, Menu, MenuItem, Toolbar } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CartContext from '../context/CartContext.js';
import FavouritesContext from '../context/FavouritesContext.js';
import SellButton from './SellButton.jsx';

function Navbar({ user, authReady, loggingOut, onLogout, onHome }) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const { cartItems } = useContext(CartContext);
  const cartCount = cartItems.reduce((total, item) => total + (item.quantity || 1), 0);
  const { favouriteIds } = useContext(FavouritesContext);

  let userName = '';
  if (user) {
    userName = user.displayName || user.email.split('@')[0];
  }

  function closeMenu() {
    setMenuAnchor(null);
  }

  function handleLogout() {
    closeMenu();
    onLogout();
  }

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: 'background.navbar',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Container>
        <Toolbar component="nav" disableGutters sx={{ gap: 2, flexWrap: 'wrap', py: 2 }}>
          <Box component={Link} to="/marketplace" onClick={onHome} aria-label="Marketplace home" sx={{ display: 'inline-flex', flexShrink: 0 }}>
            <Box component="img" src="/not-marketplace-emerald.png" width={72} height={72} alt="" />
          </Box>
          <Box sx={{ flexGrow: 1 }} />

          <SellButton />

          <IconButton component={Link} to="/cart" aria-label={`Cart, ${cartCount} items`} title="Cart">
            <Badge
              badgeContent={cartCount}
              sx={{
                '& .MuiBadge-badge': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  fontWeight: 700,
                },
              }}
            >
              <ShoppingCartIcon />
            </Badge>
          </IconButton>

          {authReady && user && (
            <>
              <Button
                color="inherit"
                variant={menuAnchor ? 'contained' : 'outlined'}
                disabled={loggingOut}
                aria-haspopup="true"
                onClick={(event) => setMenuAnchor(event.currentTarget)}
              >
                {loggingOut ? 'Logging out…' : userName}
              </Button>
              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{ paper: { sx: { minWidth: menuAnchor ? Math.max(menuAnchor.offsetWidth, 180) : 'auto' } } }}
              >
                <MenuItem component={Link} to="/user/profile" onClick={closeMenu}>Profile</MenuItem>
                <MenuItem component={Link} to="/favourites" onClick={closeMenu}>
                  Favourites{favouriteIds.length > 0 ? ` (${favouriteIds.length})` : ''}
                </MenuItem>
                <Divider />
                <MenuItem component={Link} to="/revenue" onClick={closeMenu}>Revenue</MenuItem>
                <MenuItem component={Link} to="/sold" onClick={closeMenu}>Sold</MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>Log out</MenuItem>
              </Menu>
            </>
          )}
          {authReady && !user && <Button component={Link} to="/" variant="outlined" color="inherit">Log in</Button>}
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default Navbar;
