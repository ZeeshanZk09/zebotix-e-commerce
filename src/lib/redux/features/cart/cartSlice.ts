import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OrderItem } from '@/generated/prisma/browser';
import { ProductCreateInput } from '@/generated/prisma/models';
import { Product } from '@/generated/prisma/client';
import axios from 'axios';

type CartItem = Partial<OrderItem> & {
  quantity: number;
};

interface CartState {
  isLoading: boolean;
  totalPrice: number;
  totalQuantity: number;
  cartItems: { [productId: string]: CartItem };
}

// Toggle logging here. Defaults to true in development.
const ENABLE_LOG = process.env.NODE_ENV === 'development';

function debug(...args: any[]) {
  if (ENABLE_LOG) {
    // prefix so it's easy to grep
    console.log('[cartSlice]', ...args);
  }
}

// small helper to compute totals from cartItems
function computeTotals(cartItems: CartState['cartItems']) {
  const values = Object.values(cartItems || {});
  const totalPrice = values.reduce((sum, it) => {
    const price = Number(it?.price ?? 0);
    const qty = Number(it?.quantity ?? 0);
    return sum + price * qty;
  }, 0);
  const totalQuantity = values.reduce((sum, it) => sum + (Number(it?.quantity ?? 0) || 0), 0);

  debug('computeTotals ->', { totalPrice, totalQuantity, itemsCount: values.length });
  return { totalPrice, totalQuantity };
}

/**
 * fetchCart thunk
 */
export const fetchCart = createAsyncThunk('cart/fetchCart', async (getToken: any, thunkAPI) => {
  try {
    debug('fetchCart: starting');
    const token = typeof getToken === 'function' ? await getToken() : undefined;
    debug('fetchCart: token present?', !!token);

    const res = await axios.get('/api/cart', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    debug('fetchCart: raw response', res?.data);

    const serverData = res.data?.data ?? {};

    let keyed: { [k: string]: CartItem } = {};

    if (Array.isArray(serverData)) {
      serverData.forEach((it: any) => {
        if (!it) return;
        const id = it.productId ?? it.id;
        if (!id) return;
        keyed[id] = { ...(it as CartItem), quantity: Number(it.quantity ?? 1) };
      });
    } else if (serverData && typeof serverData === 'object') {
      const maybeKeys = Object.keys(serverData);
      const looksKeyed =
        maybeKeys.length > 0 &&
        typeof serverData[maybeKeys[0]] === 'object' &&
        !!serverData[maybeKeys[0]].id;

      if (looksKeyed) {
        for (const [k, v] of Object.entries(serverData)) {
          keyed[k] = { ...(v as CartItem), quantity: Number((v as any).quantity ?? 1) };
        }
      } else if (serverData.cartItems) {
        const ci = serverData.cartItems;
        if (Array.isArray(ci)) {
          ci.forEach((it: any) => {
            if (!it) return;
            const id = it.productId ?? it.id;
            if (!id) return;
            keyed[id] = { ...(it as CartItem), quantity: Number(it.quantity ?? 1) };
          });
        } else if (ci && typeof ci === 'object') {
          for (const [k, v] of Object.entries(ci)) {
            keyed[k] = { ...(v as CartItem), quantity: Number((v as any).quantity ?? 1) };
          }
        }
      }
    }

    debug('fetchCart: normalized keyed object', keyed);
    return { cartItems: keyed };
  } catch (err: any) {
    debug('fetchCart: error', err?.message ?? err);
    return thunkAPI.rejectWithValue(err?.response?.data ?? { message: err?.message ?? 'Unknown' });
  }
});

/**
 * uploadCart thunk
 */
export const uploadCart = createAsyncThunk('cart/uploadCart', async (getToken: any, thunkAPI) => {
  try {
    debug('uploadCart: starting');
    const token = typeof getToken === 'function' ? await getToken() : undefined;
    const { cartItems } = (thunkAPI.getState() as any).cart;
    debug('uploadCart: sending', { itemsCount: Object.keys(cartItems ?? {}).length });

    const res = await axios.post(
      '/api/cart',
      {
        cart: cartItems,
      },
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    );

    debug('uploadCart: response', res?.data);
    return { cartItems };
  } catch (err: any) {
    debug('uploadCart: error', err?.message ?? err);
    return thunkAPI.rejectWithValue(err?.response?.data ?? { message: err?.message ?? 'Unknown' });
  }
});

const initialState: CartState = {
  isLoading: true,
  totalPrice: 0,
  totalQuantity: 0,
  cartItems: {},
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (
      state,
      action: PayloadAction<{ productId: string; item?: OrderItem | ProductCreateInput | Product }>
    ) => {
      const { productId, item } = action.payload;
      debug('reducer addToCart called', { productId, itemProvided: !!item });
      if (state.cartItems[productId]) {
        state.cartItems[productId].quantity += 1;
        debug('addToCart: incremented', { productId, newQty: state.cartItems[productId].quantity });
      } else {
        state.cartItems[productId] = { ...(item ?? { productId }), quantity: 1 } as CartItem;
        debug('addToCart: created new', { productId, entry: state.cartItems[productId] });
      }

      const totals = computeTotals(state.cartItems);
      state.totalPrice = totals.totalPrice;
      state.totalQuantity = totals.totalQuantity;
      debug('addToCart: totals updated', {
        totalPrice: state.totalPrice,
        totalQuantity: state.totalQuantity,
      });
    },

    removeFromCart: (state, action: PayloadAction<{ productId: string }>) => {
      const { productId } = action.payload;
      debug('reducer removeFromCart called', { productId });
      const existingItem = state.cartItems[productId];
      if (!existingItem) {
        debug('removeFromCart: no existing item', { productId });
        return;
      }

      if (existingItem.quantity > 1) {
        existingItem.quantity -= 1;
        debug('removeFromCart: decremented', { productId, newQty: existingItem.quantity });
      } else {
        delete state.cartItems[productId];
        debug('removeFromCart: deleted item', { productId });
      }

      const totals = computeTotals(state.cartItems);
      state.totalPrice = totals.totalPrice;
      state.totalQuantity = totals.totalQuantity;
      debug('removeFromCart: totals updated', {
        totalPrice: state.totalPrice,
        totalQuantity: state.totalQuantity,
      });
    },

    deleteItemFromCart: (state, action: PayloadAction<{ productId: string }>) => {
      const { productId } = action.payload;
      debug('reducer deleteItemFromCart called', { productId });
      delete state.cartItems[productId];
      const totals = computeTotals(state.cartItems);
      state.totalPrice = totals.totalPrice;
      state.totalQuantity = totals.totalQuantity;
      debug('deleteItemFromCart: totals updated', {
        totalPrice: state.totalPrice,
        totalQuantity: state.totalQuantity,
      });
    },

    clearCart: (state) => {
      debug('reducer clearCart called');
      state.cartItems = {};
      state.totalPrice = 0;
      state.totalQuantity = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state, action) => {
        state.isLoading = true;
        debug('extraReducer fetchCart.pending');
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.isLoading = false;
        debug('extraReducer fetchCart.fulfilled', { payload: action.payload });
        const payload = action.payload ?? { cartItems: {} as CartState['cartItems'] };
        const incoming = payload.cartItems ?? {};

        const hasIncoming = Object.keys(incoming).length > 0;
        const hasExisting = Object.keys(state.cartItems ?? {}).length > 0;

        if (!hasIncoming && hasExisting) {
          debug('fetchCart.fulfilled: incoming empty, keeping existing client cart');
          return;
        }

        state.cartItems = incoming;
        const totals = computeTotals(state.cartItems);
        state.totalPrice = totals.totalPrice;
        state.totalQuantity = totals.totalQuantity;
        debug('fetchCart.fulfilled: state replaced with server cart', {
          totalPrice: state.totalPrice,
          totalQuantity: state.totalQuantity,
        });
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.isLoading = false;
        debug('extraReducer fetchCart.rejected', { error: action.payload ?? action.error });
      })
      .addCase(uploadCart.pending, (state, action) => {
        state.isLoading = true;
        debug('extraReducer uploadCart.pending');
      })
      .addCase(uploadCart.fulfilled, (state, action) => {
        state.isLoading = false;
        debug('extraReducer uploadCart.fulfilled', { payload: action.payload });
        const payload = action.payload ?? { cartItems: {} as CartState['cartItems'] };
        const incoming = payload.cartItems ?? {};

        const hasIncoming = Object.keys(incoming).length > 0;
        const hasExisting = Object.keys(state.cartItems ?? {}).length > 0;

        if (!hasIncoming && hasExisting) {
          debug('uploadCart.fulfilled: incoming empty, keeping existing client cart');
          return;
        }

        state.cartItems = incoming;
        const totals = computeTotals(state.cartItems);
        state.totalPrice = totals.totalPrice;
        state.totalQuantity = totals.totalQuantity;
        debug('uploadCart.fulfilled: state updated from server', {
          totalPrice: state.totalPrice,
          totalQuantity: state.totalQuantity,
        });
      });
  },
});

export const { addToCart, removeFromCart, clearCart, deleteItemFromCart } = cartSlice.actions;

export default cartSlice.reducer;

export const selectCartItem = (state: { cart: CartState }, productId: string) => {
  const item = state.cart.cartItems[productId];
  debug('selector selectCartItem', { productId, item });
  return item;
};

export const selectCartItemQuantity = (state: { cart: CartState }, productId: string) => {
  const qty = state.cart.cartItems[productId]?.quantity ?? 0;
  debug('selector selectCartItemQuantity', { productId, qty });
  return qty;
};

// returns keyed object { [productId]: CartItem }
export const selectCartItems = (state: { cart: CartState }) => {
  debug('selector selectCartItems', { cartItems: state.cart.cartItems });
  return state.cart.cartItems;
};

// number of distinct products in cart (existing)
export const selectCartItemsCount = (state: { cart: CartState }) => {
  const count = Object.keys(state.cart.cartItems ?? {}).length;
  debug('selector selectCartItemsCount', { count });
  return count;
};

// total quantity across all items (sum of quantities) — simple version
export const selectCartTotalQuantity = (state?: { cart: CartState }) => {
  const totalQty = Object.values(state?.cart.cartItems ?? {}).reduce(
    (total, item) => total + (Number(item?.quantity ?? 0) || 0),
    0
  );
  debug('selector selectCartTotalQuantity', { totalQty });
  return totalQty;
};

// total price (safe)
export const selectCartTotalPrice = (state: { cart: CartState }) => {
  const totalPrice = Object.values(state.cart.cartItems ?? {}).reduce(
    (total, item) => total + (Number(item?.price ?? 0) || 0) * (Number(item?.quantity ?? 0) || 0),
    0
  );
  debug('selector selectCartTotalPrice', { totalPrice });
  return totalPrice;
};
