import type { NormalizedConversation, NormalizedTurn } from "../types.js";

/**
 * SRT (SubRip) subtitle format:
 *
 * 1
 * 00:00:05,000 --> 00:00:08,000
 * Alice: Hello everyone
 *
 * 2
 * 00:00:09,000 --> 00:00:12,000
 * Bob: Hi Alice
 */

interface SrtBlock {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
}

/**
 * Parse SRT timestamp to milliseconds
 * Format: HH:MM:SS,mmm or HH:MM:SS.mmm
 */
function parseTimestamp(timestamp: string): number {
  const match = timestamp.match(
    /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})/
  );
  if (!match) return 0;

  const [, hours, minutes, seconds, ms] = match.map(Number);
  return hours * 3600000 + minutes * 60000 + seconds * 1000 + ms;
}

/**
 * Extract speaker from text line if present
 * Returns [speaker, text] tuple
 */
function extractSpeaker(text: string): [string, string] {
  // Common patterns: "Alice: text", "ALICE: text", "[Alice] text", "(Alice) text"
  const patterns = [
    /^([A-Za-z][A-Za-z0-9\s]{0,20}):\s*(.+)$/s, // Name: text
    /^\[([^\]]+)\]\s*(.+)$/s, // [Name] text
    /^\(([^)]+)\)\s*(.+)$/s, // (Name) text
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return [match[1].trim(), match[2].trim()];
    }
  }

  return ["Unknown", text];
}

/**
 * Parse SRT blocks from text
 */
function parseSrtBlocks(text: string): SrtBlock[] {
  const blocks: SrtBlock[] = [];

  // Split by double newlines to get blocks
  const rawBlocks = text.split(/\n\s*\n/).filter((b) => b.trim());

  for (const block of rawBlocks) {
    const lines = block.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 3) continue;

    // First line should be index number
    const index = parseInt(lines[0], 10);
    if (isNaN(index)) continue;

    // Second line should be timestamps
    const timeMatch = lines[1].match(
      /(\d{1,2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{3})/
    );
    if (!timeMatch) continue;

    const startMs = parseTimestamp(timeMatch[1]);
    const endMs = parseTimestamp(timeMatch[2]);

    // Rest is the subtitle text
    const text = lines.slice(2).join("\n").trim();

    blocks.push({ index, startMs, endMs, text });
  }

  return blocks;
}

/**
 * Parse SRT subtitle file into normalized conversation format
 */
export function parseSrt(
  text: string,
  title?: string
): NormalizedConversation {
  const blocks = parseSrtBlocks(text);
  const turns: NormalizedTurn[] = [];

  for (const block of blocks) {
    const [speaker, content] = extractSpeaker(block.text);

    turns.push({
      speaker,
      text: content,
      startMs: block.startMs,
      endMs: block.endMs,
      turnIndex: turns.length,
      metadata: {
        srtIndex: block.index,
      },
    });
  }

  return {
    title: title || "Subtitle Transcript",
    source: "srt",
    turns,
    metadata: {},
  };
}

/**
 * Check if text looks like an SRT file
 */
export function isSrtText(text: string): boolean {
  if (typeof text !== "string") return false;

  // SRT files typically start with "1" followed by timestamp line
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 3) return false;

  // Check for typical SRT structure
  const firstLineIsNumber = /^\d+$/.test(lines[0].trim());
  const secondLineIsTimestamp =
    /\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[,.]\d{3}/.test(
      lines[1]
    );

  return firstLineIsNumber && secondLineIsTimestamp;
}
