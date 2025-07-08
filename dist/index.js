"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const sessionService_1 = require("./services/sessionService");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0"; // Listen on all network interfaces
// CORS configuration
const corsOptions = {
    origin: [
        "https://utopia-frontend-218476677732.us-central1.run.app",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3003", // Add support for frontend on port 3003
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "ngrok-skip-browser-warning",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
};
// Middleware
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Routes
app.use("/api", chatRoutes_1.default);
// Root endpoint
app.get("/", (_req, res) => {
    res.json({
        message: "Utopia AI Backend API",
        version: "1.0.0",
        endpoints: {
            chat: "POST /api/chat",
            models: "GET /api/models",
            session: "GET /api/session/:sessionId",
            clearSession: "POST /api/session/:sessionId/clear",
            health: "GET /api/health",
        },
    });
});
// Error handling middleware
app.use((err, _req, res, _next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
});
// Start server
app.listen(PORT, HOST, () => {
    console.log(`🚀 Utopia AI Backend running on ${HOST}:${PORT}`);
    console.log(`📍 API available at http://${HOST}:${PORT}/api`);
    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
        console.warn("⚠️  Warning: OPENAI_API_KEY not found in environment variables");
        console.warn("   Please set it in your .env file for the AI to work properly");
    }
    // Clean up old sessions periodically (every hour)
    setInterval(() => {
        console.log("🧹 Cleaning up old sessions...");
        sessionService_1.sessionService.cleanupOldSessions(24); // Remove sessions older than 24 hours
    }, 60 * 60 * 1000);
});
// Graceful shutdown
process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully...");
    process.exit(0);
});
exports.default = app;
