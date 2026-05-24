import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../../services/api';

interface UserProfile {
  displayName: string;
  avatarUrl: string | null;
  bio?: string;
  skills?: string[];
  city?: string;
  tasksCompleted?: number;
  avgRating?: number;
}

interface Gamification {
  totalXp: number;
  level: number;
  levelName: string;
  currentLevelXp: number;
  nextLevelXp: number;
}

interface AuthUser {
  id: string;
  email: string;
  role: string;
  verificationLevel: string;
  profile: UserProfile | null;
  gamification: Gamification | null;
  streaks: { currentStreak: number; longestStreak: number } | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await authAPI.login(email, password);
      const { accessToken, refreshToken, user } = data.data;
      await SecureStore.setItemAsync('access_token', accessToken);
      await SecureStore.setItemAsync('refresh_token', refreshToken);
      return { accessToken, user };
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(error.response?.data?.error ?? 'Login failed');
    }
  }
);

export const signup = createAsyncThunk(
  'auth/signup',
  async (input: { email: string; password: string; displayName: string }, { rejectWithValue }) => {
    try {
      const { data } = await authAPI.signup(input);
      const { accessToken, refreshToken, user } = data.data;
      await SecureStore.setItemAsync('access_token', accessToken);
      await SecureStore.setItemAsync('refresh_token', refreshToken);
      return { accessToken, user };
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(error.response?.data?.error ?? 'Signup failed');
    }
  }
);

export const restoreSession = createAsyncThunk('auth/restore', async (_, { rejectWithValue }) => {
  try {
    const token = await SecureStore.getItemAsync('access_token');
    if (!token) return null;

    const { data } = await authAPI.getMe();
    return { accessToken: token, user: data.data };
  } catch {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    return null;
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  try { await authAPI.logout(); } catch {}
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    updateProfile(state, action: PayloadAction<Partial<UserProfile>>) {
      if (state.user?.profile) {
        state.user.profile = { ...state.user.profile, ...action.payload };
      }
    },
    updateGamification(state, action: PayloadAction<Partial<Gamification>>) {
      if (state.user?.gamification) {
        state.user.gamification = { ...state.user.gamification, ...action.payload };
      }
    },
    forceLogout(state) {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(login.pending, (state) => { state.isLoading = true; state.error = null; });
    builder.addCase(login.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Signup
    builder.addCase(signup.pending, (state) => { state.isLoading = true; state.error = null; });
    builder.addCase(signup.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
    });
    builder.addCase(signup.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Restore session
    builder.addCase(restoreSession.pending, (state) => { state.isLoading = true; });
    builder.addCase(restoreSession.fulfilled, (state, action) => {
      state.isLoading = false;
      if (action.payload) {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
      }
    });
    builder.addCase(restoreSession.rejected, (state) => {
      state.isLoading = false;
      state.isAuthenticated = false;
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
    });
  },
});

export const { clearError, updateProfile, updateGamification, forceLogout } = authSlice.actions;
export default authSlice.reducer;
