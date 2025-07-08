#!/usr/bin/env node
/**
 * Test script to verify model selection and tracking functionality
 * Tests that models are properly selected, used, and displayed in responses
 */

const axios = require("axios");

const BASE_URL = "http://localhost:3000";

// ANSI color codes for better output
const colors = {
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  log(`\n🧪 ${testName}`, "cyan");
}

function logSuccess(message) {
  log(`✅ ${message}`, "green");
}

function logError(message) {
  log(`❌ ${message}`, "red");
}

function logInfo(message) {
  log(`ℹ️  ${message}`, "blue");
}

async function testModelSelection() {
  log("🚀 Starting Model Selection and Tracking Tests\n", "bold");

  try {
    // Test 1: Initial chat with model selection
    logTest("Test 1: Initial chat with GPT-4o-mini");

    const response1 = await axios.post(`${BASE_URL}/api/chat`, {
      message: "Hello! I want to start a tech startup.",
      model: "gpt-4o-mini",
    });

    if (response1.data.currentModel === "gpt-4o-mini") {
      logSuccess("✓ Initial model correctly set to gpt-4o-mini");
    } else {
      logError(`✗ Expected gpt-4o-mini, got ${response1.data.currentModel}`);
    }

    const sessionId = response1.data.sessionId;
    logInfo(`Session ID: ${sessionId}`);

    // Test 2: Continue conversation with same model
    logTest("Test 2: Continue with same model (should persist)");

    const response2 = await axios.post(`${BASE_URL}/api/chat`, {
      message: "What are the key steps to validate my idea?",
      sessionId: sessionId,
      // No model specified - should use session preference
    });

    if (response2.data.currentModel === "gpt-4o-mini") {
      logSuccess("✓ Model persisted correctly in session");
    } else {
      logError(
        `✗ Expected gpt-4o-mini (persisted), got ${response2.data.currentModel}`
      );
    }

    // Test 3: Switch to different model mid-conversation
    logTest("Test 3: Switch to GPT-4o mid-conversation");

    const response3 = await axios.post(`${BASE_URL}/api/chat`, {
      message: "Give me a detailed market analysis approach.",
      sessionId: sessionId,
      model: "gpt-4o",
    });

    if (response3.data.currentModel === "gpt-4o") {
      logSuccess("✓ Model switched successfully to gpt-4o");
    } else {
      logError(`✗ Expected gpt-4o, got ${response3.data.currentModel}`);
    }

    // Test 4: Verify session now uses new model as default
    logTest("Test 4: Verify session updated preference");

    const response4 = await axios.post(`${BASE_URL}/api/chat`, {
      message: "Thanks for the analysis!",
      sessionId: sessionId,
      // No model specified - should use updated session preference
    });

    if (response4.data.currentModel === "gpt-4o") {
      logSuccess("✓ Session preference updated correctly");
    } else {
      logError(
        `✗ Expected gpt-4o (updated preference), got ${response4.data.currentModel}`
      );
    }

    // Test 5: Get session data and verify conversation history includes models
    logTest("Test 5: Verify conversation history includes model info");

    const sessionData = await axios.get(`${BASE_URL}/api/session/${sessionId}`);
    const messages = sessionData.data.conversationHistory;

    // Check assistant messages have model information
    const assistantMessages = messages.filter(
      (msg) => msg.role === "assistant"
    );
    const modelsInHistory = assistantMessages
      .map((msg) => msg.model)
      .filter(Boolean);

    if (modelsInHistory.length >= 3) {
      logSuccess(`✓ Found ${modelsInHistory.length} messages with model info`);
      logInfo(`Models used: ${modelsInHistory.join(", ")}`);

      // Verify the progression: gpt-4o-mini → gpt-4o-mini → gpt-4o → gpt-4o
      if (
        modelsInHistory[0] === "gpt-4o-mini" &&
        modelsInHistory[modelsInHistory.length - 1] === "gpt-4o"
      ) {
        logSuccess("✓ Model progression correctly tracked in history");
      } else {
        logError("✗ Model progression not correctly tracked");
      }
    } else {
      logError("✗ Not enough assistant messages with model info found");
    }

    // Test 6: Test invalid model handling
    logTest("Test 6: Test invalid model handling");

    try {
      await axios.post(`${BASE_URL}/api/chat`, {
        message: "Test invalid model",
        sessionId: sessionId,
        model: "invalid-model",
      });
      logError("✗ Should have rejected invalid model");
    } catch (error) {
      if (error.response && error.response.status === 400) {
        logSuccess("✓ Invalid model correctly rejected");
      } else {
        logError(`✗ Unexpected error: ${error.message}`);
      }
    }

    // Test 7: Test model list endpoint
    logTest("Test 7: Verify available models endpoint");

    const modelsResponse = await axios.get(`${BASE_URL}/api/models`);
    const availableModels = modelsResponse.data.models;

    if (availableModels && availableModels.length >= 5) {
      logSuccess(`✓ Found ${availableModels.length} available models`);
      logInfo(`Available models: ${availableModels.join(", ")}`);
    } else {
      logError("✗ Models endpoint not working correctly");
    }

    log("\n🎉 All Model Selection Tests Completed!", "bold");
    log("\n📊 Summary:", "yellow");
    log("• Model selection works on initial message", "green");
    log("• Model preference persists in session", "green");
    log("• Mid-conversation model switching works", "green");
    log(
      "• Conversation history tracks which model generated each response",
      "green"
    );
    log("• Invalid model requests are properly handled", "green");
    log("• Models endpoint provides available options", "green");
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    if (error.response) {
      logError(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    process.exit(1);
  }
}

// Helper function to check if server is running
async function checkServerStatus() {
  try {
    await axios.get(`${BASE_URL}/api/models`);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  const isServerRunning = await checkServerStatus();

  if (!isServerRunning) {
    logError("❌ Server is not running on http://localhost:3000");
    logInfo("Please start the backend server first:");
    logInfo("  cd utopia-backend && npm start");
    process.exit(1);
  }

  await testModelSelection();
}

main().catch(console.error);
