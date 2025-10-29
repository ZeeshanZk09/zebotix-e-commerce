import { configureStore, Middleware } from '@reduxjs/toolkit';
import cartReducer from './features/cart/cartSlice';
import productReducer from './features/product/productSlice';
import addressReducer from './features/address/addressSlice';
import ratingReducer from './features/rating/ratingSlice';

/**
 * Toggle logs:
 * - By default logs are enabled in development.
 * - To force logs on in prod for debugging set process.env.DEBUG_REDUX === '1'
 */
const ENABLE_LOG = process.env.NODE_ENV === 'development' || process.env.DEBUG_REDUX === '1';

/**
 * Compact logger middleware:
 * - logs action type & payload
 * - logs a compact snapshot of top-level slices after the action
 * - keeps output readable and avoids huge dumps
 */
const loggerMiddleware: Middleware = (storeAPI) => (next) => (action: any) => {
  if (!ENABLE_LOG) return next(action);

  try {
    const type = action?.type ?? String(action);
    const payload = action?.payload;

    // Log action type and small payload preview
    console.groupCollapsed && console.groupCollapsed(`[redux] action ▶ ${type}`);
    console.debug('[redux] payload:', payload);

    const result = next(action);

    // After state change, show top-level slice summaries
    const state = storeAPI.getState() as any;
    const snapshot = {
      cart: {
        totalPrice: state.cart?.totalPrice,
        totalQuantity: state.cart?.totalQuantity,
        items: Object.keys(state.cart?.cartItems ?? {}).length,
      },
      product: {
        productsLoaded: Array.isArray(state.product?.list) ? state.product.list.length : 0,
      },
      address: { addresses: Array.isArray(state.address?.list) ? state.address.list.length : 0 },
      rating: { ratingSlicePresent: !!state.rating },
    };
    console.debug('[redux] state snapshot:', snapshot);

    console.groupEnd && console.groupEnd();
    return result;
  } catch (err) {
    // Never block dispatch on logger failure
    console.error('[redux][logger] error', err);
    return next(action);
  }
};

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    product: productReducer,
    address: addressReducer,
    rating: ratingReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(loggerMiddleware),
});

// For SSR-friendly patterns you may return a store instance, but here we keep the singleton
export const makeStore = () => store;

// ✅ Typed helpers
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;

export default store;
