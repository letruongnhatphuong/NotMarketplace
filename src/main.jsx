import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App.jsx';

const theme = createTheme({
  palette: {
    // Emerald + Cream.
    primary: { main: '#14532D', dark: '#166534', light: '#16A34A', contrastText: '#FFFFFF' },
    secondary: { main: '#F1EBDD', contrastText: '#1C2921' },
    warning: { main: '#C76B4A', contrastText: '#FFFFFF' },
    success: { main: '#15803D', contrastText: '#FFFFFF' },
    info: { main: '#D6A85F', contrastText: '#1C2921' },
    background: { default: '#F5F0E6', paper: '#FFFFFF', navbar: '#FAF8F2' },
    text: { primary: '#1C2921', secondary: '#526157' },
    divider: '#E7E2D8',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: { a: { color: '#14532D' } },
    },
    // Soft cream condition chips.
    MuiChip: {
      defaultProps: { color: 'secondary' },
      styleOverrides: {
        outlined: { color: '#1C2921', borderColor: '#7F8A82' },
      },
    },
    // White product cards with the palette's border gray.
    MuiCard: {
      styleOverrides: {
        root: { border: '1px solid #E7E2D8' },
      },
    },
    // Search / form fields: white with border gray.
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: { borderColor: '#7F8A82' },
      },
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);