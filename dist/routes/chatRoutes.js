"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatService_1 = require("../services/chatService");
const router = (0, express_1.Router)();
// Process a chat message
const handleChat = async (req, res) => {
    try {
        const chatRequest = req.body;
        if (!chatRequest.message) {
            res.status(400).json({ error: "Message is required" });
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
router.get("/session/:sessionId", getSession);
router.post("/session/:sessionId/clear", clearSession);
router.get("/health", healthCheck);
exports.default = router;
