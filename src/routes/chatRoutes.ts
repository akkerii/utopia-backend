import { Router, RequestHandler } from "express";
import { chatService } from "../services/chatService";
import { openAIService } from "../services/openAIService";
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

    // Validate model if provided
    if (chatRequest.model && !openAIService.isValidModel(chatRequest.model)) {
      res.status(400).json({
        error: "Invalid model specified",
        availableModels: openAIService.getAvailableModels(),
      });
      return;
    }

    const response = await chatService.processMessage(chatRequest);
    res.json(response);
  } catch (error) {
    console.error("Chat endpoint error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get available OpenAI models
const getAvailableModels: RequestHandler = async (_req, res): Promise<void> => {
  try {
    const models = openAIService.getAvailableModels();
    const defaultModel = openAIService.getDefaultModel();

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
  } catch (error) {
    console.error("Models endpoint error:", error);
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
router.get("/models", getAvailableModels);
router.get("/session/:sessionId", getSession);
router.post("/session/:sessionId/clear", clearSession);
router.get("/health", healthCheck);

export default router;
