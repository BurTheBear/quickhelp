"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeFirebase = initializeFirebase;
exports.getFirebaseMessaging = getFirebaseMessaging;
exports.getFirebaseAuth = getFirebaseAuth;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const index_js_1 = require("./index.js");
const logger_js_1 = require("../utils/logger.js");
let firebaseApp = null;
function initializeFirebase() {
    if (firebaseApp)
        return firebaseApp;
    if (!index_js_1.config.FIREBASE_PROJECT_ID || !index_js_1.config.FIREBASE_PRIVATE_KEY || !index_js_1.config.FIREBASE_CLIENT_EMAIL) {
        logger_js_1.logger.warn('Firebase credentials not configured — push notifications disabled');
        return null;
    }
    try {
        firebaseApp = firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.cert({
                projectId: index_js_1.config.FIREBASE_PROJECT_ID,
                privateKey: index_js_1.config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                clientEmail: index_js_1.config.FIREBASE_CLIENT_EMAIL,
            }),
        });
        logger_js_1.logger.info('Firebase Admin SDK initialized');
        return firebaseApp;
    }
    catch (err) {
        logger_js_1.logger.error('Failed to initialize Firebase:', err);
        return null;
    }
}
function getFirebaseMessaging() {
    if (!firebaseApp)
        return null;
    return firebase_admin_1.default.messaging(firebaseApp);
}
function getFirebaseAuth() {
    if (!firebaseApp)
        return null;
    return firebase_admin_1.default.auth(firebaseApp);
}
//# sourceMappingURL=firebase.js.map