"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionService = void 0;
const uuid_1 = require("uuid");
const types_1 = require("../types");
class SessionService {
    constructor() {
        this.sessions = new Map();
    }
    createSession(mode) {
        const sessionId = (0, uuid_1.v4)();
        const session = {
            id: sessionId,
            mode,
            currentAgent: mode === types_1.Mode.ENTREPRENEUR ? types_1.AgentType.IDEA : types_1.AgentType.STRATEGY,
            contextBuckets: new Map(),
            conversationHistory: [],
            createdAt: new Date(),
            lastActive: new Date(),
        };
        // Initialize empty context buckets for all modules
        Object.values(types_1.ModuleType).forEach((moduleType) => {
            const bucket = {
                id: (0, uuid_1.v4)(),
                moduleType: moduleType,
                data: {},
                lastUpdated: new Date(),
                completionStatus: "empty",
            };
            session.contextBuckets.set(moduleType, bucket);
        });
        this.sessions.set(sessionId, session);
        return session;
    }
    getSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastActive = new Date();
        }
        return session;
    }
    updateSession(sessionId, updates) {
        const session = this.sessions.get(sessionId);
        if (session) {
            Object.assign(session, updates);
            session.lastActive = new Date();
            return session;
        }
        return undefined;
    }
    updateContextBucket(sessionId, moduleType, data, summary) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return undefined;
        const bucket = session.contextBuckets.get(moduleType);
        if (!bucket)
            return undefined;
        // Update bucket data
        bucket.data = { ...bucket.data, ...data };
        if (summary) {
            bucket.summary = summary;
        }
        bucket.lastUpdated = new Date();
        // Update completion status based on data presence
        const hasSubstantialData = Object.keys(bucket.data).length > 0;
        if (hasSubstantialData) {
            bucket.completionStatus = this.isModuleComplete(moduleType, bucket.data)
                ? "completed"
                : "in_progress";
        }
        session.lastActive = new Date();
        return bucket;
    }
    getContextBucket(sessionId, moduleType) {
        const session = this.sessions.get(sessionId);
        return session?.contextBuckets.get(moduleType);
    }
    getAllContextBuckets(sessionId) {
        const session = this.sessions.get(sessionId);
        return session?.contextBuckets;
    }
    // Helper to determine if a module has enough data to be considered complete
    isModuleComplete(moduleType, data) {
        switch (moduleType) {
            case types_1.ModuleType.IDEA_CONCEPT:
                return !!(data.description && data.problem && data.solution);
            case types_1.ModuleType.TARGET_MARKET:
                return !!(data.segments && data.marketSize && data.demographics);
            case types_1.ModuleType.VALUE_PROPOSITION:
                return !!(data.statement && data.uniqueValue && data.benefits);
            case types_1.ModuleType.BUSINESS_MODEL:
                return !!(data.revenueStreams &&
                    data.costStructure &&
                    data.keyResources);
            case types_1.ModuleType.MARKETING_STRATEGY:
                return !!(data.channels && data.tactics && data.budget);
            case types_1.ModuleType.OPERATIONS_PLAN:
                return !!(data.processes && data.resources && data.timeline);
            case types_1.ModuleType.FINANCIAL_PLAN:
                return !!(data.revenue && data.costs && data.projections);
            default:
                return false;
        }
    }
    // Clean up old sessions (could be called periodically)
    cleanupOldSessions(maxAgeHours = 24) {
        const now = new Date();
        const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
        this.sessions.forEach((session, sessionId) => {
            if (now.getTime() - session.lastActive.getTime() > maxAge) {
                this.sessions.delete(sessionId);
            }
        });
    }
}
exports.sessionService = new SessionService();
