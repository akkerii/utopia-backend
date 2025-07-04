// Modes of operation
export enum Mode {
  ENTREPRENEUR = "entrepreneur",
  CONSULTANT = "consultant",
}

// AI Agent types
export enum AgentType {
  IDEA = "idea",
  STRATEGY = "strategy",
  FINANCE = "finance",
  OPERATIONS = "operations",
}

// Business modules
export enum ModuleType {
  IDEA_CONCEPT = "idea_concept",
  TARGET_MARKET = "target_market",
  VALUE_PROPOSITION = "value_proposition",
  BUSINESS_MODEL = "business_model",
  MARKETING_STRATEGY = "marketing_strategy",
  OPERATIONS_PLAN = "operations_plan",
  FINANCIAL_PLAN = "financial_plan",
}

// Context bucket for storing module data
export interface ContextBucket {
  id: string;
  moduleType: ModuleType;
  data: any;
  summary?: string;
  lastUpdated: Date;
  completionStatus: "empty" | "in_progress" | "completed";
}

// Session data stored in memory
export interface Session {
  id: string;
  mode: Mode;
  currentAgent: AgentType;
  currentModule?: ModuleType;
  contextBuckets: Map<ModuleType, ContextBucket>;
  conversationHistory: ConversationMessage[];
  createdAt: Date;
  lastActive: Date;
}

// Message in conversation
export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  agent?: AgentType;
  module?: ModuleType;
  timestamp: Date;
}

// Chat request from client
export interface ChatRequest {
  sessionId?: string;
  message: string;
  mode?: Mode;
}

// Chat response to client
export interface ChatResponse {
  sessionId: string;
  message: string;
  agent: AgentType;
  currentModule?: ModuleType;
  updatedModules?: ModuleUpdate[];
  suggestedNextModule?: ModuleType;
  isModuleTransition?: boolean;
}

// Module update notification
export interface ModuleUpdate {
  moduleType: ModuleType;
  data: any;
  summary: string;
  completionStatus: "empty" | "in_progress" | "completed";
}

// Agent configuration
export interface AgentConfig {
  type: AgentType;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}
