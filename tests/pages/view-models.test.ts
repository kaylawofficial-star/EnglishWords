import { expect, it } from 'vitest';
import { createLearnViewModel } from '../../miniprogram/pages/learn/view-model';
import { createParentViewModel } from '../../miniprogram/pages/parent/view-model';
import { DEMO_CONTENTS } from '../../shared/fixtures/demo-content';
import { parseTextbookContent } from '../../shared/validation/content';

it('derives both tabs from arbitrary textbook content', () => {
  const demo = DEMO_CONTENTS[0]!;
  expect(createLearnViewModel(demo)).toMatchObject({
    textbookName: '演示教材 · 三年级上册',
    currentUnitName: 'Unit 1',
    totalWords: 3,
  });
  expect(createParentViewModel(demo).unitCount).toBe(2);

  const alternate = parseTextbookContent({
    textbook: {
      id: 'alternate',
      edition: 'other',
      year: 2027,
      stage: 'primary',
      grade: 5,
      term: 'second',
      displayName: '另一套教材',
    },
    units: [1, 2, 3].map((order) => ({
      id: `alt-${order}`,
      textbookId: 'alternate',
      name: `Module ${order}`,
      order,
    })),
    entries: [
      {
        ...demo.entries[0],
        id: 'alt-word',
        unitId: 'alt-1',
        word: 'river',
        meaning: '河流',
        order: 1,
        assetId: 'asset-alt-river',
        assetVersionId: 'asset-alt-river-v1',
        placementId: 'placement-alt-river',
        placementVersionId: 'placement-alt-river-v1',
        publicationId: 'publication-alt-river-v1',
      },
    ],
  });

  expect(createLearnViewModel(alternate)).toMatchObject({
    textbookName: '另一套教材',
    currentUnitName: 'Module 1',
    totalWords: 1,
  });
  expect(createParentViewModel(alternate)).toMatchObject({
    textbookName: '另一套教材',
    edition: 'other',
    year: 2027,
    gradeLabel: '五年级',
    termLabel: '下册',
    unitCount: 3,
  });
});
