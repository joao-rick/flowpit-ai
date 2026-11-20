import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { analyzeIssuesFunction } from "@/lib/orchestration/analysis-function";

export const maxDuration = 300;

export const { GET, POST, PUT } = serve({ client: inngest, functions: [analyzeIssuesFunction] });
