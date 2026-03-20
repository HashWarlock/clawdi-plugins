import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";

export function register(api: OpenClawPluginApi) {
  api.registerCommand({
    name: "write_spec",
    description: "Write a product specification document for a feature or project",
    handler: async () => ({
      systemPrompt:
        "Use the product-management-write-spec skill to write a product specification for the user's feature or project.",
    }),
  });

  api.registerCommand({
    name: "sprint_planning",
    description: "Plan the next sprint by reviewing backlog and proposing a sprint scope",
    handler: async () => ({
      systemPrompt:
        "Use the product-management-sprint-planning skill to help the user plan the next sprint.",
    }),
  });

  api.registerCommand({
    name: "roadmap_update",
    description: "Generate a roadmap update based on current progress and priorities",
    handler: async () => ({
      systemPrompt:
        "Use the product-management-roadmap-update skill to generate a roadmap update.",
    }),
  });

  api.registerCommand({
    name: "metrics_review",
    description: "Review product metrics and generate an analysis report",
    handler: async () => ({
      systemPrompt:
        "Use the product-management-metrics-review skill to review and analyze product metrics.",
    }),
  });

  api.registerCommand({
    name: "competitive_brief",
    description: "Research competitors and generate a competitive intelligence brief",
    handler: async () => ({
      systemPrompt:
        "Use the product-management-competitive-brief skill to research and brief on competitors.",
    }),
  });

  api.registerCommand({
    name: "product_brainstorming",
    description: "Facilitate a structured product brainstorming session",
    handler: async () => ({
      systemPrompt:
        "Use the product-management-product-brainstorming skill to facilitate a brainstorming session.",
    }),
  });

  api.registerCommand({
    name: "stakeholder_update",
    description: "Prepare a stakeholder update with project status and key decisions",
    handler: async () => ({
      systemPrompt:
        "Use the product-management-stakeholder-update skill to prepare a stakeholder update.",
    }),
  });

  api.registerCommand({
    name: "synthesize_research",
    description: "Synthesize user research, feedback, and data into actionable insights",
    handler: async () => ({
      systemPrompt:
        "Use the product-management-synthesize-research skill to synthesize research findings.",
    }),
  });
}
