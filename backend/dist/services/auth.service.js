"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const database_js_1 = require("../config/database.js");
const redis_js_1 = require("../config/redis.js");
const index_js_1 = require("../config/index.js");
const firebase_js_1 = require("../config/firebase.js");
const gamification_service_js_1 = require("./gamification.service.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const SALT_ROUNDS = 12;
function generateTokens(userId, email, role) {
    const accessToken = jsonwebtoken_1.default.sign({ sub: userId, email, role }, index_js_1.config.JWT_SECRET, { expiresIn: index_js_1.config.JWT_EXPIRES_IN });
    const refreshToken = jsonwebtoken_1.default.sign({ sub: userId, type: 'refresh', jti: (0, uuid_1.v4)() }, index_js_1.config.JWT_REFRESH_SECRET, { expiresIn: index_js_1.config.JWT_REFRESH_EXPIRES_IN });
    return { accessToken, refreshToken, expiresIn: 15 * 60 }; // 15 min in seconds
}
exports.authService = {
    async signup(input) {
        const existing = await database_js_1.prisma.user.findUnique({ where: { email: input.email } });
        if (existing)
            throw new errorHandler_js_1.AppError('Email already in use', 409);
        const passwordHash = await bcryptjs_1.default.hash(input.password, SALT_ROUNDS);
        const user = await database_js_1.prisma.user.create({
            data: {
                email: input.email,
                passwordHash,
                profile: {
                    create: {
                        displayName: input.displayName,
                    },
                },
                gamification: {
                    create: {},
                },
                streaks: {
                    create: {},
                },
            },
            include: { profile: true },
        });
        // Award "Welcome" XP
        await gamification_service_js_1.gamificationService.awardXP(user.id, 10, 'Welcome to QuickHelp!');
        const tokens = generateTokens(user.id, user.email, user.role);
        await redis_js_1.cache.set(`refresh:${tokens.refreshToken}`, user.id, 30 * 24 * 60 * 60);
        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                profile: user.profile
                    ? { displayName: user.profile.displayName, avatarUrl: user.profile.avatarUrl }
                    : null,
            },
        };
    },
    async login(email, password) {
        const user = await database_js_1.prisma.user.findUnique({
            where: { email },
            include: { profile: true },
        });
        if (!user || !user.passwordHash) {
            throw new errorHandler_js_1.AppError('Invalid email or password', 401);
        }
        const isValid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isValid)
            throw new errorHandler_js_1.AppError('Invalid email or password', 401);
        if (user.status === 'SUSPENDED')
            throw new errorHandler_js_1.AppError('Account suspended', 403);
        if (user.status === 'BANNED')
            throw new errorHandler_js_1.AppError('Account banned', 403);
        await database_js_1.prisma.user.update({
            where: { id: user.id },
            data: { lastActiveAt: new Date() },
        });
        const tokens = generateTokens(user.id, user.email, user.role);
        await redis_js_1.cache.set(`refresh:${tokens.refreshToken}`, user.id, 30 * 24 * 60 * 60);
        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                profile: user.profile
                    ? { displayName: user.profile.displayName, avatarUrl: user.profile.avatarUrl }
                    : null,
            },
        };
    },
    async firebaseAuth(idToken, displayName) {
        const firebaseAuth = (0, firebase_js_1.getFirebaseAuth)();
        if (!firebaseAuth)
            throw new errorHandler_js_1.AppError('Firebase auth not configured', 503);
        let firebaseUser;
        try {
            firebaseUser = await firebaseAuth.verifyIdToken(idToken);
        }
        catch {
            throw new errorHandler_js_1.AppError('Invalid Firebase token', 401);
        }
        let user = await database_js_1.prisma.user.findFirst({
            where: {
                OR: [
                    { firebaseUid: firebaseUser.uid },
                    { email: firebaseUser.email },
                ],
            },
            include: { profile: true },
        });
        if (!user) {
            // New user via Firebase (Google, Apple, etc.)
            user = await database_js_1.prisma.user.create({
                data: {
                    email: firebaseUser.email,
                    firebaseUid: firebaseUser.uid,
                    profile: {
                        create: {
                            displayName: displayName ?? firebaseUser.name ?? firebaseUser.email.split('@')[0],
                            avatarUrl: firebaseUser.picture ?? null,
                        },
                    },
                    gamification: { create: {} },
                    streaks: { create: {} },
                },
                include: { profile: true },
            });
            await gamification_service_js_1.gamificationService.awardXP(user.id, 10, 'Welcome to QuickHelp!');
        }
        else if (!user.firebaseUid) {
            // Existing email user linking their Google account
            user = await database_js_1.prisma.user.update({
                where: { id: user.id },
                data: { firebaseUid: firebaseUser.uid },
                include: { profile: true },
            });
        }
        const tokens = generateTokens(user.id, user.email, user.role);
        await redis_js_1.cache.set(`refresh:${tokens.refreshToken}`, user.id, 30 * 24 * 60 * 60);
        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                profile: user.profile
                    ? { displayName: user.profile.displayName, avatarUrl: user.profile.avatarUrl }
                    : null,
            },
        };
    },
    async refreshToken(refreshToken) {
        let payload;
        try {
            payload = jsonwebtoken_1.default.verify(refreshToken, index_js_1.config.JWT_REFRESH_SECRET);
        }
        catch {
            throw new errorHandler_js_1.AppError('Invalid refresh token', 401);
        }
        const userId = await redis_js_1.cache.get(`refresh:${refreshToken}`);
        if (!userId || userId !== payload.sub) {
            throw new errorHandler_js_1.AppError('Refresh token revoked or expired', 401);
        }
        const user = await database_js_1.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, role: true, status: true },
        });
        if (!user || user.status !== 'ACTIVE') {
            throw new errorHandler_js_1.AppError('User unavailable', 401);
        }
        const accessToken = jsonwebtoken_1.default.sign({ sub: user.id, email: user.email, role: user.role }, index_js_1.config.JWT_SECRET, { expiresIn: index_js_1.config.JWT_EXPIRES_IN });
        return { accessToken, expiresIn: 15 * 60 };
    },
    async logout(accessToken) {
        // Blacklist the token until it expires
        try {
            const payload = jsonwebtoken_1.default.decode(accessToken);
            const ttl = payload.exp - Math.floor(Date.now() / 1000);
            if (ttl > 0) {
                await redis_js_1.cache.set(`blacklist:${accessToken}`, true, ttl);
            }
        }
        catch { }
    },
    async sendPasswordReset(email) {
        const user = await database_js_1.prisma.user.findUnique({ where: { email } });
        if (!user)
            return; // Silent fail to prevent enumeration
        const resetToken = (0, uuid_1.v4)();
        await redis_js_1.cache.set(`password-reset:${resetToken}`, user.id, 60 * 60); // 1 hour
        // In production: send email via SES/SendGrid with reset link
        // For now, log it in dev
        console.log(`[DEV] Password reset token for ${email}: ${resetToken}`);
    },
    async resetPassword(token, newPassword) {
        const userId = await redis_js_1.cache.get(`password-reset:${token}`);
        if (!userId)
            throw new errorHandler_js_1.AppError('Invalid or expired reset token', 400);
        const passwordHash = await bcryptjs_1.default.hash(newPassword, SALT_ROUNDS);
        await database_js_1.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
        await redis_js_1.cache.del(`password-reset:${token}`);
    },
    async getMe(userId) {
        return database_js_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                verificationLevel: true,
                createdAt: true,
                lastActiveAt: true,
                profile: {
                    select: {
                        displayName: true,
                        avatarUrl: true,
                        bio: true,
                        skills: true,
                        interests: true,
                        city: true,
                        state: true,
                        isAvailable: true,
                        tasksCompleted: true,
                        avgRating: true,
                        totalRatings: true,
                    },
                },
                gamification: {
                    select: {
                        totalXp: true,
                        level: true,
                        levelName: true,
                        currentLevelXp: true,
                        nextLevelXp: true,
                    },
                },
                streaks: {
                    select: { currentStreak: true, longestStreak: true },
                },
            },
        });
    },
};
//# sourceMappingURL=auth.service.js.map