interface OpenClawPluginApi {
  registerCommand(command: {
    name: string;
    description: string;
    handler: (ctx: any) => Promise<unknown>;
  }): void;
}

export function register(api: OpenClawPluginApi) {
  api.registerCommand({
    name: "plan_day",
    description: "Generate a prioritized daily plan based on your calendar, tasks, and emails",
    handler: async () => ({
      text: "Use the productivity-daily-planner skill to plan the user's day.",
    }),
  });

  api.registerCommand({
    name: "weekly_review",
    description: "Run a weekly review: what happened, what's next, what needs attention",
    handler: async () => ({
      text: "Use the productivity-weekly-review skill to run the user's weekly review.",
    }),
  });
}
