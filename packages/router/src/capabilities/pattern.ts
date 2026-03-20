export function matchCapabilityPattern(pattern: string, capabilityId: string): boolean {
  if (pattern.endsWith(".*")) {
    const prefix = pattern.slice(0, -1);
    return capabilityId.startsWith(prefix);
  }
  return pattern === capabilityId;
}

export function findBestMatch<T>(patterns: Record<string, T>, capabilityId: string): T | undefined {
  if (capabilityId in patterns) return patterns[capabilityId];
  let bestMatch: T | undefined;
  let bestLength = 0;
  for (const [pattern, value] of Object.entries(patterns)) {
    if (pattern.endsWith(".*")) {
      const prefix = pattern.slice(0, -1);
      if (capabilityId.startsWith(prefix) && prefix.length > bestLength) {
        bestMatch = value;
        bestLength = prefix.length;
      }
    }
  }
  return bestMatch;
}
