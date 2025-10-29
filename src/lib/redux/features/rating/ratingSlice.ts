import { Rating } from '@/generated/prisma/browser';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

type RatingState = {
  ratings: Rating[];
};

export const fetchRatings = createAsyncThunk(
  'rating/fetchRatings',
  async (getToken: any, thunkAPI) => {
    try {
      const token = await getToken();
      const response = await axios.get('/api/rating', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data ?? [];
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

const initialState: RatingState = {
  ratings: [],
};

const ratingSlice = createSlice({
  name: 'rating',
  initialState,
  reducers: {
    addRating: (state: RatingState, action: PayloadAction<Rating>) => {
      state.ratings.push(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchRatings.fulfilled, (state, action) => {
      state.ratings = action.payload;
    });
  },
});

export const { addRating } = ratingSlice.actions;

export default ratingSlice.reducer;
