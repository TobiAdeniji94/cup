import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  real,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enum for insight types
export const insightTypeEnum = pgEnum("insight_type", [
  "decision",
  "action",
  "risk",
  "question",
]);

// Conversations table
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  source: text("source"), // e.g., "slack", "transcript", "whatsapp"
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Turns table - individual utterances in a conversation
export const turns = pgTable("turns", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  speaker: text("speaker").notNull(),
  text: text("text").notNull(),
  startMs: integer("start_ms"), // milliseconds from conversation start
  endMs: integer("end_ms"),
  turnIndex: integer("turn_index").notNull(), // order within conversation
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insights table - extracted decisions, actions, risks, questions
export const insights = pgTable("insights", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  type: insightTypeEnum("type").notNull(),
  summary: text("summary").notNull(),
  turnIds: uuid("turn_ids").array(), // references to source turns
  owners: text("owners").array(), // people responsible (for actions)
  dueDate: timestamp("due_date"), // for action items
  createdByModel: text("created_by_model"), // which LLM model extracted this
  confidence: real("confidence"), // 0-1 confidence score
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const conversationsRelations = relations(conversations, ({ many }) => ({
  turns: many(turns),
  insights: many(insights),
}));

export const turnsRelations = relations(turns, ({ one }) => ({
  conversation: one(conversations, {
    fields: [turns.conversationId],
    references: [conversations.id],
  }),
}));

export const insightsRelations = relations(insights, ({ one }) => ({
  conversation: one(conversations, {
    fields: [insights.conversationId],
    references: [conversations.id],
  }),
}));

// Type exports for use in application code
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Turn = typeof turns.$inferSelect;
export type NewTurn = typeof turns.$inferInsert;
export type Insight = typeof insights.$inferSelect;
export type NewInsight = typeof insights.$inferInsert;
export type InsightType = "decision" | "action" | "risk" | "question";
