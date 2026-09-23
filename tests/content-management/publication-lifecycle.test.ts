import { describe, expect, it } from 'vitest';
import { InMemoryContentRepository } from '../../content-management/repositories/in-memory-content-repository';
import { ContentManagementService } from '../../content-management/services/content-management-service';
import type { ReviewChecklist } from '../../shared/contracts/content-management';

const checklist: ReviewChecklist = { meaning: true, audio: true, mnemonic: true, ageAppropriate: true, mediaRights: true, distractors: true, pronunciationRisk: true };
const content = {
  baseMeaning: '学校',
  audio: { id: 'a', storageKey: 'a.mp3', mediaType: 'audio' as const, mimeType: 'audio/mpeg', byteSize: 1, sha256: 'a'.repeat(64), rightsSource: 'self', reviewed: true },
  mnemonicStory: 'school 学校',
  image: { id: 'i', storageKey: 'i.png', mediaType: 'image' as const, mimeType: 'image/png', byteSize: 1, sha256: 'b'.repeat(64), rightsSource: 'self', reviewed: true },
  distractors: ['公园', '医院'], correctionCandidates: ['再听一次'],
};

function setup() {
  let id = 0;
  const repository = new InMemoryContentRepository();
  const service = new ContentManagementService(repository, { now: () => '2026-09-23T00:00:00.000Z', createId: (prefix) => `${prefix}-${++id}` });
  return { repository, service };
}

async function draft(service: ContentManagementService) {
  return service.createDraft({ actorId: 'admin', word: 'school', textbookId: 'demo-primary-3-first', unitId: 'demo-unit-2', textbookMeaning: '学校', order: 1, ageCopyOverride: '校园', content });
}

async function approved(service: ContentManagementService) {
  const item = await draft(service);
  await service.submitForReview({ actorId: 'admin', draftId: item.id, expectedRevision: 1 });
  return service.approve({ actorId: 'admin', draftId: item.id, checklist, notes: '通过' });
}

describe('publication lifecycle', () => {
  it('publishes only an approved version pair and updates the pointer atomically', async () => {
    const { repository, service } = setup();
    const pending = await draft(service);
    await expect(service.publish({ actorId: 'admin', draftId: pending.id, requestId: 'publish-1' })).rejects.toMatchObject({ code: 'INVALID_STATE' });
    expect((await repository.listState()).currentPublicationByPlacement).toEqual({});

    const ready = await approved(service);
    const publication = await service.publish({ actorId: 'admin', draftId: ready.id, requestId: 'publish-2' });
    const state = await repository.listState();
    expect(state.currentPublicationByPlacement[ready.placement.id]).toBe(publication.id);
    expect(state.publications).toHaveLength(1);
    expect(state.audits[state.audits.length - 1]?.action).toBe('published');
  });

  it('rejects incomplete publication without replacing the current version', async () => {
    const { repository, service } = setup();
    const ready = await approved(service);
    const first = await service.publish({ actorId: 'admin', draftId: ready.id, requestId: 'publish-1' });
    const state = await repository.listState();
    state.assetVersions[0]!.audio.reviewed = false;
    const unsafe = new InMemoryContentRepository(state);
    const unsafeService = new ContentManagementService(unsafe, { now: () => '2026-09-23T01:00:00.000Z', createId: (prefix) => `${prefix}-unsafe` });
    await expect(unsafeService.publish({ actorId: 'admin', draftId: ready.id, requestId: 'publish-unsafe' })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    expect((await unsafe.listState()).currentPublicationByPlacement[ready.placement.id]).toBe(first.id);
  });

  it('is idempotent and preserves historical versions through withdraw and rollback', async () => {
    const { repository, service } = setup();
    const ready = await approved(service);
    const first = await service.publish({ actorId: 'admin', draftId: ready.id, requestId: 'same-request' });
    await expect(service.publish({ actorId: 'admin', draftId: ready.id, requestId: 'same-request' })).resolves.toEqual(first);
    expect((await repository.listState()).publications).toHaveLength(1);

    await service.withdraw({ actorId: 'admin', placementId: ready.placement.id, reason: '发现风险' });
    expect(await service.resolveHistoricalPublication(first.id)).toEqual(first);
    const rollback = await service.rollback({ actorId: 'admin', publicationId: first.id, requestId: 'rollback-1', reason: '恢复安全版本' });
    expect(rollback.id).not.toBe(first.id);
    expect(await service.resolveHistoricalPublication(first.id)).toEqual(first);
  });
});
