import { AIOrchestrator } from "./src/agents/aiOrchestrator";
import { sessionService } from "./src/services/sessionService";
import { Mode, AgentType, ModuleType } from "./src/types";

async function testAIOrchestrator() {
  console.log("🤖 Testing AI Orchestrator System");
  console.log("=====================================");

  // Create a test session
  const session = sessionService.createSession(Mode.ENTREPRENEUR);
  console.log(`✅ Created test session: ${session.id}`);

  // Test 1: Initial idea discussion
  console.log("\n📝 Test 1: Initial Business Idea");
  console.log(
    "User: I want to start a health and wellness business for gamers"
  );

  try {
    const decision1 = await AIOrchestrator.orchestrateConversation(
      session,
      "I want to start a health and wellness business for gamers"
    );

    console.log("🧠 AI Orchestrator Decision:");
    console.log(`  Agent: ${decision1.agent}`);
    console.log(`  Module: ${decision1.module}`);
    console.log(`  Reasoning: ${decision1.reasoning}`);
    console.log(`  Should Transition: ${decision1.shouldTransition}`);
    console.log(`  Context Summary: ${decision1.contextSummary}`);
    console.log(
      `  Suggested Questions: ${decision1.suggestedQuestions.join(", ")}`
    );

    // Test 2: Follow-up with market question
    console.log("\n📝 Test 2: Market Analysis Question");
    console.log("User: Who would be my target customers?");

    const decision2 = await AIOrchestrator.orchestrateConversation(
      session,
      "Who would be my target customers?",
      "That's a great business idea! Gaming and health is a growing market..."
    );

    console.log("🧠 AI Orchestrator Decision:");
    console.log(`  Agent: ${decision2.agent}`);
    console.log(`  Module: ${decision2.module}`);
    console.log(`  Reasoning: ${decision2.reasoning}`);
    console.log(`  Should Transition: ${decision2.shouldTransition}`);
    console.log(`  Context Summary: ${decision2.contextSummary}`);

    // Test 3: Get conversation insights
    console.log("\n🔍 Test 3: Conversation Insights");
    const insights = AIOrchestrator.getConversationInsights(session.id);
    if (insights) {
      console.log("📊 Accumulated Insights:");
      console.log(`  Current Focus: ${insights.currentFocus}`);
      console.log(`  Progression Stage: ${insights.progressionStage}`);
      console.log(`  Key Insights: ${insights.keyInsights.join("; ")}`);
      console.log(`  Ready for Next: ${insights.readinessForNext}`);
    }

    // Test 4: Intelligent context
    console.log("\n🧠 Test 4: Intelligent Context");
    const context = AIOrchestrator.getIntelligentContext(session.id);
    console.log("📝 Generated Context:");
    console.log(context);
  } catch (error) {
    console.error("❌ Error testing AI orchestrator:", error);
  }

  // Cleanup
  console.log("\n🧹 Cleaning up...");
  AIOrchestrator.clearSessionMemory(session.id);
  console.log("✅ Test completed!");
}

// Run the test if this file is executed directly
if (require.main === module) {
  testAIOrchestrator()
    .then(() => {
      console.log("\n🎉 AI Orchestrator test completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Test failed:", error);
      process.exit(1);
    });
}

export { testAIOrchestrator };
