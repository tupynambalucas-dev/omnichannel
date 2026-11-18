<context-hierarchy>
  <parent src="../AGENTS.md" type="global-rules" />
  <system-instruction>
    AGENT: You are operating in the references bounded context (Diataxis Engineering Documentation Hub) of tupynambalucas-dev/omnichannel. If you have not read ../AGENTS.md in this session, stop now and read it using your file-reading tools before proceeding.
  </system-instruction>
</context-hierarchy>

# Local Context: Engineering Documentation Hub (`references`)

This directory is the Layer-2 bounded context for technical documentation in `@tupynambalucas-dev/omnichannel`, organized strictly around the four Diátaxis quadrants.

## Directory Layout

- [README.md](./README.md): Master Diátaxis index and quadrant navigation matrix.
- [tutorials/](./tutorials/): Learning-oriented, end-to-end onboarding lessons with concrete checkpoints.
- [how-to-guides/](./how-to-guides/): Task-oriented operational runbooks for competent practitioners.
- [reference/](./reference/): Information-oriented wire specifications, HTTP API contracts, SQL DDL, environment schemas, and FSM schemas.
- [explanation/](./explanation/): Understanding-oriented architectural rationale, design trade-offs, and compliance models.

## Architecture & Authoring Pipeline

1. **Quadrant Selection**:
   - Classify every document into exactly one Diátaxis quadrant (`tutorials/`, `how-to-guides/`, `reference/`, `explanation/`) before authoring. Never mix step-by-step instructions into `reference/` or `explanation/`.
2. **Code-First Verification**:
   - Derive all identifiers, environment variable names, SQL table/column definitions, queue names, TTL constants, and Zod schemas directly from [`core/src/`](../core/src/) and [`api/src/`](../api/src/).
3. **JSON Schema & Payload Validation**:
   - Every workflow JSON example in `reference/declarative-fsm-workflow-schema.md` MUST pass `WorkflowDefinitionSchema.parse()` at test time.
4. **Index Synchronization**:
   - Register every new or renamed document in [`references/README.md`](./README.md) and verify all relative links resolve on disk.

## Operational & Security Guardrails

1. **Anti-Proliferation Invariant**: Quadrant subdirectories (`tutorials/`, `how-to-guides/`, `reference/`, `explanation/`) are leaf content folders and MUST NEVER contain child `AGENTS.md` or boilerplate `README.md` files.
2. **Source Attribution**: Cite canonical upstream URLs and specification versions at the bottom of each document.
3. **Secret Hygiene**: Never include real access tokens, webhook secrets, or connection credentials in tutorials or examples; use `<YOUR_VARIABLE_NAME>` placeholders and secret references (`accessTokenSecretRef`).
4. **Zero-Emoji & Language Policy**: All documentation in `references/` must be written in `en-US` with zero emojis.

## Required Skills

- **`docusaurus-architect`**: Active when structuring Diátaxis quadrants and navigation tables.
- **`docusaurus-mdx-architect`**: Active when authoring or refactoring technical markdown documents.
- **`docusaurus-auditor`**: Active when verifying relative link integrity and markdown formatting.
- **`documentation-researcher`**: Active when verifying upstream library or platform specifications via Context7.
- **`readme-architect`**: Active when updating `references/README.md`.
- **`router-architect`**: Active when updating `references/AGENTS.md`.
