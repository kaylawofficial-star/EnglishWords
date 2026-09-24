import type { ManagedContentState } from '../../../shared/contracts/content-management';
import { parseManagedContentState } from '../../../shared/validation/content-management';
import { createEmptyManagedContentState } from '../../../content-management/testing/create-managed-content-fixture';

const DEFAULT_KEY = 'vocabulary-content-state';

export class BrowserContentStoreError extends Error {
  readonly code = 'CORRUPT_LOCAL_CONTENT';

  constructor(message = '本地内容无法读取，请先导出备份后再恢复。') {
    super(message);
    this.name = 'BrowserContentStoreError';
  }
}

export class BrowserContentStore {
  private rawBackup: string | null = null;

  constructor(
    private readonly storage: Storage,
    private readonly key = DEFAULT_KEY,
  ) {}

  load(): ManagedContentState {
    const raw = this.storage.getItem(this.key);
    if (raw === null) return createEmptyManagedContentState();
    try {
      return structuredClone(parseManagedContentState(JSON.parse(raw)));
    } catch {
      this.rawBackup = raw;
      throw new BrowserContentStoreError();
    }
  }

  save(value: ManagedContentState): void {
    const validated = parseManagedContentState(value);
    const serialized = JSON.stringify(validated);
    this.storage.setItem(this.key, serialized);
    this.rawBackup = null;
  }

  exportRawBackup(): string | null {
    return this.rawBackup;
  }
}
