import { Link } from 'react-router-dom';
import { Box, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

// Entry point to the Sell page, shown in the site header.
function SellButton() {
  return (
    <Button
      component={Link}
      to="/sell"
      variant="contained"
      aria-label="Sell an item"
      startIcon={<AddIcon />}
      sx={{
        whiteSpace: 'nowrap',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        '&:hover': { bgcolor: 'primary.dark' },
      }}
    >
      Sell
      <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, whiteSpace: 'pre' }}> an item</Box>
    </Button>
  );
}

export default SellButton;
