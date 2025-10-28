import { Product } from '@/generated/prisma/browser';
import { ProductCreateInput } from '@/generated/prisma/models';
import {
  AsyncThunkConfig,
  createAsyncThunk,
  createSlice,
  GetThunkAPI,
  PayloadAction,
} from '@reduxjs/toolkit';
import axios from 'axios';

interface ProductState {
  list: any[];
}

export const fetchProducts = createAsyncThunk(
  'product/fetchProducts',
  async (storeId?: string, thunkAPI?: GetThunkAPI<AsyncThunkConfig>) => {
    try {
      const { data } = await axios.get('/api/products' + (storeId ? `?storeId=${storeId}` : ''));
      console.log('Products: ', data);

      return data.data;
    } catch (error: any) {
      return thunkAPI?.rejectWithValue(error.response.data);
    }
  }
);

const initialState: ProductState = {
  list: [],
};

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    setProduct: (state, action: PayloadAction<(Product | ProductCreateInput)[]>) => {
      state.list = action.payload;
    },
    clearProduct: (state) => {
      state.list = [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchProducts.fulfilled, (state, action) => {
      state.list = action.payload;
    });
  },
});

export const { setProduct, clearProduct } = productSlice.actions;

export default productSlice.reducer;
