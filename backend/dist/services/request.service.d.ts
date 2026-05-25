import { RequestCategory, UrgencyLevel } from '@prisma/client';
export interface FeedQuery {
    lat?: number;
    lng?: number;
    radius?: number;
    category?: string;
    urgency?: string;
    status?: string;
    page?: number;
    limit?: number;
    sort?: 'distance' | 'newest' | 'urgency' | 'points';
}
export declare const requestService: {
    getFeed(userId: string | undefined, query: FeedQuery): Promise<{
        requests: {
            distance: number;
            _count: {
                matches: number;
            };
            author: {
                id: string;
                verificationLevel: import(".prisma/client").$Enums.VerificationLevel;
                profile: {
                    displayName: string;
                    avatarUrl: string | null;
                    tasksCompleted: number;
                    avgRating: number;
                    totalRatings: number;
                } | null;
                gamification: {
                    level: number;
                    levelName: string;
                } | null;
            };
            images: {
                id: string;
                url: string;
                thumbnailUrl: string | null;
                order: number;
            }[];
            status: import(".prisma/client").$Enums.RequestStatus;
            description: string;
            id: string;
            startedAt: Date | null;
            completedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            authorId: string;
            title: string;
            category: import(".prisma/client").$Enums.RequestCategory;
            urgency: import(".prisma/client").$Enums.UrgencyLevel;
            estimatedMinutes: number;
            rewardPoints: number;
            latitude: number;
            longitude: number;
            address: string | null;
            city: string | null;
            locationNotes: string | null;
            requiredSkills: string[];
            maxVolunteers: number;
            expiresAt: Date | null;
            aiCategory: string | null;
            aiSafetyScore: number | null;
            isFlagged: boolean;
            viewCount: number;
            deletedAt: Date | null;
        }[];
        total: number;
        page: number;
        limit: number;
        hasMore: boolean;
    } | {
        requests: {
            distance: null;
            _count: {
                matches: number;
            };
            author: {
                id: string;
                verificationLevel: import(".prisma/client").$Enums.VerificationLevel;
                profile: {
                    displayName: string;
                    avatarUrl: string | null;
                    tasksCompleted: number;
                    avgRating: number;
                    totalRatings: number;
                } | null;
                gamification: {
                    level: number;
                    levelName: string;
                } | null;
            };
            images: {
                id: string;
                url: string;
                thumbnailUrl: string | null;
                order: number;
            }[];
            status: import(".prisma/client").$Enums.RequestStatus;
            description: string;
            id: string;
            startedAt: Date | null;
            completedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            authorId: string;
            title: string;
            category: import(".prisma/client").$Enums.RequestCategory;
            urgency: import(".prisma/client").$Enums.UrgencyLevel;
            estimatedMinutes: number;
            rewardPoints: number;
            latitude: number;
            longitude: number;
            address: string | null;
            city: string | null;
            locationNotes: string | null;
            requiredSkills: string[];
            maxVolunteers: number;
            expiresAt: Date | null;
            aiCategory: string | null;
            aiSafetyScore: number | null;
            isFlagged: boolean;
            viewCount: number;
            deletedAt: Date | null;
        }[];
        total: number;
        page: number;
        limit: number;
        hasMore: boolean;
    }>;
    getById(id: string, viewerId?: string): Promise<{
        _count: {
            matches: number;
        };
        author: {
            id: string;
            verificationLevel: import(".prisma/client").$Enums.VerificationLevel;
            profile: {
                displayName: string;
                avatarUrl: string | null;
                tasksCompleted: number;
                avgRating: number;
                totalRatings: number;
            } | null;
            gamification: {
                level: number;
                levelName: string;
            } | null;
        };
        images: {
            id: string;
            url: string;
            thumbnailUrl: string | null;
            order: number;
        }[];
        matches: ({
            volunteer: {
                id: string;
                profile: {
                    displayName: string;
                    avatarUrl: string | null;
                    avgRating: number;
                } | null;
            };
        } & {
            status: import(".prisma/client").$Enums.MatchStatus;
            id: string;
            requestId: string;
            volunteerId: string;
            matchScore: number | null;
            acceptedAt: Date | null;
            startedAt: Date | null;
            completedAt: Date | null;
            cancelledAt: Date | null;
            cancelReason: string | null;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
    } & {
        status: import(".prisma/client").$Enums.RequestStatus;
        description: string;
        id: string;
        startedAt: Date | null;
        completedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
        title: string;
        category: import(".prisma/client").$Enums.RequestCategory;
        urgency: import(".prisma/client").$Enums.UrgencyLevel;
        estimatedMinutes: number;
        rewardPoints: number;
        latitude: number;
        longitude: number;
        address: string | null;
        city: string | null;
        locationNotes: string | null;
        requiredSkills: string[];
        maxVolunteers: number;
        expiresAt: Date | null;
        aiCategory: string | null;
        aiSafetyScore: number | null;
        isFlagged: boolean;
        viewCount: number;
        deletedAt: Date | null;
    }>;
    getMapRequests(bounds: {
        north: number;
        south: number;
        east: number;
        west: number;
    }): Promise<{}>;
    create(authorId: string, input: {
        title: string;
        description: string;
        category: RequestCategory;
        urgency: UrgencyLevel;
        estimatedMinutes: number;
        latitude: number;
        longitude: number;
        address?: string;
        locationNotes?: string;
        requiredSkills?: string[];
        expiresInHours?: number;
    }): Promise<{
        _count: {
            matches: number;
        };
        author: {
            id: string;
            verificationLevel: import(".prisma/client").$Enums.VerificationLevel;
            profile: {
                displayName: string;
                avatarUrl: string | null;
                tasksCompleted: number;
                avgRating: number;
                totalRatings: number;
            } | null;
            gamification: {
                level: number;
                levelName: string;
            } | null;
        };
        images: {
            id: string;
            url: string;
            thumbnailUrl: string | null;
            order: number;
        }[];
    } & {
        status: import(".prisma/client").$Enums.RequestStatus;
        description: string;
        id: string;
        startedAt: Date | null;
        completedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
        title: string;
        category: import(".prisma/client").$Enums.RequestCategory;
        urgency: import(".prisma/client").$Enums.UrgencyLevel;
        estimatedMinutes: number;
        rewardPoints: number;
        latitude: number;
        longitude: number;
        address: string | null;
        city: string | null;
        locationNotes: string | null;
        requiredSkills: string[];
        maxVolunteers: number;
        expiresAt: Date | null;
        aiCategory: string | null;
        aiSafetyScore: number | null;
        isFlagged: boolean;
        viewCount: number;
        deletedAt: Date | null;
    }>;
    cancel(requestId: string, userId: string): Promise<{
        status: import(".prisma/client").$Enums.RequestStatus;
        description: string;
        id: string;
        startedAt: Date | null;
        completedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
        title: string;
        category: import(".prisma/client").$Enums.RequestCategory;
        urgency: import(".prisma/client").$Enums.UrgencyLevel;
        estimatedMinutes: number;
        rewardPoints: number;
        latitude: number;
        longitude: number;
        address: string | null;
        city: string | null;
        locationNotes: string | null;
        requiredSkills: string[];
        maxVolunteers: number;
        expiresAt: Date | null;
        aiCategory: string | null;
        aiSafetyScore: number | null;
        isFlagged: boolean;
        viewCount: number;
        deletedAt: Date | null;
    }>;
    getMyRequests(userId: string, type?: "made" | "volunteered"): Promise<({
        _count: {
            matches: number;
        };
        author: {
            id: string;
            verificationLevel: import(".prisma/client").$Enums.VerificationLevel;
            profile: {
                displayName: string;
                avatarUrl: string | null;
                tasksCompleted: number;
                avgRating: number;
                totalRatings: number;
            } | null;
            gamification: {
                level: number;
                levelName: string;
            } | null;
        };
        images: {
            id: string;
            url: string;
            thumbnailUrl: string | null;
            order: number;
        }[];
    } & {
        status: import(".prisma/client").$Enums.RequestStatus;
        description: string;
        id: string;
        startedAt: Date | null;
        completedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
        title: string;
        category: import(".prisma/client").$Enums.RequestCategory;
        urgency: import(".prisma/client").$Enums.UrgencyLevel;
        estimatedMinutes: number;
        rewardPoints: number;
        latitude: number;
        longitude: number;
        address: string | null;
        city: string | null;
        locationNotes: string | null;
        requiredSkills: string[];
        maxVolunteers: number;
        expiresAt: Date | null;
        aiCategory: string | null;
        aiSafetyScore: number | null;
        isFlagged: boolean;
        viewCount: number;
        deletedAt: Date | null;
    })[]>;
};
//# sourceMappingURL=request.service.d.ts.map