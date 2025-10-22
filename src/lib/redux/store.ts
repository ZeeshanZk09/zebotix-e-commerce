import { configureStore } from '@reduxjs/toolkit';
import cartReducer from './features/cart/cartSlice';
import productReducer from './features/product/productSlice';
import addressReducer from './features/address/addressSlice';
import ratingReducer from './features/rating/ratingSlice';

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    product: productReducer,
    address: addressReducer,
    rating: ratingReducer,
  },
});

export const makeStore = () => store;

// ✅ Typed hooks and helpers
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;

export default store;
