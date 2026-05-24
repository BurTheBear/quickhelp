import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: string;
  content: string;
  imageUrl?: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    profile: { displayName: string; avatarUrl: string | null } | null;
  };
}

interface ChatState {
  conversations: Record<string, {
    messages: Message[];
    isLoading: boolean;
    hasMore: boolean;
    nextCursor?: string;
  }>;
  totalUnread: number;
}

const initialState: ChatState = {
  conversations: {},
  totalUnread: 0,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    initConversation(state, action: PayloadAction<{ requestId: string }>) {
      if (!state.conversations[action.payload.requestId]) {
        state.conversations[action.payload.requestId] = {
          messages: [],
          isLoading: false,
          hasMore: false,
        };
      }
    },
    setMessages(
      state,
      action: PayloadAction<{
        requestId: string;
        messages: Message[];
        hasMore: boolean;
        nextCursor?: string;
      }>
    ) {
      const { requestId, messages, hasMore, nextCursor } = action.payload;
      if (!state.conversations[requestId]) {
        state.conversations[requestId] = { messages: [], isLoading: false, hasMore: false };
      }
      state.conversations[requestId].messages = messages;
      state.conversations[requestId].hasMore = hasMore;
      state.conversations[requestId].nextCursor = nextCursor;
    },
    prependMessages(
      state,
      action: PayloadAction<{ requestId: string; messages: Message[]; nextCursor?: string }>
    ) {
      const { requestId, messages, nextCursor } = action.payload;
      if (state.conversations[requestId]) {
        state.conversations[requestId].messages = [
          ...messages,
          ...state.conversations[requestId].messages,
        ];
        state.conversations[requestId].nextCursor = nextCursor;
        state.conversations[requestId].hasMore = !!nextCursor;
      }
    },
    addMessage(state, action: PayloadAction<{ requestId: string; message: Message }>) {
      const { requestId, message } = action.payload;
      if (!state.conversations[requestId]) {
        state.conversations[requestId] = { messages: [message], isLoading: false, hasMore: false };
      } else {
        // Avoid duplicates
        const exists = state.conversations[requestId].messages.some((m) => m.id === message.id);
        if (!exists) {
          state.conversations[requestId].messages.push(message);
        }
      }
    },
    setTotalUnread(state, action: PayloadAction<number>) {
      state.totalUnread = action.payload;
    },
  },
});

export const { initConversation, setMessages, prependMessages, addMessage, setTotalUnread } =
  chatSlice.actions;
export default chatSlice.reducer;
