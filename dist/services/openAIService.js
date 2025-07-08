"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openAIService = void 0;
const openai_1 = __importDefault(require("openai"));
const types_1 = require("../types");
const agentPrompts_1 = require("../agents/agentPrompts");
const uuid_1 = require("uuid");
class OpenAIService {
    constructor() {
        this.openai = null;
        // Don't initialize OpenAI client here - use lazy initialization
        this.defaultModel =
            process.env.OPENAI_MODEL || types_1.OpenAIModel.GPT_4O_MINI;
    }
    getOpenAIClient() {
        if (!this.openai) {
            // Lazy initialization - create client when first needed
            this.openai = new openai_1.default({
                apiKey: process.env.OPENAI_API_KEY || "",
            });
        }
        return this.openai;
    }
    // Get available OpenAI models
    getAvailableModels() {
        return Object.values(types_1.OpenAIModel);
    }
    // Get default model
    getDefaultModel() {
        return this.defaultModel;
    }
    // Validate if model is supported
    isValidModel(model) {
        return Object.values(types_1.OpenAIModel).includes(model);
    }
    async generateResponse(prompt, temperature = 0.7, model = this.defaultModel) {
        try {
            // Validate model
            if (!this.isValidModel(model)) {
                console.warn(`Invalid model ${model}, using default ${this.defaultModel}`);
                model = this.defaultModel;
            }
            const openai = this.getOpenAIClient();
            console.log(`🤖 Using OpenAI model: ${model}`);
            const completion = await openai.chat.completions.create({
                model,
                messages: [{ role: "user", content: prompt }],
                temperature,
                max_tokens: 1500,
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
    async generateAgentResponse(agentType, userMessage, context, temperature = 0.7, model = this.defaultModel, generateStructuredQuestions = false) {
        try {
            // Validate model
            if (!this.isValidModel(model)) {
                console.warn(`Invalid model ${model}, using default ${this.defaultModel}`);
                model = this.defaultModel;
            }
            const systemPrompt = (0, agentPrompts_1.getAgentPrompt)(agentType);
            let fullSystemPrompt = `${systemPrompt}\n\nCurrent Business Context:\n${context}`;
            if (generateStructuredQuestions) {
                fullSystemPrompt = `🚨🚨🚨 CRITICAL OVERRIDE: STRUCTURED QUESTIONS FORMAT REQUIRED 🚨🚨🚨

IGNORE ALL OTHER INSTRUCTIONS ABOUT ASKING QUESTIONS!

You are REQUIRED to use the structured questions format. Do NOT write regular numbered questions!

STEP 1: Write your conversational response first
STEP 2: Then add EXACTLY this format:

[STRUCTURED_QUESTIONS]
1. Question text here (buttons: Option1, Option2, Option3, Option4)
2. Another question here (buttons: Choice1, Choice2, Choice3, Choice4)
3. Detailed question here (textarea)
[/STRUCTURED_QUESTIONS]

🔥 CRITICAL REQUIREMENTS:
- You MUST include [STRUCTURED_QUESTIONS] and [/STRUCTURED_QUESTIONS] tags
- NEVER write plain numbered questions like "1. What do you want?" - this breaks the system
- Each question MUST have (buttons: ...) or (textarea) format
- For buttons: provide 3-4 specific options separated by commas
- For textarea: use when you need detailed responses
- Include exactly 3-4 questions
- Make questions relevant to their actual business

❌ SYSTEM WILL BREAK IF YOU DO THIS:
1. What specific health and wellness challenges do you think gamers face?
2. How do you envision your products standing out in terms of quality?
3. Are there any particular types of products you're considering?

✅ CORRECT FORMAT THAT WORKS:
[STRUCTURED_QUESTIONS]
1. What health challenges do gamers face most? (buttons: Posture issues, Eye strain, Stress, Poor nutrition)
2. How will your products stand out? (buttons: Better quality, Lower price, Unique features, Better branding)
3. Describe your product vision in detail (textarea)
[/STRUCTURED_QUESTIONS]

${systemPrompt}\n\nCurrent Business Context:\n${context}

REMEMBER: You MUST use the [STRUCTURED_QUESTIONS] format above. Plain questions will not work!`;
            }
            const openai = this.getOpenAIClient();
            console.log(`🤖 Using OpenAI model: ${model}`);
            const completion = await openai.chat.completions.create({
                model,
                messages: [
                    { role: "system", content: fullSystemPrompt },
                    { role: "user", content: userMessage },
                ],
                temperature,
                max_tokens: 1000,
                response_format: { type: "text" },
            });
            const fullResponse = completion.choices[0]?.message?.content ||
                "I apologize, but I couldn't generate a response. Please try again.";
            if (generateStructuredQuestions) {
                console.log("🔍 Full AI response:", fullResponse);
                const { response, structuredQuestions } = this.parseStructuredQuestions(fullResponse);
                console.log("🔍 Parsed structured questions:", structuredQuestions);
                console.log("🔍 Response after parsing:", response);
                return { response, structuredQuestions };
            }
            return { response: fullResponse };
        }
        catch (error) {
            console.error("OpenAI API error:", error);
            throw new Error("Failed to generate AI response");
        }
    }
    parseStructuredQuestions(fullResponse) {
        const structuredQuestionsRegex = /\[STRUCTURED_QUESTIONS\](.*?)\[\/STRUCTURED_QUESTIONS\]/s;
        const match = fullResponse.match(structuredQuestionsRegex);
        if (!match) {
            console.log("❌ No structured questions found in response");
            console.log("❌ Full response was:", fullResponse);
            console.log("❌ Looking for pattern:", structuredQuestionsRegex);
            return { response: fullResponse };
        }
        const response = fullResponse.replace(structuredQuestionsRegex, "").trim();
        const questionsText = match[1].trim();
        console.log("Found structured questions text:", questionsText);
        console.log("Response after removing structured questions:", response);
        const structuredQuestions = [];
        // Split by numbered questions (1., 2., 3., etc.) to handle multi-line questions
        const questionParts = questionsText.split(/(?=\d+\.\s)/);
        const questionLines = questionParts
            .filter((part) => part.trim())
            .map((part) => part.trim().replace(/\s+/g, " ")); // Normalize whitespace
        console.log("Question lines:", questionLines);
        questionLines.forEach((line) => {
            // Match patterns like "1. Question text? (buttons: Option1, Option2, Option3)"
            // More flexible regex to handle various spacing and formats, including multiline options
            const questionMatch = line.match(/^\d+\.\s*(.*?)\s*\(\s*(\w+)(?:\s*:\s*([^)]*))?\s*\)\s*$/);
            if (questionMatch) {
                const questionText = questionMatch[1].trim().replace(/\?$/, ""); // Remove trailing question mark
                const inputType = questionMatch[2].toLowerCase();
                const optionsText = questionMatch[3];
                let type = "text";
                let options;
                switch (inputType) {
                    case "textarea":
                        type = "textarea";
                        break;
                    case "select":
                        type = "select";
                        if (optionsText) {
                            options = optionsText.split(",").map((opt) => opt.trim());
                        }
                        break;
                    case "multiselect":
                        type = "multiselect";
                        if (optionsText) {
                            options = optionsText.split(",").map((opt) => opt.trim());
                        }
                        break;
                    case "buttons":
                        type = "buttons";
                        if (optionsText) {
                            options = optionsText.split(",").map((opt) => opt.trim());
                        }
                        break;
                    default:
                        type = "text";
                }
                structuredQuestions.push({
                    id: (0, uuid_1.v4)(),
                    question: questionText,
                    type,
                    options,
                    required: true,
                    placeholder: type === "textarea"
                        ? "Please provide a detailed response..."
                        : "Choose an option...",
                });
            }
            else {
                console.log("Failed to parse question line:", line);
            }
        });
        console.log("Parsed structured questions:", structuredQuestions);
        // Ensure we have a response even if it's empty after parsing
        const finalResponse = response ||
            "Let me help you with some questions to better understand your business.";
        return {
            response: finalResponse,
            structuredQuestions: structuredQuestions.length > 0 ? structuredQuestions : undefined,
        };
    }
    async extractStructuredData(text, moduleType, model = this.defaultModel) {
        try {
            // Validate model
            if (!this.isValidModel(model)) {
                console.warn(`Invalid model ${model}, using default ${this.defaultModel}`);
                model = this.defaultModel;
            }
            const prompt = `Extract structured business data from the following text for the ${moduleType} module. \nReturn a JSON object with relevant fields. Be comprehensive but only include information explicitly mentioned.\n\nText: ${text}\n\nExpected fields might include (depending on module):\n- For idea_concept: description, problem, solution, inspiration\n- For target_market: segments, demographics, marketSize, needs\n- For value_proposition: statement, uniqueValue, benefits, differentiation\n- For business_model: revenueStreams, costStructure, keyResources, channels\n- For marketing_strategy: channels, tactics, messaging, budget\n- For operations_plan: processes, resources, timeline, team\n- For financial_plan: revenue, costs, projections, funding\n\nReturn only valid JSON.`;
            const openai = this.getOpenAIClient();
            const completion = await openai.chat.completions.create({
                model,
                messages: [
                    {
                        role: "system",
                        content: "You are a business data extractor. Extract structured data from text and return valid JSON only.",
                    },
                    { role: "user", content: prompt },
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
    async generateModuleSummary(moduleType, moduleData, model = this.defaultModel) {
        try {
            // Validate model
            if (!this.isValidModel(model)) {
                console.warn(`Invalid model ${model}, using default ${this.defaultModel}`);
                model = this.defaultModel;
            }
            const prompt = `Create a concise one-line summary of this ${moduleType} module data: ${JSON.stringify(moduleData)}`;
            const openai = this.getOpenAIClient();
            const completion = await openai.chat.completions.create({
                model,
                messages: [
                    {
                        role: "system",
                        content: "You create concise business module summaries. Keep it under 100 characters.",
                    },
                    { role: "user", content: prompt },
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
