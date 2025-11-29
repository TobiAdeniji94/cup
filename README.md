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
| POST | `/ingest` | Ingest conversation (auto-detects format) |
| POST | `/ingest/preview` | Preview parsing without saving |

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

# Ingest a JSON transcript (auto-detected)
curl -X POST http://localhost:3000/ingest \
  -H "Content-Type: application/json" \
  -d @examples/transcript.json

# Ingest a chat log (JSON)
curl -X POST http://localhost:3000/ingest \
  -H "Content-Type: application/json" \
  -d @examples/chat-log.json

# Ingest WhatsApp export (text)
curl -X POST http://localhost:3000/ingest \
  -H "Content-Type: text/plain" \
  --data-binary @examples/whatsapp.txt

# Ingest SRT subtitles (text)
curl -X POST http://localhost:3000/ingest \
  -H "Content-Type: text/plain" \
  --data-binary @examples/subtitles.srt

# Preview parsing without saving
curl -X POST http://localhost:3000/ingest/preview \
  -H "Content-Type: application/json" \
  -d @examples/transcript.json
```

## Project Structure

```
src/
├── db/
│   ├── schema.ts    # Drizzle schema definitions
│   └── index.ts     # Database connection
├── ingest/
│   ├── types.ts     # Input/output type definitions
│   ├── index.ts     # Main ingest function + format detection
│   └── parsers/
│       ├── json-transcript.ts  # JSON transcript parser
│       └── chat-log.ts         # Slack/WhatsApp parser
├── routes/
│   ├── conversations.ts  # CRUD endpoints
│   └── ingest.ts         # Ingestion endpoints
└── server.ts        # Express app entry

examples/
├── transcript.json  # Sample meeting transcript
└── chat-log.json    # Sample Slack-style chat
```

## Supported Input Formats

### JSON Transcript
Array of utterances with speaker and timestamp:
```json
{
  "title": "Meeting Title",
  "entries": [
    { "speaker": "Alice", "timestamp": "00:00:05", "text": "Hello everyone" },
    { "speaker": "Bob", "timestamp": "00:00:12", "text": "Hi Alice" }
  ]
}
```

### Chat Log (Slack/Discord JSON)
Messages with user and unix timestamp:
```json
{
  "channel": "#team-chat",
  "messages": [
    { "user": "alice", "ts": "1706540400.000100", "text": "Hello!" },
    { "user": "bob", "ts": "1706540460.000200", "text": "Hey!" }
  ]
}
```

### WhatsApp Text Export
Plain text export from WhatsApp:
```
1/29/24, 2:30 PM - Alice: Hello everyone
1/29/24, 2:31 PM - Bob: Hi Alice!
```

### SRT Subtitles
Standard subtitle format:
```
1
00:00:05,000 --> 00:00:08,000
Alice: Hello everyone

2
00:00:09,000 --> 00:00:12,000
Bob: Hi Alice
```

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express
- **ORM**: Drizzle
- **Database**: PostgreSQL
- **Validation**: Zod