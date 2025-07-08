const { v4: uuidv4 } = require("uuid");

// Test the parsing logic
function parseStructuredQuestions(fullResponse) {
  const structuredQuestionsRegex =
    /\[STRUCTURED_QUESTIONS\](.*?)\[\/STRUCTURED_QUESTIONS\]/s;
  const match = fullResponse.match(structuredQuestionsRegex);

  if (!match) {
    console.log("No structured questions found in response");
    return { response: fullResponse };
  }

  const response = fullResponse.replace(structuredQuestionsRegex, "").trim();
  const questionsText = match[1].trim();
  console.log("Found structured questions text:", questionsText);

  const structuredQuestions = [];
  const questionLines = questionsText.split("\n").filter((line) => line.trim());

  console.log("Question lines:", questionLines);

  questionLines.forEach((line) => {
    // Match patterns like "1. Question text? (buttons: Option1, Option2, Option3)"
    const questionMatch = line.match(
      /^\d+\.\s*(.*?)\s*\((\w+)(?::([^)]+))?\)\s*$/
    );

    if (questionMatch) {
      const questionText = questionMatch[1].trim().replace(/\?$/, ""); // Remove trailing question mark
      const inputType = questionMatch[2].toLowerCase();
      const optionsText = questionMatch[3];

      let type = "text";
      let options = undefined;

      switch (inputType) {
        case "textarea":
          type = "textarea";
          break;
        case "select":
          type = "select";
          if (optionsText) {
            options = optionsText.split(",").map((opt) => opt.trim());
          }
          break;
        case "multiselect":
          type = "multiselect";
          if (optionsText) {
            options = optionsText.split(",").map((opt) => opt.trim());
          }
          break;
        case "buttons":
          type = "buttons";
          if (optionsText) {
            options = optionsText.split(",").map((opt) => opt.trim());
          }
          break;
        default:
          type = "text";
      }

      structuredQuestions.push({
        id: uuidv4(),
        question: questionText,
        type,
        options,
        required: true,
        placeholder:
          type === "textarea"
            ? "Please provide a detailed response..."
            : "Choose an option...",
      });
    } else {
      console.log("Failed to parse question line:", line);
    }
  });

  console.log("Parsed structured questions:", structuredQuestions);
  return {
    response,
    structuredQuestions:
      structuredQuestions.length > 0 ? structuredQuestions : undefined,
  };
}

// Test with the format from the screenshot
const testResponse = `I love your enthusiasm for starting a clothing brand focused on sportswear for families! 🏃‍♀️👕 It sounds like you're passionate about solving a personal problem, which is a fantastic motivator!

Let's dive deeper into your idea and explore some specifics. Here are a few questions that can help clarify your vision and identify the unique aspects of your brand:

[STRUCTURED_QUESTIONS]
1. What age group of children are you targeting with your sports clothing? (buttons: Toddlers, Preschoolers, Elementary School, Teens)
2. What unique features do you envision for your sports clothing line? (buttons: Eco-friendly materials, Versatile designs, Affordable pricing, Trendy styles)
3. What specific personal problem are you looking to solve with your clothing line? (textarea)
4. How do you plan to connect with your audience and promote your brand? (buttons: Social media, Community events, Collaborations with sports teams, Online marketing)
5. What inspires you about the idea of creating sports clothing for families? (textarea)
[/STRUCTURED_QUESTIONS]

I'm excited to see how your idea evolves! Let's get into the details! 😊`;

console.log("Testing structured question parsing...");
const result = parseStructuredQuestions(testResponse);
console.log("\nFinal result:");
console.log("Response:", result.response);
console.log(
  "Structured questions count:",
  result.structuredQuestions?.length || 0
);
console.log("First question:", result.structuredQuestions?.[0]);
