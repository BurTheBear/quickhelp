export declare const gamificationService: {
    awardXP(userId: string, amount: number, reason: string, referenceId?: string): Promise<void>;
    updateStreak(userId: string): Promise<void>;
    checkBadgeEligibility(userId: string): Promise<void>;
    updateChallengeProgress(userId: string, category: string): Promise<void>;
};
//# sourceMappingURL=gamification.service.d.ts.map