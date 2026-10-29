export type ValidationFormat = 'TEXT' | 'EMAIL' | 'CPF' | 'NUMERIC' | 'PHONE_E164' | 'REGEX';

export interface ValidationOutcome {
  valid: boolean;
  normalizedValue: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NUMERIC_PATTERN = /^-?\d+(\.\d+)?$/;
const E164_PATTERN = /^\+?[1-9]\d{7,14}$/;

/**
 * Validates a Brazilian CPF tax identifier using Modulo-11 check digits.
 */
export function isValidBrazilianCpf(rawInput: string): boolean {
  const digits = rawInput.replace(/\D/g, '');
  if (digits.length !== 11) {
    return false;
  }

  if (/^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  const computeCheckDigit = (sliceLength: number): number => {
    let sum = 0;
    for (let i = 0; i < sliceLength; i += 1) {
      const charCode = digits.charCodeAt(i) - 48;
      sum += charCode * (sliceLength + 1 - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const firstVerifier = computeCheckDigit(9);
  const secondVerifier = computeCheckDigit(10);

  const actualFirst = digits.charCodeAt(9) - 48;
  const actualSecond = digits.charCodeAt(10) - 48;

  return firstVerifier === actualFirst && secondVerifier === actualSecond;
}

/**
 * Deterministically validates free-text conversational user input according to node rules.
 */
export function validateConversationalInput(
  rawInput: string,
  format: ValidationFormat,
  customPattern?: string,
): ValidationOutcome {
  const trimmed = rawInput.trim();
  if (trimmed.length === 0) {
    return { valid: false, normalizedValue: '' };
  }

  switch (format) {
    case 'TEXT':
      return { valid: true, normalizedValue: trimmed };

    case 'EMAIL': {
      const normalized = trimmed.toLowerCase();
      return {
        valid: EMAIL_PATTERN.test(normalized),
        normalizedValue: normalized,
      };
    }

    case 'CPF': {
      const digits = trimmed.replace(/\D/g, '');
      return {
        valid: isValidBrazilianCpf(digits),
        normalizedValue: digits,
      };
    }

    case 'NUMERIC':
      return {
        valid: NUMERIC_PATTERN.test(trimmed),
        normalizedValue: trimmed,
      };

    case 'PHONE_E164': {
      const compact = trimmed.replace(/[\s()-]/g, '');
      const normalized = compact.startsWith('+') ? compact : `+${compact}`;
      return {
        valid: E164_PATTERN.test(normalized),
        normalizedValue: normalized,
      };
    }

    case 'REGEX': {
      if (customPattern === undefined || customPattern.length === 0) {
        return { valid: false, normalizedValue: trimmed };
      }
      try {
        const expression = new RegExp(customPattern);
        return {
          valid: expression.test(trimmed),
          normalizedValue: trimmed,
        };
      } catch {
        return { valid: false, normalizedValue: trimmed };
      }
    }
  }
}
