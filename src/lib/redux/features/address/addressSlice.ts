import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Address } from '@/generated/prisma/browser';
import axios from 'axios';

interface AddressState {
  list: Address[];
}

export const fetchAddress = createAsyncThunk(
  'address/fetchAddress',
  async (getToken: any, thunkAPI) => {
    try {
      const token = typeof getToken === 'function' ? await getToken() : undefined;
      const res = await axios.get<{ data: Address[] }>('/api/address', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return res.data.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response.data);
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
      state.list.push(action.payload);
    },
    removeAddress: (state: AddressState, action: PayloadAction<{ id: string }>) => {
      state.list = state.list.filter((addr) => addr.id !== action.payload.id);
    },
    clearAddresses: (state: AddressState) => {
      state.list = [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchAddress.fulfilled, (state, action) => {
      state.list = action.payload;
    });
  },
});

export const { addAddress, removeAddress, clearAddresses } = addressSlice.actions;

export default addressSlice.reducer;
