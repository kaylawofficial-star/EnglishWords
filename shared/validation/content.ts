import type {
  SchoolStage,
  SchoolTerm,
  Textbook,
  TextbookContent,
  Unit,
  VocabularyEntry,
} from '../contracts/content';

export class ContentValidationError extends Error {
  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = 'ContentValidationError';
  }
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ContentValidationError(path, 'expected an object');
  }
  return value as Record<string, unknown>;
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new ContentValidationError(path, 'expected an array');
  }
  return value;
}

function requireNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ContentValidationError(path, 'expected a non-empty string');
  }
  return value;
}

function requirePositiveInteger(value: unknown, path: string): number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new ContentValidationError(path, 'expected a positive integer');
  }
  return value as number;
}

function requireEnum<T extends string>(
  value: unknown,
  path: string,
  allowed: readonly T[],
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new ContentValidationError(path, `expected one of ${allowed.join(', ')}`);
  }
  return value as T;
}

function ensureUniqueIds(items: readonly { id: string }[], path: string): void {
  const seen = new Set<string>();
  for (const [index, item] of items.entries()) {
    if (seen.has(item.id)) {
      throw new ContentValidationError(`${path}[${index}].id`, `duplicate id ${item.id}`);
    }
    seen.add(item.id);
  }
}

function parseTextbook(value: unknown): Textbook {
  const record = requireRecord(value, 'textbook');
  return {
    id: requireNonEmptyString(record.id, 'textbook.id'),
    edition: requireNonEmptyString(record.edition, 'textbook.edition'),
    year: requirePositiveInteger(record.year, 'textbook.year'),
    stage: requireEnum<SchoolStage>(record.stage, 'textbook.stage', [
      'primary',
      'junior',
    ]),
    grade: requirePositiveInteger(record.grade, 'textbook.grade'),
    term: requireEnum<SchoolTerm>(record.term, 'textbook.term', [
      'first',
      'second',
    ]),
    displayName: requireNonEmptyString(record.displayName, 'textbook.displayName'),
  };
}

function parseUnit(value: unknown, index: number): Unit {
  const path = `units[${index}]`;
  const record = requireRecord(value, path);
  return {
    id: requireNonEmptyString(record.id, `${path}.id`),
    textbookId: requireNonEmptyString(record.textbookId, `${path}.textbookId`),
    name: requireNonEmptyString(record.name, `${path}.name`),
    order: requirePositiveInteger(record.order, `${path}.order`),
  };
}

function parseEntry(value: unknown, index: number): VocabularyEntry {
  const path = `entries[${index}]`;
  const record = requireRecord(value, path);
  return {
    id: requireNonEmptyString(record.id, `${path}.id`),
    unitId: requireNonEmptyString(record.unitId, `${path}.unitId`),
    word: requireNonEmptyString(record.word, `${path}.word`),
    meaning: requireNonEmptyString(record.meaning, `${path}.meaning`),
    order: requirePositiveInteger(record.order, `${path}.order`),
  };
}

export function parseTextbookContent(value: unknown): TextbookContent {
  const record = requireRecord(value, 'content');
  const textbook = parseTextbook(record.textbook);
  const units = requireArray(record.units, 'units').map(parseUnit);
  const entries = requireArray(record.entries, 'entries').map(parseEntry);

  ensureUniqueIds(units, 'units');
  ensureUniqueIds(entries, 'entries');

  const unitIds = new Set(units.map((unit) => unit.id));
  for (const [index, unit] of units.entries()) {
    if (unit.textbookId !== textbook.id) {
      throw new ContentValidationError(
        `units[${index}].textbookId`,
        `expected ${textbook.id}`,
      );
    }
  }
  for (const [index, entry] of entries.entries()) {
    if (!unitIds.has(entry.unitId)) {
      throw new ContentValidationError(
        `entries[${index}].unitId`,
        `unknown unit ${entry.unitId}`,
      );
    }
  }

  return { textbook, units, entries };
}
