"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatService_1 = require("../services/chatService");
const openAIService_1 = require("../services/openAIService");
const router = (0, express_1.Router)();
// Process a chat message
const handleChat = async (req, res) => {
    try {
        const chatRequest = req.body;
        if (!chatRequest.message) {
            res.status(400).json({ error: "Message is required" });
            return;
        }
        // Validate model if provided
        if (chatRequest.model && !openAIService_1.openAIService.isValidModel(chatRequest.model)) {
            res.status(400).json({
                error: "Invalid model specified",
                availableModels: openAIService_1.openAIService.getAvailableModels(),
            });
            return;
        }
        const response = await chatService_1.chatService.processMessage(chatRequest);
        res.json(response);
    }
    catch (error) {
        console.error("Chat endpoint error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
// Get available OpenAI models
const getAvailableModels = async (_req, res) => {
    try {
        const models = openAIService_1.openAIService.getAvailableModels();
        const defaultModel = openAIService_1.openAIService.getDefaultModel();
        res.json({
            models,
            defaultModel,
            modelDescriptions: {
                "gpt-4o": "Most advanced model with vision capabilities",
                "gpt-4o-mini": "Fast and efficient model, good for most tasks",
                "gpt-4-turbo": "High-performance model with large context window",
                "gpt-4": "Reliable model with excellent reasoning capabilities",
                "gpt-3.5-turbo": "Fast and cost-effective model",
            },
        });
    }
    catch (error) {
        console.error("Models endpoint error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
// Get session data
const getSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const sessionData = chatService_1.chatService.getSessionData(sessionId);
        if (!sessionData) {
            res.status(404).json({ error: "Session not found" });
            return;
        }
        res.json(sessionData);
    }
    catch (error) {
        console.error("Session endpoint error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
// Clear/reset session
const clearSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const success = chatService_1.chatService.clearSession(sessionId);
        if (!success) {
            res.status(404).json({ error: "Session not found" });
            return;
        }
        res.json({ message: "Session cleared successfully" });
    }
    catch (error) {
        console.error("Clear session endpoint error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
// Health check
const healthCheck = (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
};
// Route handlers
router.post("/chat", handleChat);
router.get("/models", getAvailableModels);
router.get("/session/:sessionId", getSession);
router.post("/session/:sessionId/clear", clearSession);
router.get("/health", healthCheck);
exports.default = router;
