import express from "express";
import conversationsRouter from "./routes/conversations.js";
import ingestRouter from "./routes/ingest.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: "10mb" })); // Allow larger payloads for transcripts
app.use(express.text({ limit: "10mb", type: "text/plain" })); // Support plain text for WhatsApp/SRT

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/conversations", conversationsRouter);
app.use("/ingest", ingestRouter);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CUP server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;
