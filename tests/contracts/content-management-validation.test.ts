import { describe, expect, it } from 'vitest';
import { parseManagedContentState } from '../../shared/validation/content-management';

const audio = {
  id: 'media-audio-school', storageKey: 'audio/school.mp3', mediaType: 'audio',
  mimeType: 'audio/mpeg', byteSize: 1024,
  sha256: 'a'.repeat(64), rightsSource: 'self-produced', reviewed: true,
} as const;
const image = {
  id: 'media-image-school', storageKey: 'images/school.png', mediaType: 'image',
  mimeType: 'image/png', byteSize: 2048,
  sha256: 'b'.repeat(64), rightsSource: 'self-produced', reviewed: true,
} as const;

const validState = {
  assets: [{ id: 'asset-school', normalizedWord: 'school', createdAt: '2026-09-23T00:00:00.000Z' }],
  assetVersions: [{
    id: 'asset-school-v1', assetId: 'asset-school', version: 1, revision: 1,
    status: 'approved', word: 'school', baseMeaning: '学校', audio,
    mnemonicStory: '在 school 里学习。', image,
    distractors: ['公园', '医院', '车站'], correctionCandidates: ['注意长元音', '结尾轻读'],
    createdBy: 'admin-1', createdAt: '2026-09-23T00:00:00.000Z',
  }],
  placements: [{
    id: 'placement-school-demo', assetId: 'asset-school',
    textbookId: 'demo-primary-3-first', unitId: 'demo-unit-2',
  }],
  placementVersions: [{
    id: 'placement-school-demo-v1', placementId: 'placement-school-demo',
    version: 1, revision: 1, status: 'approved', textbookMeaning: '学校', order: 1,
    ageCopyOverride: '校园', createdBy: 'admin-1', createdAt: '2026-09-23T00:00:00.000Z',
  }],
  reviews: [{
    id: 'review-school-v1', assetVersionId: 'asset-school-v1',
    placementVersionId: 'placement-school-demo-v1', reviewerId: 'admin-1',
    result: 'approved', checklist: {
      meaning: true, audio: true, mnemonic: true, ageAppropriate: true,
      mediaRights: true, distractors: true, pronunciationRisk: true,
    }, notes: '通过', reviewedAt: '2026-09-23T01:00:00.000Z',
  }],
  publications: [{
    id: 'publication-school-v1', placementId: 'placement-school-demo',
    assetVersionId: 'asset-school-v1', placementVersionId: 'placement-school-demo-v1',
    status: 'published', sequence: 1, requestId: 'publish-school-v1',
    publishedBy: 'admin-1', publishedAt: '2026-09-23T02:00:00.000Z',
  }],
  audits: [{
    id: 'audit-publish-school-v1', action: 'published', actorId: 'admin-1',
    targetId: 'publication-school-v1', reason: '首版', createdAt: '2026-09-23T02:00:00.000Z',
  }],
  currentPublicationByPlacement: { 'placement-school-demo': 'publication-school-v1' },
} as const;

describe('parseManagedContentState', () => {
  it('accepts a complete versioned content state', () => {
    expect(parseManagedContentState(validState)).toEqual(validState);
  });

  it.each([
    ['duplicate ids', { ...validState, assets: [validState.assets[0], validState.assets[0]] }],
    ['orphan placement asset', { ...validState, placements: [{ ...validState.placements[0], assetId: 'missing' }] }],
    ['non-positive version', { ...validState, assetVersions: [{ ...validState.assetVersions[0], version: 0 }] }],
    ['mismatched review target', { ...validState, reviews: [{ ...validState.reviews[0], placementVersionId: 'missing' }] }],
    ['invalid checksum', { ...validState, assetVersions: [{ ...validState.assetVersions[0], audio: { ...audio, sha256: 'bad' } }] }],
    ['too few unique distractors', { ...validState, assetVersions: [{ ...validState.assetVersions[0], distractors: ['公园', '公园'] }] }],
    ['empty corrections', { ...validState, assetVersions: [{ ...validState.assetVersions[0], correctionCandidates: [] }] }],
  ])('rejects %s', (_name, value) => {
    expect(() => parseManagedContentState(value)).toThrow();
  });
});

