import {createAsyncThunk, createSlice, PayloadAction} from '@reduxjs/toolkit';
import {chatApi, ChatMessage} from '../../api/chatApi';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SupportChatMessage = ChatMessage;

export interface SupportChatState {
  chatId: string | null;
  messages: SupportChatMessage[];
  isStarting: boolean;
  isHistoryLoading: boolean;
  isSending: boolean;
  error: string | null;
}

// ─── Thunks ──────────────────────────────────────────────────────────────────

export const startSupportChat = createAsyncThunk(
  'supportChat/startSupportChat',
  async (payload: {userId?: string}, {rejectWithValue}) => {
    try {
      const response = await chatApi.startSupportChat(payload);
      return response.data?.data as {id: string; _id?: string};
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to start support chat';
      return rejectWithValue(message);
    }
  },
);

export const fetchSupportChatHistory = createAsyncThunk(
  'supportChat/fetchSupportChatHistory',
  async (chatId: string, {rejectWithValue}) => {
    try {
      const response = await chatApi.getSupportChatHistory(chatId);
      const data = response.data?.data;
      return (data?.messages ?? data?.chat ?? []) as SupportChatMessage[];
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to fetch support chat history';
      return rejectWithValue(message);
    }
  },
);

export const sendSupportMessage = createAsyncThunk(
  'supportChat/sendSupportMessage',
  async (
    {chatId, message, image}: {chatId: string; message: string; image?: string},
    {rejectWithValue},
  ) => {
    try {
      const response = await chatApi.sendMessage(chatId, message, image);
      return response.data?.data as SupportChatMessage;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to send message';
      return rejectWithValue(message);
    }
  },
);

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState: SupportChatState = {
  chatId: null,
  messages: [],
  isStarting: false,
  isHistoryLoading: false,
  isSending: false,
  error: null,
};

// ─── Slice ───────────────────────────────────────────────────────────────────

const supportChatSlice = createSlice({
  name: 'supportChat',
  initialState,
  reducers: {
    resetSupportChat() {
      return initialState;
    },
    appendSupportChatMessage(state, action: PayloadAction<SupportChatMessage>) {
      const isDuplicate = state.messages.some(
        msg =>
          (msg._id && msg._id === action.payload._id) ||
          (msg.timestamp === action.payload.timestamp &&
            msg.senderId === action.payload.senderId &&
            msg.message === action.payload.message),
      );
      if (!isDuplicate) {
        state.messages.push(action.payload);
      }
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: builder => {
    // Start Support Chat
    builder
      .addCase(startSupportChat.pending, state => {
        state.isStarting = true;
        state.error = null;
      })
      .addCase(startSupportChat.fulfilled, (state, action) => {
        state.isStarting = false;
        const payload = action.payload as any;
        state.chatId = payload?.id ?? payload?._id ?? null;
      })
      .addCase(startSupportChat.rejected, (state, action) => {
        state.isStarting = false;
        state.error = action.payload as string;
      });

    // Fetch Support Chat History
    builder
      .addCase(fetchSupportChatHistory.pending, state => {
        state.isHistoryLoading = true;
        state.error = null;
      })
      .addCase(fetchSupportChatHistory.fulfilled, (state, action) => {
        state.isHistoryLoading = false;
        const payload = action.payload as any;

        let fetchedMessages: SupportChatMessage[] = [];
        if (Array.isArray(payload)) {
          fetchedMessages = payload;
        } else if (payload && Array.isArray(payload.messages)) {
          fetchedMessages = payload.messages;
        }

        // Don't overwrite optimistic messages that are still pending
        const hasPendingOptimistic = state.messages.some(msg => msg._id?.startsWith('temp-'));

        if (hasPendingOptimistic) {
          // Only add new server messages that don't exist yet; keep optimistic ones
          for (const fetchedMsg of fetchedMessages) {
            const exists = state.messages.some(
              localMsg =>
                (localMsg._id && localMsg._id === fetchedMsg._id) ||
                (localMsg.timestamp === fetchedMsg.timestamp &&
                  localMsg.senderId === fetchedMsg.senderId &&
                  localMsg.message === fetchedMsg.message)
            );
            if (!exists) {
              state.messages.push(fetchedMsg);
            }
          }
        } else {
          const merged = [...fetchedMessages];
          for (const localMsg of state.messages) {
            const exists = fetchedMessages.some(
              fetchedMsg =>
                (fetchedMsg._id && fetchedMsg._id === localMsg._id) ||
                (fetchedMsg.timestamp === localMsg.timestamp &&
                  fetchedMsg.senderId === localMsg.senderId &&
                  fetchedMsg.message === localMsg.message)
            );
            if (!exists) {
              merged.push(localMsg);
            }
          }

          // Sort messages by timestamp
          merged.sort((a, b) => {
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeA - timeB;
          });

          state.messages = merged;
        }
      })
      .addCase(fetchSupportChatHistory.rejected, (state, action) => {
        state.isHistoryLoading = false;
        state.error = action.payload as string;
      });

    // Send Support Message
    builder
      .addCase(sendSupportMessage.pending, state => {
        state.isSending = true;
        state.error = null;
        // NOTE: Optimistic message is now added in the screen via appendSupportChatMessage
        // before this API call is dispatched, so we don't add a second temp here.
      })
      .addCase(sendSupportMessage.fulfilled, (state, action) => {
        state.isSending = false;
        const serverMsg = action.payload;
        if (!serverMsg) return;
        // Replace the temp optimistic message in-place with the confirmed server message
        const tempIndex = state.messages.findIndex(msg => msg._id?.startsWith('temp-'));
        if (tempIndex !== -1) {
          state.messages[tempIndex] = serverMsg;
        } else {
          // No temp found — push the server message if not already present
          const alreadyExists = state.messages.some(
            msg => msg._id && msg._id === serverMsg._id
          );
          if (!alreadyExists) {
            state.messages.push(serverMsg);
          }
        }
      })
      .addCase(sendSupportMessage.rejected, (state, action) => {
        state.isSending = false;
        state.error = action.payload as string;
        // Remove the temporary optimistic message if sending failed
        state.messages = state.messages.filter(msg => !msg._id?.startsWith('temp-'));
      });
  },
});

// ─── Exports ─────────────────────────────────────────────────────────────────

export const {resetSupportChat, appendSupportChatMessage, clearError} =
  supportChatSlice.actions;

export default supportChatSlice.reducer;
