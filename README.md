# CUP - Conversation Understanding Platform

A RAG-based backend for understanding conversations. Extract decisions, action items, risks, and questions from transcripts and chat logs with semantic search and LLM-powered analysis.

## Quick Start

### Prerequisites
- Node.js 18+
- Docker (for Postgres)

### Setup

```bash
# Start Postgres
docker-compose up -d

# Install dependencies
npm install

# Push database schema
npm run db:push

# Start dev server
npm run dev
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/conversations` | Create a conversation |
| GET | `/conversations` | List all conversations |
| GET | `/conversations/:id` | Get conversation with turns |
| POST | `/conversations/:id/turns` | Bulk insert turns |
| DELETE | `/conversations/:id` | Delete a conversation |
| GET | `/conversations/:id/insights` | Get insights (grouped by type) |

### Example Usage

```bash
# Create a conversation
curl -X POST http://localhost:3000/conversations \
  -H "Content-Type: application/json" \
  -d '{"title": "Product Planning Meeting", "source": "transcript"}'

# Add turns
curl -X POST http://localhost:3000/conversations/<id>/turns \
  -H "Content-Type: application/json" \
  -d '{
    "turns": [
      {"speaker": "Alice", "text": "Let'\''s discuss the MVP scope", "turnIndex": 0},
      {"speaker": "Bob", "text": "I think we should ship by March 5", "turnIndex": 1}
    ]
  }'

# Get conversation with turns
curl http://localhost:3000/conversations/<id>
```

## Project Structure

```
src/
├── db/
│   ├── schema.ts    # Drizzle schema definitions
│   └── index.ts     # Database connection
├── routes/
│   └── conversations.ts  # CRUD endpoints
└── server.ts        # Express app entry
```

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express
- **ORM**: Drizzle
- **Database**: PostgreSQL
- **Validation**: Zod