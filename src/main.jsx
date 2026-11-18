import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App.jsx';

const theme = createTheme({
  palette: {
    // Retail palette: maroon header, green buy actions, near-black text.
    primary: { main: '#8C1D2F', contrastText: '#FFF7F2' },
    secondary: { main: '#1E7A46', contrastText: '#FFFFFF' },
    warning: { main: '#F7E4DF', contrastText: '#6B1620' },
    success: { main: '#1E7A46', contrastText: '#FFFFFF' },
    background: { default: '#FFFBF9', paper: '#FFFFFF' },
    text: { primary: '#1A1414' },
  },
  components: {
    MuiChip: { defaultProps: { color: 'warning' } },
    // Maroon strip across the top of every card.
    MuiCard: {
      styleOverrides: {
        root: { borderTop: '4px solid #8C1D2F' },
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