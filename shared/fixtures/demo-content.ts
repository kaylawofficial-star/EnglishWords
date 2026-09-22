import type { TextbookContent } from '../contracts/content';
import { parseTextbookContent } from '../validation/content';

export const DEMO_TEXTBOOK_ID = 'demo-primary-3-first';

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
      {
        id: 'demo-morning',
        unitId: 'demo-unit-1',
        word: 'morning',
        meaning: '早晨；上午',
        order: 1,
      },
      {
        id: 'demo-hello',
        unitId: 'demo-unit-1',
        word: 'hello',
        meaning: '你好',
        order: 2,
      },
      {
        id: 'demo-school',
        unitId: 'demo-unit-2',
        word: 'school',
        meaning: '学校',
        order: 1,
      },
    ],
  }),
];
