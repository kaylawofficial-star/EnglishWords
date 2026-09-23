import { expect, it } from 'vitest';
import { InMemoryContentRepository } from '../../content-management/repositories/in-memory-content-repository';
import { ContentManagementService } from '../../content-management/services/content-management-service';

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
  return {
    repository,
    service: new ContentManagementService(repository, {
      now: () => '2026-09-23T00:00:00.000Z', createId: (prefix) => `${prefix}-${++id}`,
    }),
  };
}

it('reuses normalized vocabulary assets across textbook placements', async () => {
  const { repository, service } = setup();
  for (const [index, word] of ['School', ' school ', 'SCHOOL'].entries()) {
    await service.createDraft({
      actorId: 'admin', word, textbookId: `book-${index}`, unitId: `unit-${index}`,
      textbookMeaning: '学校', order: 1, ageCopyOverride: '校园', content,
    });
  }
  expect((await repository.listState()).assets).toHaveLength(1);
});

it('rejects a stale editor without overwriting the latest revision', async () => {
  const { service } = setup();
  const draft = await service.createDraft({
    actorId: 'admin', word: 'school', textbookId: 'book', unitId: 'unit',
    textbookMeaning: '学校', order: 1, ageCopyOverride: '校园', content,
  });
  const first = await service.getDraft(draft.id);
  const stale = await service.getDraft(draft.id);
  await service.updateDraft({ actorId: 'admin', draftId: first.id, expectedRevision: 1, changes: { textbookMeaning: '学校；校园' } });

  await expect(service.updateDraft({
    actorId: 'admin', draftId: stale.id, expectedRevision: 1,
    changes: { textbookMeaning: '学堂' },
  })).rejects.toMatchObject({ code: 'REVISION_CONFLICT', currentRevision: 2 });
  expect((await service.getDraft(draft.id)).placementVersion.textbookMeaning).toBe('学校；校园');
});
