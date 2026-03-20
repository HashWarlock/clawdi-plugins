import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";

export function register(api: OpenClawPluginApi) {
  // Register pack-specific slash commands for quick access to HR workflows.
  // The router discovers this pack automatically via the @clawdi-ai/pack-* convention
  // and reads pack-manifest.yaml for capability requirements.

  api.registerCommand({
    name: "performance_review",
    description: "Structure a performance review with self-assessment, manager review, or calibration templates",
    handler: async () => ({
      systemPrompt: "Use the performance-review skill to help structure a performance review.",
    }),
  });

  api.registerCommand({
    name: "comp_analysis",
    description: "Run compensation benchmarking, band placement, or equity modeling",
    handler: async () => ({
      systemPrompt: "Use the comp-analysis skill to analyze compensation.",
    }),
  });

  api.registerCommand({
    name: "people_report",
    description: "Generate a people analytics report on headcount, attrition, diversity, or org health",
    handler: async () => ({
      systemPrompt: "Use the people-report skill to generate a people analytics report.",
    }),
  });

  api.registerCommand({
    name: "policy_lookup",
    description: "Find and explain a company policy in plain language",
    handler: async () => ({
      systemPrompt: "Use the policy-lookup skill to find and explain the requested policy.",
    }),
  });

  api.registerCommand({
    name: "onboarding_plan",
    description: "Generate an onboarding checklist and first-week plan for a new hire",
    handler: async () => ({
      systemPrompt: "Use the onboarding-plan skill to create an onboarding plan for the new hire.",
    }),
  });

  api.registerCommand({
    name: "employee_handbook",
    description: "Create or update an employee handbook section",
    handler: async () => ({
      systemPrompt: "Use the employee-handbook skill to create or update a handbook section.",
    }),
  });

  api.registerCommand({
    name: "exit_interview",
    description: "Structure an exit interview process or analyze departure patterns",
    handler: async () => ({
      systemPrompt: "Use the exit-interview skill to structure the exit interview process.",
    }),
  });
}
