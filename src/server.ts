import express from "express";
import conversationsRouter from "./routes/conversations.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/conversations", conversationsRouter);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CUP server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;
