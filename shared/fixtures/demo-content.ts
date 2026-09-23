import type { TextbookContent } from '../contracts/content';
import { parseTextbookContent } from '../validation/content';

export const DEMO_TEXTBOOK_ID = 'demo-primary-3-first';

function publishedEntry(
  id: string,
  unitId: string,
  word: string,
  meaning: string,
  order: number,
) {
  const assetId = `asset-${id}`;
  const placementId = `placement-${id}`;
  return {
    id,
    unitId,
    word,
    meaning,
    order,
    assetId,
    assetVersionId: `${assetId}-v1`,
    placementId,
    placementVersionId: `${placementId}-v1`,
    publicationId: `publication-${id}-v1`,
    publishedAt: '2026-09-23T00:00:00.000Z',
    audio: {
      id: `audio-${id}`,
      storageKey: `demo/audio/${word}.mp3`,
      mediaType: 'audio',
      mimeType: 'audio/mpeg',
      byteSize: 1024,
      sha256: 'a'.repeat(64),
      rightsSource: 'demo-self-produced',
      reviewed: true,
    },
    mnemonicStory: `${word} 的演示记忆故事`,
    image: {
      id: `image-${id}`,
      storageKey: `demo/images/${word}.png`,
      mediaType: 'image',
      mimeType: 'image/png',
      byteSize: 2048,
      sha256: 'b'.repeat(64),
      rightsSource: 'demo-self-produced',
      reviewed: true,
    },
    distractors: ['公园', '医院', '车站'],
    correctionCandidates: ['再听一次标准音'],
  };
}

export const DEMO_CONTENTS: readonly TextbookContent[] = [
  parseTextbookContent({
    textbook: {
      id: DEMO_TEXTBOOK_ID,
      edition: 'demo-edition',
      year: 2026,
      stage: 'primary',
      grade: 3,
      term: 'first',
      displayName: '演示教材 · 三年级上册',
    },
    units: [
      {
        id: 'demo-unit-1',
        textbookId: DEMO_TEXTBOOK_ID,
        name: 'Unit 1',
        order: 1,
      },
      {
        id: 'demo-unit-2',
        textbookId: DEMO_TEXTBOOK_ID,
        name: 'Unit 2',
        order: 2,
      },
    ],
    entries: [
      publishedEntry('demo-morning', 'demo-unit-1', 'morning', '早晨；上午', 1),
      publishedEntry('demo-hello', 'demo-unit-1', 'hello', '你好', 2),
      publishedEntry('demo-school', 'demo-unit-2', 'school', '学校', 1),
    ],
  }),
];
