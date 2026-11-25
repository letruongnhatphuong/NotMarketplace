import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Button,
  ButtonBase,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';

const CATEGORIES = [
  'Electronics',
  'Furniture',
  'Clothing & Accessories',
  'Books',
  'Home & Garden',
  'Sports & Outdoors',
  'Toys & Games',
  'Vehicles',
  'Other',
];

const CONDITIONS = ['New', 'Used - Like new', 'Used - Good', 'Used - Fair'];

const titleStyle = {
  bgcolor: 'primary.main',
  color: 'primary.contrastText',
  fontWeight: 'bold',
  textTransform: 'uppercase',
  px: 2,
  py: 1,
};

function Sidebar({ filters, onChange, onApply }) {
  const { item, category, minPrice, maxPrice, condition } = filters;
  const [sellingOpen, setSellingOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const priceError = minPrice !== '' && maxPrice !== '' && Number(minPrice) > Number(maxPrice);

  function handleSubmit(event) {
    event.preventDefault();
    if (priceError) return;
    onApply(filters);
    setMobileOpen(false);
  }

  function handleClear() {
    const emptyFilters = { item: '', category: '', minPrice: '', maxPrice: '', condition: '' };
    onChange(emptyFilters);
    onApply(emptyFilters);
    setMobileOpen(false);
  }

  return (
    <Box component="aside" sx={{ width: { xs: '100%', md: 260 }, flexShrink: 0, bgcolor: 'white' }}>
      <Button
        fullWidth
        startIcon={<FilterListIcon />}
        endIcon={mobileOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(!mobileOpen)}
        sx={{ display: { xs: 'flex', md: 'none' }, py: 1.5, borderRadius: 0 }}
      >
        Filters and menu
      </Button>

      <Box sx={{ display: { xs: mobileOpen ? 'block' : 'none', md: 'block' } }}>
      <Typography sx={titleStyle}>Buying</Typography>

      <List disablePadding>
        <ListItemButton component={Link} to="/orders">
          <ListItemText primary="Order" />
        </ListItemButton>
      </List>

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
        <TextField label="Item" size="small" value={item} onChange={(e) => onChange({ ...filters, item: e.target.value })} />

        <TextField select label="Category" size="small" value={category} onChange={(e) => onChange({ ...filters, category: e.target.value })}>
          <MenuItem value="">All categories</MenuItem>
          {CATEGORIES.map((name) => (
            <MenuItem key={name} value={name}>{name}</MenuItem>
          ))}
        </TextField>

        <Typography variant="body2" fontWeight="bold">Price</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField label="Min" type="number" size="small" value={minPrice} error={priceError} slotProps={{ htmlInput: { min: 0, step: 'any' } }} onChange={(e) => onChange({ ...filters, minPrice: e.target.value })} />
          <TextField label="Max" type="number" size="small" value={maxPrice} error={priceError} slotProps={{ htmlInput: { min: 0, step: 'any' } }} onChange={(e) => onChange({ ...filters, maxPrice: e.target.value })} />
        </Box>
        {priceError && <Typography variant="body2" color="error">Min can&apos;t be more than Max.</Typography>}

        <TextField select label="Condition" size="small" value={condition} onChange={(e) => onChange({ ...filters, condition: e.target.value })}>
          <MenuItem value="">Any condition</MenuItem>
          {CONDITIONS.map((name) => (
            <MenuItem key={name} value={name}>{name}</MenuItem>
          ))}
        </TextField>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained" fullWidth>Apply</Button>
          <Button variant="outlined" fullWidth onClick={handleClear}>Clear</Button>
        </Box>
      </Box>

      <ButtonBase
        aria-expanded={sellingOpen}
        onClick={() => setSellingOpen(!sellingOpen)}
        sx={{ ...titleStyle, width: '100%', justifyContent: 'space-between', fontSize: '1rem', fontFamily: 'inherit' }}
      >
        Selling
        {sellingOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </ButtonBase>

      {sellingOpen && (
        <List disablePadding>
          <ListItemButton component={Link} to="/selling">
            <ListItemText primary="Selling" />
          </ListItemButton>
        </List>
      )}
      </Box>
    </Box>
  );
}

export default Sidebar;
