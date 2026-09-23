import { expect, it } from 'vitest';
import { projectHistoricalPublication, projectPublishedTextbook } from '../../content-management/services/published-content-projector';
import { DEMO_CONTENTS } from '../../shared/fixtures/demo-content';
import type { ManagedContentState } from '../../shared/contracts/content-management';

const source = DEMO_CONTENTS[0]!;
const entry = source.entries[2]!;
const state: ManagedContentState = {
  assets: [{ id: entry.assetId, normalizedWord: entry.word, createdAt: entry.publishedAt }],
  assetVersions: [{ id: entry.assetVersionId, assetId: entry.assetId, version: 1, revision: 1, status: 'approved', word: entry.word, baseMeaning: entry.meaning, audio: entry.audio, mnemonicStory: entry.mnemonicStory, image: entry.image, distractors: entry.distractors, correctionCandidates: entry.correctionCandidates, createdBy: 'admin', createdAt: entry.publishedAt }],
  placements: [{ id: entry.placementId, assetId: entry.assetId, textbookId: source.textbook.id, unitId: entry.unitId }],
  placementVersions: [{ id: entry.placementVersionId, placementId: entry.placementId, version: 1, revision: 1, status: 'approved', textbookMeaning: entry.meaning, order: entry.order, ageCopyOverride: '校园', createdBy: 'admin', createdAt: entry.publishedAt }],
  reviews: [{ id: 'review', assetVersionId: entry.assetVersionId, placementVersionId: entry.placementVersionId, reviewerId: 'admin', result: 'approved', checklist: { meaning: true, audio: true, mnemonic: true, ageAppropriate: true, mediaRights: true, distractors: true, pronunciationRisk: true }, notes: '通过', reviewedAt: entry.publishedAt }],
  publications: [{ id: entry.publicationId, placementId: entry.placementId, assetVersionId: entry.assetVersionId, placementVersionId: entry.placementVersionId, status: 'published', sequence: 1, requestId: 'publish', publishedBy: 'admin', publishedAt: entry.publishedAt }],
  audits: [], currentPublicationByPlacement: { [entry.placementId]: entry.publicationId },
};
const catalog = { textbooks: [source.textbook], units: source.units };

it('projects current content and resolves a withdrawn publication historically', () => {
  expect(projectPublishedTextbook(state, source.textbook.id, catalog).entries[0]).toMatchObject({ word: 'school', meaning: '学校', publicationId: entry.publicationId });
  state.publications[0]!.status = 'withdrawn';
  state.currentPublicationByPlacement = {};
  expect(projectPublishedTextbook(state, source.textbook.id, catalog).entries).toEqual([]);
  expect(projectHistoricalPublication(state, entry.publicationId, catalog).entries[0]?.publicationId).toBe(entry.publicationId);
});
