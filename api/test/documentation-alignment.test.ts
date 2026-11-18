import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { WorkflowDefinitionSchema } from '@tupynambalucas-dev/omnichannel-core';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

function collectMarkdownFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === 'node_modules' ||
      entry.name === '.git' ||
      entry.name === 'dist' ||
      entry.name === '.turbo'
    ) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Documentation & Context-Router Alignment Verification', () => {
  it('enforces the 3-layer AGENTS.md ceiling and AGENTS-README co-existence invariant', () => {
    const allowedRouters = new Set([
      'AGENTS.md',
      '.agents/AGENTS.md',
      'core/AGENTS.md',
      'api/AGENTS.md',
      'references/AGENTS.md',
    ]);

    const allMarkdown = collectMarkdownFiles(REPO_ROOT);
    const actualRouters = allMarkdown
      .filter((filePath) => path.basename(filePath) === 'AGENTS.md')
      .map((filePath) => path.relative(REPO_ROOT, filePath).replace(/\\/g, '/'));

    assert.deepEqual(new Set(actualRouters), allowedRouters);

    for (const routerRel of actualRouters) {
      const siblingReadme = path.join(REPO_ROOT, path.dirname(routerRel), 'README.md');
      assert.equal(
        fs.existsSync(siblingReadme),
        true,
        `Missing sibling README.md for router ${routerRel}`,
      );
    }
  });

  it('validates all JSON workflow examples in declarative-fsm-workflow-schema.md against WorkflowDefinitionSchema and z.toJSONSchema()', () => {
    const jsonSchema = z.toJSONSchema(WorkflowDefinitionSchema);
    assert.equal(jsonSchema.type, 'object');

    const fsmDocPath = path.join(
      REPO_ROOT,
      'references/reference/declarative-fsm-workflow-schema.md',
    );
    const content = fs.readFileSync(fsmDocPath, 'utf8');
    const jsonBlocks = Array.from(content.matchAll(/```json\r?\n([\s\S]*?)```/g));

    assert.ok(jsonBlocks.length >= 1, 'Expected at least one JSON block in FSM reference');

    for (const match of jsonBlocks) {
      const rawJson = match[1];
      const parsed: unknown = JSON.parse(rawJson);
      const validated = WorkflowDefinitionSchema.parse(parsed);
      assert.ok(validated.nodes.length >= 1);
    }
  });

  it('verifies PostgreSQL migration DDL tables, columns, and ON CONFLICT unique constraints match repositories', () => {
    const migrationPath = path.join(REPO_ROOT, 'api/migrations/0001_initial_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    const expectedSnippets = [
      'CREATE TABLE IF NOT EXISTS tenants',
      'CREATE TABLE IF NOT EXISTS workflow_definitions',
      'CREATE TABLE IF NOT EXISTS tenant_channels',
      'CREATE TABLE IF NOT EXISTS conversation_sessions',
      'CREATE TABLE IF NOT EXISTS opt_in_audit_trail',
      'UNIQUE (channel, channel_account_id)',
      'UNIQUE (tenant_id, conversation_key)',
      'UNIQUE (tenant_id, workflow_key, version)',
      'access_token_secret_ref',
      'active_workflow_id',
      'invalid_attempts',
      'state_version',
      'evidence_metadata',
      'FORCE ROW LEVEL SECURITY',
    ];

    for (const snippet of expectedSnippets) {
      assert.ok(sql.includes(snippet), `Missing "${snippet}" in 0001_initial_schema.sql`);
    }
  });

  it('verifies all relative Markdown links resolve to existing files on disk', () => {
    const markdownFiles = collectMarkdownFiles(REPO_ROOT).filter(
      (filePath) => !filePath.includes(path.join('.vscode', 'references')),
    );

    const linkRegex = /\[[^\]]+\]\(([^)]+)\)/g;

    for (const mdFile of markdownFiles) {
      const content = fs.readFileSync(mdFile, 'utf8');
      const dir = path.dirname(mdFile);

      for (const match of content.matchAll(linkRegex)) {
        const rawTarget = match[1];
        const target = rawTarget.split('#')[0].trim();
        if (
          target.length === 0 ||
          target.startsWith('http://') ||
          target.startsWith('https://') ||
          target.startsWith('mailto:') ||
          target.startsWith('file://')
        ) {
          continue;
        }

        const resolvedPath = path.resolve(dir, target);
        if (resolvedPath === path.join(REPO_ROOT, '.agents', 'plans')) {
          // .agents/plans/ is intentionally gitignored in CI per Dual-Storage Invariant
          continue;
        }
        assert.equal(
          fs.existsSync(resolvedPath),
          true,
          `Broken relative link "${rawTarget}" in ${path.relative(REPO_ROOT, mdFile)}`,
        );
      }
    }
  });

  it('enforces the stale-identifier denylist across references/ and the zero-emoji invariant', () => {
    const referencesDir = path.join(REPO_ROOT, 'references');
    const referenceFiles = collectMarkdownFiles(referencesDir);
    const staleIdentifiers = [
      'workflow_versions',
      'access_token_enc',
      'schemaVersion',
      'externalMessageId',
      'omnichannel-inbound-webhook',
      'omnichannel-status-telemetry',
      'verifyMetaHubSignature',
      'MAX_GENERIC_CARDS',
      'HUMAN_AGENT',
      'OutboundChannelCompiler',
      'omnichannel-master-plan',
    ];

    const emojiPattern = /[\u2600-\u27BF]|[\uD83C-\uD83E][\uDC00-\uDFFF]/;

    for (const refFile of referenceFiles) {
      const content = fs.readFileSync(refFile, 'utf8');
      const relPath = path.relative(REPO_ROOT, refFile);
      for (const stale of staleIdentifiers) {
        assert.equal(
          content.includes(stale),
          false,
          `Stale identifier "${stale}" found in ${relPath}`,
        );
      }
      assert.equal(emojiPattern.test(content), false, `Emoji character found in ${relPath}`);
    }
  });
});
