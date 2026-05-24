import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { requestsAPI } from '../../services/api';

export interface HelpRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  status: string;
  estimatedMinutes: number;
  rewardPoints: number;
  latitude: number;
  longitude: number;
  address?: string;
  distance?: number;
  createdAt: string;
  expiresAt?: string | null;
  author: {
    id: string;
    verificationLevel: string;
    profile: {
      displayName: string;
      avatarUrl: string | null;
      avgRating: number;
      tasksCompleted: number;
    } | null;
    gamification: { level: number; levelName: string } | null;
  };
  images: Array<{ id: string; url: string; thumbnailUrl: string | null }>;
  _count: { matches: number };
}

interface FeedMeta {
  total: number;
  page: number;
  hasMore: boolean;
}

interface RequestsState {
  feed: HelpRequest[];
  feedMeta: FeedMeta;
  mapRequests: HelpRequest[];
  myRequests: HelpRequest[];
  selectedRequest: HelpRequest | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  error: string | null;
  filters: {
    category?: string;
    urgency?: string;
    radius: number;
    sort: 'distance' | 'newest' | 'urgency' | 'points';
  };
}

const initialState: RequestsState = {
  feed: [],
  feedMeta: { total: 0, page: 1, hasMore: false },
  mapRequests: [],
  myRequests: [],
  selectedRequest: null,
  isLoading: false,
  isRefreshing: false,
  isLoadingMore: false,
  error: null,
  filters: { radius: 10, sort: 'distance' },
};

export const fetchFeed = createAsyncThunk(
  'requests/fetchFeed',
  async (
    params: { lat?: number; lng?: number; page?: number; refresh?: boolean } & Record<string, unknown>,
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { requests: RequestsState };
      const { filters } = state.requests;
      const { data } = await requestsAPI.getFeed({
        ...filters,
        ...params,
        page: params.page ?? 1,
      });
      return { ...data.data, refresh: params.refresh };
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(error.response?.data?.error ?? 'Failed to load feed');
    }
  }
);

export const fetchMapRequests = createAsyncThunk(
  'requests/fetchMapRequests',
  async (bounds: { north: number; south: number; east: number; west: number }, { rejectWithValue }) => {
    try {
      const { data } = await requestsAPI.getMapRequests(bounds);
      return data.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(error.response?.data?.error ?? 'Failed to load map');
    }
  }
);

export const fetchRequestById = createAsyncThunk(
  'requests/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await requestsAPI.getById(id);
      return data.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(error.response?.data?.error ?? 'Request not found');
    }
  }
);

export const createRequest = createAsyncThunk(
  'requests/create',
  async (input: Record<string, unknown>, { rejectWithValue }) => {
    try {
      const { data } = await requestsAPI.create(input);
      return data.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(error.response?.data?.error ?? 'Failed to create request');
    }
  }
);

const requestsSlice = createSlice({
  name: 'requests',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<RequestsState['filters']>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    setSelectedRequest(state, action: PayloadAction<HelpRequest | null>) {
      state.selectedRequest = action.payload;
    },
    updateRequestStatus(state, action: PayloadAction<{ id: string; status: string }>) {
      const req = state.feed.find((r) => r.id === action.payload.id);
      if (req) req.status = action.payload.status;
      if (state.selectedRequest?.id === action.payload.id) {
        state.selectedRequest.status = action.payload.status;
      }
    },
    addNewRequest(state, action: PayloadAction<HelpRequest>) {
      // Prepend to feed if it matches current filters
      state.feed.unshift(action.payload);
    },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    // Feed
    builder.addCase(fetchFeed.pending, (state, action) => {
      if (action.meta.arg.refresh) state.isRefreshing = true;
      else if ((action.meta.arg.page ?? 1) > 1) state.isLoadingMore = true;
      else state.isLoading = true;
    });
    builder.addCase(fetchFeed.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isRefreshing = false;
      state.isLoadingMore = false;
      const { requests, total, page, hasMore, refresh } = action.payload as {
        requests: HelpRequest[];
        total: number;
        page: number;
        hasMore: boolean;
        refresh?: boolean;
      };
      if (refresh || page === 1) {
        state.feed = requests;
      } else {
        state.feed = [...state.feed, ...requests];
      }
      state.feedMeta = { total, page, hasMore };
    });
    builder.addCase(fetchFeed.rejected, (state, action) => {
      state.isLoading = false;
      state.isRefreshing = false;
      state.isLoadingMore = false;
      state.error = action.payload as string;
    });

    // Map
    builder.addCase(fetchMapRequests.fulfilled, (state, action) => {
      state.mapRequests = action.payload;
    });

    // By ID
    builder.addCase(fetchRequestById.fulfilled, (state, action) => {
      state.selectedRequest = action.payload;
    });

    // Create
    builder.addCase(createRequest.fulfilled, (state, action) => {
      state.myRequests.unshift(action.payload);
    });
  },
});

export const { setFilters, setSelectedRequest, updateRequestStatus, addNewRequest, clearError } =
  requestsSlice.actions;
export default requestsSlice.reducer;
