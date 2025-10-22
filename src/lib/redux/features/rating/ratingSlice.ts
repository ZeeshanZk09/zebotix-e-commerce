import { Rating } from '@/generated/prisma/browser';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type RatingState = {
  ratings: Rating[];
};

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
});

export const { addRating } = ratingSlice.actions;

export default ratingSlice.reducer;
