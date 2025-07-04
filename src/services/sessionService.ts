import { v4 as uuidv4 } from "uuid";
import { Session, Mode, AgentType, ModuleType, ContextBucket } from "../types";

class SessionService {
  private sessions: Map<string, Session> = new Map();

  createSession(mode: Mode): Session {
    const sessionId = uuidv4();
    const session: Session = {
      id: sessionId,
      mode,
      currentAgent:
        mode === Mode.ENTREPRENEUR ? AgentType.IDEA : AgentType.STRATEGY,
      contextBuckets: new Map(),
      conversationHistory: [],
      createdAt: new Date(),
      lastActive: new Date(),
    };

    // Initialize empty context buckets for all modules
    Object.values(ModuleType).forEach((moduleType) => {
      const bucket: ContextBucket = {
        id: uuidv4(),
        moduleType: moduleType as ModuleType,
        data: {},
        lastUpdated: new Date(),
        completionStatus: "empty",
      };
      session.contextBuckets.set(moduleType as ModuleType, bucket);
    });

    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActive = new Date();
    }
    return session;
  }

  updateSession(
    sessionId: string,
    updates: Partial<Session>
  ): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
      session.lastActive = new Date();
      return session;
    }
    return undefined;
  }

  updateContextBucket(
    sessionId: string,
    moduleType: ModuleType,
    data: any,
    summary?: string
  ): ContextBucket | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    const bucket = session.contextBuckets.get(moduleType);
    if (!bucket) return undefined;

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

  getContextBucket(
    sessionId: string,
    moduleType: ModuleType
  ): ContextBucket | undefined {
    const session = this.sessions.get(sessionId);
    return session?.contextBuckets.get(moduleType);
  }

  getAllContextBuckets(
    sessionId: string
  ): Map<ModuleType, ContextBucket> | undefined {
    const session = this.sessions.get(sessionId);
    return session?.contextBuckets;
  }

  // Helper to determine if a module has enough data to be considered complete
  private isModuleComplete(moduleType: ModuleType, data: any): boolean {
    switch (moduleType) {
      case ModuleType.IDEA_CONCEPT:
        return !!(data.description && data.problem && data.solution);
      case ModuleType.TARGET_MARKET:
        return !!(data.segments && data.marketSize && data.demographics);
      case ModuleType.VALUE_PROPOSITION:
        return !!(data.statement && data.uniqueValue && data.benefits);
      case ModuleType.BUSINESS_MODEL:
        return !!(
          data.revenueStreams &&
          data.costStructure &&
          data.keyResources
        );
      case ModuleType.MARKETING_STRATEGY:
        return !!(data.channels && data.tactics && data.budget);
      case ModuleType.OPERATIONS_PLAN:
        return !!(data.processes && data.resources && data.timeline);
      case ModuleType.FINANCIAL_PLAN:
        return !!(data.revenue && data.costs && data.projections);
      default:
        return false;
    }
  }

  // Clean up old sessions (could be called periodically)
  cleanupOldSessions(maxAgeHours: number = 24): void {
    const now = new Date();
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds

    this.sessions.forEach((session, sessionId) => {
      if (now.getTime() - session.lastActive.getTime() > maxAge) {
        this.sessions.delete(sessionId);
      }
    });
  }
}

export const sessionService = new SessionService();
