import type {
  JsonTranscriptInput,
  JsonTranscriptEntry,
  NormalizedConversation,
  NormalizedTurn,
} from "../types.js";

/**
 * Parse timestamp string to milliseconds
 * Supports: "HH:MM:SS", "MM:SS", "SS", ISO 8601
 */
function parseTimestampToMs(timestamp: string | undefined): number | undefined {
  if (!timestamp) return undefined;

  // Try ISO 8601 date
  const isoDate = new Date(timestamp);
  if (!isNaN(isoDate.getTime())) {
    return isoDate.getTime();
  }

  // Try HH:MM:SS or MM:SS or SS format
  const parts = timestamp.split(":").map(Number);
  if (parts.some(isNaN)) return undefined;

  if (parts.length === 3) {
    // HH:MM:SS
    const [hours, minutes, seconds] = parts;
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  } else if (parts.length === 2) {
    // MM:SS
    const [minutes, seconds] = parts;
    return (minutes * 60 + seconds) * 1000;
  } else if (parts.length === 1) {
    // SS
    return parts[0] * 1000;
  }

  return undefined;
}

/**
 * Parse a JSON transcript into normalized conversation format
 */
export function parseJsonTranscript(
  input: JsonTranscriptInput,
  title?: string
): NormalizedConversation {
  const turns: NormalizedTurn[] = input.entries.map(
    (entry: JsonTranscriptEntry, index: number) => {
      const startMs = entry.start ?? parseTimestampToMs(entry.timestamp);
      const endMs = entry.end;

      return {
        speaker: entry.speaker || "Unknown",
        text: entry.text,
        startMs,
        endMs,
        turnIndex: index,
        metadata: {},
      };
    }
  );

  return {
    title: title || input.title || "Untitled Transcript",
    source: "json-transcript",
    turns,
    metadata: {},
  };
}

/**
 * Validate that input looks like a JSON transcript
 */
export function isJsonTranscript(data: unknown): data is JsonTranscriptInput {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;

  // Must have entries array
  if (!Array.isArray(obj.entries)) return false;

  // Check first few entries have expected shape
  const sample = obj.entries.slice(0, 3);
  return sample.every(
    (entry: unknown) =>
      entry &&
      typeof entry === "object" &&
      "text" in (entry as object) &&
      ("speaker" in (entry as object) || "timestamp" in (entry as object))
  );
}
