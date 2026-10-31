# API Test Subsystem Agent Context

This document serves as the context router for agents writing and running tests in `@tupynambalucas-dev/omnichannel-api/test`.

## Navigation

- [Parent API Subsystem](../README.md): Primary documentation for `@tupynambalucas-dev/omnichannel-api`.
- [Directory README](./README.md): Test suite execution guidelines.
- [Guided Prototype Simulation](./guided-prototype-simulation.test.ts): Canonical multi-turn conversational simulator.

## Testing Guidelines

1. **Dual-Mode Repositories**:
   Tests should leverage the in-memory fallback modes of `TenantRepository` and `SessionStateRepository` (passing `null` for Redis and PostgreSQL pools) to run deterministically and fast without external infrastructure.

2. **Zero Plaintext Secrets**:
   Never include real tokens, credentials, or private keys in test fixtures.

3. **Zero-Emoji Policy**:
   Never include emojis in test descriptions or assertions.
