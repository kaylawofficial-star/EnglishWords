import { expect, it } from 'vitest';
import { parseTextbookContent } from '../../shared/validation/content';

const media = {
  id: 'media-1', storageKey: 'content/media-1', mediaType: 'audio',
  mimeType: 'audio/mpeg', byteSize: 100, sha256: 'c'.repeat(64),
  rightsSource: 'self-produced', reviewed: true,
} as const;

const valid = {
  textbook: { id: 'book', edition: 'demo', year: 2026, stage: 'primary', grade: 3, term: 'first', displayName: '演示教材' },
  units: [{ id: 'unit', textbookId: 'book', name: 'Unit 1', order: 1 }],
  entries: [{
    id: 'entry', unitId: 'unit', word: 'school', meaning: '学校', order: 1,
    assetId: 'asset-school', assetVersionId: 'asset-school-v1',
    placementId: 'placement-school', placementVersionId: 'placement-school-v1',
    publicationId: 'publication-school-v1', publishedAt: '2026-09-23T00:00:00.000Z',
    audio: media, mnemonicStory: '在学校学习', image: { ...media, id: 'image-1', mediaType: 'image', mimeType: 'image/png' },
    distractors: ['公园', '医院', '车站'], correctionCandidates: ['注意长元音'],
  }],
} as const;

it('accepts complete published entries and rejects unsafe media or missing versions', () => {
  expect(parseTextbookContent(valid)).toEqual(valid);
  expect(() => parseTextbookContent({
    ...valid,
    entries: [{ ...valid.entries[0], assetVersionId: '' }],
  })).toThrow(/assetVersionId/);
  expect(() => parseTextbookContent({
    ...valid,
    entries: [{ ...valid.entries[0], audio: { ...media, reviewed: false } }],
  })).toThrow(/reviewed/);
});
