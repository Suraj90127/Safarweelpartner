import {createAsyncThunk, createSlice, PayloadAction} from '@reduxjs/toolkit';
import {chatApi} from '../../api/chatApi';

export interface ChatMessage {
  id: string;
  senderType: 'rider' | 'driver';
  message: string;
  timestamp: string;
}

export interface ChatState {
  chatId: string | null;
  participantKey: string | null;
  rideKey: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

/** Normalize a raw backend message into the shape the UI expects. */
export const normalizeChatMessage = (raw: any): ChatMessage => ({
  id: raw?._id || raw?.id || String(raw?.timestamp || Date.now()),
  senderType: raw?.senderType === 'driver' ? 'driver' : 'rider',
  message: (raw?.message || '').trim(),
  timestamp: raw?.timestamp
    ? new Date(raw.timestamp).toISOString()
    : new Date().toISOString(),
});

/** Extract the raw message array from any of the known response shapes. */
export const extractRawMessages = (payload: any): any[] =>
  payload?.chat?.messages ||
  payload?.messages ||
  payload?.chat ||
  [];

export const fetchChatHistory = createAsyncThunk(
  'chat/fetchChatHistory',
  async (chatId: string, {rejectWithValue}) => {
    try {
      const response = await chatApi.getMessages(chatId);
      return response.data?.data;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch chat history';
      return rejectWithValue(message);
    }
  },
);

export const startChat = createAsyncThunk(
  'chat/startChat',
  async (
    payload: {driverId: string; userId: string; rideId?: string},
    {dispatch, rejectWithValue},
  ) => {
    const startedAt = Date.now();
    try {
      const response = await chatApi.startChat(payload);
      const data = response.data?.data || response.data;
      const chatId = data?.id || data?._id || null;
      const rawMessages = extractRawMessages(data);
      let normalizedMessages = rawMessages.map(normalizeChatMessage);

      console.log('[RideChat] startChat API duration(ms):', Date.now() - startedAt);

      // If /chat/start didn't return messages, fetch history before resolving
      // so the screen does not briefly render an empty list.
      if (chatId && normalizedMessages.length === 0) {
        try {
          const historyPayload = await dispatch(fetchChatHistory(chatId)).unwrap();
          normalizedMessages = extractRawMessages(historyPayload).map(
            normalizeChatMessage,
          );
        } catch (historyError) {
          console.warn('[RideChat] Failed to prefetch chat history in startChat:', historyError);
        }
      }

      return {
        chatId,
        participantKey: `${payload.driverId}:${payload.userId}`,
        rideKey: payload.rideId ?? null,
        messages: normalizedMessages,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to start chat';
      return rejectWithValue(message);
    }
  },
);

const initialState: ChatState = {
  chatId: null,
  participantKey: null,
  rideKey: null,
  messages: [],
  isLoading: false,
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setChatId(state, action: PayloadAction<string | null>) {
      state.chatId = action.payload;
    },
    appendChatMessage(state, action: PayloadAction<ChatMessage>) {
      if (!state.messages.some(msg => msg.id === action.payload.id)) {
        state.messages.push(action.payload);
      }
    },
    setChatMessages(state, action: PayloadAction<ChatMessage[]>) {
      state.messages = action.payload;
    },
    resetChat() {
      return initialState;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchChatHistory.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchChatHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.messages = extractRawMessages(action.payload).map(
          normalizeChatMessage,
        );
      })
      .addCase(fetchChatHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(startChat.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startChat.fulfilled, (state, action) => {
        state.isLoading = false;
        state.chatId = action.payload.chatId;
        state.participantKey = action.payload.participantKey;
        state.rideKey = action.payload.rideKey;
        state.messages = action.payload.messages;
      })
      .addCase(startChat.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {setChatId, appendChatMessage, setChatMessages, resetChat} = chatSlice.actions;
export default chatSlice.reducer;
