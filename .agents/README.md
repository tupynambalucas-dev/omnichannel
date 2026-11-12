# Agent Customizations (`.agents`)

Configuration directory binding enterprise AI agent plugins, rules, and modular skills from `@tupynambalucas-dev/agent-mesh` into the `tupynambalucas-dev/omnichannel` workspace.

---

## Overview

Rather than duplicating rules or mounting Git submodules, `omnichannel` consumes sovereign domain plugins via the `@tupynambalucas-dev/agent-mesh` umbrella package managed through the `plugins-stack` catalog in [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) and installed via the root [`package.json`](../package.json).

All 10 domain plugins and 8 sovereign MCP servers are discovered simultaneously via the single entrypoint in [`plugins.json`](./plugins.json):

```json
{
  "entries": [
    {
      "path": "node_modules/@tupynambalucas-dev/agent-mesh/plugins/packages"
    }
  ]
}
```

---

## Configured Domain Plugins

| Plugin        | Capabilities                                                          | Sovereign MCP Server                         |
| :------------ | :-------------------------------------------------------------------- | :------------------------------------------- |
| `appsheet`    | Relational schemas, key formulas, Playwright Studio automation        | `mcp-appsheet` via `scripts/launcher.cjs`    |
| `atelier`     | Context routers (`AGENTS.md`), skills, rules, hooks, plugin manifests | Self-contained (no MCP)                      |
| `docusaurus`  | Diátaxis taxonomy, Markdown/MDX auditing and scaffolding              | Self-contained (no MCP)                      |
| `github-flow` | Conventional Commits, SSH commit signing, pull requests, Actions      | `mcp-github-flow` via `scripts/launcher.cjs` |
| `github-org`  | Organization repository provisioning, branch rulesets, security       | `mcp-github-org` via `scripts/launcher.cjs`  |
| `gwork`       | Google Sheets normalization, Drive file operations, Docs export       | `mcp-gwork` via `scripts/launcher.cjs`       |
| `repo`        | Monorepo catalogs, Solution TSConfig references, licensing            | Self-contained (no MCP)                      |
| `research`    | Upstream library documentation via Context7, Firecrawl scraping       | `mcp-firecrawl` via `scripts/launcher.cjs`   |
| `secrets`     | Infisical Cloud secret injection, Universal Auth, secret hygiene      | `mcp-infisical` via `scripts/launcher.cjs`   |
| `web`         | Headless and interactive Playwright browser verification              | `mcp-playwright` via `scripts/launcher.cjs`  |

---

## Directory Layout

- [AGENTS.md](./AGENTS.md): Bounded context router for `.agents/`.
- [plugins.json](./plugins.json): Antigravity runtime plugin discovery manifest.

---

## Navigation

- Parent Workspace: [Omnichannel Monorepo Root](../README.md)
