import type {
  ChatLogInput,
  ChatLogMessage,
  NormalizedConversation,
  NormalizedTurn,
} from "../types.js";

/**
 * Extract speaker from various chat log formats
 */
function extractSpeaker(message: ChatLogMessage): string {
  return (
    message.user ||
    message.username ||
    message.author ||
    message.sender ||
    "Unknown"
  );
}

/**
 * Extract text from various chat log formats
 */
function extractText(message: ChatLogMessage): string {
  return message.text || message.message || message.content || "";
}

/**
 * Parse timestamp from various chat log formats to milliseconds
 */
function parseTimestampToMs(message: ChatLogMessage): number | undefined {
  // Slack-style unix timestamp (seconds or milliseconds)
  if (message.ts) {
    const ts = parseFloat(message.ts);
    // If it looks like seconds (before year 2100), convert to ms
    if (ts < 4102444800) {
      return Math.floor(ts * 1000);
    }
    return Math.floor(ts);
  }

  // ISO timestamp
  if (message.timestamp) {
    const date = new Date(message.timestamp);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
  }

  // Combined date + time
  if (message.date) {
    const dateStr = message.time
      ? `${message.date} ${message.time}`
      : message.date;
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
  }

  return undefined;
}

/**
 * Parse a chat log into normalized conversation format
 */
export function parseChatLog(
  input: ChatLogInput,
  title?: string
): NormalizedConversation {
  // Sort messages by timestamp if available
  const sortedMessages = [...input.messages].sort((a, b) => {
    const tsA = parseTimestampToMs(a);
    const tsB = parseTimestampToMs(b);
    if (tsA === undefined || tsB === undefined) return 0;
    return tsA - tsB;
  });

  // Find the earliest timestamp to use as base
  const timestamps = sortedMessages
    .map(parseTimestampToMs)
    .filter((ts): ts is number => ts !== undefined);
  const baseTimestamp = timestamps.length > 0 ? Math.min(...timestamps) : 0;

  const turns: NormalizedTurn[] = sortedMessages
    .filter((msg) => extractText(msg).trim() !== "")
    .map((message: ChatLogMessage, index: number) => {
      const absoluteMs = parseTimestampToMs(message);
      const startMs =
        absoluteMs !== undefined ? absoluteMs - baseTimestamp : undefined;

      return {
        speaker: extractSpeaker(message),
        text: extractText(message),
        startMs,
        endMs: undefined,
        turnIndex: index,
        metadata: {},
      };
    });

  return {
    title: title || input.title || input.channel || "Untitled Chat",
    source: "chat-log",
    turns,
    metadata: {
      channel: input.channel,
    },
  };
}

/**
 * Validate that input looks like a chat log
 */
export function isChatLog(data: unknown): data is ChatLogInput {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;

  // Must have messages array
  if (!Array.isArray(obj.messages)) return false;

  // Check first few messages have expected shape
  const sample = obj.messages.slice(0, 3);
  return sample.every((msg: unknown) => {
    if (!msg || typeof msg !== "object") return false;
    const m = msg as Record<string, unknown>;
    // Should have some form of text and optionally user/timestamp
    const hasText = "text" in m || "message" in m || "content" in m;
    const hasUser =
      "user" in m || "username" in m || "author" in m || "sender" in m;
    const hasTimestamp = "ts" in m || "timestamp" in m || "date" in m;
    return hasText || (hasUser && hasTimestamp);
  });
}
