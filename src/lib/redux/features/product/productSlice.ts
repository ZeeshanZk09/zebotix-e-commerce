import { Product } from '@/generated/prisma/browser';
import { ProductCreateInput } from '@/generated/prisma/models';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ProductState {
  list: Product[];
}

const initialState: ProductState = {
  list: [],
};
const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    setProduct: (state: ProductState, action: PayloadAction<ProductCreateInput[]>) => {
      state.list = action.payload;
    },
    clearProduct: (state: ProductState) => {
      state.list = [];
    },
  },
});

export const { setProduct, clearProduct } = productSlice.actions;

export default productSlice.reducer;
