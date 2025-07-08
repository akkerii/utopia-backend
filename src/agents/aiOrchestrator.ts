import { Session, AgentType, ModuleType, OpenAIModel } from "../types";
import { openAIService } from "../services/openAIService";
import {
  IntelligentQuestioningEngine,
  QuestionStrategy,
  IntelligentQuestion,
} from "./intelligentQuestioningEngine";

interface ConversationContext {
  currentFocus: string;
  keyInsights: string[];
  progressionStage: string;
  readinessForNext: boolean;
  suggestedNextSteps: string[];
  collectedData: Record<string, any>;
  // Enhanced bucket system
  insightBuckets: InsightBucket[];
  confidenceScores: Record<string, number>;
  connectionMap: Record<string, string[]>;
  questioningStrategy: QuestionStrategy;
}

interface InsightBucket {
  id: string;
  category: string;
  insights: InsightItem[];
  completeness: number;
  confidence: number;
  connections: string[];
  lastUpdated: Date;
}

interface InsightItem {
  id: string;
  content: string;
  type:
    | "fact"
    | "assumption"
    | "preference"
    | "goal"
    | "concern"
    | "opportunity";
  confidence: number;
  source: string;
  timestamp: Date;
  validated: boolean;
}

interface OrchestrationDecision {
  agent: AgentType;
  module?: ModuleType;
  reasoning: string;
  shouldTransition: boolean;
  contextSummary: string;
  suggestedQuestions: string[];
  memoryUpdates: MemoryUpdate[];
}

interface MemoryUpdate {
  type: "insight" | "data" | "decision" | "progression";
  content: string;
  moduleContext?: ModuleType;
  importance: "high" | "medium" | "low";
}

export class AIOrchestrator {
  private static conversationMemory: Map<string, ConversationContext> =
    new Map();

  /**
   * Main orchestration method - uses AI to decide next steps
   */
  static async orchestrateConversation(
    session: Session,
    userMessage: string,
    previousResponse?: string
  ): Promise<OrchestrationDecision> {
    // Build comprehensive context
    const contextData = await this.buildIntelligentContext(
      session,
      userMessage,
      previousResponse
    );

    // Use AI to make orchestration decisions
    const decision = await this.makeOrchestrationDecision(
      session,
      userMessage,
      contextData
    );

    // Update conversation memory
    await this.updateConversationMemory(session.id, decision, userMessage);

    return decision;
  }

  /**
   * Build intelligent context using AI analysis
   */
  private static async buildIntelligentContext(
    session: Session,
    userMessage: string,
    previousResponse?: string
  ): Promise<ConversationContext> {
    // Get existing memory
    const existingMemory = this.conversationMemory.get(session.id) || {
      currentFocus: "",
      keyInsights: [],
      progressionStage: "initial",
      readinessForNext: false,
      suggestedNextSteps: [],
      collectedData: {},
      insightBuckets: [],
      confidenceScores: {},
      connectionMap: {},
      questioningStrategy: QuestionStrategy.BUCKET_BUILDING,
    };

    // Recent conversation context
    const recentMessages = session.conversationHistory.slice(-6);
    const conversationSummary = recentMessages
      .map((msg) => `${msg.role}: ${msg.content.substring(0, 200)}`)
      .join("\n");

    // Module data summary
    const moduleData = this.summarizeModuleData(session);

    // AI context analysis prompt
    const contextPrompt = `
    Analyze this business advisory conversation and provide intelligent context:

    **Conversation Mode**: ${session.mode}
    **Current Module**: ${session.currentModule || "None"}
    **User Message**: ${userMessage}
    ${previousResponse ? `**Previous AI Response**: ${previousResponse}` : ""}

    **Recent Conversation**:
    ${conversationSummary}

    **Existing Module Data**:
    ${moduleData}

    **Previous Insights**: ${existingMemory.keyInsights.join("; ")}
    **Current Focus**: ${existingMemory.currentFocus}

    Analyze and provide:
    1. **Current Focus**: What is the conversation currently focused on?
    2. **Key Insights**: What important insights have been gathered? (list key points)
    3. **Progression Stage**: Where are we in the business development journey?
    4. **Readiness for Next**: Is the current topic ready to progress to the next stage?
    5. **Suggested Next Steps**: What should happen next in the conversation?
    6. **Collected Data**: What structured data has been collected? (JSON format)

    Respond in JSON format:
    {
      "currentFocus": "string",
      "keyInsights": ["string"],
      "progressionStage": "string", 
      "readinessForNext": boolean,
      "suggestedNextSteps": ["string"],
      "collectedData": {}
    }
    `;

    try {
      const contextResponse = await openAIService.generateResponse(
        contextPrompt,
        0.3, // Lower temperature for more consistent analysis
        session.preferredModel || OpenAIModel.GPT_4O
      );

      // Parse AI response
      const contextMatch = contextResponse.match(/\{[\s\S]*\}/);
      if (contextMatch) {
        const aiContext = JSON.parse(contextMatch[0]);
        return {
          ...existingMemory,
          ...aiContext,
        };
      }
    } catch (error) {
      console.error("Error in AI context analysis:", error);
    }

    return existingMemory;
  }

  /**
   * Use AI to make orchestration decisions
   */
  private static async makeOrchestrationDecision(
    session: Session,
    userMessage: string,
    context: ConversationContext
  ): Promise<OrchestrationDecision> {
    // First check if current module is ready for automatic transition
    const currentModule = session.currentModule || ModuleType.IDEA_CONCEPT;

    // Count how many rounds of structured questions we've already asked for this module
    const structuredQuestionRoundsForModule =
      session.conversationHistory.filter(
        (msg) =>
          msg.role === "assistant" &&
          msg.module === currentModule &&
          msg.structuredQuestions &&
          msg.structuredQuestions.length > 0
      ).length;

    // If we've already asked 3 rounds, treat module as ready to move on
    const questionLimitReached = structuredQuestionRoundsForModule >= 3;

    const isReadyForTransition =
      this.isModuleReadyForTransition(session.id, currentModule) ||
      questionLimitReached;

    const nextModule = this.getNextModule(currentModule);

    // Check if we should stop asking questions for this module
    const shouldStopQuestions =
      !this.shouldGenerateQuestions(session.id, currentModule) ||
      questionLimitReached;

    // If module is complete and there's a next module, prepare for transition
    if (isReadyForTransition && nextModule && shouldStopQuestions) {
      console.log(
        `Module ${currentModule} is complete. Ready to transition to ${nextModule}`
      );

      // Determine the appropriate agent for the next module
      const nextAgent = this.getAgentForModule(nextModule);

      return {
        agent: nextAgent,
        module: nextModule,
        reasoning: questionLimitReached
          ? `Collected enough initial insights (3 question rounds) in ${currentModule}. Progressing to ${nextModule} for the next phase of your business plan.`
          : `The ${currentModule} module has sufficient information (70%+ complete). Time to progress to ${nextModule} to continue building your business strategy.`,
        shouldTransition: true,
        contextSummary: `We have a solid understanding of ${this.getModuleDescription(currentModule)}. Now let's explore ${this.getModuleDescription(nextModule)}.`,
        suggestedQuestions: [],
        memoryUpdates: [
          {
            type: "progression",
            content: `Completed ${currentModule} module, transitioning to ${nextModule}`,
            moduleContext: currentModule,
            importance: "high",
          },
        ],
      };
    }

    // Build orchestration prompt with transition awareness
    const orchestrationPrompt = `
    You are an AI Business Advisory Orchestrator. Your job is to intelligently guide business conversations and decide the best next steps.

    **Available Agents**:
    - IDEA: For brainstorming, concept development, problem identification
    - STRATEGY: For market analysis, value propositions, business models  
    - FINANCE: For financial planning, pricing, budgets, funding
    - OPERATIONS: For execution planning, processes, team structure

    **Available Modules** (progressive flow):
    - IDEA_CONCEPT: Core business idea and problem
    - TARGET_MARKET: Customer segments and market analysis
    - VALUE_PROPOSITION: Unique value and differentiation
    - BUSINESS_MODEL: Revenue model and structure
    - MARKETING_STRATEGY: Customer acquisition and marketing
    - OPERATIONS_PLAN: Execution and delivery processes
    - FINANCIAL_PLAN: Financial projections and funding

    **Current Situation**:
    - Mode: ${session.mode}
    - Current Module: ${session.currentModule || "None"}
    - Module Ready for Transition: ${isReadyForTransition}
    - Should Stop Questions: ${shouldStopQuestions}
    - Next Module Available: ${nextModule || "None"}
    - Current Focus: ${context.currentFocus}
    - Progression Stage: ${context.progressionStage}
    
    **User Message**: "${userMessage}"
    
    **Context**: 
    - Key Insights: ${context.keyInsights.join("; ")}
    - Insight Buckets: ${context.insightBuckets.length} buckets with ${context.insightBuckets.reduce((sum, b) => sum + b.insights.length, 0)} total insights
    - Average Completeness: ${context.insightBuckets.length > 0 ? Math.round((context.insightBuckets.reduce((sum, b) => sum + b.completeness, 0) / context.insightBuckets.length) * 100) : 0}%

    **IMPORTANT Decision Guidelines**:
    1. If module is ready for transition (${isReadyForTransition}) and should stop questions (${shouldStopQuestions}), MUST transition to next module
    2. Don't keep asking questions if module has sufficient information (70%+ complete)
    3. Follow the logical flow: Idea → Target Market → Value Proposition → Business Model → Marketing Strategy
    4. Only stay in current module if truly need more information
    5. User message context can override automatic transition if they ask about something specific

    Provide your orchestration decision in JSON format:
    {
      "agent": "AgentType",
      "module": "ModuleType or null",
      "reasoning": "Why this decision makes sense",
      "shouldTransition": boolean,
      "contextSummary": "Summary of current understanding",
      "suggestedQuestions": ["Question 1", "Question 2"],
      "memoryUpdates": [
        {
          "type": "insight|data|decision|progression",
          "content": "What to remember",
          "moduleContext": "ModuleType or null",
          "importance": "high|medium|low"
        }
      ]
    }
    `;

    try {
      const decisionResponse = await openAIService.generateResponse(
        orchestrationPrompt,
        0.4, // Moderate temperature for balanced decision making
        session.preferredModel || OpenAIModel.GPT_4O
      );

      // Parse AI response
      const decisionMatch = decisionResponse.match(/\{[\s\S]*\}/);
      if (decisionMatch) {
        const decision = JSON.parse(decisionMatch[0]);

        // Validate agent
        let validAgent = AgentType.IDEA;
        if (
          decision.agent &&
          Object.values(AgentType).includes(decision.agent)
        ) {
          validAgent = decision.agent;
        } else if (decision.agent) {
          console.warn(
            `Invalid agent type from AI: ${decision.agent}, using default IDEA`
          );
        }

        // Validate module
        let validModule = session.currentModule;
        if (decision.module === null || decision.module === "null") {
          validModule = undefined;
        } else if (
          decision.module &&
          Object.values(ModuleType).includes(decision.module)
        ) {
          validModule = decision.module;
        } else if (decision.module) {
          console.warn(
            `Invalid module type from AI: ${decision.module}, keeping current: ${session.currentModule}`
          );
        }

        console.log("AI Orchestrator validation:", {
          originalAgent: decision.agent,
          validAgent,
          originalModule: decision.module,
          validModule,
          sessionCurrentModule: session.currentModule,
          isReadyForTransition,
          shouldStopQuestions,
        });

        // Validate and default values
        return {
          agent: validAgent,
          module: validModule,
          reasoning: decision.reasoning || "Default decision",
          shouldTransition: decision.shouldTransition || false,
          contextSummary: decision.contextSummary || "",
          suggestedQuestions: decision.suggestedQuestions || [],
          memoryUpdates: decision.memoryUpdates || [],
        };
      }
    } catch (error) {
      console.error("Error in AI orchestration decision:", error);
    }

    // Fallback to simple logic if AI fails
    return this.fallbackDecision(session, userMessage, context);
  }

  /**
   * Update conversation memory with new insights
   */
  private static async updateConversationMemory(
    sessionId: string,
    decision: OrchestrationDecision,
    _userMessage: string
  ): Promise<void> {
    const currentMemory = this.conversationMemory.get(sessionId) || {
      currentFocus: "",
      keyInsights: [],
      progressionStage: "initial",
      readinessForNext: false,
      suggestedNextSteps: [],
      collectedData: {},
      insightBuckets: [],
      confidenceScores: {},
      connectionMap: {},
      questioningStrategy: QuestionStrategy.BUCKET_BUILDING,
    };

    // Process memory updates from the decision
    for (const update of decision.memoryUpdates) {
      switch (update.type) {
        case "insight":
          if (!currentMemory.keyInsights.includes(update.content)) {
            currentMemory.keyInsights.push(update.content);
            // Keep only the most recent 10 insights
            if (currentMemory.keyInsights.length > 10) {
              currentMemory.keyInsights = currentMemory.keyInsights.slice(-10);
            }
          }
          break;

        case "data":
          // Store structured data
          if (update.moduleContext) {
            currentMemory.collectedData[update.moduleContext] = {
              ...currentMemory.collectedData[update.moduleContext],
              content: update.content,
              timestamp: new Date().toISOString(),
            };
          }
          break;

        case "progression":
          currentMemory.progressionStage = update.content;
          break;
      }
    }

    // Update current focus and readiness
    currentMemory.currentFocus = decision.contextSummary;
    currentMemory.readinessForNext = decision.shouldTransition;
    currentMemory.suggestedNextSteps = decision.suggestedQuestions;

    this.conversationMemory.set(sessionId, currentMemory);
  }

  /**
   * Get intelligent conversation summary for agent prompts
   */
  static getIntelligentContext(sessionId: string): string {
    const memory = this.conversationMemory.get(sessionId);
    if (!memory) return "";

    return `
**Business Context Understanding**:
- Current Focus: ${memory.currentFocus}
- Progression Stage: ${memory.progressionStage}
- Key Insights Gathered: ${memory.keyInsights.join("; ")}
- Ready for Next Step: ${memory.readinessForNext ? "Yes" : "No"}
- Suggested Next Steps: ${memory.suggestedNextSteps.join("; ")}

**Collected Business Data**:
${Object.entries(memory.collectedData)
  .map(([module, data]) => `- ${module}: ${JSON.stringify(data)}`)
  .join("\n")}
    `;
  }

  /**
   * Suggest intelligent follow-up questions
   */
  static async generateIntelligentQuestions(
    session: Session,
    currentModule: ModuleType,
    context: ConversationContext
  ): Promise<string[]> {
    const questionPrompt = `
    Generate intelligent follow-up questions for a business advisory conversation.

    **Current Module**: ${currentModule}
    **Current Focus**: ${context.currentFocus}
    **Key Insights**: ${context.keyInsights.join("; ")}
    **Collected Data**: ${JSON.stringify(context.collectedData)}
    **Readiness for Next**: ${context.readinessForNext}

    Generate 3-4 smart follow-up questions that:
    1. Build upon what's already been discussed
    2. Fill important gaps in understanding
    3. Help progress the conversation naturally
    4. Are specific to the current business context

    Return as JSON array of strings:
    ["Question 1", "Question 2", "Question 3"]
    `;

    try {
      const response = await openAIService.generateResponse(
        questionPrompt,
        0.5,
        session.preferredModel || OpenAIModel.GPT_4O
      );

      const questionsMatch = response.match(/\[[\s\S]*?\]/);
      if (questionsMatch) {
        return JSON.parse(questionsMatch[0]);
      }
    } catch (error) {
      console.error("Error generating intelligent questions:", error);
    }

    return [];
  }

  /**
   * Fallback decision logic
   */
  private static fallbackDecision(
    session: Session,
    userMessage: string,
    _context: ConversationContext
  ): OrchestrationDecision {
    // Simple keyword-based fallback
    const lowerMessage = userMessage.toLowerCase();

    let agent = AgentType.IDEA;
    let module = session.currentModule;

    if (lowerMessage.includes("market") || lowerMessage.includes("customer")) {
      agent = AgentType.STRATEGY;
      module = ModuleType.TARGET_MARKET;
    } else if (
      lowerMessage.includes("value") ||
      lowerMessage.includes("proposition")
    ) {
      agent = AgentType.STRATEGY;
      module = ModuleType.VALUE_PROPOSITION;
    } else if (
      lowerMessage.includes("money") ||
      lowerMessage.includes("cost") ||
      lowerMessage.includes("price")
    ) {
      agent = AgentType.FINANCE;
      module = ModuleType.FINANCIAL_PLAN;
    } else if (
      lowerMessage.includes("process") ||
      lowerMessage.includes("operation")
    ) {
      agent = AgentType.OPERATIONS;
      module = ModuleType.OPERATIONS_PLAN;
    }

    return {
      agent,
      module,
      reasoning: "Fallback keyword-based decision",
      shouldTransition: false,
      contextSummary: "Basic analysis of user message",
      suggestedQuestions: [],
      memoryUpdates: [],
    };
  }

  /**
   * Summarize module data for context
   */
  private static summarizeModuleData(session: Session): string {
    const summaries: string[] = [];

    session.contextBuckets.forEach((bucket, moduleType) => {
      if (
        bucket.completionStatus !== "empty" &&
        Object.keys(bucket.data).length > 0
      ) {
        summaries.push(
          `${moduleType}: ${bucket.summary || JSON.stringify(bucket.data)}`
        );
      }
    });

    return summaries.join("\n") || "No module data collected yet";
  }

  /**
   * Clear memory for a session
   */
  static clearSessionMemory(sessionId: string): void {
    this.conversationMemory.delete(sessionId);
  }

  /**
   * Get conversation insights for external use
   */
  static getConversationInsights(
    sessionId: string
  ): ConversationContext | null {
    return this.conversationMemory.get(sessionId) || null;
  }

  /**
   * Generate intelligent questions using the questioning engine
   */
  static async generateSmartQuestions(
    session: Session,
    userMessage: string,
    currentModule: ModuleType
  ): Promise<IntelligentQuestion[]> {
    const conversationMemory = this.conversationMemory.get(session.id);

    const questions =
      await IntelligentQuestioningEngine.generateIntelligentQuestions(
        session,
        userMessage,
        currentModule,
        conversationMemory
      );

    // Track questioning strategy
    if (conversationMemory && questions.length > 0) {
      conversationMemory.questioningStrategy = questions[0].strategy;
      this.conversationMemory.set(session.id, conversationMemory);
    }

    return questions;
  }

  /**
   * Build insight buckets from conversation data
   */
  static async buildInsightBuckets(
    session: Session,
    userMessage: string,
    previousResponse?: string
  ): Promise<InsightBucket[]> {
    const existingMemory = this.conversationMemory.get(session.id);
    const currentBuckets = existingMemory?.insightBuckets || [];

    const bucketPrompt = `
    Analyze this business conversation and organize insights into categorized buckets.

    **User Message**: ${userMessage}
    ${previousResponse ? `**Previous Response**: ${previousResponse}` : ""}
    
    **Conversation History**: ${session.conversationHistory
      .slice(-5)
      .map((msg) => `${msg.role}: ${msg.content.substring(0, 150)}`)
      .join("\n")}
    
    **Current Module**: ${session.currentModule || "None"}
    **Existing Buckets**: ${currentBuckets.map((b) => `${b.category}: ${b.insights.length} insights`).join(", ")}

    Create/update insight buckets for business understanding:
    
    **Bucket Categories** (select relevant ones):
    - Problem Understanding: What problems are being addressed?
    - Solution Concept: What solutions are being proposed?
    - Target Market: Who are the customers/users?
    - Value Proposition: What unique value is offered?
    - Business Model: How will revenue be generated?
    - Market Opportunity: What's the market size and opportunity?
    - Competitive Landscape: Who are the competitors?
    - Implementation Strategy: How will this be executed?
    - Financial Considerations: What are the costs and revenue projections?
    - Risk Factors: What are the potential challenges?

    For each insight, determine:
    - Type: fact, assumption, preference, goal, concern, opportunity
    - Confidence: 0.0-1.0
    - Connections: Related bucket categories

    Return JSON format:
    {
      "buckets": [
        {
          "category": "Problem Understanding",
          "insights": [
            {
              "content": "Specific insight content",
              "type": "fact|assumption|preference|goal|concern|opportunity",
              "confidence": 0.8,
              "connections": ["Solution Concept", "Target Market"]
            }
          ],
          "completeness": 0.6,
          "confidence": 0.7
        }
      ]
    }
    `;

    try {
      const response = await openAIService.generateResponse(bucketPrompt, 0.4);
      const bucketMatch = response.match(/\{[\s\S]*\}/);

      if (bucketMatch) {
        const result = JSON.parse(bucketMatch[0]);

        const newBuckets: InsightBucket[] = result.buckets.map(
          (bucket: any) => ({
            id: `bucket_${bucket.category.replace(/\s+/g, "_").toLowerCase()}`,
            category: bucket.category,
            insights: bucket.insights.map((insight: any, index: number) => ({
              id: `insight_${Date.now()}_${index}`,
              content: insight.content,
              type: insight.type,
              confidence: insight.confidence,
              source: "conversation",
              timestamp: new Date(),
              validated: false,
            })),
            completeness: bucket.completeness || 0.5,
            confidence: bucket.confidence || 0.5,
            connections: bucket.insights.reduce(
              (acc: string[], insight: any) => {
                return [...acc, ...(insight.connections || [])];
              },
              []
            ),
            lastUpdated: new Date(),
          })
        );

        return newBuckets;
      }
    } catch (error) {
      console.error("Error building insight buckets:", error);
    }

    return currentBuckets;
  }

  /**
   * Update insight buckets with new information
   */
  static async updateInsightBuckets(
    sessionId: string,
    newBuckets: InsightBucket[]
  ): Promise<void> {
    const existingMemory = this.conversationMemory.get(sessionId);
    if (!existingMemory) return;

    // Merge new buckets with existing ones
    const mergedBuckets = [...existingMemory.insightBuckets];

    newBuckets.forEach((newBucket) => {
      const existingIndex = mergedBuckets.findIndex(
        (b) => b.category === newBucket.category
      );

      if (existingIndex >= 0) {
        // Update existing bucket
        mergedBuckets[existingIndex] = {
          ...mergedBuckets[existingIndex],
          insights: [
            ...mergedBuckets[existingIndex].insights,
            ...newBucket.insights,
          ],
          completeness: Math.max(
            mergedBuckets[existingIndex].completeness,
            newBucket.completeness
          ),
          confidence:
            (mergedBuckets[existingIndex].confidence + newBucket.confidence) /
            2,
          connections: [
            ...new Set([
              ...mergedBuckets[existingIndex].connections,
              ...newBucket.connections,
            ]),
          ],
          lastUpdated: new Date(),
        };
      } else {
        // Add new bucket
        mergedBuckets.push(newBucket);
      }
    });

    existingMemory.insightBuckets = mergedBuckets;
    this.conversationMemory.set(sessionId, existingMemory);
  }

  /**
   * Get intelligent bucket summary for prompts
   */
  static getBucketSummary(sessionId: string): string {
    const memory = this.conversationMemory.get(sessionId);
    if (!memory || memory.insightBuckets.length === 0) {
      return "No insights collected yet - this is a fresh conversation.";
    }

    const bucketSummaries = memory.insightBuckets
      .map((bucket) => {
        const insightSummary = bucket.insights
          .map(
            (insight) =>
              `${insight.type}: ${insight.content} (${Math.round(insight.confidence * 100)}% confident)`
          )
          .join("; ");

        return `**${bucket.category}** (${Math.round(bucket.completeness * 100)}% complete): ${insightSummary}`;
      })
      .join("\n");

    return `
**Accumulated Business Understanding** (${memory.insightBuckets.length} insight buckets):
${bucketSummaries}

**Current Questioning Strategy**: ${memory.questioningStrategy}
**Overall Confidence**: ${Object.values(memory.confidenceScores).reduce((a, b) => a + b, 0) / Object.keys(memory.confidenceScores).length || 0}
    `;
  }

  /**
   * Determine if more questions are needed
   */
  static shouldGenerateQuestions(
    sessionId: string,
    currentModule: ModuleType
  ): boolean {
    const memory = this.conversationMemory.get(sessionId);
    if (!memory) return true;

    // Check if current module has sufficient information
    const relevantBuckets = memory.insightBuckets.filter(
      (bucket) =>
        bucket.category.toLowerCase().includes(currentModule.toLowerCase()) ||
        bucket.connections.includes(currentModule)
    );

    if (relevantBuckets.length === 0) return true;

    const avgCompleteness =
      relevantBuckets.reduce((sum, bucket) => sum + bucket.completeness, 0) /
      relevantBuckets.length;

    // Don't generate questions if module is sufficiently complete
    return avgCompleteness < 0.7; // Generate questions if less than 70% complete
  }

  /**
   * Check if current module is ready for transition
   */
  static isModuleReadyForTransition(
    sessionId: string,
    currentModule: ModuleType
  ): boolean {
    const memory = this.conversationMemory.get(sessionId);
    if (!memory) return false;

    // Module-specific completion criteria
    const moduleCompletionCriteria: Record<ModuleType, string[]> = {
      [ModuleType.IDEA_CONCEPT]: ["Problem Understanding", "Solution Concept"],
      [ModuleType.TARGET_MARKET]: ["Target Market", "Market Opportunity"],
      [ModuleType.VALUE_PROPOSITION]: [
        "Value Proposition",
        "Competitive Landscape",
      ],
      [ModuleType.BUSINESS_MODEL]: [
        "Business Model",
        "Financial Considerations",
      ],
      [ModuleType.MARKETING_STRATEGY]: [
        "Marketing Strategy",
        "Implementation Strategy",
      ],
      [ModuleType.OPERATIONS_PLAN]: [
        "Operations Plan",
        "Implementation Strategy",
      ],
      [ModuleType.FINANCIAL_PLAN]: ["Financial Considerations", "Risk Factors"],
    };

    const requiredCategories = moduleCompletionCriteria[currentModule] || [];

    // Check if all required categories have sufficient insights
    const relevantBuckets = memory.insightBuckets.filter((bucket) =>
      requiredCategories.some((cat) =>
        bucket.category.toLowerCase().includes(cat.toLowerCase())
      )
    );

    if (relevantBuckets.length === 0) return false;

    // Calculate average completeness
    const avgCompleteness =
      relevantBuckets.reduce((sum, bucket) => sum + bucket.completeness, 0) /
      relevantBuckets.length;

    // Check if we have enough insights
    const totalInsights = relevantBuckets.reduce(
      (sum, bucket) => sum + bucket.insights.length,
      0
    );

    // Module is ready if:
    // 1. Average completeness > 70%
    // 2. At least 3 insights per required category
    // 3. High confidence (> 0.7)
    const avgConfidence =
      relevantBuckets.reduce((sum, bucket) => sum + bucket.confidence, 0) /
      relevantBuckets.length;

    return (
      avgCompleteness >= 0.7 &&
      totalInsights >= requiredCategories.length * 3 &&
      avgConfidence >= 0.7
    );
  }

  /**
   * Get next logical module in the business flow
   */
  static getNextModule(currentModule: ModuleType): ModuleType | null {
    const moduleFlow: Record<ModuleType, ModuleType | null> = {
      [ModuleType.IDEA_CONCEPT]: ModuleType.TARGET_MARKET,
      [ModuleType.TARGET_MARKET]: ModuleType.VALUE_PROPOSITION,
      [ModuleType.VALUE_PROPOSITION]: ModuleType.BUSINESS_MODEL,
      [ModuleType.BUSINESS_MODEL]: ModuleType.MARKETING_STRATEGY,
      [ModuleType.MARKETING_STRATEGY]: ModuleType.OPERATIONS_PLAN,
      [ModuleType.OPERATIONS_PLAN]: ModuleType.FINANCIAL_PLAN,
      [ModuleType.FINANCIAL_PLAN]: null, // End of flow
    };

    return moduleFlow[currentModule] || null;
  }

  /**
   * Get appropriate agent for a module
   */
  private static getAgentForModule(moduleType: ModuleType): AgentType {
    const moduleAgentMap: Record<ModuleType, AgentType> = {
      [ModuleType.IDEA_CONCEPT]: AgentType.IDEA,
      [ModuleType.TARGET_MARKET]: AgentType.STRATEGY,
      [ModuleType.VALUE_PROPOSITION]: AgentType.STRATEGY,
      [ModuleType.BUSINESS_MODEL]: AgentType.STRATEGY,
      [ModuleType.MARKETING_STRATEGY]: AgentType.STRATEGY,
      [ModuleType.OPERATIONS_PLAN]: AgentType.OPERATIONS,
      [ModuleType.FINANCIAL_PLAN]: AgentType.FINANCE,
    };

    return moduleAgentMap[moduleType] || AgentType.IDEA;
  }

  /**
   * Get human-readable module description
   */
  private static getModuleDescription(moduleType: ModuleType): string {
    const descriptions: Record<ModuleType, string> = {
      [ModuleType.IDEA_CONCEPT]: "your business idea and the problem it solves",
      [ModuleType.TARGET_MARKET]: "your target market and customer segments",
      [ModuleType.VALUE_PROPOSITION]: "your unique value proposition",
      [ModuleType.BUSINESS_MODEL]: "your business model and revenue strategy",
      [ModuleType.MARKETING_STRATEGY]:
        "your marketing and customer acquisition strategy",
      [ModuleType.OPERATIONS_PLAN]: "your operations and execution plan",
      [ModuleType.FINANCIAL_PLAN]:
        "your financial projections and funding needs",
    };

    return descriptions[moduleType] || moduleType;
  }
}
