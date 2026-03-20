# Additional Knowledge Work Packs Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 7 more role packs and split recruiting/HR, bringing total to 10 packs with ~63 skills for testing on a live OpenClaw deployment.

**Depends on:** `docs/superpowers/plans/2026-03-20-knowledge-work-router-implementation.md` (router + sales, productivity, recruiting packs)

**Architecture:** Same as base plan — native OpenClaw plugins discovered by `@clawdi-ai/pack-*` convention + `pack-manifest.yaml`.

**Status:** All 7 new packs have been written to disk by parallel agents. This plan documents what was created and the remaining integration steps.

---

## Packs Created

| Pack | Package | Skills | Location |
|---|---|---|---|
| Marketing | `@clawdi-ai/pack-marketing` | 8 | `packages/pack-marketing/` |
| Operations | `@clawdi-ai/pack-operations` | 9 | `packages/pack-operations/` |
| Customer Support | `@clawdi-ai/pack-customer-support` | 5 | `packages/pack-customer-support/` |
| Engineering | `@clawdi-ai/pack-engineering` | 6 | `packages/pack-engineering/` |
| Enterprise Search | `@clawdi-ai/pack-enterprise-search` | 4 | `packages/pack-enterprise-search/` |
| Human Resources | `@clawdi-ai/pack-human-resources` | 7 | `packages/pack-human-resources/` |
| Product Management | `@clawdi-ai/pack-product-management` | 8 | `packages/pack-product-management/` |

**Total new skills:** 47
**Grand total (all 10 packs):** ~63 skills

---

## Chunk 1: Recruiting/HR Split

The original `pack-recruiting` plan included HR-operations skills that now belong in `pack-human-resources`. This task splits them cleanly.

### Task 1: Update pack-recruiting to remove HR skills

**Context:** The following skills should be REMOVED from pack-recruiting (they are now in pack-human-resources):
- performance-review
- comp-analysis
- people-report
- policy-lookup
- onboarding-plan

Pack-recruiting should keep only recruiting-focused skills:
- recruiting-pipeline
- interview-prep
- org-planning
- draft-offer

**Files:**
- Modify: `packages/pack-recruiting/pack-manifest.yaml`
- Modify: `packages/pack-recruiting/src/index.ts`
- Modify: `packages/pack-recruiting/openclaw.plugin.json`
- Delete: `packages/pack-recruiting/skills/comp-analysis/`
- Delete: `packages/pack-recruiting/skills/people-report/`
- Delete: `packages/pack-recruiting/skills/performance-review/`
- Delete: `packages/pack-recruiting/skills/policy-lookup/`
- Delete: `packages/pack-recruiting/skills/onboarding-plan/`

- [ ] **Step 1: Update pack-manifest.yaml**

Remove `hris.get_employee`, `hris.list_employees`, `compensation.get_benchmarks` from capabilities (these belong to HR pack). Keep only recruiting-relevant capabilities.

```yaml
packId: recruiting
displayName: "Recruiting Pack"
capabilities:
  required:
    - ats.search_candidates
    - ats.get_candidate
    - calendar.read_events
    - research.web_search
  optional:
    - ats.update_candidate_stage
    - mail.send_followup
    - mail.read_inbox
    - docs.create_brief
    - recruiting.offer_workflow
preferredApps:
  ats.*:
    - greenhouse
    - lever
    - ashby
preferences:
  preferredAts:
    type: enum
    values: [greenhouse, lever, ashby, workable]
    label: "Applicant Tracking System"
    description: "Which ATS do you use for recruiting?"
    captureAt: first_use
onboarding:
  welcomeMessage: "The Recruiting pack helps with candidate pipelines, interview planning, org design, and offers."
  suggestedFirstTask: "Try: 'Show me the recruiting pipeline' or 'Prep interview questions for [role]'"
```

- [ ] **Step 2: Update index.ts to remove HR slash commands**

```ts
interface OpenClawPluginApi {
  registerCommand(command: {
    name: string;
    description: string;
    handler: (ctx: any) => Promise<unknown>;
  }): void;
}

export function register(api: OpenClawPluginApi) {
  api.registerCommand({
    name: "draft_offer",
    description: "Draft an offer letter with compensation details",
    handler: async () => ({
      systemPrompt: "Use the recruiting-draft-offer skill. Ask the user for the role and level.",
    }),
  });
}
```

- [ ] **Step 3: Update openclaw.plugin.json**

```json
{
  "id": "@clawdi-ai/pack-recruiting",
  "name": "Recruiting Pack",
  "description": "Recruiting pipeline management, interview prep, org planning, and offer drafting",
  "version": "0.1.0",
  "skills": ["./skills"],
  "configSchema": {}
}
```

- [ ] **Step 4: Delete HR skills from recruiting pack**

```bash
rm -rf packages/pack-recruiting/skills/comp-analysis
rm -rf packages/pack-recruiting/skills/people-report
rm -rf packages/pack-recruiting/skills/performance-review
rm -rf packages/pack-recruiting/skills/policy-lookup
rm -rf packages/pack-recruiting/skills/onboarding-plan
```

- [ ] **Step 5: Commit**

```bash
git add packages/pack-recruiting/
git commit -m "refactor: split HR skills out of recruiting pack into dedicated pack-human-resources"
```

---

## Chunk 2: Register New Packs in Monorepo

### Task 2: Add new packages to pnpm workspace and tsconfig

**Files:**
- Modify: `tsconfig.json` (root — add references for all new packs)
- Verify: `pnpm-workspace.yaml` (already covers `packages/*` via glob)

- [ ] **Step 1: Update root tsconfig.json**

```json
{
  "extends": "./tsconfig.base.json",
  "references": [
    { "path": "packages/router" },
    { "path": "packages/pack-sales" },
    { "path": "packages/pack-productivity" },
    { "path": "packages/pack-recruiting" },
    { "path": "packages/pack-marketing" },
    { "path": "packages/pack-operations" },
    { "path": "packages/pack-customer-support" },
    { "path": "packages/pack-engineering" },
    { "path": "packages/pack-enterprise-search" },
    { "path": "packages/pack-human-resources" },
    { "path": "packages/pack-product-management" }
  ]
}
```

- [ ] **Step 2: Ensure each new pack has tsconfig.json**

Verify or create `tsconfig.json` in each pack directory:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

Packs that need this: `pack-enterprise-search`, `pack-human-resources`, `pack-product-management` (agents may have skipped tsconfig).

- [ ] **Step 3: Install dependencies**

```bash
pnpm install
```

- [ ] **Step 4: Commit**

```bash
git add tsconfig.json packages/*/tsconfig.json
git commit -m "feat: register all 10 packs in monorepo workspace"
```

---

## Chunk 3: Verify All Packs

### Task 3: Validate pack manifests and plugin manifests

- [ ] **Step 1: Verify all pack-manifest.yaml files parse correctly**

```bash
node -e "
const yaml = require('yaml');
const fs = require('fs');
const packs = fs.readdirSync('packages').filter(d => d.startsWith('pack-'));
for (const p of packs) {
  try {
    const m = yaml.parse(fs.readFileSync('packages/' + p + '/pack-manifest.yaml', 'utf-8'));
    const skillCount = fs.readdirSync('packages/' + p + '/skills').filter(d =>
      fs.existsSync('packages/' + p + '/skills/' + d + '/SKILL.md')
    ).length;
    console.log(p, '|', m.packId, '|', m.capabilities.required.length, 'req +', (m.capabilities.optional?.length ?? 0), 'opt |', skillCount, 'skills');
  } catch (e) { console.error(p, 'ERROR:', e.message); }
}
"
```

Expected: 10 packs, each with valid YAML, correct packId, and matching skill counts.

- [ ] **Step 2: Verify all openclaw.plugin.json files are valid**

```bash
node -e "
const fs = require('fs');
const packs = fs.readdirSync('packages').filter(d => d.startsWith('pack-'));
for (const p of packs) {
  try {
    const m = JSON.parse(fs.readFileSync('packages/' + p + '/openclaw.plugin.json', 'utf-8'));
    console.log(p, '|', m.id, '|', m.skills ? 'skills: ' + m.skills.join(',') : 'no skills');
  } catch (e) { console.error(p, 'ERROR:', e.message); }
}
"
```

Expected: All 10 packs have valid JSON with `@clawdi-ai/pack-*` IDs.

- [ ] **Step 3: Verify all skills reference capability_execute**

```bash
grep -rL "capability_execute" packages/pack-*/skills/*/SKILL.md || echo "All skills reference capability_execute"
```

Expected: All skills contain `capability_execute` references.

- [ ] **Step 4: Build all packages**

```bash
pnpm build
```

Expected: All packages compile without errors.

- [ ] **Step 5: Run full test suite**

```bash
pnpm test
```

Expected: ALL PASS

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: add 7 new knowledge-work packs — marketing, operations, customer-support, engineering, enterprise-search, human-resources, product-management

10 packs total with 63 skills covering sales, productivity, recruiting,
marketing, operations, customer support, engineering, enterprise search,
human resources, and product management."
```

---

## Full Pack Inventory

| # | Pack | Skills | Capabilities (Required) |
|---|---|---|---|
| 1 | sales | 8 | calendar, crm, mail, research |
| 2 | productivity | 4 | calendar, mail, project |
| 3 | recruiting | 4 | ats, calendar, research |
| 4 | marketing | 8 | research, analytics, seo, docs |
| 5 | operations | 9 | project, docs, research |
| 6 | customer-support | 5 | mail, crm, docs, project |
| 7 | engineering | 6 | project, docs, chat, research |
| 8 | enterprise-search | 4 | research, docs, mail |
| 9 | human-resources | 7 | hris, docs, compensation |
| 10 | product-management | 8 | project, docs, research, analytics |

**Total: 63 skills across 10 packs**
