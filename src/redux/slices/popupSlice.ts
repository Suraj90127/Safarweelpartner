import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { popupApi, PopupData } from '../../api/popupApi';
import ENV from '../../config/env';
import logger from '../../utils/logger';

const TAG = 'popupSlice';

export interface PopupState {
  popup: PopupData | null;
  imageUrl: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: PopupState = {
  popup: null,
  imageUrl: null,
  loading: false,
  error: null,
};

export const fetchPopupThunk = createAsyncThunk(
  'popup/fetchPopup',
  async (status: string | undefined = 'active', { rejectWithValue }) => {
    try {
      const response = await popupApi.getPopup(status);
      const popupData = response?.data;

      if (popupData && popupData.status === 'active' && popupData.image) {
        let imgUrl = popupData.image;
        if (!imgUrl.startsWith('http://') && !imgUrl.startsWith('https://')) {
          const baseUrl = ENV.API_BASE_URL.replace(/\/api\/?$/, '');
          imgUrl = `${baseUrl}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
        }
        logger.info(TAG, 'Popup image fetched successfully:', imgUrl);
        return {
          popup: popupData,
          imageUrl: imgUrl,
        };
      }

      return {
        popup: popupData || null,
        imageUrl: null,
      };
    } catch (error: any) {
      logger.error(TAG, 'Failed to fetch popup image:', error);
      return rejectWithValue(
        error?.response?.data?.message || error?.message || 'Failed to fetch popup'
      );
    }
  }
);

const popupSlice = createSlice({
  name: 'popup',
  initialState,
  reducers: {
    clearPopup: (state) => {
      state.popup = null;
      state.imageUrl = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPopupThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchPopupThunk.fulfilled,
        (
          state,
          action: PayloadAction<{ popup: PopupData | null; imageUrl: string | null }>
        ) => {
          state.loading = false;
          state.popup = action.payload.popup;
          state.imageUrl = action.payload.imageUrl;
        }
      )
      .addCase(fetchPopupThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearPopup } = popupSlice.actions;
export default popupSlice.reducer;
