import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";

export function register(api: OpenClawPluginApi) {
  api.registerCommand({
    name: "search",
    description: "Search across all connected sources for information",
    handler: async () => ({
      systemPrompt:
        "Use the enterprise-search-search skill to search across all connected sources for the user's query.",
    }),
  });

  api.registerCommand({
    name: "search_strategy",
    description: "Plan a research strategy for a complex question",
    handler: async () => ({
      systemPrompt:
        "Use the enterprise-search-search-strategy skill to plan a multi-step research strategy for the user's question.",
    }),
  });

  api.registerCommand({
    name: "knowledge_synthesis",
    description: "Synthesize knowledge from multiple sources into a structured brief",
    handler: async () => ({
      systemPrompt:
        "Use the enterprise-search-knowledge-synthesis skill to gather and synthesize information from multiple sources.",
    }),
  });

  api.registerCommand({
    name: "digest",
    description: "Generate an information digest from recent activity across all sources",
    handler: async () => ({
      systemPrompt:
        "Use the enterprise-search-digest skill to generate a curated digest of recent activity and information.",
    }),
  });
}
