import { Hono } from "hono";

const app = new Hono();

// Root route - API only (frontend is served by SvelteKit)
app.get("/", (c) => {
  return c.json({
    message: "Bulk Email Sender API",
    version: "2.0.0",
    docs: "See /health for status",
  });
});

export default app;
