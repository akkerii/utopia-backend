import { Session, ModuleType } from "../types";
import { openAIService } from "../services/openAIService";

export interface QuestionContext {
  userMessage: string;
  conversationDepth: number;
  knowledgeGaps: string[];
  confidenceScore: number;
  insightLevel: "surface" | "moderate" | "deep" | "expert";
  questionHistory: QuestionMetrics[];
  moduleCompleteness: number;
}

export interface QuestionMetrics {
  type: QuestionType;
  effectiveness: number;
  responseQuality: number;
  insightGenerated: boolean;
  timestamp: Date;
}

export interface IntelligentQuestion {
  id: string;
  question: string;
  type: QuestionType;
  strategy: QuestionStrategy;
  expectedInsight: string;
  followUpPotential: string[];
  confidenceLevel: number;
  adaptiveOptions?: string[];
  validation?: string;
}

export enum QuestionType {
  EXPLORATORY = "exploratory", // Open-ended discovery
  CLARIFYING = "clarifying", // Specific clarification
  VALIDATING = "validating", // Confirm understanding
  EXPANDING = "expanding", // Build upon existing knowledge
  STRATEGIC = "strategic", // Strategic thinking
  TACTICAL = "tactical", // Practical implementation
  EMOTIONAL = "emotional", // Motivation and passion
  ANALYTICAL = "analytical", // Data and analysis
}

export enum QuestionStrategy {
  BUCKET_BUILDING = "bucket_building", // Progressive idea accumulation
  GAP_FILLING = "gap_filling", // Address knowledge gaps
  DEPTH_DIVING = "depth_diving", // Go deeper on existing topics
  CONNECTION_MAKING = "connection_making", // Connect different insights
  VALIDATION_SEEKING = "validation_seeking", // Validate assumptions
  EXPANSION_DRIVING = "expansion_driving", // Expand scope/possibilities
}

export class IntelligentQuestioningEngine {
  private static questionMetrics: Map<string, QuestionMetrics[]> = new Map();

  /**
   * Generate intelligent questions based on conversation context
   */
  static async generateIntelligentQuestions(
    session: Session,
    userMessage: string,
    currentModule: ModuleType,
    conversationMemory: any
  ): Promise<IntelligentQuestion[]> {
    // Analyze current context
    const context = await this.analyzeQuestionContext(
      session,
      userMessage,
      currentModule,
      conversationMemory
    );

    // Determine question strategy
    const strategy = this.determineQuestionStrategy(context);

    // Generate questions using AI
    const questions = await this.generateContextualQuestions(
      session,
      context,
      strategy,
      currentModule
    );

    return questions;
  }

  /**
   * Analyze current conversation context to inform question generation
   */
  private static async analyzeQuestionContext(
    session: Session,
    userMessage: string,
    currentModule: ModuleType,
    conversationMemory: any
  ): Promise<QuestionContext> {
    const conversationDepth = session.conversationHistory.length;
    const moduleMessages = session.conversationHistory.filter(
      (msg) => msg.module === currentModule
    ).length;

    // Analyze knowledge gaps using AI
    const gapAnalysisPrompt = `
    Analyze this business conversation and identify knowledge gaps:
    
    **Current Module**: ${currentModule}
    **User Message**: ${userMessage}
    **Conversation History**: ${session.conversationHistory
      .slice(-5)
      .map((msg) => `${msg.role}: ${msg.content.substring(0, 100)}`)
      .join("\n")}
    **Current Insights**: ${conversationMemory?.keyInsights?.join("; ") || "None"}
    
    Identify:
    1. What critical information is missing?
    2. What aspects need deeper exploration?
    3. What assumptions need validation?
    
    Return JSON: {
      "knowledgeGaps": ["gap1", "gap2"],
      "confidenceScore": 0.0-1.0,
      "insightLevel": "surface|moderate|deep|expert"
    }
    `;

    try {
      const gapResponse = await openAIService.generateResponse(
        gapAnalysisPrompt,
        0.3
      );

      const gapMatch = gapResponse.match(/\{[\s\S]*\}/);
      if (gapMatch) {
        const analysis = JSON.parse(gapMatch[0]);

        return {
          userMessage,
          conversationDepth,
          knowledgeGaps: analysis.knowledgeGaps || [],
          confidenceScore: analysis.confidenceScore || 0.5,
          insightLevel: analysis.insightLevel || "surface",
          questionHistory: this.questionMetrics.get(session.id) || [],
          moduleCompleteness: moduleMessages / 10, // Rough estimate
        };
      }
    } catch (error) {
      console.error("Error analyzing question context:", error);
    }

    // Fallback context
    return {
      userMessage,
      conversationDepth,
      knowledgeGaps: [],
      confidenceScore: 0.5,
      insightLevel: "surface",
      questionHistory: [],
      moduleCompleteness: 0.3,
    };
  }

  /**
   * Determine the best questioning strategy based on context
   */
  private static determineQuestionStrategy(
    context: QuestionContext
  ): QuestionStrategy {
    // Early conversation - focus on bucket building
    if (context.conversationDepth < 3) {
      return QuestionStrategy.BUCKET_BUILDING;
    }

    // Many knowledge gaps - fill them
    if (context.knowledgeGaps.length > 3) {
      return QuestionStrategy.GAP_FILLING;
    }

    // Low confidence - seek validation
    if (context.confidenceScore < 0.4) {
      return QuestionStrategy.VALIDATION_SEEKING;
    }

    // Surface level insights - go deeper
    if (
      context.insightLevel === "surface" &&
      context.moduleCompleteness > 0.3
    ) {
      return QuestionStrategy.DEPTH_DIVING;
    }

    // Good progress - make connections
    if (
      context.insightLevel === "moderate" ||
      context.insightLevel === "deep"
    ) {
      return QuestionStrategy.CONNECTION_MAKING;
    }

    // Default to expansion
    return QuestionStrategy.EXPANSION_DRIVING;
  }

  /**
   * Generate contextual questions using AI with specific strategies
   */
  private static async generateContextualQuestions(
    _session: Session,
    context: QuestionContext,
    strategy: QuestionStrategy,
    _currentModule: ModuleType
  ): Promise<IntelligentQuestion[]> {
    const strategyPrompts = {
      [QuestionStrategy.BUCKET_BUILDING]: `
        Create BUCKET-BUILDING questions that progressively accumulate understanding.
        Focus on: foundational knowledge, core concepts, initial direction
        Style: Mix of choices for quick wins + open exploration
      `,
      [QuestionStrategy.GAP_FILLING]: `
        Create GAP-FILLING questions that address specific missing information.
        Focus on: ${context.knowledgeGaps.join(", ")}
        Style: Targeted, specific, actionable questions
      `,
      [QuestionStrategy.DEPTH_DIVING]: `
        Create DEPTH-DIVING questions that go deeper into existing insights.
        Focus on: expanding current understanding, uncovering nuances
        Style: Thoughtful, analytical, building on what we know
      `,
      [QuestionStrategy.CONNECTION_MAKING]: `
        Create CONNECTION-MAKING questions that link different insights.
        Focus on: relationships, implications, strategic connections
        Style: Strategic, synthesizing, pattern-recognition
      `,
      [QuestionStrategy.VALIDATION_SEEKING]: `
        Create VALIDATION questions that confirm understanding and assumptions.
        Focus on: testing ideas, getting confirmation, reducing uncertainty
        Style: Clarifying, confirming, reality-checking
      `,
      [QuestionStrategy.EXPANSION_DRIVING]: `
        Create EXPANSION questions that open new possibilities and areas.
        Focus on: new opportunities, broader perspectives, growth areas
        Style: Creative, expansive, possibility-focused
      `,
    };

    const questionPrompt = `
    You are an intelligent business advisor creating questions to collaboratively build a business idea.
    
         **Context**:
     - Current Module: ${_currentModule}
     - Strategy: ${strategy}
    - User Message: "${context.userMessage}"
    - Knowledge Gaps: ${context.knowledgeGaps.join(", ") || "None identified"}
    - Insight Level: ${context.insightLevel}
    - Confidence: ${Math.round(context.confidenceScore * 100)}%
    
    **Strategy Instructions**:
    ${strategyPrompts[strategy]}
    
    **Question Generation Rules**:
    1. Create 2-3 intelligent questions that build understanding together
    2. Mix question types: some with choices (buttons), some open-ended (textarea)
    3. Each question should have a clear purpose and expected insight
    4. Build upon previous conversation naturally
    5. Make it feel like collaborative idea building, not interrogation
    
    **Question Types Available**:
    - buttons: For quick selection with 3-4 smart options + custom input
    - textarea: For detailed exploration and open thinking
    - hybrid: Smart choices that lead to follow-up questions
    
    Generate questions in this JSON format:
    {
      "questions": [
        {
          "question": "Clear, engaging question text",
          "type": "buttons|textarea|hybrid",
          "strategy": "${strategy}",
          "expectedInsight": "What insight this should generate",
          "adaptiveOptions": ["Option 1", "Option 2", "Option 3", "Other..."],
          "validation": "How to validate the response"
        }
      ]
    }
    
    Make questions feel collaborative and intelligent - like working together to build something amazing!
    `;

    try {
      const response = await openAIService.generateResponse(
        questionPrompt,
        0.6
      );
      const questionsMatch = response.match(/\{[\s\S]*\}/);

      if (questionsMatch) {
        const result = JSON.parse(questionsMatch[0]);

        return result.questions.map((q: any, index: number) => ({
          id: `iq_${Date.now()}_${index}`,
          question: q.question,
          type: this.mapToQuestionType(q.type, strategy),
          strategy,
          expectedInsight: q.expectedInsight || "",
          followUpPotential: [],
          confidenceLevel: context.confidenceScore,
          adaptiveOptions: q.adaptiveOptions || [],
          validation: q.validation || "",
        }));
      }
    } catch (error) {
      console.error("Error generating contextual questions:", error);
    }

    // Fallback questions
    return this.generateFallbackQuestions(_currentModule, strategy);
  }

  /**
   * Map question types to our enum
   */
  private static mapToQuestionType(
    type: string,
    strategy: QuestionStrategy
  ): QuestionType {
    const strategyTypeMap: Record<QuestionStrategy, QuestionType> = {
      [QuestionStrategy.BUCKET_BUILDING]: QuestionType.EXPLORATORY,
      [QuestionStrategy.GAP_FILLING]: QuestionType.CLARIFYING,
      [QuestionStrategy.DEPTH_DIVING]: QuestionType.ANALYTICAL,
      [QuestionStrategy.CONNECTION_MAKING]: QuestionType.STRATEGIC,
      [QuestionStrategy.VALIDATION_SEEKING]: QuestionType.VALIDATING,
      [QuestionStrategy.EXPANSION_DRIVING]: QuestionType.EXPANDING,
    };

    if (type === "textarea") return QuestionType.EXPLORATORY;
    if (type === "buttons") return QuestionType.CLARIFYING;

    return strategyTypeMap[strategy] || QuestionType.EXPLORATORY;
  }

  /**
   * Generate fallback questions if AI generation fails
   */
  private static generateFallbackQuestions(
    currentModule: ModuleType,
    strategy: QuestionStrategy
  ): IntelligentQuestion[] {
    const fallbackQuestions: Record<ModuleType, IntelligentQuestion[]> = {
      [ModuleType.IDEA_CONCEPT]: [
        {
          id: "fallback_1",
          question: "What excites you most about this business idea?",
          type: QuestionType.EMOTIONAL,
          strategy,
          expectedInsight: "Understand motivation and passion",
          followUpPotential: ["passion areas", "problem connection"],
          confidenceLevel: 0.7,
          adaptiveOptions: [
            "Solving problems",
            "Creating value",
            "Building something new",
            "Making money",
          ],
        },
      ],
      // ... other modules would have their fallbacks
    } as any;

    return fallbackQuestions[currentModule] || [];
  }

  /**
   * Track question effectiveness for learning
   */
  static trackQuestionMetrics(
    sessionId: string,
    _questionId: string,
    type: QuestionType,
    responseQuality: number,
    insightGenerated: boolean
  ): void {
    const metrics = this.questionMetrics.get(sessionId) || [];

    metrics.push({
      type,
      effectiveness: responseQuality,
      responseQuality,
      insightGenerated,
      timestamp: new Date(),
    });

    // Keep only recent metrics
    if (metrics.length > 20) {
      metrics.splice(0, metrics.length - 20);
    }

    this.questionMetrics.set(sessionId, metrics);
  }

  /**
   * Clear metrics for a session
   */
  static clearMetrics(sessionId: string): void {
    this.questionMetrics.delete(sessionId);
  }
}
