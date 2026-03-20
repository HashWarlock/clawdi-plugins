interface OpenClawPluginApi {
  registerCommand(command: {
    name: string;
    description: string;
    handler: (ctx: any) => Promise<unknown>;
  }): void;
}

export function register(api: OpenClawPluginApi) {
  api.registerCommand({
    name: "campaign_plan",
    description: "Build a full marketing campaign plan with channels, timeline, budget, and KPIs",
    handler: async () => ({
      systemPrompt: "Use the marketing-campaign-plan skill to build a campaign plan. Ask the user for the campaign goal and target audience.",
    }),
  });

  api.registerCommand({
    name: "seo_audit",
    description: "Run a comprehensive SEO audit on a URL and get prioritized recommendations",
    handler: async () => ({
      systemPrompt: "Use the marketing-seo-audit skill to audit the provided URL. Ask the user for the URL to audit.",
    }),
  });

  api.registerCommand({
    name: "performance_report",
    description: "Generate a marketing performance report with metrics, trends, and recommendations",
    handler: async () => ({
      systemPrompt: "Use the marketing-performance-report skill to build the report. Ask the user for the time period and channels to include.",
    }),
  });

  api.registerCommand({
    name: "email_sequence",
    description: "Design a multi-step email sequence with targeting, copy, and send schedule",
    handler: async () => ({
      systemPrompt: "Use the marketing-email-sequence skill to design the sequence. Ask the user for the sequence goal and audience.",
    }),
  });

  api.registerCommand({
    name: "brand_review",
    description: "Audit brand consistency across channels and get alignment recommendations",
    handler: async () => ({
      systemPrompt: "Use the marketing-brand-review skill to review brand consistency. Ask the user for the brand or channels to review.",
    }),
  });
}
