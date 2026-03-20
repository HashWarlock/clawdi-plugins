import type { CapabilityId } from "../capabilities/types.js";

/**
 * Maps capabilities to the broadest app that covers them.
 * Used by /connect_apps to suggest e.g. "Google Workspace"
 * instead of asking about Calendar, Gmail, Docs separately.
 */
const APP_COVERAGE: Record<string, CapabilityId[]> = {
  "Google Workspace": [
    "calendar.read_events",
    "calendar.prepare_meeting_context",
    "mail.send_followup",
    "mail.read_inbox",
    "docs.create_brief",
  ],
  HubSpot: ["crm.lookup_account", "crm.create_note"],
  Salesforce: ["crm.lookup_account", "crm.create_note"],
  Slack: ["chat.search_messages", "chat.send_message"],
  Greenhouse: ["ats.search_candidates", "ats.get_candidate", "ats.update_candidate_stage"],
  BambooHR: ["hris.get_employee", "hris.list_employees"],
  Linear: ["project.list_tasks", "project.create_task"],
};

export interface AppSuggestion {
  appName: string;
  coversCapabilities: CapabilityId[];
  uncoveredAfter: CapabilityId[];
}

export function suggestBroadestApps(
  unreadyCapabilities: CapabilityId[]
): AppSuggestion[] {
  const remaining = new Set(unreadyCapabilities);
  const suggestions: AppSuggestion[] = [];

  while (remaining.size > 0) {
    // Find the app that covers the most remaining capabilities
    let bestApp = "";
    let bestCovered: CapabilityId[] = [];

    for (const [app, caps] of Object.entries(APP_COVERAGE)) {
      const covered = caps.filter((c) => remaining.has(c));
      if (covered.length > bestCovered.length) {
        bestApp = app;
        bestCovered = covered;
      }
    }

    if (bestCovered.length === 0) break; // no app covers remaining capabilities

    for (const cap of bestCovered) {
      remaining.delete(cap);
    }

    suggestions.push({
      appName: bestApp,
      coversCapabilities: bestCovered,
      uncoveredAfter: [...remaining],
    });
  }

  return suggestions;
}

export function lookupBroadestApp(capabilityId: CapabilityId): string | undefined {
  for (const [app, caps] of Object.entries(APP_COVERAGE)) {
    if (caps.includes(capabilityId)) {
      return app;
    }
  }
  return undefined;
}
