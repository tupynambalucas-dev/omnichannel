# API Test Suite

This directory contains integration, simulation, and unit tests for `@tupynambalucas-dev/omnichannel-api`.

## Structure

- [`guided-prototype-simulation.test.ts`](./guided-prototype-simulation.test.ts): End-to-end multi-turn simulation test executing the enterprise guided conversation prototype through the in-memory `WorkflowEngine`.

## Running Tests

Execute the full test suite using:

```bash
# From workspace root
pnpm test

# From api workspace
pnpm --filter @tupynambalucas-dev/omnichannel-api test
```
