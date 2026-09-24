import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { InMemoryContentRepository } from '../../content-management/repositories/in-memory-content-repository';
import { createDraftId } from '../../content-management/repositories/content-repository';
import { ContentManagementService } from '../../content-management/services/content-management-service';
import { createVersionedContentService } from '../../content-management/services/versioned-content-service';
import type { ReviewChecklist } from '../../shared/contracts/content-management';
import type { Textbook, Unit } from '../../shared/contracts/content';

const directory = mkdtempSync(join(tmpdir(), 'content-lifecycle-'));
afterAll(() => rmSync(directory, { recursive: true, force: true }));

const checklist: ReviewChecklist = {
  meaning: true, audio: true, mnemonic: true, ageAppropriate: true,
  mediaRights: true, distractors: true, pronunciationRisk: true,
};

const textbooks: Textbook[] = [
  { id: 'demo-primary-3-first', edition: 'demo', year: 2026, stage: 'primary', grade: 3, term: 'first', displayName: '演示教材一' },
  { id: 'demo-primary-4-first', edition: 'demo', year: 2026, stage: 'primary', grade: 4, term: 'first', displayName: '演示教材二' },
];
const units: Unit[] = [
  { id: 'demo-unit-2', textbookId: 'demo-primary-3-first', name: 'Unit 2', order: 2 },
  { id: 'demo-unit-1-second-book', textbookId: 'demo-primary-4-first', name: 'Unit 1', order: 1 },
];

describe('versioned content publishing lifecycle', () => {
  it('imports, reviews, publishes, versions, withdraws, resolves history, and rolls back', async () => {
    const importedPath = join(directory, 'imported.json');
    const npmCli = process.env.npm_execpath;
    if (!npmCli) throw new Error('npm_execpath is required');
    const imported = spawnSync(process.execPath, [npmCli, 'run', 'content', '--', 'import', 'content-packs/demo-school.json', '--out', importedPath], { encoding: 'utf8' });
    expect(imported.status, imported.stderr).toBe(0);

    const repository = new InMemoryContentRepository(JSON.parse(readFileSync(importedPath, 'utf8')));
    let nextId = 0;
    let minute = 0;
    const management = new ContentManagementService(repository, {
      now: () => `2026-09-23T01:${String(minute++).padStart(2, '0')}:00.000Z`,
      createId: (prefix) => `${prefix}-e2e-${++nextId}`,
    });
    const student = createVersionedContentService(repository, { textbooks, units });
    const initial = await repository.listState();
    const importedDraftId = createDraftId(initial.assetVersions[0]!.id, initial.placementVersions[0]!.id);

    await expect(student.getTextbookContent('demo-primary-3-first')).resolves.toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    await expect(management.previewDraft(importedDraftId)).resolves.toMatchObject({
      steps: [
        { kind: 'standard-audio' }, { kind: 'mnemonic' },
        { kind: 'meaning-check', meaning: '学校' }, { kind: 'correction' },
      ],
    });
    await management.submitForReview({ actorId: 'admin', draftId: importedDraftId, expectedRevision: 1 });
    await management.approve({ actorId: 'admin', draftId: importedDraftId, checklist, notes: 'v1 审核通过' });
    const v1 = await management.publish({ actorId: 'admin', draftId: importedDraftId, requestId: 'publish-v1' });

    const currentV1 = await student.getTextbookContent('demo-primary-3-first');
    expect(currentV1.ok).toBe(true);
    if (!currentV1.ok) return;
    expect(currentV1.data.entries[0]).toMatchObject({
      word: 'school', meaning: '学校', publicationId: v1.id,
      assetVersionId: expect.any(String), placementVersionId: expect.any(String),
      mnemonicStory: expect.any(String), distractors: ['医院', '公园', '车站'],
      correctionCandidates: expect.any(Array), audio: { reviewed: true }, image: { reviewed: true },
    });

    const otherPlacement = await management.createDraft({
      actorId: 'admin', word: 'school', textbookId: 'demo-primary-4-first', unitId: 'demo-unit-1-second-book',
      textbookMeaning: '学校（另一教材）', order: 1, ageCopyOverride: '另一册教材中的原始释义',
      content: contentFromEntry(currentV1.data.entries[0]!),
    });
    await approveAndPublish(management, otherPlacement.id, 'publish-other');

    const v2Draft = await management.createDraft({
      actorId: 'admin', word: 'school', textbookId: 'demo-primary-3-first', unitId: 'demo-unit-2',
      textbookMeaning: '校园与学校', order: 1, ageCopyOverride: '第二版教材表达',
      content: contentFromEntry(currentV1.data.entries[0]!),
    });
    expect(v2Draft.placement.id).toBe(initial.placements[0]!.id);
    const v2 = await approveAndPublish(management, v2Draft.id, 'publish-v2');

    const currentV2 = await student.getTextbookContent('demo-primary-3-first');
    expect(currentV2.ok && currentV2.data.entries.map((entry) => entry.meaning)).toEqual(['校园与学校']);
    const otherCurrent = await student.getTextbookContent('demo-primary-4-first');
    expect(otherCurrent.ok && otherCurrent.data.entries[0]?.meaning).toBe('学校（另一教材）');

    await management.withdraw({ actorId: 'admin', placementId: v2Draft.placement.id, reason: '下架第二版做回滚演示' });
    await expect(student.getTextbookContent('demo-primary-3-first')).resolves.toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    await expect(student.getHistoricalPublication(v2.id)).resolves.toMatchObject({ ok: true, data: { entries: [{ publicationId: v2.id, meaning: '校园与学校' }] } });

    const rollback = await management.rollback({ actorId: 'admin', publicationId: v1.id, requestId: 'rollback-v1', reason: '恢复第一版' });
    const restored = await student.getTextbookContent('demo-primary-3-first');
    expect(restored.ok && restored.data.entries[0]).toMatchObject({ publicationId: rollback.id, meaning: '学校' });
    await expect(student.getHistoricalPublication(v2.id)).resolves.toMatchObject({ ok: true, data: { entries: [{ publicationId: v2.id }] } });
  });
});

async function approveAndPublish(service: ContentManagementService, draftId: string, requestId: string) {
  const draft = await service.getDraft(draftId);
  await service.submitForReview({ actorId: 'admin', draftId, expectedRevision: draft.assetVersion.revision });
  await service.approve({ actorId: 'admin', draftId, checklist, notes: `${requestId} 审核通过` });
  return service.publish({ actorId: 'admin', draftId, requestId });
}

function contentFromEntry(entry: { audio: any; image: any; mnemonicStory: string; distractors: string[]; correctionCandidates: string[]; meaning: string }) {
  return {
    baseMeaning: entry.meaning, audio: entry.audio, mnemonicStory: entry.mnemonicStory,
    image: entry.image, distractors: entry.distractors, correctionCandidates: entry.correctionCandidates,
  };
}
