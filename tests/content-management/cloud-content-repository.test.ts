import { expect, it } from 'vitest';
import { CloudContentRepository } from '../../content-management/repositories/cloud-content-repository';
import { createEmptyManagedContentState } from '../../content-management/testing/create-managed-content-fixture';

it('uses a cloud transaction for atomic publication changes', async () => {
  let state = createEmptyManagedContentState();
  let transactionCalls = 0;
  const repository = new CloudContentRepository({
    loadState: async () => structuredClone(state),
    async runTransaction<T>(change: (current: typeof state) => Promise<{ state: typeof state; result: T }> | { state: typeof state; result: T }) {
      transactionCalls += 1;
      const changed = await change(structuredClone(state));
      state = structuredClone(changed.state);
      return changed.result;
    },
  });
  const publication = { id: 'pub-1', placementId: 'placement-1', assetVersionId: 'asset-v1', placementVersionId: 'placement-v1', status: 'published' as const, sequence: 1, requestId: 'request-1', publishedBy: 'admin', publishedAt: '2026-09-23T00:00:00.000Z' };
  // Invalid references are deliberately caught inside the transaction before persistence.
  await expect(repository.publishAtomically({ publication, expectedCurrentPublicationId: null, audit: { id: 'audit-1', action: 'published', actorId: 'admin', targetId: 'pub-1', reason: 'test', createdAt: publication.publishedAt } }))
    .rejects.toThrow();
  expect(transactionCalls).toBe(1);
  expect(state.publications).toEqual([]);
});
