import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Address } from '@/generated/prisma/browser';
import axios from 'axios';

interface AddressState {
  list: Address[];
}

// Toggle logging here. Defaults to true in development.
const ENABLE_LOG = process.env.NODE_ENV === 'development';

function debug(...args: any[]) {
  if (ENABLE_LOG) {
    // easy to grep
    console.log('[addressSlice]', ...args);
  }
}

export const fetchAddress = createAsyncThunk(
  'address/fetchAddress',
  async (getToken: any, thunkAPI) => {
    try {
      debug('fetchAddress: start');
      const token = typeof getToken === 'function' ? await getToken() : undefined;
      debug('fetchAddress: token present?', !!token);

      const res = await axios.get<{ data: Address[] }>('/api/address', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      debug('fetchAddress: response received', res?.data);
      const data = res.data?.data ?? [];
      debug('fetchAddress: normalized data length', data.length);

      return data;
    } catch (error: any) {
      debug('fetchAddress: error', error?.message ?? error);
      return thunkAPI.rejectWithValue(
        error?.response?.data ?? { message: error?.message ?? 'Unknown' }
      );
    }
  }
);

const initialState: AddressState = {
  list: [] as Address[],
};

const addressSlice = createSlice({
  name: 'address',
  initialState,
  reducers: {
    addAddress: (state: AddressState, action: PayloadAction<Address>) => {
      debug('reducer addAddress called', action.payload);
      state.list.push(action.payload);
      debug('reducer addAddress: new length', state.list.length);
    },
    removeAddress: (state: AddressState, action: PayloadAction<{ id: string }>) => {
      debug('reducer removeAddress called', action.payload);
      const before = state.list.length;
      state.list = state.list.filter((addr) => addr.id !== action.payload.id);
      debug(
        'reducer removeAddress: removed?',
        before !== state.list.length,
        'new length',
        state.list.length
      );
    },
    clearAddresses: (state: AddressState) => {
      debug('reducer clearAddresses called (clearing all addresses)');
      state.list = [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchAddress.fulfilled, (state, action) => {
      debug('extraReducer fetchAddress.fulfilled', { payloadLength: action.payload?.length ?? 0 });
      state.list = action.payload ?? [];
    });
    builder.addCase(fetchAddress.rejected, (state, action) => {
      debug('extraReducer fetchAddress.rejected', action.payload ?? action.error);
      // keep existing state on failure
    });
    builder.addCase(fetchAddress.pending, () => {
      debug('extraReducer fetchAddress.pending');
    });
  },
});

export const { addAddress, removeAddress, clearAddresses } = addressSlice.actions;

export default addressSlice.reducer;
