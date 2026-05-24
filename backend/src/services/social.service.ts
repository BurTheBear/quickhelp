import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

// ─── FOLLOW ──────────────────────────────────────────────────────────────────

export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) throw new AppError('Cannot follow yourself', 400);

  const target = await prisma.user.findUnique({ where: { id: followingId } });
  if (!target) throw new AppError('User not found', 404);

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });
  if (existing) throw new AppError('Already following this user', 409);

  const follow = await prisma.follow.create({ data: { followerId, followingId } });

  await prisma.notification.create({
    data: {
      userId: followingId,
      type: 'NEW_FOLLOWER',
      title: 'New Follower',
      body: 'Someone started following you!',
      data: { followerId },
    },
  });

  return follow;
}

export async function unfollowUser(followerId: string, followingId: string) {
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });
  if (!existing) throw new AppError('Not following this user', 404);

  await prisma.follow.delete({
    where: { followerId_followingId: { followerId, followingId } },
  });
}

export async function getFollowers(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [followers, total] = await Promise.all([
    prisma.follow.findMany({
      where: { followingId: userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        follower: {
          select: {
            id: true,
            profile: { select: { displayName: true, avatarUrl: true, city: true } },
            gamification: { select: { level: true, levelName: true } },
          },
        },
      },
    }),
    prisma.follow.count({ where: { followingId: userId } }),
  ]);
  return { followers: followers.map((f) => f.follower), total, page, limit };
}

export async function getFollowing(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [following, total] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        following: {
          select: {
            id: true,
            profile: { select: { displayName: true, avatarUrl: true, city: true } },
            gamification: { select: { level: true, levelName: true } },
          },
        },
      },
    }),
    prisma.follow.count({ where: { followerId: userId } }),
  ]);
  return { following: following.map((f) => f.following), total, page, limit };
}

// ─── POSTS ───────────────────────────────────────────────────────────────────

export async function createPost(
  authorId: string,
  content: string,
  imageUrl?: string,
  visibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE' = 'PUBLIC',
  linkedRequestId?: string,
  videoUrl?: string,
) {
  if (!content.trim()) throw new AppError('Post content is required', 400);
  if (content.length > 1000) throw new AppError('Post too long (max 1000 chars)', 400);

  return prisma.socialPost.create({
    data: { authorId, content: content.trim(), imageUrl, videoUrl, visibility, linkedRequestId },
    include: {
      author: {
        select: {
          id: true,
          profile: { select: { displayName: true, avatarUrl: true } },
          gamification: { select: { level: true, levelName: true } },
        },
      },
      _count: { select: { likes: true, comments: true } },
    },
  });
}

export async function deletePost(postId: string, userId: string) {
  const post = await prisma.socialPost.findUnique({ where: { id: postId } });
  if (!post) throw new AppError('Post not found', 404);
  if (post.authorId !== userId) throw new AppError('Not authorized', 403);
  await prisma.socialPost.update({ where: { id: postId }, data: { deletedAt: new Date() } });
}

export async function getPublicFeed(page = 1, limit = 20, currentUserId?: string) {
  const skip = (page - 1) * limit;
  const posts = await prisma.socialPost.findMany({
    where: { deletedAt: null, visibility: 'PUBLIC' },
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: {
          id: true,
          profile: { select: { displayName: true, avatarUrl: true, city: true } },
          gamification: { select: { level: true, levelName: true } },
        },
      },
      likes: currentUserId ? { where: { userId: currentUserId }, select: { id: true } } : false,
      _count: { select: { likes: true, comments: true } },
    },
  });

  return posts.map((p) => ({
    ...p,
    isLiked: currentUserId ? p.likes.length > 0 : false,
    likes: undefined,
  }));
}

export async function getFollowingFeed(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const followingIds = await prisma.follow
    .findMany({ where: { followerId: userId }, select: { followingId: true } })
    .then((rows) => rows.map((r) => r.followingId));

  const authorIds = [...followingIds, userId];

  const posts = await prisma.socialPost.findMany({
    where: {
      deletedAt: null,
      authorId: { in: authorIds },
      OR: [{ visibility: 'PUBLIC' }, { visibility: 'FOLLOWERS' }],
    },
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: {
          id: true,
          profile: { select: { displayName: true, avatarUrl: true, city: true } },
          gamification: { select: { level: true, levelName: true } },
        },
      },
      likes: { where: { userId }, select: { id: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  return posts.map((p) => ({
    ...p,
    isLiked: p.likes.length > 0,
    likes: undefined,
  }));
}

export async function getUserPosts(profileUserId: string, viewerId?: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const isOwn = profileUserId === viewerId;

  const isFollowing = viewerId && !isOwn
    ? !!(await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: profileUserId } },
      }))
    : false;

  const visibilityFilter = isOwn
    ? {}
    : isFollowing
    ? { OR: [{ visibility: 'PUBLIC' as const }, { visibility: 'FOLLOWERS' as const }] }
    : { visibility: 'PUBLIC' as const };

  const posts = await prisma.socialPost.findMany({
    where: { authorId: profileUserId, deletedAt: null, ...visibilityFilter },
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: {
          id: true,
          profile: { select: { displayName: true, avatarUrl: true } },
          gamification: { select: { level: true, levelName: true } },
        },
      },
      likes: viewerId ? { where: { userId: viewerId }, select: { id: true } } : false,
      _count: { select: { likes: true, comments: true } },
    },
  });

  return posts.map((p) => ({
    ...p,
    isLiked: viewerId ? p.likes.length > 0 : false,
    likes: undefined,
  }));
}

// ─── LIKES ───────────────────────────────────────────────────────────────────

export async function likePost(postId: string, userId: string) {
  const post = await prisma.socialPost.findUnique({ where: { id: postId } });
  if (!post || post.deletedAt) throw new AppError('Post not found', 404);

  const existing = await prisma.postLike.findUnique({
    where: { postId_userId: { postId, userId } },
  });
  if (existing) throw new AppError('Already liked', 409);

  await prisma.$transaction([
    prisma.postLike.create({ data: { postId, userId } }),
    prisma.socialPost.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
  ]);

  if (post.authorId !== userId) {
    await prisma.notification.create({
      data: {
        userId: post.authorId,
        type: 'POST_LIKED',
        title: 'Someone liked your post',
        body: post.content.slice(0, 60),
        data: { postId, userId },
      },
    });
  }
}

export async function unlikePost(postId: string, userId: string) {
  const existing = await prisma.postLike.findUnique({
    where: { postId_userId: { postId, userId } },
  });
  if (!existing) throw new AppError('Not liked', 404);

  await prisma.$transaction([
    prisma.postLike.delete({ where: { postId_userId: { postId, userId } } }),
    prisma.socialPost.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
  ]);
}

// ─── COMMENTS ────────────────────────────────────────────────────────────────

export async function addComment(postId: string, authorId: string, content: string) {
  const post = await prisma.socialPost.findUnique({ where: { id: postId } });
  if (!post || post.deletedAt) throw new AppError('Post not found', 404);
  if (!content.trim()) throw new AppError('Comment cannot be empty', 400);

  const [comment] = await prisma.$transaction([
    prisma.postComment.create({
      data: { postId, authorId, content: content.trim() },
      include: {
        author: {
          select: {
            id: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
    }),
    prisma.socialPost.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } }),
  ]);

  if (post.authorId !== authorId) {
    await prisma.notification.create({
      data: {
        userId: post.authorId,
        type: 'POST_COMMENTED',
        title: 'New comment on your post',
        body: content.slice(0, 60),
        data: { postId, authorId },
      },
    });
  }

  return comment;
}

export async function getComments(postId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [comments, total] = await Promise.all([
    prisma.postComment.findMany({
      where: { postId, deletedAt: null },
      skip,
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: {
            id: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
    }),
    prisma.postComment.count({ where: { postId, deletedAt: null } }),
  ]);
  return { comments, total, page, limit };
}

// ─── PUBLIC PROFILE ──────────────────────────────────────────────────────────

export async function getPublicProfile(profileUserId: string, viewerId?: string) {
  const user = await prisma.user.findUnique({
    where: { id: profileUserId },
    select: {
      id: true,
      createdAt: true,
      profile: true,
      gamification: true,
      streaks: true,
      userBadges: {
        where: { isDisplayed: true },
        take: 6,
        include: { badge: true },
        orderBy: { earnedAt: 'desc' },
      },
      _count: {
        select: {
          followers: true,
          following: true,
          helpRequestsMade: true,
          matchesAsVolunteer: true,
          posts: true,
        },
      },
    },
  });

  if (!user) throw new AppError('User not found', 404);

  const isFollowing =
    viewerId && viewerId !== profileUserId
      ? !!(await prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: viewerId, followingId: profileUserId } },
        }))
      : false;

  return { ...user, isFollowing };
}
