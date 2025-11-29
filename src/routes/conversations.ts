import { Router, Request, Response } from "express";
import { eq, asc } from "drizzle-orm";
import { db, conversations, turns, insights } from "../db/index.js";
import { z } from "zod";

const router = Router();

// Validation schemas
const createConversationSchema = z.object({
  title: z.string().min(1),
  source: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const createTurnSchema = z.object({
  speaker: z.string().min(1),
  text: z.string().min(1),
  startMs: z.number().int().optional(),
  endMs: z.number().int().optional(),
  turnIndex: z.number().int(),
  metadata: z.record(z.unknown()).optional(),
});

const bulkCreateTurnsSchema = z.object({
  turns: z.array(createTurnSchema),
});

// POST /conversations - Create a new conversation
router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = createConversationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.errors });
      return;
    }

    const [conversation] = await db
      .insert(conversations)
      .values({
        title: parsed.data.title,
        source: parsed.data.source,
        metadata: parsed.data.metadata,
      })
      .returning();

    res.status(201).json(conversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /conversations - List all conversations
router.get("/", async (_req: Request, res: Response) => {
  try {
    const allConversations = await db
      .select()
      .from(conversations)
      .orderBy(asc(conversations.createdAt));

    res.json(allConversations);
  } catch (error) {
    console.error("Error listing conversations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /conversations/:id - Get a conversation with its turns
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // Get conversation
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Get paginated turns
    const conversationTurns = await db
      .select()
      .from(turns)
      .where(eq(turns.conversationId, id))
      .orderBy(asc(turns.turnIndex))
      .limit(limit)
      .offset(offset);

    // Get total turn count for pagination
    const allTurns = await db
      .select()
      .from(turns)
      .where(eq(turns.conversationId, id));

    res.json({
      ...conversation,
      turns: conversationTurns,
      pagination: {
        page,
        limit,
        total: allTurns.length,
        totalPages: Math.ceil(allTurns.length / limit),
      },
    });
  } catch (error) {
    console.error("Error getting conversation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /conversations/:id/turns - Bulk insert turns
router.post("/:id/turns", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify conversation exists
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const parsed = bulkCreateTurnsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.errors });
      return;
    }

    // Insert all turns
    const turnsToInsert = parsed.data.turns.map((turn) => ({
      conversationId: id,
      speaker: turn.speaker,
      text: turn.text,
      startMs: turn.startMs,
      endMs: turn.endMs,
      turnIndex: turn.turnIndex,
      metadata: turn.metadata,
    }));

    const insertedTurns = await db.insert(turns).values(turnsToInsert).returning();

    res.status(201).json({
      message: `Inserted ${insertedTurns.length} turns`,
      turns: insertedTurns,
    });
  } catch (error) {
    console.error("Error inserting turns:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /conversations/:id - Delete a conversation and all its turns
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [deleted] = await db
      .delete(conversations)
      .where(eq(conversations.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    res.json({ message: "Conversation deleted", conversation: deleted });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /conversations/:id/insights - Get insights for a conversation (grouped by type)
router.get("/:id/insights", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify conversation exists
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const allInsights = await db
      .select()
      .from(insights)
      .where(eq(insights.conversationId, id));

    // Group by type
    const grouped = {
      decisions: allInsights.filter((i) => i.type === "decision"),
      actions: allInsights.filter((i) => i.type === "action"),
      risks: allInsights.filter((i) => i.type === "risk"),
      questions: allInsights.filter((i) => i.type === "question"),
    };

    res.json(grouped);
  } catch (error) {
    console.error("Error getting insights:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
