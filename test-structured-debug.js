const axios = require("axios");

async function testStructuredQuestions() {
  try {
    console.log("🔍 Testing Structured Questions Generation...\n");

    // Test with a simple message that should trigger structured questions
    const response = await axios.post("http://localhost:3000/api/chat", {
      message: "Thanks for your responses!",
      mode: "guided",
    });

    console.log("=== Response Data ===");
    console.log("Agent:", response.data.agent);
    console.log("Module:", response.data.currentModule);
    console.log("Response:", response.data.response);
    console.log(
      "Structured Questions Count:",
      response.data.structuredQuestions?.length || 0
    );

    if (
      response.data.structuredQuestions &&
      response.data.structuredQuestions.length > 0
    ) {
      console.log("\n✅ Structured Questions Generated:");
      response.data.structuredQuestions.forEach((q, idx) => {
        console.log(`  ${idx + 1}. ${q.question} (${q.type})`);
        if (q.options) {
          console.log(`     Options: ${q.options.join(", ")}`);
        }
      });
    } else {
      console.log("\n❌ No structured questions generated");
      console.log("Full response text:", response.data.response);
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.error("Response:", error.response.data);
    }
  }
}

testStructuredQuestions();
