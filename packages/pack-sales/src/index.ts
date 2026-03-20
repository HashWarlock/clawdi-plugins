interface OpenClawPluginApi {
  registerCommand(command: {
    name: string;
    description: string;
    handler: (ctx: any) => Promise<unknown>;
  }): void;
}

export function register(api: OpenClawPluginApi) {
  api.registerCommand({
    name: "call_summary",
    description: "Process call notes or transcript — extract action items, draft follow-up, generate internal summary",
    handler: async () => ({
      systemPrompt: "Use the sales-call-summary skill to process the call notes or transcript provided by the user.",
    }),
  });

  api.registerCommand({
    name: "forecast",
    description: "Generate a weighted sales forecast with scenarios and gap analysis",
    handler: async () => ({
      systemPrompt: "Use the sales-forecast skill to build a forecast. Ask the user for the time period.",
    }),
  });

  api.registerCommand({
    name: "pipeline_review",
    description: "Analyze pipeline health, prioritize deals, and create a weekly action plan",
    handler: async () => ({
      systemPrompt: "Use the sales-pipeline-review skill to analyze the pipeline. Ask the user for their pipeline data.",
    }),
  });
}
