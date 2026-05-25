"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.followUser = followUser;
exports.unfollowUser = unfollowUser;
exports.getFollowers = getFollowers;
exports.getFollowing = getFollowing;
exports.createPost = createPost;
exports.deletePost = deletePost;
exports.getPublicFeed = getPublicFeed;
exports.getFollowingFeed = getFollowingFeed;
exports.getUserPosts = getUserPosts;
exports.likePost = likePost;
exports.unlikePost = unlikePost;
exports.addComment = addComment;
exports.getComments = getComments;
exports.getPublicProfile = getPublicProfile;
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
// ─── FOLLOW ──────────────────────────────────────────────────────────────────
async function followUser(followerId, followingId) {
    if (followerId === followingId)
        throw new errorHandler_1.AppError('Cannot follow yourself', 400);
    const target = await database_1.prisma.user.findUnique({ where: { id: followingId } });
    if (!target)
        throw new errorHandler_1.AppError('User not found', 404);
    const existing = await database_1.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId, followingId } },
    });
    if (existing)
        throw new errorHandler_1.AppError('Already following this user', 409);
    const follow = await database_1.prisma.follow.create({ data: { followerId, followingId } });
    await database_1.prisma.notification.create({
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
async function unfollowUser(followerId, followingId) {
    const existing = await database_1.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId, followingId } },
    });
    if (!existing)
        throw new errorHandler_1.AppError('Not following this user', 404);
    await database_1.prisma.follow.delete({
        where: { followerId_followingId: { followerId, followingId } },
    });
}
async function getFollowers(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [followers, total] = await Promise.all([
        database_1.prisma.follow.findMany({
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
        database_1.prisma.follow.count({ where: { followingId: userId } }),
    ]);
    return { followers: followers.map((f) => f.follower), total, page, limit };
}
async function getFollowing(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [following, total] = await Promise.all([
        database_1.prisma.follow.findMany({
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
        database_1.prisma.follow.count({ where: { followerId: userId } }),
    ]);
    return { following: following.map((f) => f.following), total, page, limit };
}
// ─── POSTS ───────────────────────────────────────────────────────────────────
async function createPost(authorId, content, imageUrl, visibility = 'PUBLIC', linkedRequestId, videoUrl) {
    if (!content.trim())
        throw new errorHandler_1.AppError('Post content is required', 400);
    if (content.length > 1000)
        throw new errorHandler_1.AppError('Post too long (max 1000 chars)', 400);
    return database_1.prisma.socialPost.create({
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
async function deletePost(postId, userId) {
    const post = await database_1.prisma.socialPost.findUnique({ where: { id: postId } });
    if (!post)
        throw new errorHandler_1.AppError('Post not found', 404);
    if (post.authorId !== userId)
        throw new errorHandler_1.AppError('Not authorized', 403);
    await database_1.prisma.socialPost.update({ where: { id: postId }, data: { deletedAt: new Date() } });
}
async function getPublicFeed(page = 1, limit = 20, currentUserId) {
    const skip = (page - 1) * limit;
    const posts = await database_1.prisma.socialPost.findMany({
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
async function getFollowingFeed(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const followingIds = await database_1.prisma.follow
        .findMany({ where: { followerId: userId }, select: { followingId: true } })
        .then((rows) => rows.map((r) => r.followingId));
    const authorIds = [...followingIds, userId];
    const posts = await database_1.prisma.socialPost.findMany({
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
async function getUserPosts(profileUserId, viewerId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const isOwn = profileUserId === viewerId;
    const isFollowing = viewerId && !isOwn
        ? !!(await database_1.prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: viewerId, followingId: profileUserId } },
        }))
        : false;
    const visibilityFilter = isOwn
        ? {}
        : isFollowing
            ? { OR: [{ visibility: 'PUBLIC' }, { visibility: 'FOLLOWERS' }] }
            : { visibility: 'PUBLIC' };
    const posts = await database_1.prisma.socialPost.findMany({
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
async function likePost(postId, userId) {
    const post = await database_1.prisma.socialPost.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt)
        throw new errorHandler_1.AppError('Post not found', 404);
    const existing = await database_1.prisma.postLike.findUnique({
        where: { postId_userId: { postId, userId } },
    });
    if (existing)
        throw new errorHandler_1.AppError('Already liked', 409);
    await database_1.prisma.$transaction([
        database_1.prisma.postLike.create({ data: { postId, userId } }),
        database_1.prisma.socialPost.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
    ]);
    if (post.authorId !== userId) {
        await database_1.prisma.notification.create({
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
async function unlikePost(postId, userId) {
    const existing = await database_1.prisma.postLike.findUnique({
        where: { postId_userId: { postId, userId } },
    });
    if (!existing)
        throw new errorHandler_1.AppError('Not liked', 404);
    await database_1.prisma.$transaction([
        database_1.prisma.postLike.delete({ where: { postId_userId: { postId, userId } } }),
        database_1.prisma.socialPost.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
    ]);
}
// ─── COMMENTS ────────────────────────────────────────────────────────────────
async function addComment(postId, authorId, content) {
    const post = await database_1.prisma.socialPost.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt)
        throw new errorHandler_1.AppError('Post not found', 404);
    if (!content.trim())
        throw new errorHandler_1.AppError('Comment cannot be empty', 400);
    const [comment] = await database_1.prisma.$transaction([
        database_1.prisma.postComment.create({
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
        database_1.prisma.socialPost.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } }),
    ]);
    if (post.authorId !== authorId) {
        await database_1.prisma.notification.create({
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
async function getComments(postId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [comments, total] = await Promise.all([
        database_1.prisma.postComment.findMany({
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
        database_1.prisma.postComment.count({ where: { postId, deletedAt: null } }),
    ]);
    return { comments, total, page, limit };
}
// ─── PUBLIC PROFILE ──────────────────────────────────────────────────────────
async function getPublicProfile(profileUserId, viewerId) {
    const user = await database_1.prisma.user.findUnique({
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
    if (!user)
        throw new errorHandler_1.AppError('User not found', 404);
    const isFollowing = viewerId && viewerId !== profileUserId
        ? !!(await database_1.prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: viewerId, followingId: profileUserId } },
        }))
        : false;
    return { ...user, isFollowing };
}
//# sourceMappingURL=social.service.js.map