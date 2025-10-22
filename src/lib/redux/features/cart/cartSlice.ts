import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OrderItem } from '@/generated/prisma/browser';

type CartItem = OrderItem & {
  quantity: number;
};

interface CartState {
  total: number;
  cartItems: Record<string, CartItem>;
}

const initialState: CartState = {
  total: 0,
  cartItems: {},
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<{ productId: string; item?: OrderItem }>) => {
      const { productId, item } = action.payload;

      if (state.cartItems[productId]) {
        state.cartItems[productId].quantity += 1;
      } else {
        state.cartItems[productId] = { ...item, quantity: 1 };
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
