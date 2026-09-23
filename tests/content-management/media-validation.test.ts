import { describe, expect, it } from 'vitest';
import { LocalMediaStorage } from '../../content-management/media/media-storage';

describe('media storage boundary', () => {
  const storage = new LocalMediaStorage(() => '2026-09-23T00:10:00.000Z');

  it.each([
    { mimeType: 'text/plain', byteSize: 10, sha256: 'a'.repeat(64), rightsSource: 'self' },
    { mimeType: 'image/png', byteSize: 0, sha256: 'a'.repeat(64), rightsSource: 'self' },
    { mimeType: 'image/png', byteSize: 11_000_000, sha256: 'a'.repeat(64), rightsSource: 'self' },
    { mimeType: 'image/png', byteSize: 10, sha256: 'bad', rightsSource: 'self' },
    { mimeType: 'image/png', byteSize: 10, sha256: 'a'.repeat(64), rightsSource: '' },
  ])('rejects unsafe upload metadata %#', async (value) => {
    await expect(storage.createUploadIntent({ assetId: 'asset-1', ...value })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('creates a scoped short-lived upload intent', async () => {
    await expect(storage.createUploadIntent({ assetId: 'asset-1', mimeType: 'image/png', byteSize: 100, sha256: 'a'.repeat(64), rightsSource: 'self' }))
      .resolves.toMatchObject({ storageKey: expect.stringMatching(/^content\/asset-1\//), expiresAt: '2026-09-23T00:10:00.000Z', uploadToken: expect.any(String) });
  });
});

