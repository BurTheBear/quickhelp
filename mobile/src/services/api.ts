import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        // Wait for the in-flight refresh
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const newToken = data.data.accessToken;

        await SecureStore.setItemAsync('access_token', newToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

        refreshQueue.forEach((cb) => cb(newToken));
        refreshQueue = [];

        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        // Emit logout event — caught by auth store
        authEvents.emit('logout');
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Lightweight event emitter for auth state changes across the app
class AuthEvents {
  private listeners: Array<() => void> = [];
  emit(event: 'logout') {
    if (event === 'logout') this.listeners.forEach((fn) => fn());
  }
  on(_event: 'logout', fn: () => void) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter((l) => l !== fn); };
  }
}

export const authEvents = new AuthEvents();

// ─── API METHODS ─────────────────────────────────────────────────────────────

export const authAPI = {
  signup: (data: { email: string; password: string; displayName: string }) =>
    api.post('/auth/signup', data),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  firebaseAuth: (idToken: string, displayName?: string) =>
    api.post('/auth/firebase', { idToken, displayName }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

export const requestsAPI = {
  getFeed: (params: Record<string, unknown>) => api.get('/requests', { params }),
  getMapRequests: (bounds: { north: number; south: number; east: number; west: number }) =>
    api.get('/requests/map', { params: bounds }),
  getById: (id: string) => api.get(`/requests/${id}`),
  getMyRequests: (type: 'made' | 'volunteered') =>
    api.get('/requests/my', { params: { type } }),
  create: (data: Record<string, unknown>) => api.post('/requests', data),
  cancel: (id: string) => api.patch(`/requests/${id}/cancel`),
  report: (id: string, data: { reason: string; description: string }) =>
    api.post(`/requests/${id}/report`, data),
  uploadImage: (requestId: string, imageUri: string) => {
    const form = new FormData();
    form.append('image', {
      uri: imageUri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    } as any);
    return api.post(`/requests/${requestId}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const matchesAPI = {
  accept: (requestId: string) => api.post(`/matches/request/${requestId}`),
  start: (matchId: string) => api.patch(`/matches/${matchId}/start`),
  complete: (matchId: string) => api.patch(`/matches/${matchId}/complete`),
  requestCompletion: (matchId: string) => api.patch(`/matches/${matchId}/request-completion`),
  approveCompletion: (matchId: string) => api.patch(`/matches/${matchId}/approve`),
  cancel: (matchId: string, reason?: string) => api.patch(`/matches/${matchId}/cancel`, { reason }),
  getActive: () => api.get('/matches/active'),
  getHistory: () => api.get('/matches/history'),
};

export const chatAPI = {
  getConversation: (requestId: string) => api.get(`/chats/request/${requestId}`),
  getMessages: (requestId: string, cursor?: string) =>
    api.get(`/chats/request/${requestId}/messages`, { params: { cursor } }),
  sendMessage: (requestId: string, content: string, type = 'TEXT') =>
    api.post(`/chats/request/${requestId}/messages`, { content, type }),
  getUnreadCount: () => api.get('/chats/unread-count'),
};

export const usersAPI = {
  getProfile: (id: string) => api.get(`/users/profile/${id}`),
  getMyStats: () => api.get('/users/me/stats'),
  getMyBadges: () => api.get('/users/me/badges'),
  updateProfile: (data: Record<string, unknown>) => api.put('/users/me/profile', data),
  updateLocation: (lat: number, lng: number) =>
    api.post('/users/me/location', { latitude: lat, longitude: lng }),
  registerDeviceToken: (fcmToken: string, platform: string) =>
    api.post('/users/me/device-token', { fcmToken, platform }),
  rateUser: (data: Record<string, unknown>) => api.post('/users/rate', data),
  reportUser: (id: string, data: { reason: string; description: string }) =>
    api.post(`/users/${id}/report`, data),
};

export const notificationsAPI = {
  getAll: (page = 1) => api.get('/notifications', { params: { page } }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const leaderboardAPI = {
  getGlobal: () => api.get('/leaderboard/global'),
  getWeekly: () => api.get('/leaderboard/weekly'),
  getMonthly: () => api.get('/leaderboard/monthly'),
  getNearby: () => api.get('/leaderboard/nearby'),
  getChallenges: () => api.get('/leaderboard/challenges'),
};

export const backgroundCheckAPI = {
  /** Get the current user's background check status. */
  getStatus: () => api.get('/background-check/status'),

  /**
   * Submit personal info to start a Sterling background check.
   * SSN is optional; if provided it is transmitted directly to Sterling
   * and never stored in QuickHelp's database.
   */
  initiate: (data: {
    firstName:   string;
    lastName:    string;
    dateOfBirth: string;  // YYYY-MM-DD
    ssn?:        string;
    zipCode?:    string;
    phone?:      string;
  }) => api.post('/background-check/initiate', data),
};

export const socialAPI = {
  // Feed
  getPublicFeed: (page = 1) => api.get('/social/feed', { params: { page } }),
  getFollowingFeed: (page = 1) => api.get('/social/feed/following', { params: { page } }),

  // Posts
  createPost: (data: { content: string; imageUrl?: string; visibility?: string; linkedRequestId?: string }) =>
    api.post('/social/posts', data),
  createPostWithMedia: (content: string, mediaUri: string, mediaType: 'image' | 'video', visibility = 'PUBLIC') => {
    const form = new FormData();
    form.append('content', content);
    form.append('visibility', visibility);
    form.append('media', {
      uri: mediaUri,
      name: mediaType === 'video' ? 'video.mp4' : 'photo.jpg',
      type: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
    } as any);
    return api.post('/social/posts', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deletePost: (postId: string) => api.delete(`/social/posts/${postId}`),
  getUserPosts: (userId: string, page = 1) =>
    api.get(`/social/users/${userId}/posts`, { params: { page } }),

  // Likes
  likePost: (postId: string) => api.post(`/social/posts/${postId}/like`),
  unlikePost: (postId: string) => api.delete(`/social/posts/${postId}/like`),

  // Comments
  getComments: (postId: string, page = 1) =>
    api.get(`/social/posts/${postId}/comments`, { params: { page } }),
  addComment: (postId: string, content: string) =>
    api.post(`/social/posts/${postId}/comments`, { content }),

  // Follow
  follow: (userId: string) => api.post(`/social/users/${userId}/follow`),
  unfollow: (userId: string) => api.delete(`/social/users/${userId}/follow`),
  getFollowers: (userId: string, page = 1) =>
    api.get(`/social/users/${userId}/followers`, { params: { page } }),
  getFollowing: (userId: string, page = 1) =>
    api.get(`/social/users/${userId}/following`, { params: { page } }),

  // Public profile
  getPublicProfile: (userId: string) => api.get(`/social/users/${userId}/profile`),
};
