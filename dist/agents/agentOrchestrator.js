"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentOrchestrator = void 0;
const types_1 = require("../types");
// Map modules to their primary and related agents
const moduleAgentMap = {
    [types_1.ModuleType.IDEA_CONCEPT]: {
        primaryAgent: types_1.AgentType.IDEA,
        relatedAgents: [types_1.AgentType.STRATEGY],
    },
    [types_1.ModuleType.TARGET_MARKET]: {
        primaryAgent: types_1.AgentType.STRATEGY,
        relatedAgents: [types_1.AgentType.IDEA],
    },
    [types_1.ModuleType.VALUE_PROPOSITION]: {
        primaryAgent: types_1.AgentType.STRATEGY,
        relatedAgents: [types_1.AgentType.IDEA],
    },
    [types_1.ModuleType.BUSINESS_MODEL]: {
        primaryAgent: types_1.AgentType.STRATEGY,
        relatedAgents: [types_1.AgentType.FINANCE],
    },
    [types_1.ModuleType.MARKETING_STRATEGY]: {
        primaryAgent: types_1.AgentType.STRATEGY,
        relatedAgents: [types_1.AgentType.OPERATIONS],
    },
    [types_1.ModuleType.OPERATIONS_PLAN]: {
        primaryAgent: types_1.AgentType.OPERATIONS,
        relatedAgents: [types_1.AgentType.STRATEGY, types_1.AgentType.FINANCE],
    },
    [types_1.ModuleType.FINANCIAL_PLAN]: {
        primaryAgent: types_1.AgentType.FINANCE,
        relatedAgents: [types_1.AgentType.STRATEGY, types_1.AgentType.OPERATIONS],
    },
};
// Keywords that might trigger specific agents
const agentKeywords = {
    [types_1.AgentType.IDEA]: [
        "idea",
        "concept",
        "brainstorm",
        "innovate",
        "create",
        "imagine",
        "passion",
        "interest",
    ],
    [types_1.AgentType.STRATEGY]: [
        "strategy",
        "market",
        "customer",
        "competition",
        "differentiate",
        "position",
        "target",
        "segment",
        "value proposition",
        "business model",
    ],
    [types_1.AgentType.FINANCE]: [
        "cost",
        "price",
        "revenue",
        "profit",
        "money",
        "budget",
        "financial",
        "investment",
        "funding",
        "capital",
        "break-even",
        "margin",
    ],
    [types_1.AgentType.OPERATIONS]: [
        "process",
        "operations",
        "delivery",
        "logistics",
        "team",
        "hire",
        "scale",
        "efficiency",
        "production",
        "supply",
        "workflow",
    ],
};
// Keywords that indicate module transitions
const moduleTransitionKeywords = {
    [types_1.ModuleType.IDEA_CONCEPT]: [
        "idea",
        "concept",
        "what if",
        "thinking about",
        "passion",
        "interested in",
    ],
    [types_1.ModuleType.TARGET_MARKET]: [
        "target market",
        "customers",
        "who will buy",
        "market segment",
        "demographics",
        "target audience",
        "customer profile",
        "market targeting",
    ],
    [types_1.ModuleType.VALUE_PROPOSITION]: [
        "value proposition",
        "unique value",
        "why choose",
        "differentiation",
        "what makes",
        "stand out",
        "benefit",
        "advantage",
    ],
    [types_1.ModuleType.BUSINESS_MODEL]: [
        "business model",
        "revenue model",
        "how make money",
        "pricing strategy",
        "monetization",
        "revenue streams",
    ],
    [types_1.ModuleType.MARKETING_STRATEGY]: [
        "marketing",
        "promotion",
        "advertising",
        "reach customers",
        "marketing strategy",
        "social media",
        "marketing plan",
    ],
    [types_1.ModuleType.OPERATIONS_PLAN]: [
        "operations",
        "how deliver",
        "process",
        "workflow",
        "team",
        "logistics",
        "operations plan",
        "implementation",
    ],
    [types_1.ModuleType.FINANCIAL_PLAN]: [
        "financial plan",
        "budget",
        "costs",
        "revenue projection",
        "financial forecast",
        "break even",
        "profit margin",
        "funding",
    ],
};
// Phrases that indicate module transition intent
const transitionPhrases = [
    "let's move to",
    "let's talk about",
    "can we discuss",
    "next",
    "now let's",
    "move on to",
    "switch to",
    "go to",
    "start with",
    "focus on",
    "let's work on",
    "i want to discuss",
    "tell me about",
    "help me with",
    "what about",
    "nice let's",
    "nice, let's",
    "great let's",
    "ok let's",
    "okay let's",
    "alright let's",
    "cool let's",
    "perfect let's",
];
class AgentOrchestrator {
    // Check if the user wants to switch modules
    static detectModuleTransition(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        // Check if message contains transition phrases
        let hasTransitionIntent = transitionPhrases.some((phrase) => lowerMessage.includes(phrase));
        // Also check for simple patterns like "nice lets move to target market"
        const simpleTransitionPattern = /(?:nice|great|ok|okay|alright|cool|perfect|good|excellent)[\s,]*let'?s?\s+(?:move|go|switch|focus|work)?\s*(?:to|on)?\s*([a-z\s]+)/i;
        const simpleMatch = lowerMessage.match(simpleTransitionPattern);
        if (simpleMatch) {
            hasTransitionIntent = true;
        }
        // Check each module's keywords
        for (const [module, keywords] of Object.entries(moduleTransitionKeywords)) {
            const moduleScore = keywords.filter((keyword) => lowerMessage.includes(keyword)).length;
            // If we have transition intent + module keywords, or strong module keywords
            if ((hasTransitionIntent && moduleScore > 0) || moduleScore >= 2) {
                return module;
            }
        }
        return null;
    }
    // Determine which agent should handle the conversation based on context
    static determineAgent(session, userMessage, requestedModule) {
        const lowerMessage = userMessage.toLowerCase();
        // 1. If a specific module was requested (from chatService), use it
        if (requestedModule && requestedModule !== session.currentModule) {
            return {
                agent: moduleAgentMap[requestedModule].primaryAgent,
                module: requestedModule,
                reason: `User explicitly requested to switch to ${requestedModule} module`,
                isTransition: true,
            };
        }
        // 2. Check if user wants to switch modules through natural language
        const detectedModule = this.detectModuleTransition(userMessage);
        if (detectedModule && detectedModule !== session.currentModule) {
            return {
                agent: moduleAgentMap[detectedModule].primaryAgent,
                module: detectedModule,
                reason: `User requested to switch to ${detectedModule} module`,
                isTransition: true,
            };
        }
        // 3. If we're in a specific module and no transition detected, stay in it
        const currentModule = requestedModule || session.currentModule;
        if (currentModule && moduleAgentMap[currentModule]) {
            return {
                agent: moduleAgentMap[currentModule].primaryAgent,
                module: currentModule,
                reason: `Continuing discussion in ${currentModule} module`,
                isTransition: false,
            };
        }
        // 4. Check for agent-specific keywords in the message
        let bestMatch = null;
        for (const [agent, keywords] of Object.entries(agentKeywords)) {
            const score = keywords.filter((keyword) => lowerMessage.includes(keyword)).length;
            if (score > 0 && (!bestMatch || score > bestMatch.score)) {
                bestMatch = { agent: agent, score };
            }
        }
        if (bestMatch) {
            // Find the most relevant module for this agent
            const relevantModule = Object.entries(moduleAgentMap).find(([_, mapping]) => mapping.primaryAgent === bestMatch.agent)?.[0];
            return {
                agent: bestMatch.agent,
                module: relevantModule,
                reason: `User message contains ${bestMatch.agent}-related keywords`,
                isTransition: false,
            };
        }
        // 5. Mode-based default
        if (session.mode === types_1.Mode.ENTREPRENEUR) {
            // In entrepreneur mode, follow a logical progression
            const progression = this.getEntrepreneurProgression(session);
            return {
                agent: progression.agent,
                module: progression.module,
                reason: "Following entrepreneur mode progression",
                isTransition: false,
            };
        }
        else {
            // Consultant mode defaults to strategy for problem analysis
            return {
                agent: types_1.AgentType.STRATEGY,
                module: undefined,
                reason: "Default to strategy agent for consultant mode",
                isTransition: false,
            };
        }
    }
    // Get the next logical step in entrepreneur mode
    static getEntrepreneurProgression(session) {
        const buckets = session.contextBuckets;
        // Check modules in order and return the first incomplete one
        const moduleOrder = [
            types_1.ModuleType.IDEA_CONCEPT,
            types_1.ModuleType.TARGET_MARKET,
            types_1.ModuleType.VALUE_PROPOSITION,
            types_1.ModuleType.BUSINESS_MODEL,
            types_1.ModuleType.MARKETING_STRATEGY,
            types_1.ModuleType.OPERATIONS_PLAN,
            types_1.ModuleType.FINANCIAL_PLAN,
        ];
        for (const module of moduleOrder) {
            const bucket = buckets.get(module);
            if (!bucket || bucket.completionStatus !== "completed") {
                return {
                    agent: moduleAgentMap[module].primaryAgent,
                    module,
                };
            }
        }
        // All modules complete, default to strategy for refinement
        return {
            agent: types_1.AgentType.STRATEGY,
            module: types_1.ModuleType.BUSINESS_MODEL,
        };
    }
    // Get suggested next module based on current progress
    static getSuggestedNextModule(session) {
        if (session.mode === types_1.Mode.CONSULTANT) {
            // In consultant mode, we don't force a progression
            return undefined;
        }
        const progression = this.getEntrepreneurProgression(session);
        return progression.module;
    }
    // Extract module data from AI response
    static extractModuleData(response, moduleType) {
        // This is a simplified extraction - in production, you'd use more sophisticated parsing
        // or instruct the AI to return structured data
        const data = {};
        let summary = "";
        // Look for key patterns in the response based on module type
        switch (moduleType) {
            case types_1.ModuleType.IDEA_CONCEPT:
                // Extract idea description, problem, solution
                const ideaMatch = response.match(/(?:idea|concept)(?:\s+is)?:?\s*([^.!?]+[.!?])/i);
                const problemMatch = response.match(/(?:problem|issue|challenge)(?:\s+is)?:?\s*([^.!?]+[.!?])/i);
                const solutionMatch = response.match(/(?:solution|solve|address)(?:\s+by)?:?\s*([^.!?]+[.!?])/i);
                if (ideaMatch)
                    data.description = ideaMatch[1].trim();
                if (problemMatch)
                    data.problem = problemMatch[1].trim();
                if (solutionMatch)
                    data.solution = solutionMatch[1].trim();
                summary = data.description || "Business idea in development";
                break;
            case types_1.ModuleType.TARGET_MARKET:
                // Extract market segments, size, demographics
                const segmentMatch = response.match(/(?:target|customer|market)(?:\s+is)?:?\s*([^.!?]+[.!?])/i);
                if (segmentMatch) {
                    data.segments = [segmentMatch[1].trim()];
                    summary = `Target: ${segmentMatch[1].trim()}`;
                }
                break;
            case types_1.ModuleType.VALUE_PROPOSITION:
                // Extract value statement
                const valueMatch = response.match(/(?:value proposition|unique value|offer)(?:\s+is)?:?\s*([^.!?]+[.!?])/i);
                if (valueMatch) {
                    data.statement = valueMatch[1].trim();
                    summary = valueMatch[1].trim();
                }
                break;
            // Add more module-specific extraction logic as needed
        }
        return Object.keys(data).length > 0 ? { data, summary } : null;
    }
    // Build context for the agent prompt
    static buildAgentContext(session, currentModule) {
        let context = "";
        // Add mode context
        context += `Mode: ${session.mode}\n`;
        // Add current module context
        if (currentModule) {
            context += `Current Module: ${currentModule}\n`;
            const currentBucket = session.contextBuckets.get(currentModule);
            if (currentBucket && Object.keys(currentBucket.data).length > 0) {
                context += `Current Module Data: ${JSON.stringify(currentBucket.data)}\n`;
                if (currentBucket.summary) {
                    context += `Current Module Summary: ${currentBucket.summary}\n`;
                }
            }
        }
        // Add context from all other modules with data
        context += "\nInformation from other modules:\n";
        session.contextBuckets.forEach((bucket, moduleType) => {
            if (moduleType !== currentModule &&
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
        // Add recent conversation context (last 5 messages)
        const recentMessages = session.conversationHistory.slice(-5);
        if (recentMessages.length > 0) {
            context += "Recent conversation:\n";
            recentMessages.forEach((msg) => {
                context += `${msg.role}: ${msg.content.substring(0, 150)}...\n`;
            });
        }
        // Add module progression guidance
        const completedModules = Array.from(session.contextBuckets.values())
            .filter((bucket) => bucket.completionStatus === "completed")
            .map((bucket) => bucket.moduleType);
        if (completedModules.length > 0) {
            context += "\nCompleted modules: " + completedModules.join(", ") + "\n";
        }
        return context;
    }
    // Get module-specific context for transitions
    static getModuleTransitionContext(session, fromModule, toModule) {
        let context = `Transitioning from ${fromModule} to ${toModule}.\n\n`;
        // Add data from the previous module
        const fromBucket = session.contextBuckets.get(fromModule);
        if (fromBucket && Object.keys(fromBucket.data).length > 0) {
            context += `Previous module (${fromModule}) data:\n`;
            context += `${JSON.stringify(fromBucket.data)}\n`;
            if (fromBucket.summary) {
                context += `Summary: ${fromBucket.summary}\n`;
            }
        }
        // Add data from the new module if it exists
        const toBucket = session.contextBuckets.get(toModule);
        if (toBucket && Object.keys(toBucket.data).length > 0) {
            context += `\nExisting data for ${toModule}:\n`;
            context += `${JSON.stringify(toBucket.data)}\n`;
            if (toBucket.summary) {
                context += `Summary: ${toBucket.summary}\n`;
            }
        }
        // Add guidance for the transition
        context += `\nPlease acknowledge this transition and guide the user through the ${toModule} module. Reference relevant information from the ${fromModule} module when appropriate.\n`;
        return context;
    }
}
exports.AgentOrchestrator = AgentOrchestrator;
