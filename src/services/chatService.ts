import { v4 as uuidv4 } from "uuid";
import {
  ChatRequest,
  ChatResponse,
  ConversationMessage,
  Session,
  ModuleUpdate,
  Mode,
  ModuleType,
} from "../types";
import { sessionService } from "./sessionService";
import { openAIService } from "./openAIService";
import { AgentOrchestrator } from "../agents/agentOrchestrator";

class ChatService {
  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    let session: Session | undefined;

    // Get or create session
    if (request.sessionId) {
      session = sessionService.getSession(request.sessionId);
    }

    if (!session) {
      // Create new session with the specified mode or default to entrepreneur
      const mode = request.mode || Mode.ENTREPRENEUR;
      session = sessionService.createSession(mode);
    }

    try {
      // Add user message to conversation history
      const userMessage: ConversationMessage = {
        id: uuidv4(),
        role: "user",
        content: request.message,
        timestamp: new Date(),
      };
      session.conversationHistory.push(userMessage);

      // Check if this is an explicit module transition request
      const moduleTransitionRegex =
        /(?:let'?s?|can we|move to|switch to|go to|work on|focus on|nice let'?s?) (?:the )?([a-z\s]+)(?: module| section)?/i;
      const match = request.message.match(moduleTransitionRegex);

      let explicitModuleRequest: ModuleType | undefined;

      if (match) {
        const requestedModuleName = match[1].trim().toLowerCase();
        // Map the requested module name to a ModuleType
        explicitModuleRequest = this.mapTextToModuleType(requestedModuleName);
        console.log("Module transition detected:", {
          requestedModuleName,
          mappedModule: explicitModuleRequest,
          currentModule: session.currentModule,
        });
      }

      // Determine which agent should handle this
      const agentDecision = AgentOrchestrator.determineAgent(
        session,
        request.message,
        explicitModuleRequest || session.currentModule
      );

      console.log("Agent decision:", {
        agent: agentDecision.agent,
        module: agentDecision.module,
        isTransition: agentDecision.isTransition,
        previousModule: session.currentModule,
      });

      // Check if this is a module transition
      const isModuleTransition =
        agentDecision.isTransition &&
        agentDecision.module !== session.currentModule;

      // Update session with current agent and module
      session.currentAgent = agentDecision.agent;
      const previousModule = session.currentModule;
      if (agentDecision.module) {
        session.currentModule = agentDecision.module;
      }

      // Build context for the agent including data from all modules
      const context = this.buildEnhancedAgentContext(session);

      // Generate AI response with transition context if needed
      let promptPrefix = "";
      if (isModuleTransition && previousModule && agentDecision.module) {
        promptPrefix = `The user is transitioning from ${previousModule} to ${agentDecision.module}. 
        Acknowledge this transition and guide them through the ${agentDecision.module} module.
        Reference relevant information from previous modules if applicable.
        Previous module data: ${JSON.stringify(this.getPreviousModuleData(session, previousModule))}.
        `;
      }

      const aiResponse = await openAIService.generateAgentResponse(
        agentDecision.agent,
        promptPrefix + request.message,
        context
      );

      // Add AI response to conversation history
      const assistantMessage: ConversationMessage = {
        id: uuidv4(),
        role: "assistant",
        content: aiResponse,
        agent: agentDecision.agent,
        module: session.currentModule,
        timestamp: new Date(),
      };
      session.conversationHistory.push(assistantMessage);

      // Extract and update module data
      const updatedModules: ModuleUpdate[] = [];

      if (session.currentModule) {
        // Try to extract structured data from the conversation
        const combinedText = `User: ${request.message}\nAssistant: ${aiResponse}`;
        const extractedData = await openAIService.extractStructuredData(
          combinedText,
          session.currentModule
        );

        if (Object.keys(extractedData).length > 0) {
          // Generate a summary
          const summary = await openAIService.generateModuleSummary(
            session.currentModule,
            extractedData
          );

          // Update the context bucket
          const updatedBucket = sessionService.updateContextBucket(
            session.id,
            session.currentModule,
            extractedData,
            summary
          );

          if (updatedBucket) {
            updatedModules.push({
              moduleType: session.currentModule,
              data: updatedBucket.data,
              summary: updatedBucket.summary || "",
              completionStatus: updatedBucket.completionStatus,
            });
          }
        }
      }

      // Update session's last active time
      session.lastActive = new Date();
      sessionService.updateSession(session.id, session);

      return {
        message: aiResponse,
        sessionId: session.id,
        agent: session.currentAgent,
        currentModule: session.currentModule,
        isModuleTransition,
        updatedModules,
      };
    } catch (error) {
      console.error("Error processing message:", error);
      throw error;
    }
  }

  // Enhanced context builder that includes data from all modules
  private buildEnhancedAgentContext(session: Session): string {
    let context = "";

    // Add current module context
    if (session.currentModule) {
      const currentBucket = session.contextBuckets.get(session.currentModule);
      if (currentBucket) {
        context += `Current module: ${session.currentModule}\n`;
        context += `Module data: ${JSON.stringify(currentBucket.data)}\n`;
        if (currentBucket.summary) {
          context += `Module summary: ${currentBucket.summary}\n`;
        }
      }
    }

    // Add context from all other modules with data
    context += "\nInformation from other modules:\n";
    session.contextBuckets.forEach((bucket, moduleType) => {
      if (
        moduleType !== session.currentModule &&
        bucket.completionStatus !== "empty" &&
        Object.keys(bucket.data).length > 0
      ) {
        context += `${moduleType}:\n`;
        context += `- Data: ${JSON.stringify(bucket.data)}\n`;
        if (bucket.summary) {
          context += `- Summary: ${bucket.summary}\n`;
        }
        context += "\n";
      }
    });

    return context;
  }

  // Get data from a specific module
  private getPreviousModuleData(session: Session, moduleType: ModuleType) {
    const bucket = session.contextBuckets.get(moduleType);
    if (!bucket) return {};
    return {
      data: bucket.data,
      summary: bucket.summary,
      completionStatus: bucket.completionStatus,
    };
  }

  // Map text to ModuleType
  private mapTextToModuleType(text: string): ModuleType | undefined {
    const normalizedText = text.toLowerCase().trim();

    const moduleMap: Record<string, ModuleType> = {
      // Idea/Concept variations
      idea: ModuleType.IDEA_CONCEPT,
      concept: ModuleType.IDEA_CONCEPT,
      "business idea": ModuleType.IDEA_CONCEPT,
      "idea concept": ModuleType.IDEA_CONCEPT,

      // Target Market variations
      target: ModuleType.TARGET_MARKET,
      market: ModuleType.TARGET_MARKET,
      "target market": ModuleType.TARGET_MARKET,
      customers: ModuleType.TARGET_MARKET,
      "target customers": ModuleType.TARGET_MARKET,
      customer: ModuleType.TARGET_MARKET,

      // Value Proposition variations
      value: ModuleType.VALUE_PROPOSITION,
      proposition: ModuleType.VALUE_PROPOSITION,
      "value proposition": ModuleType.VALUE_PROPOSITION,
      "unique value": ModuleType.VALUE_PROPOSITION,

      // Business Model variations
      business: ModuleType.BUSINESS_MODEL,
      model: ModuleType.BUSINESS_MODEL,
      "business model": ModuleType.BUSINESS_MODEL,
      revenue: ModuleType.BUSINESS_MODEL,
      "revenue model": ModuleType.BUSINESS_MODEL,

      // Marketing Strategy variations
      marketing: ModuleType.MARKETING_STRATEGY,
      strategy: ModuleType.MARKETING_STRATEGY,
      "marketing strategy": ModuleType.MARKETING_STRATEGY,
      promotion: ModuleType.MARKETING_STRATEGY,

      // Operations Plan variations
      operations: ModuleType.OPERATIONS_PLAN,
      plan: ModuleType.OPERATIONS_PLAN,
      "operations plan": ModuleType.OPERATIONS_PLAN,
      operation: ModuleType.OPERATIONS_PLAN,

      // Financial Plan variations
      financial: ModuleType.FINANCIAL_PLAN,
      finance: ModuleType.FINANCIAL_PLAN,
      "financial plan": ModuleType.FINANCIAL_PLAN,
      finances: ModuleType.FINANCIAL_PLAN,
      budget: ModuleType.FINANCIAL_PLAN,
    };

    // Try exact match first
    if (moduleMap[normalizedText]) {
      return moduleMap[normalizedText];
    }

    // Try partial matches
    for (const [key, value] of Object.entries(moduleMap)) {
      if (normalizedText.includes(key) || key.includes(normalizedText)) {
        return value;
      }
    }

    return undefined;
  }

  // Get session data (for dashboard display)
  getSessionData(sessionId: string) {
    const session = sessionService.getSession(sessionId);
    if (!session) {
      return null;
    }

    const modules = Array.from(session.contextBuckets.entries()).map(
      ([moduleType, bucket]) => ({
        moduleType,
        data: bucket.data,
        summary: bucket.summary,
        completionStatus: bucket.completionStatus,
        lastUpdated: bucket.lastUpdated,
      })
    );

    return {
      sessionId: session.id,
      mode: session.mode,
      currentAgent: session.currentAgent,
      currentModule: session.currentModule,
      modules,
      conversationHistory: session.conversationHistory.slice(-10), // Last 10 messages
    };
  }

  // Clear session data (start over)
  clearSession(sessionId: string): boolean {
    const session = sessionService.getSession(sessionId);
    if (!session) {
      return false;
    }

    // Create new session with same mode
    const newSession = sessionService.createSession(session.mode);

    // Copy the session ID to maintain continuity
    newSession.id = sessionId;

    // Update the session
    sessionService.updateSession(sessionId, newSession);

    return true;
  }
}

export const chatService = new ChatService();
