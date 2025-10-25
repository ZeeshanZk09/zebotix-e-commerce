import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OrderItem } from '@/generated/prisma/browser';
import { ProductCreateInput } from '@/generated/prisma/models';
import { Product } from '@/generated/prisma/client';

type CartItem = Partial<OrderItem> & {
  quantity: number;
};

interface CartState {
  total: number;
  cartItems: { [productId: string]: CartItem };
}

const initialState: CartState = {
  total: 0,
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
        // avoid spreading undefined; provide a minimal fallback when item is not supplied
        state.cartItems[productId] = { ...(item ?? { productId }), quantity: 1 };
      }

      state.total += 1;
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

      state.total = Math.max(state.total - 1, 0);
    },

    deleteItemFromCart: (state, action: PayloadAction<{ productId: string }>) => {
      const { productId } = action.payload;
      const quantity = state.cartItems[productId]?.quantity ?? 0;

      state.total = Math.max(state.total - quantity, 0);
      delete state.cartItems[productId];
    },

    clearCart: (state) => {
      state.cartItems = {};
      state.total = 0;
    },
  },
});

export const { addToCart, removeFromCart, clearCart, deleteItemFromCart } = cartSlice.actions;

export default cartSlice.reducer;

export type { CartItem };

export const selectCartItems = (state: { cart: CartState }) => state.cart.cartItems;
export const selectCartTotal = (state: { cart: CartState }) => state.cart.total;

export const selectCartItem = (state: { cart: CartState }, productId: string) =>
  state.cart.cartItems[productId];

export const selectCartItemQuantity = (state: { cart: CartState }, productId: string) =>
  state.cart.cartItems[productId]?.quantity ?? 0;

export const selectCartItemsCount = (state: { cart: CartState }) =>
  Object.keys(state.cart.cartItems).length;

export const selectCartTotalCount = (state: { cart: CartState }) =>
  Object.values(state.cart.cartItems).reduce((total, item) => total + item.quantity, 0);

export const selectCartTotalPrice = (state: { cart: CartState }) =>
  Object.values(state.cart.cartItems).reduce(
    (total, item) => total + item.price! * item.quantity,
    0
  );

export const selectCartTotalQuantity = (state: { cart: CartState }) =>
  Object.values(state.cart.cartItems).reduce((total, item) => total + item.quantity, 0);
