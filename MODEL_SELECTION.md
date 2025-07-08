# OpenAI Model Selection Feature

This document explains how to use the new OpenAI model selection feature in the Utopia AI Backend.

## Overview

Users can now choose which OpenAI model to use for their conversations. The backend supports multiple OpenAI models and remembers the user's preference per session.

## Available Models

- **gpt-4o**: Most advanced model with vision capabilities
- **gpt-4o-mini**: Fast and efficient model, good for most tasks (default)
- **gpt-4-turbo**: High-performance model with large context window
- **gpt-4**: Reliable model with excellent reasoning capabilities
- **gpt-3.5-turbo**: Fast and cost-effective model

## API Endpoints

### GET `/api/models`

Returns available OpenAI models and their descriptions.

**Response:**

```json
{
  "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
  "defaultModel": "gpt-4o-mini",
  "modelDescriptions": {
    "gpt-4o": "Most advanced model with vision capabilities",
    "gpt-4o-mini": "Fast and efficient model, good for most tasks",
    "gpt-4-turbo": "High-performance model with large context window",
    "gpt-4": "Reliable model with excellent reasoning capabilities",
    "gpt-3.5-turbo": "Fast and cost-effective model"
  }
}
```

### POST `/api/chat`

Enhanced chat endpoint that now accepts model selection.

**Request Body:**

```json
{
  "message": "Hello! Can you help me with my business idea?",
  "sessionId": "optional-session-id",
  "mode": "entrepreneur",
  "model": "gpt-4o-mini",
  "structuredResponses": []
}
```

**Response:**

```json
{
  "sessionId": "session-uuid",
  "message": "AI response...",
  "agent": "idea",
  "currentModule": "idea_concept",
  "currentModel": "gpt-4o-mini",
  "structuredQuestions": [],
  "updatedModules": [],
  "isModuleTransition": false
}
```

## Usage Examples

### 1. Get Available Models

```javascript
const response = await fetch("/api/models");
const data = await response.json();
console.log(data.models); // Array of available models
```

### 2. Start Chat with Specific Model

```javascript
const response = await fetch("/api/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: "Hello! Can you help me with my business idea?",
    model: "gpt-4o",
  }),
});
```

### 3. Continue Chat (Model Remembered)

```javascript
const response = await fetch("/api/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: "Tell me more about market research",
    sessionId: "previous-session-id",
    // Model not specified - will use session preference
  }),
});
```

### 4. Change Model Mid-Conversation

```javascript
const response = await fetch("/api/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: "Let's switch to a more advanced model",
    sessionId: "existing-session-id",
    model: "gpt-4o",
  }),
});
```

## Session Model Persistence

- When a user specifies a model in their request, it becomes their preferred model for that session
- Subsequent messages in the same session will use this preferred model if no model is specified
- Users can change their preferred model at any time by specifying a different model

## Error Handling

### Invalid Model

If an invalid model is specified, the API will return a 400 error:

```json
{
  "error": "Invalid model specified",
  "availableModels": [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo"
  ]
}
```

### Fallback Behavior

- If an invalid model is specified, the system falls back to the default model
- If no model is specified and no session preference exists, the default model is used
- The default model is `gpt-4o-mini` unless overridden by the `OPENAI_MODEL` environment variable

## Environment Variables

- `OPENAI_MODEL`: Set the default model (optional, defaults to `gpt-4o-mini`)
- `OPENAI_API_KEY`: Your OpenAI API key (required)

## Testing

Run the test script to verify the implementation:

```bash
node test-model-selection.js
```

This will test:

1. Getting available models
2. Chat with model selection
3. Model persistence in sessions
4. Changing models mid-conversation
5. Invalid model handling

## Frontend Integration

The frontend should:

1. Fetch available models using `GET /api/models`
2. Display model selector to users
3. Include the selected model in chat requests
4. Display the current model being used
5. Allow users to change models during conversation

Example React component:

```jsx
const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
const [availableModels, setAvailableModels] = useState([]);

// Fetch available models on component mount
useEffect(() => {
  fetch("/api/models")
    .then((res) => res.json())
    .then((data) => setAvailableModels(data.models));
}, []);

// Include model in chat request
const sendMessage = async (message) => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      model: selectedModel,
      sessionId: currentSessionId,
    }),
  });
  // Handle response...
};
```
