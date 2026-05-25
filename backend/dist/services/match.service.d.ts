export declare const matchService: {
    acceptRequest(requestId: string, volunteerId: string): Promise<{
        volunteer: {
            id: string;
            profile: {
                displayName: string;
                avatarUrl: string | null;
                avgRating: number;
            } | null;
            gamification: {
                level: number;
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
    }>;
    startTask(matchId: string, volunteerId: string): Promise<{
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
    }>;
    completeTask(matchId: string, volunteerId: string): Promise<{
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
    }>;
    requestCompletion(matchId: string, volunteerId: string): Promise<{
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
    }>;
    approveCompletion(matchId: string, requesterId: string): Promise<{
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
    }>;
    cancelMatch(matchId: string, userId: string, reason?: string): Promise<void>;
    getActiveMatches(userId: string): Promise<({
        request: {
            author: {
                profile: {
                    displayName: string;
                    avatarUrl: string | null;
                } | null;
            };
            images: {
                url: string;
                thumbnailUrl: string | null;
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
    })[]>;
};
//# sourceMappingURL=match.service.d.ts.map