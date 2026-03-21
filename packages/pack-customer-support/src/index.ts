import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";

export function register(api: OpenClawPluginApi) {
  api.registerCommand({
    name: "triage_tickets",
    description: "Triage and prioritize open support tickets",
    handler: async () => ({
      text:
        "Use the customer-support-ticket-triage skill to triage and prioritize the user's open support tickets.",
    }),
  });

  api.registerCommand({
    name: "research_customer",
    description: "Research a customer's account history and context",
    handler: async () => ({
      text:
        "Use the customer-support-customer-research skill to research the specified customer.",
    }),
  });

  api.registerCommand({
    name: "draft_support_response",
    description: "Draft a response to a customer support ticket",
    handler: async () => ({
      text:
        "Use the customer-support-draft-response skill to draft a response to the specified ticket.",
    }),
  });

  api.registerCommand({
    name: "escalate_ticket",
    description: "Escalate a support ticket with context and routing",
    handler: async () => ({
      text:
        "Use the customer-support-customer-escalation skill to escalate the specified ticket.",
    }),
  });

  api.registerCommand({
    name: "create_kb_article",
    description: "Create a knowledge base article from resolved tickets",
    handler: async () => ({
      text:
        "Use the customer-support-kb-article skill to create a knowledge base article from the specified resolved tickets.",
    }),
  });
}
