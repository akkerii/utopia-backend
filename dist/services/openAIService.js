"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openAIService = void 0;
const openai_1 = __importDefault(require("openai"));
const agentPrompts_1 = require("../agents/agentPrompts");
class OpenAIService {
    constructor() {
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY || "",
        });
    }
    async generateAgentResponse(agentType, userMessage, context, temperature = 0.7) {
        try {
            const systemPrompt = (0, agentPrompts_1.getAgentPrompt)(agentType);
            // Add context to the system prompt
            const fullSystemPrompt = `${systemPrompt}\n\nCurrent Business Context:\n${context}`;
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4-0125-preview",
                messages: [
                    {
                        role: "system",
                        content: fullSystemPrompt,
                    },
                    {
                        role: "user",
                        content: userMessage,
                    },
                ],
                temperature,
                max_tokens: 1000,
                response_format: { type: "text" },
            });
            return (completion.choices[0]?.message?.content ||
                "I apologize, but I couldn't generate a response. Please try again.");
        }
        catch (error) {
            console.error("OpenAI API error:", error);
            throw new Error("Failed to generate AI response");
        }
    }
    // Special method for extracting structured data from responses
    async extractStructuredData(text, moduleType) {
        try {
            const prompt = `Extract structured business data from the following text for the ${moduleType} module. 
      Return a JSON object with relevant fields. Be comprehensive but only include information explicitly mentioned.
      
      Text: ${text}
      
      Expected fields might include (depending on module):
      - For idea_concept: description, problem, solution, inspiration
      - For target_market: segments, demographics, marketSize, needs
      - For value_proposition: statement, uniqueValue, benefits, differentiation
      - For business_model: revenueStreams, costStructure, keyResources, channels
      - For marketing_strategy: channels, tactics, messaging, budget
      - For operations_plan: processes, resources, timeline, team
      - For financial_plan: revenue, costs, projections, funding
      
      Return only valid JSON.`;
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4-0125-preview",
                messages: [
                    {
                        role: "system",
                        content: "You are a business data extractor. Extract structured data from text and return valid JSON only.",
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                temperature: 0.3,
                max_tokens: 500,
                response_format: { type: "json_object" },
            });
            const response = completion.choices[0]?.message?.content || "{}";
            return JSON.parse(response);
        }
        catch (error) {
            console.error("Error extracting structured data:", error);
            return {};
        }
    }
    // Generate module summaries
    async generateModuleSummary(moduleType, moduleData) {
        try {
            const prompt = `Create a concise one-line summary of this ${moduleType} module data: ${JSON.stringify(moduleData)}`;
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4-0125-preview",
                messages: [
                    {
                        role: "system",
                        content: "You create concise business module summaries. Keep it under 100 characters.",
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                temperature: 0.5,
                max_tokens: 50,
            });
            return completion.choices[0]?.message?.content || "Module data recorded";
        }
        catch (error) {
            console.error("Error generating summary:", error);
            return "Module data recorded";
        }
    }
}
exports.openAIService = new OpenAIService();
