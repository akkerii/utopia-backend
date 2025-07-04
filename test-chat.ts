import axios from "axios";

const API_URL = "http://localhost:3000/api";

async function testChat() {
  console.log("🚀 Testing Utopia AI Chat Backend\n");

  try {
    // Test 1: Start entrepreneur mode conversation
    console.log("📝 Test 1: Starting entrepreneur mode conversation...");
    const response1 = await axios.post(`${API_URL}/chat`, {
      message:
        "I want to start an online business but I'm not sure what exactly",
      mode: "entrepreneur",
    });

    console.log("Response:", response1.data.message);
    console.log("Agent:", response1.data.agent);
    console.log("Module:", response1.data.currentModule);
    console.log("Session ID:", response1.data.sessionId);

    const sessionId = response1.data.sessionId;

    // Test 2: Continue conversation
    console.log("\n📝 Test 2: Continuing conversation...");
    const response2 = await axios.post(`${API_URL}/chat`, {
      sessionId,
      message:
        "I'm passionate about fitness and nutrition. I've been a personal trainer for 5 years.",
    });

    console.log("Response:", response2.data.message);
    console.log("Updated modules:", response2.data.updatedModules);

    // Test 3: Move to target market
    console.log("\n📝 Test 3: Discussing target market...");
    const response3 = await axios.post(`${API_URL}/chat`, {
      sessionId,
      message:
        "I think my target customers would be busy professionals who want to stay fit but don't have time for the gym",
    });

    console.log("Response:", response3.data.message);
    console.log("Current module:", response3.data.currentModule);

    // Test 4: Get session data
    console.log("\n📝 Test 4: Getting session data...");
    const sessionData = await axios.get(`${API_URL}/session/${sessionId}`);

    console.log("\nSession Summary:");
    console.log("Mode:", sessionData.data.mode);
    console.log("Modules progress:");
    sessionData.data.modules.forEach((module: any) => {
      if (module.completionStatus !== "empty") {
        console.log(
          `  - ${module.moduleType}: ${module.completionStatus} - ${module.summary || "No summary"}`
        );
      }
    });

    // Test 5: Test consultant mode
    console.log("\n📝 Test 5: Testing consultant mode...");
    const consultResponse = await axios.post(`${API_URL}/chat`, {
      message:
        "I run a small e-commerce store selling handmade jewelry. My sales have been declining for the past 3 months.",
      mode: "consultant",
    });

    console.log("Consultant Response:", consultResponse.data.message);
    console.log("Agent:", consultResponse.data.agent);
  } catch (error: any) {
    console.error("❌ Error:", error.response?.data || error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
      console.error("Data:", error.response.data);
    } else if (error.request) {
      console.error("No response received:", error.request);
    } else {
      console.error("Error details:", error);
    }
  }
}

// Run the test
console.log("Make sure the server is running on port 3000...\n");
setTimeout(testChat, 2000);
 