import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Address } from '@/generated/prisma/browser';

interface AddressState {
  list: Address[];
}

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
});

export const { addAddress, removeAddress, clearAddresses } = addressSlice.actions;

export default addressSlice.reducer;
