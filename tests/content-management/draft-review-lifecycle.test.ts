import { describe, expect, it } from 'vitest';
import { InMemoryContentRepository } from '../../content-management/repositories/in-memory-content-repository';
import { ContentManagementService } from '../../content-management/services/content-management-service';
import type { ReviewChecklist } from '../../shared/contracts/content-management';

const audio = {
  id: 'audio-school', storageKey: 'audio/school.mp3', mediaType: 'audio' as const,
  mimeType: 'audio/mpeg', byteSize: 1000, sha256: 'a'.repeat(64),
  rightsSource: 'self-produced', reviewed: true,
};
const image = {
  id: 'image-school', storageKey: 'images/school.png', mediaType: 'image' as const,
  mimeType: 'image/png', byteSize: 2000, sha256: 'b'.repeat(64),
  rightsSource: 'self-produced', reviewed: true,
};
const content = {
  baseMeaning: '学校', audio, mnemonicStory: '在 school 里学习。', image,
  distractors: ['公园', '医院', '车站'], correctionCandidates: ['注意长元音', '结尾轻读'],
};
const checklist: ReviewChecklist = {
  meaning: true, audio: true, mnemonic: true, ageAppropriate: true,
  mediaRights: true, distractors: true, pronunciationRisk: true,
};

function createService() {
  let nextId = 0;
  const repository = new InMemoryContentRepository();
  const service = new ContentManagementService(repository, {
    now: () => '2026-09-23T00:00:00.000Z',
    createId: (prefix) => `${prefix}-${++nextId}`,
  });
  return { repository, service };
}

async function createDraft(service: ContentManagementService) {
  return service.createDraft({
    actorId: 'admin-1', word: 'school', textbookId: 'demo-primary-3-first',
    unitId: 'demo-unit-2', textbookMeaning: '学校', order: 1,
    ageCopyOverride: '校园', content,
  });
}

describe('draft and human review lifecycle', () => {
  it('previews a complete draft without approving or publishing it', async () => {
    const { repository, service } = createService();
    const draft = await createDraft(service);

    expect(draft.assetVersion.status).toBe('draft');
    expect(draft.placementVersion.status).toBe('draft');
    await expect(service.previewDraft(draft.id)).resolves.toEqual({
      draftId: draft.id,
      steps: [
        { kind: 'standard-audio', audio },
        { kind: 'mnemonic', story: content.mnemonicStory, image },
        { kind: 'meaning-check', meaning: '学校', distractors: content.distractors },
        { kind: 'correction', candidates: content.correctionCandidates },
      ],
    });
    const state = await repository.listState();
    expect(state.reviews).toEqual([]);
    expect(state.publications).toEqual([]);
  });

  it('requires an explicit complete human review before approval', async () => {
    const { repository, service } = createService();
    const draft = await createDraft(service);

    await service.submitForReview({ actorId: 'admin-1', draftId: draft.id, expectedRevision: 1 });
    await expect(service.updateDraft({
      actorId: 'admin-1', draftId: draft.id, expectedRevision: 2,
      changes: { textbookMeaning: '校园' },
    })).rejects.toMatchObject({ code: 'INVALID_STATE' });
    await expect(service.approve({
      actorId: 'admin-1', draftId: draft.id,
      checklist: { ...checklist, pronunciationRisk: false }, notes: '未检查完',
    })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });

    const approved = await service.approve({
      actorId: 'admin-1', draftId: draft.id, checklist, notes: '审核通过',
    });
    expect(approved.assetVersion.status).toBe('approved');
    expect((await repository.listState()).reviews).toHaveLength(1);
  });

  it('records rejection and returns content to an editable draft revision', async () => {
    const { repository, service } = createService();
    const draft = await createDraft(service);
    await service.submitForReview({ actorId: 'admin-1', draftId: draft.id, expectedRevision: 1 });

    const rejected = await service.reject({
      actorId: 'admin-1', draftId: draft.id, checklist,
      notes: '谐音可能误导发音',
    });

    expect(rejected.assetVersion.status).toBe('draft');
    expect(rejected.assetVersion.revision).toBe(3);
    expect((await repository.listState()).reviews[0]?.result).toBe('rejected');
  });
});

