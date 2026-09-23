import { describe, expect, it } from 'vitest';
import { parseTextbookContent } from '../../shared/validation/content';

const validContent = {
  textbook: {
    id: 'demo-primary-3-first',
    edition: 'demo-edition',
    year: 2026,
    stage: 'primary',
    grade: 3,
    term: 'first',
    displayName: '演示教材 · 三年级上册',
  },
  units: [
    {
      id: 'unit-1',
      textbookId: 'demo-primary-3-first',
      name: 'Unit 1',
      order: 1,
    },
  ],
  entries: [
    {
      id: 'word-morning',
      unitId: 'unit-1',
      word: 'morning',
      meaning: '早晨；上午',
      order: 1,
      assetId: 'asset-morning',
      assetVersionId: 'asset-morning-v1',
      placementId: 'placement-morning',
      placementVersionId: 'placement-morning-v1',
      publicationId: 'publication-morning-v1',
      publishedAt: '2026-09-23T00:00:00.000Z',
      audio: {
        id: 'audio-morning', storageKey: 'audio/morning.mp3', mediaType: 'audio',
        mimeType: 'audio/mpeg', byteSize: 100, sha256: 'a'.repeat(64),
        rightsSource: 'self-produced', reviewed: true,
      },
      mnemonicStory: '早晨说 morning',
      image: {
        id: 'image-morning', storageKey: 'images/morning.png', mediaType: 'image',
        mimeType: 'image/png', byteSize: 100, sha256: 'b'.repeat(64),
        rightsSource: 'self-produced', reviewed: true,
      },
      distractors: ['晚上', '中午', '下午'],
      correctionCandidates: ['注意开头音'],
    },
  ],
} as const;

describe('parseTextbookContent', () => {
  it('accepts a valid configurable textbook', () => {
    expect(parseTextbookContent(validContent)).toEqual(validContent);
  });

  it.each([
    ['duplicate unit id', { ...validContent, units: [validContent.units[0], validContent.units[0]] }],
    [
      'orphan entry',
      {
        ...validContent,
        entries: [{ ...validContent.entries[0], unitId: 'missing' }],
      },
    ],
    [
      'non-positive order',
      {
        ...validContent,
        units: [{ ...validContent.units[0], order: 0 }],
      },
    ],
  ])('rejects %s', (_name, value) => {
    expect(() => parseTextbookContent(value)).toThrow();
  });
});
