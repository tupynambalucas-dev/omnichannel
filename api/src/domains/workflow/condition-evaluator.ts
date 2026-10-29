import type { WorkflowConditionBranch } from '@tupynambalucas-dev/omnichannel-core';

function readNestedValue(variables: Record<string, unknown>, keyPath: string): unknown {
  const segments = keyPath.split('.');
  let cursor: unknown = variables;

  for (const segment of segments) {
    if (cursor !== null && typeof cursor === 'object' && segment in cursor) {
      cursor = (cursor as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }

  return cursor;
}

function toSafeString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

function matchesCondition(actual: unknown, branch: WorkflowConditionBranch): boolean {
  const actualString = toSafeString(actual);
  const expectedString = Array.isArray(branch.value) ? '' : toSafeString(branch.value);

  switch (branch.operator) {
    case 'EXISTS':
      return actual !== undefined && actual !== null && actualString.trim().length > 0;

    case 'EQUALS':
      return actualString === expectedString;

    case 'NOT_EQUALS':
      return actualString !== expectedString;

    case 'CONTAINS': {
      const haystack = actualString.toLowerCase();
      const needle = expectedString.toLowerCase();
      return needle.length > 0 && haystack.includes(needle);
    }

    case 'IN': {
      if (!Array.isArray(branch.value)) {
        return false;
      }
      return branch.value.includes(actualString);
    }

    case 'GT': {
      const left = Number(actual);
      const right = Number(branch.value);
      return Number.isFinite(left) && Number.isFinite(right) && left > right;
    }

    case 'LT': {
      const left = Number(actual);
      const right = Number(branch.value);
      return Number.isFinite(left) && Number.isFinite(right) && left < right;
    }
  }
}

/**
 * Deterministically evaluates ordered `CONDITION_SWITCH` branches against session variables.
 * Returns the first matching `nextNodeId`, or `undefined` if no branch matches.
 */
export function evaluateConditionBranches(
  branches: WorkflowConditionBranch[],
  variables: Record<string, unknown>,
): string | undefined {
  for (const branch of branches) {
    const actual = readNestedValue(variables, branch.variable);
    if (matchesCondition(actual, branch)) {
      return branch.nextNodeId;
    }
  }
  return undefined;
}
