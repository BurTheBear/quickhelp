import { UserRole } from '@prisma/client';
interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
interface AuthResult extends AuthTokens {
    user: {
        id: string;
        email: string;
        role: UserRole;
        profile: {
            displayName: string;
            avatarUrl: string | null;
        } | null;
    };
}
export declare const authService: {
    signup(input: {
        email: string;
        password: string;
        displayName: string;
    }): Promise<AuthResult>;
    login(email: string, password: string): Promise<AuthResult>;
    firebaseAuth(idToken: string, displayName?: string): Promise<AuthResult>;
    refreshToken(refreshToken: string): Promise<Pick<AuthTokens, "accessToken" | "expiresIn">>;
    logout(accessToken: string): Promise<void>;
    sendPasswordReset(email: string): Promise<void>;
    resetPassword(token: string, newPassword: string): Promise<void>;
    getMe(userId: string): Promise<{
        status: import(".prisma/client").$Enums.UserStatus;
        id: string;
        email: string;
        createdAt: Date;
        role: import(".prisma/client").$Enums.UserRole;
        verificationLevel: import(".prisma/client").$Enums.VerificationLevel;
        lastActiveAt: Date | null;
        profile: {
            city: string | null;
            displayName: string;
            avatarUrl: string | null;
            bio: string | null;
            skills: string[];
            interests: string[];
            state: string | null;
            isAvailable: boolean;
            tasksCompleted: number;
            avgRating: number;
            totalRatings: number;
        } | null;
        gamification: {
            level: number;
            totalXp: number;
            levelName: string;
            currentLevelXp: number;
            nextLevelXp: number;
        } | null;
        streaks: {
            currentStreak: number;
            longestStreak: number;
        } | null;
    } | null>;
};
export {};
//# sourceMappingURL=auth.service.d.ts.map