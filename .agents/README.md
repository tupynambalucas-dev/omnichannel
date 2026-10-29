# Agent Customizations (`.agents`)

Configuration directory binding enterprise AI agent plugins, rules, and modular skills from `@tupynambalucas-dev/agent-mesh` into the `tupynambalucas-dev/omnichannel` workspace.

---

## Overview

Rather than duplicating rules or mounting Git submodules, `omnichannel` consumes sovereign domain plugins as versioned packages managed through the `plugins-stack` catalog in [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) and installed via the root [`package.json`](../package.json).

---

## Configured Domain Plugins

| Package                                  | Path in `plugins.json`                                | Domain Capabilities                                                                       |
| :--------------------------------------- | :---------------------------------------------------- | :---------------------------------------------------------------------------------------- |
| `@tupynambalucas-dev/plugin-atelier`     | `node_modules/@tupynambalucas-dev/plugin-atelier`     | Context routers (`AGENTS.md`), skills, rules, hooks, and plugin manifests.                |
| `@tupynambalucas-dev/plugin-repo`        | `node_modules/@tupynambalucas-dev/plugin-repo`        | Monorepo catalogs, Solution TSConfig references, licensing, and `README.md` architecture. |
| `@tupynambalucas-dev/plugin-github-flow` | `node_modules/@tupynambalucas-dev/plugin-github-flow` | Conventional Commits, SSH commit signing, pull requests, and GitHub Actions.              |
| `@tupynambalucas-dev/plugin-github-org`  | `node_modules/@tupynambalucas-dev/plugin-github-org`  | Organization repository provisioning, branch rulesets, and security auditing.             |
| `@tupynambalucas-dev/plugin-research`    | `node_modules/@tupynambalucas-dev/plugin-research`    | Upstream library documentation via Context7 and web extraction via Firecrawl.             |
| `@tupynambalucas-dev/plugin-secrets`     | `node_modules/@tupynambalucas-dev/plugin-secrets`     | Infisical Cloud secret injection, Universal Auth, and zero-leakage secret hygiene.        |
| `@tupynambalucas-dev/plugin-docusaurus`  | `node_modules/@tupynambalucas-dev/plugin-docusaurus`  | Diátaxis documentation quadrant taxonomy and Markdown validation.                         |
| `@tupynambalucas-dev/plugin-web`         | `node_modules/@tupynambalucas-dev/plugin-web`         | Headless and interactive Playwright browser verification.                                 |

---

## Directory Layout

- [AGENTS.md](./AGENTS.md): Bounded context router for `.agents/`.
- [plugins.json](./plugins.json): Antigravity runtime plugin discovery manifest.

---

## Navigation

- Parent Workspace: [Omnichannel Monorepo Root](../README.md)
