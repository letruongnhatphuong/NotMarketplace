import { createContext } from "react";

// Shares the favourites (heart icon) list with the Marketplace, Favourites page and Navbar.
const FavouritesContext = createContext({
  favouriteIds: [],
  isFavourite: () => false,
  toggleFavourite: () => {},
  removeFavourites: () => {},
});

export default FavouritesContext;
