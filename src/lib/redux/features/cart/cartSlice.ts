import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OrderItem } from '@/generated/prisma/browser';
import { ProductCreateInput } from '@/generated/prisma/models';
import { Product } from '@/generated/prisma/client';
import axios from 'axios';

type CartItem = Partial<OrderItem> & {
  quantity: number;
};

interface CartState {
  // explicit totals
  totalPrice: number;
  totalQuantity: number;
  // items keyed by productId
  cartItems: { [productId: string]: CartItem };
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
  return { totalPrice, totalQuantity };
}

/**
 * fetchCart thunk: first arg can be a `getToken` function if you dispatch like fetchCart(getToken)
 * or null/undefined — this preserves your calling style.
 */
export const fetchCart = createAsyncThunk('cart/fetchCart', async (getToken: any, thunkAPI) => {
  try {
    const token = typeof getToken === 'function' ? await getToken() : undefined;
    const res = await axios.get('/api/cart', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    // DEBUG: uncomment while troubleshooting
    // console.log('fetchCart res.data:', res.data);

    // res.data.data could be:
    // - a keyed object: { "<productId>": { ... }, ... }
    // - an array: [{ productId, ... }, ...]
    // - wrapped in other shapes. Normalize safely.
    const serverData = res.data?.data ?? {};

    let keyed: { [k: string]: CartItem } = {};

    if (Array.isArray(serverData)) {
      // API returned array of items
      serverData.forEach((it: any) => {
        if (!it) return;
        const id = it.productId ?? it.id;
        if (!id) return;
        keyed[id] = { ...(it as CartItem), quantity: Number(it.quantity ?? 1) };
      });
    } else if (serverData && typeof serverData === 'object') {
      // API returned an object — assume it's already keyed by productId OR it's a wrapper with keys
      // If the keys look like productIds, use them; otherwise, try to extract nested cartItems
      const maybeKeys = Object.keys(serverData);
      const looksKeyed =
        maybeKeys.length > 0 &&
        typeof serverData[maybeKeys[0]] === 'object' &&
        !!serverData[maybeKeys[0]].id;

      if (looksKeyed) {
        // already keyed: copy and normalize quantity
        for (const [k, v] of Object.entries(serverData)) {
          keyed[k] = { ...(v as CartItem), quantity: Number((v as any).quantity ?? 1) };
        }
      } else if (serverData.cartItems) {
        // server wrapped data: { cartItems: { ... } } or { cartItems: [ ... ] }
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
      // otherwise keyed remains empty (safe)
    }

    return { cartItems: keyed };
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err?.response?.data ?? { message: err?.message ?? 'Unknown' });
  }
});

/**
 * uploadCart — debounce style uploading to server (keeps your pattern)
 * I changed minimal bits to avoid using setTimeout uncovered by async returns.
 */
export const uploadCart = createAsyncThunk('cart/uploadCart', async (getToken: any, thunkAPI) => {
  try {
    // small debounce: caller can call uploadCart many times but we only send once per window
    // Note: this pattern returns nothing useful to reducer; you can adapt as needed.
    // We'll perform upload immediately here (no setTimeout), or you can implement debounce outside.
    const token = typeof getToken === 'function' ? await getToken() : undefined;
    const { cartItems } = (thunkAPI.getState() as any).cart;

    await axios.post(
      '/api/cart',
      {
        cart: cartItems,
      },
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    );

    // Optionally return server shape if API responds with updated cart
    return { cartItems };
  } catch (err: any) {
    return thunkAPI.rejectWithValue(err?.response?.data ?? { message: err?.message ?? 'Unknown' });
  }
});
const initialState: CartState = {
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
      if (state.cartItems[productId]) {
        state.cartItems[productId].quantity += 1;
      } else {
        // put a minimal object; ensure quantity present
        state.cartItems[productId] = { ...(item ?? { productId }), quantity: 1 } as CartItem;
      }

      // recompute totals for safety
      const totals = computeTotals(state.cartItems);
      state.totalPrice = totals.totalPrice;
      state.totalQuantity = totals.totalQuantity;
    },

    removeFromCart: (state, action: PayloadAction<{ productId: string }>) => {
      const { productId } = action.payload;
      const existingItem = state.cartItems[productId];
      if (!existingItem) return;

      if (existingItem.quantity > 1) {
        existingItem.quantity -= 1;
      } else {
        delete state.cartItems[productId];
      }

      const totals = computeTotals(state.cartItems);
      state.totalPrice = totals.totalPrice;
      state.totalQuantity = totals.totalQuantity;
    },

    deleteItemFromCart: (state, action: PayloadAction<{ productId: string }>) => {
      const { productId } = action.payload;
      delete state.cartItems[productId];
      const totals = computeTotals(state.cartItems);
      state.totalPrice = totals.totalPrice;
      state.totalQuantity = totals.totalQuantity;
    },

    clearCart: (state) => {
      state.cartItems = {};
      state.totalPrice = 0;
      state.totalQuantity = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.fulfilled, (state, action) => {
        const payload = action.payload ?? { cartItems: {} as CartState['cartItems'] };
        const incoming = payload.cartItems ?? {};

        // If server returned nothing but we already have a client cart, keep existing
        const hasIncoming = Object.keys(incoming).length > 0;
        const hasExisting = Object.keys(state.cartItems ?? {}).length > 0;

        if (!hasIncoming && hasExisting) {
          // keep existing cart (don't overwrite with empty)
          return;
        }

        state.cartItems = incoming;
        const totals = computeTotals(state.cartItems);
        state.totalPrice = totals.totalPrice;
        state.totalQuantity = totals.totalQuantity;
      })
      .addCase(fetchCart.rejected, (state) => {
        // on network error, keep existing cart; do not clear
      })
      .addCase(uploadCart.fulfilled, (state, action) => {
        const payload = action.payload ?? { cartItems: {} as CartState['cartItems'] };
        const incoming = payload.cartItems ?? {};

        // same safety guard on upload: if server returned empty but client has items, keep client
        const hasIncoming = Object.keys(incoming).length > 0;
        const hasExisting = Object.keys(state.cartItems ?? {}).length > 0;

        if (!hasIncoming && hasExisting) {
          return;
        }

        state.cartItems = incoming;
        const totals = computeTotals(state.cartItems);
        state.totalPrice = totals.totalPrice;
        state.totalQuantity = totals.totalQuantity;
      });
  },
});

export const { addToCart, removeFromCart, clearCart, deleteItemFromCart } = cartSlice.actions;

export default cartSlice.reducer;

export const selectCartItem = (state: { cart: CartState }, productId: string) =>
  state.cart.cartItems[productId];
export const selectCartItemQuantity = (state: { cart: CartState }, productId: string) =>
  state.cart.cartItems[productId]?.quantity ?? 0;

// returns keyed object { [productId]: CartItem }
export const selectCartItems = (state: { cart: CartState }) => state.cart.cartItems;

// number of distinct products in cart (existing)
export const selectCartItemsCount = (state: { cart: CartState }) =>
  Object.keys(state.cart.cartItems ?? {}).length;

// total quantity across all items (sum of quantities) — simple version
export const selectCartTotalQuantity = (state: { cart: CartState }) => {
  console.log('state.cart', state.cart);
  return Object.values(state.cart.cartItems ?? {}).reduce(
    (total, item) => total + (Number(item?.quantity ?? 0) || 0),
    0
  );
};

// total price (safe)
export const selectCartTotalPrice = (state: { cart: CartState }) =>
  Object.values(state.cart.cartItems ?? {}).reduce(
    (total, item) => total + (Number(item?.price ?? 0) || 0) * (Number(item?.quantity ?? 0) || 0),
    0
  );
