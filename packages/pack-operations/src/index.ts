interface OpenClawPluginApi {
  registerCommand(command: {
    name: string;
    description: string;
    handler: (ctx: any) => Promise<unknown>;
  }): void;
}

export function register(api: OpenClawPluginApi) {
  api.registerCommand({
    name: "status_report",
    description: "Generate a status report summarizing project progress, blockers, and next steps",
    handler: async () => ({
      text: "Use the ops-status-report skill to build the report. Ask the user for the reporting period and projects to include.",
    }),
  });

  api.registerCommand({
    name: "change_request",
    description: "Create a structured change request with impact analysis and rollback plan",
    handler: async () => ({
      text: "Use the ops-change-request skill to draft the change request. Ask the user for the change details.",
    }),
  });

  api.registerCommand({
    name: "risk_assessment",
    description: "Evaluate risks for a project, initiative, or operational change",
    handler: async () => ({
      text: "Use the ops-risk-assessment skill to assess risks. Ask the user for the subject to evaluate.",
    }),
  });

  api.registerCommand({
    name: "runbook",
    description: "Create or update an operational runbook with step-by-step procedures",
    handler: async () => ({
      text: "Use the ops-runbook skill to create the runbook. Ask the user for the procedure to document.",
    }),
  });

  api.registerCommand({
    name: "capacity_plan",
    description: "Analyze team capacity and plan resource allocation for upcoming work",
    handler: async () => ({
      text: "Use the ops-capacity-plan skill to analyze capacity. Ask the user for the time period and teams to include.",
    }),
  });
}
