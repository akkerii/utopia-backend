# Utopia AI Backend

An intelligent AI-powered business advisory platform backend that helps entrepreneurs and business owners through natural conversations.

## Overview

Utopia AI operates in two distinct modes:

- **Entrepreneur Mode**: For users starting from scratch with just an idea
- **Consultant Mode**: For existing businesses seeking advice on specific challenges

The backend features four specialized AI agents:

1. **Idea Agent**: Helps brainstorm and refine business ideas
2. **Strategy Agent**: Develops business strategies and models
3. **Finance Agent**: Handles financial planning and analysis
4. **Operations Agent**: Focuses on execution and operational details

## Key Features

- 🧠 **Smart Context Management**: Maintains conversation context across modules
- 🔄 **Dynamic Agent Switching**: Automatically selects the best agent based on context
- 📊 **Module Building**: Progressively builds business modules through conversation
- 💾 **In-Memory Storage**: Fast session management (no database required for MVP)
- 🎯 **Goal-Oriented**: Guides users through logical business planning progression

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- OpenAI API Key

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   cd utopia-backend
   pnpm install
   ```

3. Create a `.env` file:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   NODE_ENV=development
   ```

### Running the Server

Development mode:

```bash
pnpm dev
```

Production mode:

```bash
pnpm start:prod
```

## API Endpoints

### POST /api/chat

Send a message to the AI advisor

**Request Body:**

```json
{
  "message": "I want to start a coffee shop",
  "sessionId": "optional-session-id",
  "mode": "entrepreneur" // or "consultant"
}
```

**Response:**

```json
{
  "sessionId": "uuid",
  "message": "That's exciting! A coffee shop can be a wonderful business. Let me help you explore this idea. 😊 What inspired you to think about opening a coffee shop?",
  "agent": "idea",
  "currentModule": "idea_concept",
  "updatedModules": [{
    "moduleType": "idea_concept",
    "data": {...},
    "summary": "Coffee shop business concept",
    "completionStatus": "in_progress"
  }],
  "suggestedNextModule": "target_market"
}
```

### GET /api/session/:sessionId

Get current session data and module progress

### POST /api/session/:sessionId/clear

Clear session data and start fresh

### GET /api/health

Health check endpoint

## Business Modules

The system progressively builds these modules through conversation:

1. **Idea Concept**: Core business idea, problem, and solution
2. **Target Market**: Customer segments, demographics, market size
3. **Value Proposition**: Unique value, benefits, differentiation
4. **Business Model**: Revenue streams, cost structure, key resources
5. **Marketing Strategy**: Channels, tactics, messaging
6. **Financial Plan**: Revenue projections, costs, funding needs
7. **Operations Plan**: Processes, resources, timeline

## Architecture

```
src/
├── agents/
│   ├── agentPrompts.ts      # Agent personalities and prompts
│   └── agentOrchestrator.ts # Agent selection logic
├── services/
│   ├── sessionService.ts    # Session management
│   ├── openAIService.ts     # OpenAI integration
│   └── chatService.ts       # Main chat orchestration
├── routes/
│   └── chatRoutes.ts        # API endpoints
├── types/
│   └── index.ts             # TypeScript definitions
└── index.ts                 # Express server
```

## How It Works

1. **User sends message** → API receives chat request
2. **Agent Selection** → System determines best agent based on context
3. **Context Building** → Relevant business data is included in prompt
4. **AI Response** → OpenAI generates contextual response
5. **Data Extraction** → System extracts business insights from conversation
6. **Module Update** → Business modules are updated with new information
7. **Response** → User receives AI message + module updates

## Development Notes

- Sessions are stored in-memory (cleared after 24 hours of inactivity)
- No authentication required (MVP phase)
- Supports concurrent sessions
- Automatic agent switching based on conversation context
- Progressive module completion tracking

## Future Enhancements

- Database integration for persistent storage
- User authentication and profiles
- Advanced analytics and reporting
- Integration with external business tools
- Multi-language support
- Voice interaction capabilities

## License

ISC
