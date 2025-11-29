// Raw input formats that we accept

// JSON Transcript format (e.g., from meeting recording tools)
export interface JsonTranscriptEntry {
  speaker: string;
  timestamp?: string; // ISO 8601 or "HH:MM:SS" or "MM:SS"
  start?: number; // milliseconds
  end?: number; // milliseconds
  text: string;
}

export interface JsonTranscriptInput {
  title?: string;
  entries: JsonTranscriptEntry[];
}

// Chat log format (e.g., Slack/WhatsApp export)
export interface ChatLogMessage {
  user?: string;
  username?: string;
  author?: string;
  sender?: string;
  timestamp?: string;
  ts?: string; // Slack-style unix timestamp
  date?: string;
  time?: string;
  text?: string;
  message?: string;
  content?: string;
}

export interface ChatLogInput {
  title?: string;
  channel?: string;
  messages: ChatLogMessage[];
}

// Normalized output that goes into the database
export interface NormalizedTurn {
  speaker: string;
  text: string;
  startMs?: number;
  endMs?: number;
  turnIndex: number;
  metadata?: Record<string, unknown>;
}

export interface NormalizedConversation {
  title: string;
  source: string;
  turns: NormalizedTurn[];
  metadata?: Record<string, unknown>;
}

// Format detection result
export type InputFormat =
  | "json-transcript"
  | "chat-log"
  | "whatsapp"
  | "srt"
  | "unknown";

export interface ParseResult {
  success: boolean;
  data?: NormalizedConversation;
  error?: string;
  format?: InputFormat;
}
