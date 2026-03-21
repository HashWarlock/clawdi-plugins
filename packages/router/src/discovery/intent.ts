export interface ExtractedIntent {
  intent: string;
  domain: string;
}

export function extractIntent(capabilityId: string): ExtractedIntent {
  const dotIndex = capabilityId.indexOf(".");
  if (dotIndex === -1) {
    return { intent: capabilityId, domain: "" };
  }
  const domain = capabilityId.slice(0, dotIndex);
  const verbNoun = capabilityId.slice(dotIndex + 1);
  const intent = verbNoun.replace(/_/g, " ");
  return { intent, domain };
}

export function extractVerb(capabilityId: string): string {
  const dotIndex = capabilityId.indexOf(".");
  const verbNoun =
    dotIndex === -1 ? capabilityId : capabilityId.slice(dotIndex + 1);
  const underscoreIndex = verbNoun.indexOf("_");
  return underscoreIndex === -1 ? verbNoun : verbNoun.slice(0, underscoreIndex);
}
