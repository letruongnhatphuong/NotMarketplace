import { Link } from 'react-router-dom';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

// Entry point to the Sell page, shown in the site header.
function SellButton() {
  return (
    <Button
      component={Link}
      to="/sell"
      variant="contained"
      startIcon={<AddIcon />}
      sx={{
        whiteSpace: 'nowrap',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        '&:hover': { bgcolor: 'primary.dark' },
      }}
    >
      Sell an item
    </Button>
  );
}

export default SellButton;
