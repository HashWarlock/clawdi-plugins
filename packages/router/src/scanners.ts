import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import type { PackCapability, ProviderEntry, RuntimeCallbacks } from "./types.js";

const execFileAsync = promisify(execFile);

// --- Private helpers ---

function extractIntent(capabilityId: string): { intent: string; domain: string } {
  const dotIndex = capabilityId.indexOf(".");
  if (dotIndex === -1) return { intent: capabilityId, domain: "" };
  const domain = capabilityId.slice(0, dotIndex);
  const intent = capabilityId.slice(dotIndex + 1).replace(/_/g, " ");
  return { intent, domain };
}

function matchPattern(pattern: string, capabilityId: string): boolean {
  if (pattern === capabilityId) return true;
  if (pattern.endsWith(".*")) return capabilityId.startsWith(pattern.slice(0, -1));
  if (pattern.endsWith("*")) return capabilityId.startsWith(pattern.slice(0, -1));
  return false;
}

function toolkitDisplayName(toolkit: string): string {
  const overrides: Record<string, string> = {
    googlesuper: "Google Workspace",
    hubspot: "HubSpot",
    bamboohr: "BambooHR",
  };
  return overrides[toolkit] ?? toolkit.charAt(0).toUpperCase() + toolkit.slice(1);
}

// --- Scanners ---

export function scanBuiltins(
  capabilities: PackCapability[],
  callbacks: RuntimeCallbacks
): ProviderEntry[] {
  const tools = callbacks.listBuiltinTools();
  const entries: ProviderEntry[] = [];

  for (const cap of capabilities) {
    const dotIndex = cap.id.indexOf(".");
    const toolName = dotIndex === -1 ? cap.id : cap.id.slice(dotIndex + 1);
    if (tools.includes(toolName)) {
      entries.push({
        providerId: `builtin:${toolName}`,
        capabilityId: cap.id,
        target: { kind: "builtin_tool", name: toolName },
        ready: true,
        source: "builtin",
      });
    }
  }

  return entries;
}

export async function scanComposio(
  capabilities: PackCapability[],
  callbacks: RuntimeCallbacks,
  preferredProviders?: Record<string, string[]>
): Promise<ProviderEntry[]> {
  const entries: ProviderEntry[] = [];

  for (const cap of capabilities) {
    try {
      const { intent } = extractIntent(cap.id);
      const res = (await callbacks.callMcpTool("clawdi-mcp", "COMPOSIO_SEARCH_TOOLS", {
        queries: [{ use_case: intent }],
      })) as any;

      const slugs: string[] = res?.primary_tool_slugs ?? [];
      if (!slugs.length) continue;

      // Check preferred providers for this capability
      const preferredApps: string[] = [];
      if (preferredProviders) {
        for (const [pattern, apps] of Object.entries(preferredProviders)) {
          if (matchPattern(pattern, cap.id)) {
            preferredApps.push(...apps);
            break;
          }
        }
      }

      let action: string;
      if (preferredApps.length) {
        const preferred = slugs.find((s) =>
          preferredApps.some((app) => s.toLowerCase().startsWith(app.toLowerCase()))
        );
        action = preferred ?? slugs[0];
      } else {
        action = slugs[0];
      }

      const toolkit = action.split("_")[0].toLowerCase();
      const statuses: Record<string, string> = res?.toolkit_connection_statuses ?? {};
      const connected = statuses[toolkit] === "active";

      let setupUrl: string | undefined;
      if (!connected) {
        try {
          const conn = (await callbacks.callMcpTool("clawdi-mcp", "COMPOSIO_MANAGE_CONNECTIONS", {
            toolkits: [toolkit],
          })) as any;
          setupUrl = conn?.redirect_url;
        } catch {
          // Best-effort
        }
      }

      entries.push({
        providerId: `composio:${toolkit}`,
        capabilityId: cap.id,
        target: { kind: "composio", action, toolkit },
        ready: connected,
        setupHint: connected ? undefined : "Connect via OAuth",
        setupUrl,
        source: "composio",
      });
    } catch {
      // Skip capabilities that fail Composio search
    }
  }

  return entries;
}

export async function scanMcpServers(
  capabilities: PackCapability[],
  callbacks: RuntimeCallbacks
): Promise<ProviderEntry[]> {
  const entries: ProviderEntry[] = [];

  let servers: Array<{ name: string; tools: Array<{ name: string; description?: string }> }>;
  try {
    servers = await callbacks.listMcpServers();
  } catch {
    return entries;
  }

  for (const cap of capabilities) {
    const { intent } = extractIntent(cap.id);
    const keywords = intent.toLowerCase().split(" ");

    for (const server of servers) {
      for (const tool of server.tools) {
        const nameHaystack = tool.name.replace(/_/g, " ").toLowerCase();
        const descHaystack = (tool.description ?? "").toLowerCase();
        const matchesName = keywords.some((kw) => nameHaystack.includes(kw));
        const matchesDesc = keywords.some((kw) => descHaystack.includes(kw));

        if (matchesName && (matchesDesc || !tool.description)) {
          entries.push({
            providerId: `mcp:${server.name}:${tool.name}`,
            capabilityId: cap.id,
            target: { kind: "mcp_tool", server: server.name, tool: tool.name },
            ready: true,
            source: "mcp",
          });
          break; // First match per capability per server
        }
      }
    }
  }

  return entries;
}

export async function scanCliMappings(
  capabilities: PackCapability[],
  cliMappings: Record<string, string>
): Promise<ProviderEntry[]> {
  const entries: ProviderEntry[] = [];

  for (const cap of capabilities) {
    let bin: string | undefined;
    for (const [pattern, binary] of Object.entries(cliMappings)) {
      if (pattern === cap.id || (pattern.endsWith("*") && cap.id.startsWith(pattern.slice(0, -1)))) {
        bin = binary;
        break;
      }
    }
    if (!bin) continue;

    let ready = false;
    try {
      await execFileAsync("which", [bin]);
      ready = true;
    } catch {
      // Binary not found
    }

    entries.push({
      providerId: `cli:${bin}`,
      capabilityId: cap.id,
      target: { kind: "cli", command: bin },
      ready,
      setupHint: ready ? undefined : `Install ${bin}`,
      source: "cli",
    });
  }

  return entries;
}

export async function scanLobster(
  capabilities: PackCapability[],
  callbacks: RuntimeCallbacks
): Promise<ProviderEntry[]> {
  const entries: ProviderEntry[] = [];

  let workflows: string[];
  try {
    workflows = await callbacks.listLobsterWorkflows();
  } catch {
    return entries;
  }

  for (const cap of capabilities) {
    if (!cap.id.endsWith("_workflow")) continue;

    const dotIndex = cap.id.indexOf(".");
    const suffix = dotIndex === -1 ? cap.id : cap.id.slice(dotIndex + 1);
    const searchTerm = suffix.replace(/_workflow$/, "").replace(/_/g, "-");

    const match = workflows.find((w) => w.includes(searchTerm));
    if (!match) continue;

    entries.push({
      providerId: `lobster:${match}`,
      capabilityId: cap.id,
      target: { kind: "lobster", workflowId: match },
      ready: true,
      source: "lobster",
    });
  }

  return entries;
}

export function scanSkills(
  capabilities: PackCapability[],
  skillDirs: string[]
): ProviderEntry[] {
  const entries: ProviderEntry[] = [];

  for (const dir of skillDirs) {
    if (!existsSync(dir)) continue;

    let skillFolders: string[];
    try {
      skillFolders = readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    } catch {
      continue;
    }

    for (const folder of skillFolders) {
      const skillPath = join(dir, folder, "SKILL.md");
      if (!existsSync(skillPath)) continue;

      let content: string;
      try {
        content = readFileSync(skillPath, "utf-8");
      } catch {
        continue;
      }

      // Extract YAML frontmatter
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!fmMatch) continue;

      let fm: any;
      try {
        fm = parseYaml(fmMatch[1]);
      } catch {
        continue;
      }

      const provides: string[] = fm?.metadata?.router?.provides?.capabilities ?? [];
      if (!provides.length) continue;

      // Check requirements
      const reqBins: string[] = fm?.metadata?.openclaw?.requires?.bins ?? [];
      const reqEnv: string[] = fm?.metadata?.openclaw?.requires?.env ?? [];
      const binsOk = reqBins.every((bin: string) => {
        try {
          execFileSync("which", [bin], { stdio: "ignore" });
          return true;
        } catch {
          return false;
        }
      });
      const envOk = reqEnv.every((key: string) => !!process.env[key]);
      const ready = binsOk && envOk;

      const skillName = fm?.name ?? folder;

      for (const provided of provides) {
        if (!capabilities.some((c) => c.id === provided)) continue;
        entries.push({
          providerId: `skill:${skillName}`,
          capabilityId: provided,
          target: { kind: "skill", skillName },
          ready,
          setupHint: ready ? undefined : `Missing requirements for skill ${skillName}`,
          source: "skill",
        });
      }
    }
  }

  return entries;
}

export async function runAllScanners(
  capabilities: PackCapability[],
  callbacks: RuntimeCallbacks,
  cliMappings: Record<string, string>,
  skillDirs: string[],
  preferredProviders?: Record<string, string[]>
): Promise<ProviderEntry[]> {
  const [builtins, composio, mcp, cli, lobster, skills] = await Promise.all([
    Promise.resolve(scanBuiltins(capabilities, callbacks)),
    scanComposio(capabilities, callbacks, preferredProviders),
    scanMcpServers(capabilities, callbacks),
    scanCliMappings(capabilities, cliMappings),
    scanLobster(capabilities, callbacks),
    Promise.resolve(scanSkills(capabilities, skillDirs)),
  ]);

  return [...builtins, ...composio, ...mcp, ...cli, ...lobster, ...skills];
}
