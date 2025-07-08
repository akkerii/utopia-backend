"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatService = void 0;
const uuid_1 = require("uuid");
const types_1 = require("../types");
const sessionService_1 = require("./sessionService");
const openAIService_1 = require("./openAIService");
const aiOrchestrator_1 = require("../agents/aiOrchestrator");
const enhancedAgentPrompts_1 = require("../agents/enhancedAgentPrompts");
// import { IntelligentQuestion } from "../agents/intelligentQuestioningEngine";
class ChatService {
    async processMessage(request) {
        let session;
        // Get or create session
        if (request.sessionId) {
            session = sessionService_1.sessionService.getSession(request.sessionId);
        }
        if (!session) {
            // Create new session with the specified mode or default to entrepreneur
            const mode = request.mode || types_1.Mode.ENTREPRENEUR;
            session = sessionService_1.sessionService.createSession(mode);
        }
        // Handle model selection
        let selectedModel;
        if (request.model && openAIService_1.openAIService.isValidModel(request.model)) {
            selectedModel = request.model;
            // Update session's preferred model
            session.preferredModel = selectedModel;
        }
        else {
            // Use session's preferred model or default
            selectedModel = session.preferredModel || openAIService_1.openAIService.getDefaultModel();
        }
        console.log(`🤖 Using model: ${selectedModel} for session: ${session.id}`);
        try {
            // Handle structured responses if provided
            let userMessage = request.message;
            if (request.structuredResponses &&
                request.structuredResponses.length > 0) {
                userMessage = this.formatStructuredResponses(request.message, request.structuredResponses);
            }
            // Add user message to conversation history
            const userMessageObj = {
                id: (0, uuid_1.v4)(),
                role: "user",
                content: userMessage,
                timestamp: new Date(),
                structuredResponses: request.structuredResponses,
            };
            session.conversationHistory.push(userMessageObj);
            // Use AI Orchestrator to make intelligent decisions
            const orchestrationDecision = await aiOrchestrator_1.AIOrchestrator.orchestrateConversation(session, userMessage, session.conversationHistory.length > 0
                ? session.conversationHistory[session.conversationHistory.length - 1].content
                : undefined);
            console.log("AI Orchestration decision:", {
                agent: orchestrationDecision.agent,
                module: orchestrationDecision.module,
                reasoning: orchestrationDecision.reasoning,
                shouldTransition: orchestrationDecision.shouldTransition,
                previousModule: session.currentModule,
            });
            // Check if this is a module transition
            const isModuleTransition = orchestrationDecision.shouldTransition &&
                orchestrationDecision.module !== session.currentModule;
            // Update session with AI orchestrator decisions
            session.currentAgent = orchestrationDecision.agent;
            const previousModule = session.currentModule;
            // Validate and set module
            if (orchestrationDecision.module) {
                // Ensure the module is a valid ModuleType
                const validModules = Object.values(types_1.ModuleType);
                if (validModules.includes(orchestrationDecision.module)) {
                    session.currentModule = orchestrationDecision.module;
                }
                else {
                    console.error("Invalid module from orchestrator:", orchestrationDecision.module);
                    console.error("Valid modules:", validModules);
                    // Keep the current module if invalid
                }
            }
            // Build enhanced context using AI insights
            const context = this.buildAIEnhancedContext(session, orchestrationDecision);
            // Generate AI response using enhanced agent prompts with intelligent context
            let promptPrefix = "";
            if (isModuleTransition &&
                previousModule &&
                orchestrationDecision.module) {
                promptPrefix = `🔄 INTELLIGENT TRANSITION: Moving from ${previousModule} to ${orchestrationDecision.module}
        
AI Orchestrator Reasoning: ${orchestrationDecision.reasoning}
Context Summary: ${orchestrationDecision.contextSummary}

Acknowledge this transition intelligently and guide them through the ${orchestrationDecision.module} module.
Build upon the insights and data already gathered.
        `;
            }
            // Check if AI orchestrator suggests transition to next module
            const shouldTransition = orchestrationDecision.shouldTransition;
            let finalResponse;
            let finalStructuredQuestions = [];
            if (shouldTransition && orchestrationDecision.module) {
                // Generate intelligent transition using AI context
                const transitionPrompt = `${promptPrefix}

The AI Orchestrator has determined it's time to progress. 

ORCHESTRATOR INSIGHTS:
- Context Summary: ${orchestrationDecision.contextSummary}
- Reasoning: ${orchestrationDecision.reasoning}
- Suggested Questions: ${orchestrationDecision.suggestedQuestions.join("; ")}

Please provide:
1. Acknowledgment of what we've accomplished so far
2. Intelligent transition to the new focus area
3. Initial questions that build on our accumulated understanding

Use the enhanced agent prompt capabilities to create a seamless, intelligent transition.`;
                const aiResponseData = await this.generateEnhancedAgentResponse(orchestrationDecision.agent, transitionPrompt, context, selectedModel, true, // Generate structured questions for transitions
                session);
                finalResponse = aiResponseData.response;
                finalStructuredQuestions = aiResponseData.structuredQuestions || [];
            }
            else {
                // Normal processing with AI-enhanced context awareness
                const shouldGenerateStructuredQuestions = this.shouldGenerateIntelligentQuestions(session, userMessage, orchestrationDecision);
                // Check if module is complete - if so, don't generate questions
                const moduleComplete = session.currentModule &&
                    aiOrchestrator_1.AIOrchestrator.isModuleReadyForTransition(session.id, session.currentModule);
                const aiResponseData = await this.generateEnhancedAgentResponse(orchestrationDecision.agent, promptPrefix + userMessage, context, selectedModel, shouldGenerateStructuredQuestions && !moduleComplete, // Don't generate questions if module is complete
                session);
                finalResponse = aiResponseData.response;
                finalStructuredQuestions = aiResponseData.structuredQuestions || [];
                // If module is complete, add a transition message
                if (moduleComplete &&
                    !orchestrationDecision.shouldTransition &&
                    session.currentModule) {
                    const nextModule = aiOrchestrator_1.AIOrchestrator.getNextModule(session.currentModule);
                    if (nextModule) {
                        finalResponse += `\n\n✅ Great! I have a solid understanding of ${this.getModuleDescription(session.currentModule)}. When you're ready, we can move on to explore ${this.getModuleDescription(nextModule)}.`;
                    }
                }
            }
            // Add AI response to conversation history
            const assistantMessage = {
                id: (0, uuid_1.v4)(),
                role: "assistant",
                content: finalResponse,
                agent: orchestrationDecision.agent,
                module: session.currentModule,
                timestamp: new Date(),
                model: selectedModel,
                structuredQuestions: finalStructuredQuestions,
            };
            session.conversationHistory.push(assistantMessage);
            // Extract and update module data
            const updatedModules = [];
            if (session.currentModule) {
                // Try to extract structured data from the conversation
                const combinedText = `User: ${userMessage}\nAssistant: ${finalResponse}`;
                const extractedData = await openAIService_1.openAIService.extractStructuredData(combinedText, session.currentModule, selectedModel);
                if (Object.keys(extractedData).length > 0) {
                    // Generate a summary
                    const summary = await openAIService_1.openAIService.generateModuleSummary(session.currentModule, extractedData, selectedModel);
                    // Update the context bucket
                    const updatedBucket = sessionService_1.sessionService.updateContextBucket(session.id, session.currentModule, extractedData, summary);
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
            sessionService_1.sessionService.updateSession(session.id, session);
            return {
                message: finalResponse,
                sessionId: session.id,
                agent: session.currentAgent,
                currentModule: session.currentModule,
                isModuleTransition: isModuleTransition || shouldTransition,
                updatedModules,
                structuredQuestions: finalStructuredQuestions,
                currentModel: selectedModel,
            };
        }
        catch (error) {
            console.error("Error processing message:", error);
            throw error;
        }
    }
    formatStructuredResponses(originalMessage, responses) {
        let formattedMessage = originalMessage;
        if (responses.length > 0) {
            formattedMessage += "\n\nResponses to your questions:";
            responses.forEach((response, index) => {
                formattedMessage += `\n${index + 1}. ${response.question}`;
                if (Array.isArray(response.response)) {
                    formattedMessage += `\n   Answer: ${response.response.join(", ")}`;
                }
                else {
                    formattedMessage += `\n   Answer: ${response.response}`;
                }
            });
        }
        return formattedMessage;
    }
    // Enhanced context builder that includes data from all modules
    buildEnhancedAgentContext(session) {
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
            if (moduleType !== session.currentModule &&
                bucket.completionStatus !== "empty" &&
                Object.keys(bucket.data).length > 0) {
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
    // Get session data (for dashboard display)
    getSessionData(sessionId) {
        const session = sessionService_1.sessionService.getSession(sessionId);
        if (!session) {
            return null;
        }
        const modules = Array.from(session.contextBuckets.entries()).map(([moduleType, bucket]) => ({
            moduleType,
            data: bucket.data,
            summary: bucket.summary,
            completionStatus: bucket.completionStatus,
            lastUpdated: bucket.lastUpdated,
        }));
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
    clearSession(sessionId) {
        const session = sessionService_1.sessionService.getSession(sessionId);
        if (!session) {
            return false;
        }
        // Clear AI orchestrator memory as well
        aiOrchestrator_1.AIOrchestrator.clearSessionMemory(sessionId);
        // Create new session with same mode
        const newSession = sessionService_1.sessionService.createSession(session.mode);
        // Copy the session ID to maintain continuity
        newSession.id = sessionId;
        // Update the session
        sessionService_1.sessionService.updateSession(sessionId, newSession);
        return true;
    }
    /**
     * Build AI-enhanced context that integrates intelligent insights and bucket system
     */
    buildAIEnhancedContext(session, orchestrationDecision) {
        // Get intelligent context from AI orchestrator
        const intelligentContext = aiOrchestrator_1.AIOrchestrator.getIntelligentContext(session.id);
        // Get bucket-based insights
        const bucketSummary = aiOrchestrator_1.AIOrchestrator.getBucketSummary(session.id);
        // Build traditional context
        const traditionalContext = this.buildEnhancedAgentContext(session);
        // Combine with AI insights
        return `
**🧠 Intelligent Business Understanding**:
${bucketSummary}

**📊 AI Orchestrator Insights**:
- Decision Reasoning: ${orchestrationDecision.reasoning}
- Context Summary: ${orchestrationDecision.contextSummary}
- Suggested Questions: ${orchestrationDecision.suggestedQuestions.join("; ")}

**🎯 Progressive Context Memory**:
${intelligentContext}

**📁 Module Data Context**:
${traditionalContext}

**🔄 Conversation Strategy**:
This conversation uses intelligent bucket-filling to progressively build business understanding. 
Build upon accumulated insights while filling knowledge gaps collaboratively.
    `.trim();
    }
    /**
     * Generate enhanced agent response using new prompts and AI context
     */
    async generateEnhancedAgentResponse(agent, message, context, model, shouldGenerateQuestions, session) {
        // Get enhanced agent prompt
        const enhancedPrompt = (0, enhancedAgentPrompts_1.getEnhancedAgentPrompt)(agent);
        // Combine enhanced prompt with context
        const fullPrompt = `${enhancedPrompt}

**CURRENT CONTEXT**:
${context}

**USER MESSAGE**: ${message}

Please respond using your enhanced capabilities, building upon the conversation memory and context provided.
${shouldGenerateQuestions ? "Include structured questions using the [STRUCTURED_QUESTIONS] format when appropriate." : ""}`;
        try {
            const response = await openAIService_1.openAIService.generateResponse(fullPrompt, 0.7, model);
            // Parse structured questions if they exist
            let structuredQuestions = [];
            if (shouldGenerateQuestions) {
                // Try to use enhanced structured question generation first
                if (session) {
                    try {
                        const enhancedQuestions = await this.generateEnhancedStructuredQuestions(session, message);
                        if (enhancedQuestions.length > 0) {
                            structuredQuestions = enhancedQuestions;
                        }
                    }
                    catch (error) {
                        console.error("Error generating enhanced questions:", error);
                    }
                }
                // Fall back to traditional parsing if enhanced questions failed
                if (structuredQuestions.length === 0) {
                    const questionsMatch = response.match(/\[STRUCTURED_QUESTIONS\]([\s\S]*?)\[\/STRUCTURED_QUESTIONS\]/);
                    if (questionsMatch) {
                        // Parse the questions (this is a simplified parser)
                        const questionsText = questionsMatch[1];
                        const questionLines = questionsText
                            .split("\n")
                            .filter((line) => line.trim().length > 0);
                        structuredQuestions = questionLines
                            .map((line, index) => {
                            const match = line.match(/^\d+\.\s*(.+?)\s*\((.+?)\)/);
                            if (match) {
                                const question = match[1].trim();
                                const optionsText = match[2];
                                if (optionsText.includes("buttons:")) {
                                    const buttonsMatch = optionsText.match(/buttons:\s*(.+)/);
                                    if (buttonsMatch) {
                                        const buttons = buttonsMatch[1]
                                            .split(",")
                                            .map((b) => b.trim());
                                        return {
                                            id: `q_${index}`,
                                            question,
                                            type: "multiple_choice",
                                            options: buttons,
                                        };
                                    }
                                }
                                else if (optionsText.includes("textarea")) {
                                    return {
                                        id: `q_${index}`,
                                        question,
                                        type: "text",
                                    };
                                }
                            }
                            return null;
                        })
                            .filter((q) => q !== null);
                    }
                }
            }
            // Remove structured questions from response
            const cleanResponse = response
                .replace(/\[STRUCTURED_QUESTIONS\][\s\S]*?\[\/STRUCTURED_QUESTIONS\]/g, "")
                .trim();
            return {
                response: cleanResponse,
                structuredQuestions: structuredQuestions.length > 0 ? structuredQuestions : undefined,
            };
        }
        catch (error) {
            console.error("Error in enhanced agent response:", error);
            // Fallback to traditional method
            return await openAIService_1.openAIService.generateAgentResponse(agent, message, context, 0.7, model, shouldGenerateQuestions);
        }
    }
    /**
     * Determine if intelligent questions should be generated using enhanced bucket system
     */
    shouldGenerateIntelligentQuestions(session, userMessage, orchestrationDecision) {
        // Use AI orchestrator's intelligent bucket system
        const shouldGenerate = aiOrchestrator_1.AIOrchestrator.shouldGenerateQuestions(session.id, session.currentModule || types_1.ModuleType.IDEA_CONCEPT);
        // Check if we haven't asked questions recently
        const recentMessages = session.conversationHistory.slice(-3);
        const hasRecentQuestions = recentMessages.some((msg) => msg.role === "assistant" &&
            msg.structuredQuestions &&
            msg.structuredQuestions.length > 0);
        // Enhanced logic: Generate questions based on conversation depth and bucket completeness
        const conversationDepth = session.conversationHistory.length;
        const isEarlyConversation = conversationDepth < 6;
        // Check if orchestrator suggests questions
        const orchestratorSuggests = orchestrationDecision.suggestedQuestions.length > 0;
        // Check if user is asking for guidance
        const lowerMsg = userMessage.toLowerCase();
        const isAskingForHelp = lowerMsg.includes("help") ||
            lowerMsg.includes("what should") ||
            lowerMsg.includes("how do i") ||
            lowerMsg.includes("guide me") ||
            lowerMsg.includes("tell me about");
        // Generate questions if user gave brief/vague responses that need expansion
        const userMessageLength = userMessage.trim().length;
        const needsExpansion = userMessageLength < 50 && conversationDepth > 2;
        // Check if user just submitted responses and we need intelligent follow-up
        const userJustSubmittedResponses = recentMessages.some((msg) => msg.role === "user" &&
            msg.structuredResponses &&
            msg.structuredResponses.length > 0);
        // Generate questions if:
        // 1. AI orchestrator determines we need more information (bucket system)
        // 2. We're in early conversation (bucket building phase)
        // 3. Orchestrator suggests questions and we haven't asked recently
        // 4. User gave brief/vague responses that need expansion
        // 5. User is asking for help/guidance
        // 6. User just submitted responses and we need intelligent follow-up
        // 7. Module transition needs validation
        return (shouldGenerate ||
            (isEarlyConversation && !hasRecentQuestions) ||
            (orchestratorSuggests && !hasRecentQuestions) ||
            needsExpansion ||
            isAskingForHelp ||
            userJustSubmittedResponses ||
            orchestrationDecision.shouldTransition);
    }
    /**
     * Get human-readable module description
     */
    getModuleDescription(moduleType) {
        const descriptions = {
            [types_1.ModuleType.IDEA_CONCEPT]: "your business idea and the problem it solves",
            [types_1.ModuleType.TARGET_MARKET]: "your target market and customer segments",
            [types_1.ModuleType.VALUE_PROPOSITION]: "your unique value proposition",
            [types_1.ModuleType.BUSINESS_MODEL]: "your business model and revenue strategy",
            [types_1.ModuleType.MARKETING_STRATEGY]: "your marketing and customer acquisition strategy",
            [types_1.ModuleType.OPERATIONS_PLAN]: "your operations and execution plan",
            [types_1.ModuleType.FINANCIAL_PLAN]: "your financial projections and funding needs",
        };
        return descriptions[moduleType] || moduleType;
    }
    /**
     * Generate enhanced structured questions using intelligent questioning engine
     */
    async generateEnhancedStructuredQuestions(session, userMessage) {
        // Build insight buckets from conversation
        const buckets = await aiOrchestrator_1.AIOrchestrator.buildInsightBuckets(session, userMessage, session.conversationHistory.length > 0
            ? session.conversationHistory[session.conversationHistory.length - 1]
                .content
            : undefined);
        // Update buckets in memory
        await aiOrchestrator_1.AIOrchestrator.updateInsightBuckets(session.id, buckets);
        // Generate intelligent questions
        const intelligentQuestions = await aiOrchestrator_1.AIOrchestrator.generateSmartQuestions(session, userMessage, session.currentModule || types_1.ModuleType.IDEA_CONCEPT);
        // Convert to structured questions format
        return intelligentQuestions.map((q) => ({
            id: q.id,
            question: q.question,
            type: q.adaptiveOptions && q.adaptiveOptions.length > 0
                ? "multiple_choice"
                : "text",
            options: q.adaptiveOptions || [],
            required: false,
            placeholder: q.validation || "Share your thoughts...",
            metadata: {
                strategy: q.strategy,
                expectedInsight: q.expectedInsight,
                confidenceLevel: q.confidenceLevel,
            },
        }));
    }
}
exports.chatService = new ChatService();
