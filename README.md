# `@tupynambalucas-dev/omnichannel`

Enterprise multi-tenant omnichannel messaging gateway, polymorphic UI channel compiler, and deterministic JSONB Finite State Machine (FSM) workflow engine unifying **WhatsApp Cloud API** and **Instagram Messaging API** on a cloud-native, zero-Docker architecture.

---

## 1. Architecture Overview

`@tupynambalucas-dev/omnichannel` ingests high-concurrency Meta Graph webhooks through a single stateless Fastify v5 edge, normalizes heterogeneous WhatsApp and Instagram events into a single **Canonical Inbound Envelope**, enforces two-layer 24-hour idempotency and per-conversation FIFO ordering, and executes declarative multi-tenant conversation workflows backed by Cloud PostgreSQL (with Row-Level Security) and dual-role Cloud Redis.

```text
omnichannel/
├── .agents/                  # Enterprise Agent Mesh plugin bindings (plugins.json)
├── .vscode/                  # Workspace tasks, settings, and recommended extensions
├── core/                     # @tupynambalucas-dev/omnichannel-core (Zod v4 schemas & FSM contracts)
├── api/                      # @tupynambalucas-dev/omnichannel-api (Fastify v5 gateway & BullMQ workers)
├── references/               # Diataxis engineering documentation & cloud onboarding tutorials
├── eslint.config.ts          # Strict flat-config TypeScript ESLint ruleset
├── pnpm-workspace.yaml       # Centralized pnpm dependency and plugin catalogs
├── tsconfig.base.json        # Shared strict ES2022 / NodeNext compiler options
├── tsconfig.json             # Solution-style TypeScript Project References coordinator
├── tsconfig.node.json        # Root tooling TypeScript configuration
└── turbo.json                # Turborepo task graph orchestration
```

---

## 2. Subsystems / Navigation

| Subsystem / Directory      | Package Scope                          | Documentation                                  | Agent Context                            |
| :------------------------- | :------------------------------------- | :--------------------------------------------- | :--------------------------------------- |
| **Core Contracts**         | `@tupynambalucas-dev/omnichannel-core` | [core/README.md](./core/README.md)             | [core/AGENTS.md](./core/AGENTS.md)       |
| **API Gateway & Engine**   | `@tupynambalucas-dev/omnichannel-api`  | [api/README.md](./api/README.md)               | [api/AGENTS.md](./api/AGENTS.md)         |
| **Agent Customizations**   | `.agents`                              | [.agents/README.md](./.agents/README.md)       | [.agents/AGENTS.md](./.agents/AGENTS.md) |
| **Engineering References** | Diátaxis Hub                           | [references/README.md](./references/README.md) | —                                        |

### Key Onboarding Tutorials

- [Meta for Developers Registration and Channel Onboarding](./references/tutorials/meta-developer-app-and-channels-onboarding.md)
- [Cloud Databases Provisioning Without Docker (Neon, Upstash, Atlas)](./references/tutorials/cloud-databases-provisioning-without-docker.md)

---

## 3. Getting Started

### Prerequisites

- **Node.js**: `>= 22.x` (verified on `v24.x`)
- **pnpm**: `10.33.2` (managed via Corepack)
- **Cloud Data Stores** (optional for initial local boot; required for persistent multi-node execution):
  - Cloud PostgreSQL (`DATABASE_URL` — Neon or Supabase)
  - Cloud Redis Queue (`REDIS_QUEUE_URL` — `maxmemory-policy=noeviction`)
  - Cloud Redis State (`REDIS_STATE_URL` — `maxmemory-policy=volatile-ttl`)
  - Optional MongoDB Atlas (`MONGODB_URI` when `MONGODB_ARCHIVE_ENABLED=true`)

> [!TIP]
> When `DATABASE_URL`, `REDIS_QUEUE_URL`, and `REDIS_STATE_URL` are left blank in `.env`, `@tupynambalucas-dev/omnichannel-api` automatically boots with deterministic in-memory repositories and inline pipeline execution so you can test endpoints and FSM transitions immediately without external containers.

### Installation & Local Startup

```bash
# 1. Install workspace dependencies and Agent Mesh plugins from pnpm catalogs
pnpm install

# 2. Copy the environment template and populate secrets (or inject via Infisical)
cp .env.example .env

# 3. Compile referenced TypeScript packages
pnpm build

# 4. Start the development gateway and watch mode
pnpm api:dev
```

---

## 4. Pipeline Scripts

| Command             | Description                                                                                              |
| :------------------ | :------------------------------------------------------------------------------------------------------- |
| `pnpm dev`          | Runs `core` compiler watch and `api` hot-reload server via Turborepo.                                    |
| `pnpm api:dev`      | Frees port `3000` and starts `@tupynambalucas-dev/omnichannel-api` in watch mode.                        |
| `pnpm build`        | Compiles `@tupynambalucas-dev/omnichannel-core` and `@tupynambalucas-dev/omnichannel-api` via Turborepo. |
| `pnpm typecheck`    | Runs `tsc -b` solution build validation and package-level typechecking.                                  |
| `pnpm lint`         | Executes strict type-checked ESLint rules across all packages.                                           |
| `pnpm format:check` | Verifies repository formatting with Prettier.                                                            |
| `pnpm format:write` | Formats TypeScript, JSON, YAML, and Markdown files with Prettier.                                        |
| `pnpm clean`        | Removes `dist/`, `.turbo/`, and `*.tsbuildinfo` artifacts.                                               |

---

## 5. Governance Standards

- **Cryptographic Commit Signing**: Every Git commit and tag MUST be signed via SSH (`git commit -S -m "..."`).
- **Conventional Commits**: Commit messages strictly adhere to `<type>(<scope>): <description>`.
- **Zero-Emoji Invariant**: Emojis are strictly prohibited in source code, logs, documentation, and commits.
- **Secret Hygiene**: Never commit `.env` files or raw Meta System User tokens. Store only secret variable names (`accessTokenSecretRef`) in `tenant_channels` and inject secret values at runtime via Infisical or environment variables.
- **License**: Distributed under the [Apache License 2.0](./LICENSE.md).
