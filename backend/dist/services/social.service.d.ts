export declare function followUser(followerId: string, followingId: string): Promise<{
    id: string;
    createdAt: Date;
    followerId: string;
    followingId: string;
}>;
export declare function unfollowUser(followerId: string, followingId: string): Promise<void>;
export declare function getFollowers(userId: string, page?: number, limit?: number): Promise<{
    followers: {
        id: string;
        profile: {
            city: string | null;
            displayName: string;
            avatarUrl: string | null;
        } | null;
        gamification: {
            level: number;
            levelName: string;
        } | null;
    }[];
    total: number;
    page: number;
    limit: number;
}>;
export declare function getFollowing(userId: string, page?: number, limit?: number): Promise<{
    following: {
        id: string;
        profile: {
            city: string | null;
            displayName: string;
            avatarUrl: string | null;
        } | null;
        gamification: {
            level: number;
            levelName: string;
        } | null;
    }[];
    total: number;
    page: number;
    limit: number;
}>;
export declare function createPost(authorId: string, content: string, imageUrl?: string, visibility?: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE', linkedRequestId?: string, videoUrl?: string): Promise<{
    _count: {
        likes: number;
        comments: number;
    };
    author: {
        id: string;
        profile: {
            displayName: string;
            avatarUrl: string | null;
        } | null;
        gamification: {
            level: number;
            levelName: string;
        } | null;
    };
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    authorId: string;
    deletedAt: Date | null;
    content: string;
    imageUrl: string | null;
    videoUrl: string | null;
    visibility: import(".prisma/client").$Enums.PostVisibility;
    likeCount: number;
    commentCount: number;
    linkedRequestId: string | null;
    linkedMatchId: string | null;
}>;
export declare function deletePost(postId: string, userId: string): Promise<void>;
export declare function getPublicFeed(page?: number, limit?: number, currentUserId?: string): Promise<{
    isLiked: boolean;
    likes: undefined;
    _count: {
        likes: number;
        comments: number;
    };
    author: {
        id: string;
        profile: {
            city: string | null;
            displayName: string;
            avatarUrl: string | null;
        } | null;
        gamification: {
            level: number;
            levelName: string;
        } | null;
    };
    id: string;
    createdAt: Date;
    updatedAt: Date;
    authorId: string;
    deletedAt: Date | null;
    content: string;
    imageUrl: string | null;
    videoUrl: string | null;
    visibility: import(".prisma/client").$Enums.PostVisibility;
    likeCount: number;
    commentCount: number;
    linkedRequestId: string | null;
    linkedMatchId: string | null;
}[]>;
export declare function getFollowingFeed(userId: string, page?: number, limit?: number): Promise<{
    isLiked: boolean;
    likes: undefined;
    _count: {
        likes: number;
        comments: number;
    };
    author: {
        id: string;
        profile: {
            city: string | null;
            displayName: string;
            avatarUrl: string | null;
        } | null;
        gamification: {
            level: number;
            levelName: string;
        } | null;
    };
    id: string;
    createdAt: Date;
    updatedAt: Date;
    authorId: string;
    deletedAt: Date | null;
    content: string;
    imageUrl: string | null;
    videoUrl: string | null;
    visibility: import(".prisma/client").$Enums.PostVisibility;
    likeCount: number;
    commentCount: number;
    linkedRequestId: string | null;
    linkedMatchId: string | null;
}[]>;
export declare function getUserPosts(profileUserId: string, viewerId?: string, page?: number, limit?: number): Promise<{
    isLiked: boolean;
    likes: undefined;
    _count: {
        likes: number;
        comments: number;
    };
    author: {
        id: string;
        profile: {
            displayName: string;
            avatarUrl: string | null;
        } | null;
        gamification: {
            level: number;
            levelName: string;
        } | null;
    };
    id: string;
    createdAt: Date;
    updatedAt: Date;
    authorId: string;
    deletedAt: Date | null;
    content: string;
    imageUrl: string | null;
    videoUrl: string | null;
    visibility: import(".prisma/client").$Enums.PostVisibility;
    likeCount: number;
    commentCount: number;
    linkedRequestId: string | null;
    linkedMatchId: string | null;
}[]>;
export declare function likePost(postId: string, userId: string): Promise<void>;
export declare function unlikePost(postId: string, userId: string): Promise<void>;
export declare function addComment(postId: string, authorId: string, content: string): Promise<{
    author: {
        id: string;
        profile: {
            displayName: string;
            avatarUrl: string | null;
        } | null;
    };
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    authorId: string;
    deletedAt: Date | null;
    content: string;
    postId: string;
}>;
export declare function getComments(postId: string, page?: number, limit?: number): Promise<{
    comments: ({
        author: {
            id: string;
            profile: {
                displayName: string;
                avatarUrl: string | null;
            } | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
        deletedAt: Date | null;
        content: string;
        postId: string;
    })[];
    total: number;
    page: number;
    limit: number;
}>;
export declare function getPublicProfile(profileUserId: string, viewerId?: string): Promise<{
    isFollowing: boolean;
    id: string;
    createdAt: Date;
    _count: {
        helpRequestsMade: number;
        matchesAsVolunteer: number;
        posts: number;
        following: number;
        followers: number;
    };
    profile: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        latitude: number | null;
        longitude: number | null;
        city: string | null;
        userId: string;
        displayName: string;
        avatarUrl: string | null;
        bio: string | null;
        phone: string | null;
        skills: string[];
        interests: string[];
        languages: string[];
        state: string | null;
        country: string;
        radius: number;
        isAvailable: boolean;
        tasksCompleted: number;
        tasksRequested: number;
        avgRating: number;
        totalRatings: number;
    } | null;
    gamification: {
        level: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        totalXp: number;
        levelName: string;
        currentLevelXp: number;
        nextLevelXp: number;
        weeklyXp: number;
        monthlyXp: number;
    } | null;
    userBadges: ({
        badge: {
            description: string;
            id: string;
            createdAt: Date;
            category: string;
            name: string;
            isActive: boolean;
            iconUrl: string;
            rarity: string;
            xpReward: number;
            criteria: import("@prisma/client/runtime/library").JsonValue;
        };
    } & {
        id: string;
        userId: string;
        badgeId: string;
        earnedAt: Date;
        isDisplayed: boolean;
    })[];
    streaks: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        currentStreak: number;
        longestStreak: number;
        lastActivityDate: Date | null;
    } | null;
}>;
//# sourceMappingURL=social.service.d.ts.map