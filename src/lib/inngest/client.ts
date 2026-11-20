import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "flowpilot-ai",
  isDev: process.env.NODE_ENV !== "production",
  checkpointing: { maxRuntime: "240s" },
});
