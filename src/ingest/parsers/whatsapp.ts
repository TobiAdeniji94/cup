import type { NormalizedConversation, NormalizedTurn } from "../types.js";

/**
 * WhatsApp chat export format:
 * - "1/29/24, 2:30 PM - Alice: Hello everyone"
 * - "29/01/2024, 14:30 - Alice: Hello everyone"
 * - "[29/01/2024, 14:30:00] Alice: Hello everyone"
 */

// Regex patterns for different WhatsApp date formats
const WHATSAPP_PATTERNS = [
  // US format: 1/29/24, 2:30 PM - Name: Message
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\s*[-–]\s*([^:]+):\s*(.+)$/i,
  // EU format: 29/01/2024, 14:30 - Name: Message
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–]\s*([^:]+):\s*(.+)$/i,
  // Bracket format: [29/01/2024, 14:30:00] Name: Message
  /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^:]+):\s*(.+)$/i,
];

interface ParsedLine {
  date: string;
  time: string;
  speaker: string;
  text: string;
}

/**
 * Try to parse a line with various WhatsApp patterns
 */
function parseLine(line: string): ParsedLine | null {
  for (const pattern of WHATSAPP_PATTERNS) {
    const match = line.match(pattern);
    if (match) {
      return {
        date: match[1],
        time: match[2],
        speaker: match[3].trim(),
        text: match[4].trim(),
      };
    }
  }
  return null;
}

/**
 * Parse date and time strings to milliseconds
 */
function parseDateTime(date: string, time: string): number | undefined {
  try {
    // Normalize date separators
    const normalizedDate = date.replace(/\//g, "-");
    const dateTimeStr = `${normalizedDate} ${time}`;
    const parsed = new Date(dateTimeStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.getTime();
    }

    // Try parsing with different date formats
    const parts = date.split(/[\/\-]/);
    if (parts.length === 3) {
      let [a, b, c] = parts.map(Number);
      // Assume day/month/year if day > 12
      if (a > 12) {
        // DD/MM/YYYY
        const year = c < 100 ? 2000 + c : c;
        const dateObj = new Date(`${year}-${b.toString().padStart(2, "0")}-${a.toString().padStart(2, "0")} ${time}`);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.getTime();
        }
      } else {
        // MM/DD/YYYY (US format)
        const year = c < 100 ? 2000 + c : c;
        const dateObj = new Date(`${year}-${a.toString().padStart(2, "0")}-${b.toString().padStart(2, "0")} ${time}`);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.getTime();
        }
      }
    }
  } catch {
    // Ignore parse errors
  }
  return undefined;
}

/**
 * Parse WhatsApp text export into normalized conversation format
 */
export function parseWhatsApp(
  text: string,
  title?: string
): NormalizedConversation {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const turns: NormalizedTurn[] = [];
  let currentTurn: ParsedLine | null = null;
  let currentText = "";

  for (const line of lines) {
    const parsed = parseLine(line);

    if (parsed) {
      // Save previous turn if exists
      if (currentTurn) {
        const timestamp = parseDateTime(currentTurn.date, currentTurn.time);
        turns.push({
          speaker: currentTurn.speaker,
          text: currentText.trim(),
          startMs: timestamp,
          turnIndex: turns.length,
          metadata: {
            originalDate: currentTurn.date,
            originalTime: currentTurn.time,
          },
        });
      }
      currentTurn = parsed;
      currentText = parsed.text;
    } else if (currentTurn) {
      // Continuation of previous message (multi-line)
      currentText += "\n" + line;
    }
  }

  // Don't forget the last turn
  if (currentTurn) {
    const timestamp = parseDateTime(currentTurn.date, currentTurn.time);
    turns.push({
      speaker: currentTurn.speaker,
      text: currentText.trim(),
      startMs: timestamp,
      turnIndex: turns.length,
      metadata: {
        originalDate: currentTurn.date,
        originalTime: currentTurn.time,
      },
    });
  }

  // Normalize timestamps relative to first message
  if (turns.length > 0 && turns[0].startMs !== undefined) {
    const baseTime = turns[0].startMs;
    for (const turn of turns) {
      if (turn.startMs !== undefined) {
        turn.startMs = turn.startMs - baseTime;
      }
    }
  }

  return {
    title: title || "WhatsApp Chat",
    source: "whatsapp",
    turns,
    metadata: {},
  };
}

/**
 * Check if text looks like a WhatsApp export
 */
export function isWhatsAppText(text: string): boolean {
  if (typeof text !== "string") return false;

  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return false;

  // Check if at least 30% of lines match WhatsApp pattern
  let matches = 0;
  const samplSize = Math.min(lines.length, 10);
  for (let i = 0; i < samplSize; i++) {
    if (parseLine(lines[i])) {
      matches++;
    }
  }

  return matches / samplSize >= 0.3;
}
