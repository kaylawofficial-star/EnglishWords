import { expect, it } from 'vitest';
import { createContentManagementMain } from '../../cloudfunctions/content-management/src/index';
import { InMemoryContentRepository } from '../../content-management/repositories/in-memory-content-repository';
import { ContentManagementService } from '../../content-management/services/content-management-service';

it('authorizes a configured administrator and rejects everyone else', async () => {
  const main = createContentManagementMain({
    repository: new InMemoryContentRepository(), allowedActorIds: new Set(['admin-openid']),
    now: () => '2026-09-23T00:00:00.000Z', createId: (prefix) => `${prefix}-1`,
  });
  await expect(main({ action: 'listContent', payload: {} }, { OPENID: 'other' })).resolves.toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } });
  await expect(main({ action: 'listContent', payload: {} }, { OPENID: 'admin-openid' })).resolves.toEqual({ ok: true, data: [] });
});

it('authorizes the trusted CloudBase custom user identity', async () => {
  const main = createContentManagementMain({
    repository: new InMemoryContentRepository(), allowedActorIds: new Set(['content-admin']),
    now: () => '2026-09-23T00:00:00.000Z', createId: (prefix) => `${prefix}-1`,
  });

  await expect(main(
    { action: 'listContent', payload: {} },
    { TCB_CUSTOM_USER_ID: 'content-admin' },
  )).resolves.toEqual({ ok: true, data: [] });
});

it('rejects publication when server-side storage verification fails', async () => {
  const repository = new InMemoryContentRepository();
  let id = 0;
  const setupService = new ContentManagementService(repository, {
    now: () => '2026-09-23T00:00:00.000Z', createId: (prefix) => `${prefix}-${++id}`,
  });
  const draft = await setupService.createDraft({
    actorId: 'content-admin', word: 'school', textbookId: 'book', unitId: 'unit',
    textbookMeaning: '学校', order: 1, ageCopyOverride: '学校',
    content: {
      baseMeaning: '学校', mnemonicStory: 'school story', distractors: ['park', 'hospital'],
      correctionCandidates: ['listen again'],
      audio: { id: 'audio', storageKey: 'forged-audio', mediaType: 'audio', mimeType: 'audio/mpeg', byteSize: 10, sha256: 'a'.repeat(64), rightsSource: 'self', reviewed: true },
      image: { id: 'image', storageKey: 'forged-image', mediaType: 'image', mimeType: 'image/png', byteSize: 10, sha256: 'b'.repeat(64), rightsSource: 'self', reviewed: true },
    },
  });
  await setupService.submitForReview({ actorId: 'content-admin', draftId: draft.id, expectedRevision: 1 });
  await setupService.approve({
    actorId: 'content-admin', draftId: draft.id,
    checklist: { meaning: true, audio: true, mnemonic: true, ageAppropriate: true, mediaRights: true, distractors: true, pronunciationRisk: true },
    notes: 'approved',
  });
  const main = createContentManagementMain({
    repository,
    allowedActorIds: new Set(['content-admin']),
    mediaStorage: {
      createUploadIntent: async () => { throw new Error('not used'); },
      verify: async () => { throw new Error('stored media missing'); },
    },
    now: () => '2026-09-23T00:00:00.000Z',
    createId: (prefix) => `${prefix}-1`,
  });

  await expect(main(
    { action: 'publish', payload: { draftId: draft.id, requestId: 'publish-forged-media' } },
    { TCB_CUSTOM_USER_ID: 'content-admin' },
  )).resolves.toMatchObject({ ok: false, error: { message: 'stored media missing' } });
});
