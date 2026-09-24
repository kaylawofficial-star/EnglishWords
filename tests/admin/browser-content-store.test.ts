import { describe, expect, it } from 'vitest';
import { BrowserContentStore } from '../../admin/src/storage/browser-content-store';
import { createEmptyManagedContentState } from '../../content-management/testing/create-managed-content-fixture';

class FakeStorage implements Storage {
  readonly values = new Map<string, string>();
  readonly writes: Array<{ key: string; value: string }> = [];
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) {
    this.writes.push({ key, value });
    this.values.set(key, value);
  }
}

describe('BrowserContentStore', () => {
  it('round-trips validated content with one atomic replacement', () => {
    const storage = new FakeStorage();
    const store = new BrowserContentStore(storage);
    const state = createEmptyManagedContentState();

    store.save(state);

    expect(store.load()).toEqual(state);
    expect(storage.writes).toHaveLength(1);
  });

  it('does not replace the last good state when validation fails', () => {
    const storage = new FakeStorage();
    const store = new BrowserContentStore(storage);
    store.save(createEmptyManagedContentState());
    const original = storage.getItem('vocabulary-content-state');

    expect(() => store.save({ assets: [] } as never)).toThrow();
    expect(storage.getItem('vocabulary-content-state')).toBe(original);
    expect(storage.writes).toHaveLength(1);
  });

  it('retains malformed JSON as an exportable recovery backup', () => {
    const storage = new FakeStorage();
    const originalCorruptText = '{not-json';
    storage.setItem('vocabulary-content-state', originalCorruptText);
    const store = new BrowserContentStore(storage);

    expect(() => store.load()).toThrowError(expect.objectContaining({ code: 'CORRUPT_LOCAL_CONTENT' }));
    expect(store.exportRawBackup()).toBe(originalCorruptText);
    expect(storage.getItem('vocabulary-content-state')).toBe(originalCorruptText);
  });
});
