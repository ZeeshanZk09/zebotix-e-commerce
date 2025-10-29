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
  isLoading: boolean;
  error: string | null;
  list: any[];
}

// Toggle logging here. Defaults to true in development.
const ENABLE_LOG = process.env.NODE_ENV === 'development';

function debug(...args: any[]) {
  if (ENABLE_LOG) {
    console.log('[productSlice]', ...args);
  }
}

export const fetchProducts = createAsyncThunk(
  'product/fetchProducts',
  async (storeId?: string, thunkAPI?: GetThunkAPI<AsyncThunkConfig>) => {
    try {
      debug('fetchProducts: starting', { storeId });
      const url = '/api/products' + (storeId ? `?storeId=${storeId}` : '');
      const res = await axios.get(url);
      debug('fetchProducts: response received', res?.data);
      const payload = res.data?.data ?? [];
      debug(
        'fetchProducts: normalized payload length',
        Array.isArray(payload) ? payload.length : 'non-array'
      );
      return payload;
    } catch (error: any) {
      debug('fetchProducts: error', error?.message ?? error);
      return thunkAPI?.rejectWithValue(
        error?.response?.data ?? { message: error?.message ?? 'Unknown' }
      );
    }
  }
);

const initialState: ProductState = {
  isLoading: true,
  error: null,
  list: [],
};

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    setProduct: (state, action: PayloadAction<(Product | ProductCreateInput)[]>) => {
      debug('reducer setProduct called', { length: action.payload?.length ?? 0 });
      state.list = action.payload;
    },
    clearProduct: (state) => {
      debug('reducer clearProduct called');
      state.list = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (_state, _action) => {
        _state.isLoading = true;
        _state.error = null;
        debug('extraReducer fetchProducts.pending');
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        debug('extraReducer fetchProducts.fulfilled', {
          payloadLength: action.payload?.length ?? 0,
        });
        state.isLoading = false;
        state.error = null;
        state.list = action.payload ?? [];
      })
      .addCase(fetchProducts.rejected, (state, action: any) => {
        debug('extraReducer fetchProducts.rejected', { error: action.payload ?? action.error });
        state.isLoading = false;
        state.error = action.payload?.message ?? 'Unknown';
      });
  },
});

export const { setProduct, clearProduct } = productSlice.actions;

export default productSlice.reducer;
