import { Router, RequestHandler } from "express";
import { chatService } from "../services/chatService";
import { ChatRequest } from "../types";

const router = Router();

// Process a chat message
const handleChat: RequestHandler = async (req, res): Promise<void> => {
  try {
    const chatRequest: ChatRequest = req.body;

    if (!chatRequest.message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const response = await chatService.processMessage(chatRequest);
    res.json(response);
  } catch (error) {
    console.error("Chat endpoint error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get session data
const getSession: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const sessionData = chatService.getSessionData(sessionId);

    if (!sessionData) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    res.json(sessionData);
  } catch (error) {
    console.error("Session endpoint error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Clear/reset session
const clearSession: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const success = chatService.clearSession(sessionId);

    if (!success) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    res.json({ message: "Session cleared successfully" });
  } catch (error) {
    console.error("Clear session endpoint error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Health check
const healthCheck: RequestHandler = (_req, res): void => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
};

// Route handlers
router.post("/chat", handleChat);
router.get("/session/:sessionId", getSession);
router.post("/session/:sessionId/clear", clearSession);
router.get("/health", healthCheck);

export default router;
