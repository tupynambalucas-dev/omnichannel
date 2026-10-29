<context-hierarchy>
  <parent src="../AGENTS.md" type="global-rules" />
  <system-instruction>
    AGENT: You are operating in the .agents bounded context of tupynambalucas-dev/omnichannel. If you have not read ../AGENTS.md in this session, stop now and read it using your file-reading tools before proceeding.
  </system-instruction>
</context-hierarchy>

# Local Context: Agent Customizations (`.agents`)

This directory governs AI agent plugin consumption and local customization assets for the `tupynambalucas-dev/omnichannel` monorepo.

## Directory Layout

- [README.md](./README.md): Developer guide for consuming organizational plugins via pnpm catalogs.
- [plugins.json](./plugins.json): Antigravity plugin discovery manifest referencing installed `@tupynambalucas-dev/plugin-*` packages under `node_modules/`.

## Architecture & Guardrails

1. **Zero Local `package.json`**: Never create a `package.json` inside `.agents/`. All upstream organizational plugins MUST be declared in the root [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) under `catalogs.plugins-stack` and consumed in the root [`package.json`](../package.json) `devDependencies`.
2. **Local Project Plugin Target**: If a domain plugin specific exclusively to `omnichannel` is ever scaffolded, create it under `.agents/plugins/<slug>/` following the `plugin-architect` Workflow B standard. Never search for an external `agent-mesh` directory on disk.
3. **Loaded Domain Plugins**:
   - `@tupynambalucas-dev/plugin-atelier`
   - `@tupynambalucas-dev/plugin-docusaurus`
   - `@tupynambalucas-dev/plugin-github-flow`
   - `@tupynambalucas-dev/plugin-github-org`
   - `@tupynambalucas-dev/plugin-repo`
   - `@tupynambalucas-dev/plugin-research`
   - `@tupynambalucas-dev/plugin-secrets`
   - `@tupynambalucas-dev/plugin-web`

## Required Skills

- **`plugin-architect`**: Active when modifying `plugins.json` or scaffolding local `.agents/plugins/<slug>/` manifests.
- **`router-architect`**: Active when updating `AGENTS.md` context routers.
