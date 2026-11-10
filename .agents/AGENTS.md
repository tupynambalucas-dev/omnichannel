<context-hierarchy>
  <parent src="../AGENTS.md" type="global-rules" />
  <system-instruction>
    AGENT: You are operating in the .agents bounded context of tupynambalucas-dev/omnichannel. If you have not read ../AGENTS.md in this session, stop now and read it using your file-reading tools before proceeding.
  </system-instruction>
</context-hierarchy>

# Local Context: Agent Customizations (`.agents`)

This directory governs AI agent plugin consumption and local customization assets for the `tupynambalucas-dev/omnichannel` monorepo.

## Directory Layout

- [README.md](./README.md): Developer guide for consuming organizational plugins via the `@tupynambalucas-dev/agent-mesh` umbrella package.
- [plugins.json](./plugins.json): Antigravity plugin discovery manifest referencing `@tupynambalucas-dev/agent-mesh/plugins/packages` under `node_modules/`.

## Architecture & Guardrails

1. **Umbrella Package Consumption**: Never create a `package.json` inside `.agents/`. Upstream organizational plugins are consumed via the `@tupynambalucas-dev/agent-mesh` umbrella package declared in [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) under `catalogs.plugins-stack` (`github:tupynambalucas-dev/agent-mesh`) and installed via the root [`package.json`](../package.json) `devDependencies` (`catalog:plugins-stack`).
2. **Deterministic Discovery Path**: [`plugins.json`](./plugins.json) registers `node_modules/@tupynambalucas-dev/agent-mesh/plugins/packages`. Antigravity and Claude Code automatically discover all 10 domain plugins and their sovereign MCP servers without manual per-plugin imports.
3. **Local Project Plugin Target**: If a domain plugin specific exclusively to `omnichannel` is ever scaffolded, create it under `.agents/plugins/<slug>/` following the `plugin-architect` Workflow B standard. Never search for an external `agent-mesh` directory on disk.
4. **Loaded Domain Plugins & Sovereign Launchers**:
   - `appsheet`: Google AppSheet relational schema and Studio automation.
   - `atelier`: Context routers (`AGENTS.md`), skills, rules, hooks, and plugin manifests.
   - `docusaurus`: Diátaxis documentation quadrant taxonomy and Markdown validation.
   - `github-flow`: Conventional Commits, SSH commit signing, pull requests, and GitHub Actions.
   - `github-org`: Organization repository provisioning, branch rulesets, and security auditing.
   - `gwork`: Google Workspace Sheets, Drive, and Docs relational operators.
   - `repo`: Monorepo catalogs, Solution TSConfig references, licensing, and `README.md` architecture.
   - `research`: Upstream library documentation via Context7 and web extraction via Firecrawl.
   - `secrets`: Infisical Cloud secret injection, Universal Auth, and zero-leakage secret hygiene.
   - `web`: Headless and interactive Playwright browser verification via sovereign launchers.

## Required Skills

- **`plugin-architect`**: Active when modifying `plugins.json` or scaffolding local `.agents/plugins/<slug>/` manifests.
- **`router-architect`**: Active when updating `AGENTS.md` context routers.
