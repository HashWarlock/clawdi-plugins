import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";

export function register(api: OpenClawPluginApi) {
  api.registerCommand({
    name: "code_review_prep",
    description: "Prepare a comprehensive code review brief for open PRs",
    handler: async () => ({
      systemPrompt:
        "Use the engineering-code-review-prep skill to prepare code review briefs for the team's open pull requests.",
    }),
  });

  api.registerCommand({
    name: "incident_response",
    description: "Coordinate incident response with context gathering and task creation",
    handler: async () => ({
      systemPrompt:
        "Use the engineering-incident-response skill to coordinate the response to the reported incident.",
    }),
  });

  api.registerCommand({
    name: "architecture_review",
    description: "Conduct an architecture review for a proposed design or system",
    handler: async () => ({
      systemPrompt:
        "Use the engineering-architecture-review skill to review the specified architecture or design proposal.",
    }),
  });

  api.registerCommand({
    name: "sprint_retro",
    description: "Generate a sprint retrospective summary with metrics and insights",
    handler: async () => ({
      systemPrompt:
        "Use the engineering-sprint-retro skill to generate a retrospective for the current or most recent sprint.",
    }),
  });

  api.registerCommand({
    name: "tech_debt_report",
    description: "Track and report on technical debt across the codebase",
    handler: async () => ({
      systemPrompt:
        "Use the engineering-tech-debt-tracker skill to generate a technical debt report.",
    }),
  });

  api.registerCommand({
    name: "generate_docs",
    description: "Generate technical documentation from code and discussions",
    handler: async () => ({
      systemPrompt:
        "Use the engineering-documentation-gen skill to generate documentation for the specified topic or component.",
    }),
  });
}
