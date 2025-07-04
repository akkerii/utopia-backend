"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleType = exports.AgentType = exports.Mode = void 0;
// Modes of operation
var Mode;
(function (Mode) {
    Mode["ENTREPRENEUR"] = "entrepreneur";
    Mode["CONSULTANT"] = "consultant";
})(Mode || (exports.Mode = Mode = {}));
// AI Agent types
var AgentType;
(function (AgentType) {
    AgentType["IDEA"] = "idea";
    AgentType["STRATEGY"] = "strategy";
    AgentType["FINANCE"] = "finance";
    AgentType["OPERATIONS"] = "operations";
})(AgentType || (exports.AgentType = AgentType = {}));
// Business modules
var ModuleType;
(function (ModuleType) {
    ModuleType["IDEA_CONCEPT"] = "idea_concept";
    ModuleType["TARGET_MARKET"] = "target_market";
    ModuleType["VALUE_PROPOSITION"] = "value_proposition";
    ModuleType["BUSINESS_MODEL"] = "business_model";
    ModuleType["MARKETING_STRATEGY"] = "marketing_strategy";
    ModuleType["OPERATIONS_PLAN"] = "operations_plan";
    ModuleType["FINANCIAL_PLAN"] = "financial_plan";
})(ModuleType || (exports.ModuleType = ModuleType = {}));
