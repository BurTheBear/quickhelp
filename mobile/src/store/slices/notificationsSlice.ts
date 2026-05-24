import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { notificationsAPI } from '../../services/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsState {
  items: Notification[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  page: number;
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  isLoading: false,
  hasMore: false,
  page: 1,
};

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (page: number = 1) => {
    const { data } = await notificationsAPI.getAll(page);
    return data.data;
  }
);

export const fetchUnreadCount = createAsyncThunk('notifications/unreadCount', async () => {
  const { data } = await notificationsAPI.getUnreadCount();
  return data.data.count;
});

export const markRead = createAsyncThunk('notifications/markRead', async (id: string) => {
  await notificationsAPI.markRead(id).catch(() => {});
  return id;
});

export const markAllRead = createAsyncThunk('notifications/markAllRead', async () => {
  await notificationsAPI.markAllRead().catch(() => {});
});

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification(state, action: PayloadAction<Notification>) {
      state.items.unshift(action.payload);
      state.unreadCount += 1;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchNotifications.pending, (state) => { state.isLoading = true; });
    builder.addCase(fetchNotifications.fulfilled, (state, action) => {
      state.isLoading = false;
      const { notifications, unread, hasMore, page } = action.payload;
      state.items = page === 1 ? notifications : [...state.items, ...notifications];
      state.unreadCount = unread;
      state.hasMore = hasMore;
      state.page = page;
    });
    builder.addCase(fetchNotifications.rejected, (state) => { state.isLoading = false; });
    builder.addCase(fetchUnreadCount.fulfilled, (state, action) => {
      state.unreadCount = action.payload;
    });
    builder.addCase(markRead.fulfilled, (state, action) => {
      const notif = state.items.find((n) => n.id === action.payload);
      if (notif && !notif.isRead) {
        notif.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    });
    builder.addCase(markAllRead.fulfilled, (state) => {
      state.items.forEach((n) => { n.isRead = true; });
      state.unreadCount = 0;
    });
  },
});

export const { addNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;
