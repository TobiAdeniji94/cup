import { Router, Request, Response } from "express";
import { z } from "zod";
import { ingest, detectFormat, parseInput } from "../ingest/index.js";
import type { InputFormat } from "../ingest/types.js";

const router = Router();

// Validation schema for ingest request (wrapped format)
const wrappedIngestSchema = z.object({
  title: z.string().optional(),
  format: z.enum(["json-transcript", "chat-log", "whatsapp", "srt"]).optional(),
  data: z.unknown(),
});

/**
 * Normalize request body - supports both wrapped { data: ... } and direct format
 */
function normalizeRequestBody(body: unknown): {
  title?: string;
  format?: InputFormat;
  data: unknown;
} {
  if (!body || typeof body !== "object") {
    return { data: body };
  }

  const obj = body as Record<string, unknown>;

  // If it has a 'data' property, treat as wrapped format
  if ("data" in obj) {
    return {
      title: typeof obj.title === "string" ? obj.title : undefined,
      format: ["json-transcript", "chat-log", "whatsapp", "srt"].includes(
        obj.format as string
      )
        ? (obj.format as InputFormat)
        : undefined,
      data: obj.data,
    };
  }

  // Otherwise, the body itself is the data (direct format)
  // Extract title if present at root level
  return {
    title: typeof obj.title === "string" ? obj.title : undefined,
    data: body,
  };
}

/**
 * POST /ingest
 * Ingest a conversation from various formats
 *
 * Body:
 * {
 *   "title": "Optional title",
 *   "format": "json-transcript" | "chat-log" (optional, auto-detected),
 *   "data": { ... } // The actual conversation data
 * }
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { title, format, data } = normalizeRequestBody(req.body);

    // Detect format if not provided
    const detectedFormat = format || detectFormat(data);
    if (detectedFormat === "unknown") {
      res.status(400).json({
        error: "Could not detect input format",
        hint: "Supported formats: json-transcript (entries array), chat-log (messages array), whatsapp (text), srt (subtitles)",
      });
      return;
    }

    const result = await ingest(data, {
      title,
      format: format as InputFormat | undefined,
    });

    res.status(201).json({
      message: "Conversation ingested successfully",
      conversationId: result.conversationId,
      turnCount: result.turnCount,
      format: detectedFormat,
    });
  } catch (error) {
    console.error("Ingest error:", error);
    res.status(500).json({
      error: "Failed to ingest conversation",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /ingest/preview
 * Preview how data will be parsed without saving to database
 */
router.post("/preview", async (req: Request, res: Response) => {
  try {
    const { title, format, data } = normalizeRequestBody(req.body);
    const result = parseInput(data, {
      title,
      format: format as InputFormat | undefined,
    });

    if (!result.success) {
      res.status(400).json({
        error: result.error,
        format: result.format,
      });
      return;
    }

    res.json({
      format: result.format,
      preview: {
        title: result.data!.title,
        source: result.data!.source,
        turnCount: result.data!.turns.length,
        turns: result.data!.turns.slice(0, 5), // Show first 5 turns as preview
      },
    });
  } catch (error) {
    console.error("Preview error:", error);
    res.status(500).json({
      error: "Failed to preview conversation",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
