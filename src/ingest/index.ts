import { db, conversations, turns } from "../db/index.js";
import type {
  InputFormat,
  ParseResult,
  NormalizedConversation,
} from "./types.js";
import {
  parseJsonTranscript,
  isJsonTranscript,
} from "./parsers/json-transcript.js";
import { parseChatLog, isChatLog } from "./parsers/chat-log.js";
import { parseWhatsApp, isWhatsAppText } from "./parsers/whatsapp.js";
import { parseSrt, isSrtText } from "./parsers/srt.js";

export * from "./types.js";

/**
 * Detect the format of input data (JSON or text)
 */
export function detectFormat(data: unknown): InputFormat {
  // JSON formats
  if (isJsonTranscript(data)) return "json-transcript";
  if (isChatLog(data)) return "chat-log";

  // Text formats
  if (typeof data === "string") {
    if (isSrtText(data)) return "srt";
    if (isWhatsAppText(data)) return "whatsapp";
  }

  return "unknown";
}

/**
 * Parse input data based on detected or specified format
 */
export function parseInput(
  data: unknown,
  options?: {
    format?: InputFormat;
    title?: string;
  }
): ParseResult {
  const format = options?.format || detectFormat(data);

  try {
    let normalized: NormalizedConversation;

    switch (format) {
      case "json-transcript":
        if (!isJsonTranscript(data)) {
          return {
            success: false,
            error: "Data does not match json-transcript format",
            format,
          };
        }
        normalized = parseJsonTranscript(data, options?.title);
        break;

      case "chat-log":
        if (!isChatLog(data)) {
          return {
            success: false,
            error: "Data does not match chat-log format",
            format,
          };
        }
        normalized = parseChatLog(data, options?.title);
        break;

      case "whatsapp":
        if (typeof data !== "string") {
          return {
            success: false,
            error: "WhatsApp format requires plain text input",
            format,
          };
        }
        normalized = parseWhatsApp(data, options?.title);
        break;

      case "srt":
        if (typeof data !== "string") {
          return {
            success: false,
            error: "SRT format requires plain text input",
            format,
          };
        }
        normalized = parseSrt(data, options?.title);
        break;

      default:
        return {
          success: false,
          error: `Unknown format. Supported: json-transcript, chat-log, whatsapp, srt`,
          format: "unknown",
        };
    }

    return {
      success: true,
      data: normalized,
      format,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Parse error",
      format,
    };
  }
}

/**
 * Ingest data into the database
 * Returns the created conversation ID
 */
export async function ingest(
  data: unknown,
  options?: {
    format?: InputFormat;
    title?: string;
  }
): Promise<{ conversationId: string; turnCount: number }> {
  const parseResult = parseInput(data, options);

  if (!parseResult.success || !parseResult.data) {
    throw new Error(parseResult.error || "Failed to parse input");
  }

  const normalized = parseResult.data;

  // Create conversation
  const [conversation] = await db
    .insert(conversations)
    .values({
      title: normalized.title,
      source: normalized.source,
      metadata: normalized.metadata,
    })
    .returning();

  // Insert turns
  if (normalized.turns.length > 0) {
    const turnsToInsert = normalized.turns.map((turn) => ({
      conversationId: conversation.id,
      speaker: turn.speaker,
      text: turn.text,
      startMs: turn.startMs,
      endMs: turn.endMs,
      turnIndex: turn.turnIndex,
      metadata: turn.metadata,
    }));

    await db.insert(turns).values(turnsToInsert);
  }

  return {
    conversationId: conversation.id,
    turnCount: normalized.turns.length,
  };
}
