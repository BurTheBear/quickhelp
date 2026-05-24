import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { socialAPI } from '../../services/api';

export interface PostAuthor {
  id: string;
  profile: { displayName: string; avatarUrl?: string; city?: string } | null;
  gamification: { level: number; levelName: string } | null;
}

export interface SocialPost {
  id: string;
  authorId: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  visibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  linkedRequestId?: string;
  createdAt: string;
  author: PostAuthor;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: { id: string; profile: { displayName: string; avatarUrl?: string } | null };
}

export interface PublicProfile {
  id: string;
  createdAt: string;
  profile: Record<string, unknown> | null;
  gamification: Record<string, unknown> | null;
  streaks: Record<string, unknown> | null;
  userBadges: unknown[];
  isFollowing: boolean;
  _count: {
    followers: number;
    following: number;
    helpRequestsMade: number;
    matchesAsVolunteer: number;
    posts: number;
  };
}

interface SocialState {
  publicFeed: SocialPost[];
  followingFeed: SocialPost[];
  currentFeedType: 'public' | 'following';
  comments: Record<string, PostComment[]>;
  profiles: Record<string, PublicProfile>;
  loading: boolean;
  error: string | null;
  publicFeedPage: number;
  followingFeedPage: number;
  hasMorePublic: boolean;
  hasMoreFollowing: boolean;
}

const initialState: SocialState = {
  publicFeed: [],
  followingFeed: [],
  currentFeedType: 'public',
  comments: {},
  profiles: {},
  loading: false,
  error: null,
  publicFeedPage: 1,
  followingFeedPage: 1,
  hasMorePublic: true,
  hasMoreFollowing: true,
};

export const fetchPublicFeed = createAsyncThunk(
  'social/fetchPublicFeed',
  async (page: number = 1) => {
    const res = await socialAPI.getPublicFeed(page);
    return { posts: res.data.data as SocialPost[], page };
  },
);

export const fetchFollowingFeed = createAsyncThunk(
  'social/fetchFollowingFeed',
  async (page: number = 1) => {
    const res = await socialAPI.getFollowingFeed(page);
    return { posts: res.data.data as SocialPost[], page };
  },
);

export const createPost = createAsyncThunk(
  'social/createPost',
  async (data: { content: string; imageUrl?: string; visibility?: string }) => {
    const res = await socialAPI.createPost(data);
    return res.data.data as SocialPost;
  },
);

export const fetchComments = createAsyncThunk(
  'social/fetchComments',
  async (postId: string) => {
    const res = await socialAPI.getComments(postId);
    return { postId, comments: res.data.data.comments as PostComment[] };
  },
);

export const addComment = createAsyncThunk(
  'social/addComment',
  async ({ postId, content }: { postId: string; content: string }) => {
    const res = await socialAPI.addComment(postId, content);
    return { postId, comment: res.data.data as PostComment };
  },
);

export const fetchPublicProfile = createAsyncThunk(
  'social/fetchPublicProfile',
  async (userId: string) => {
    const res = await socialAPI.getPublicProfile(userId);
    return res.data.data as PublicProfile;
  },
);

export const followUser = createAsyncThunk(
  'social/followUser',
  async (userId: string) => {
    await socialAPI.follow(userId);
    return userId;
  },
);

export const unfollowUser = createAsyncThunk(
  'social/unfollowUser',
  async (userId: string) => {
    await socialAPI.unfollow(userId);
    return userId;
  },
);

const socialSlice = createSlice({
  name: 'social',
  initialState,
  reducers: {
    setFeedType(state, action: PayloadAction<'public' | 'following'>) {
      state.currentFeedType = action.payload;
    },
    toggleLikeOptimistic(state, action: PayloadAction<{ postId: string; feedType: 'public' | 'following' }>) {
      const { postId, feedType } = action.payload;
      const feed = feedType === 'public' ? state.publicFeed : state.followingFeed;
      const post = feed.find((p) => p.id === postId);
      if (post) {
        post.isLiked = !post.isLiked;
        post.likeCount += post.isLiked ? 1 : -1;
      }
    },
    prependPost(state, action: PayloadAction<SocialPost>) {
      state.publicFeed.unshift(action.payload);
      state.followingFeed.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPublicFeed.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchPublicFeed.fulfilled, (state, action) => {
        state.loading = false;
        const { posts, page } = action.payload;
        if (page === 1) {
          state.publicFeed = posts;
        } else {
          state.publicFeed.push(...posts);
        }
        state.publicFeedPage = page;
        state.hasMorePublic = posts.length === 20;
      })
      .addCase(fetchPublicFeed.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load feed';
      })

      .addCase(fetchFollowingFeed.pending, (state) => { state.loading = true; })
      .addCase(fetchFollowingFeed.fulfilled, (state, action) => {
        state.loading = false;
        const { posts, page } = action.payload;
        if (page === 1) {
          state.followingFeed = posts;
        } else {
          state.followingFeed.push(...posts);
        }
        state.followingFeedPage = page;
        state.hasMoreFollowing = posts.length === 20;
      })
      .addCase(fetchFollowingFeed.rejected, (state) => { state.loading = false; })

      .addCase(createPost.fulfilled, (state, action) => {
        state.publicFeed.unshift(action.payload);
        state.followingFeed.unshift(action.payload);
      })

      .addCase(fetchComments.fulfilled, (state, action) => {
        state.comments[action.payload.postId] = action.payload.comments;
      })

      .addCase(addComment.fulfilled, (state, action) => {
        const { postId, comment } = action.payload;
        if (!state.comments[postId]) state.comments[postId] = [];
        state.comments[postId].push(comment);
        const updatePost = (feed: SocialPost[]) => {
          const post = feed.find((p) => p.id === postId);
          if (post) post.commentCount += 1;
        };
        updatePost(state.publicFeed);
        updatePost(state.followingFeed);
      })

      .addCase(fetchPublicProfile.fulfilled, (state, action) => {
        state.profiles[action.payload.id] = action.payload;
      })

      .addCase(followUser.fulfilled, (state, action) => {
        const profile = state.profiles[action.payload];
        if (profile) {
          profile.isFollowing = true;
          profile._count.followers += 1;
        }
      })

      .addCase(unfollowUser.fulfilled, (state, action) => {
        const profile = state.profiles[action.payload];
        if (profile) {
          profile.isFollowing = false;
          profile._count.followers -= 1;
        }
      });
  },
});

export const { setFeedType, toggleLikeOptimistic, prependPost } = socialSlice.actions;
export default socialSlice.reducer;
