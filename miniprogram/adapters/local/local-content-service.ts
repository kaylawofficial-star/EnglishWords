import type { TextbookContent } from '../../../shared/contracts/content';
import { DEMO_CONTENTS } from '../../../shared/fixtures/demo-content';
import { parseTextbookContent } from '../../../shared/validation/content';
import type { ContentService } from '../../services/content/content-service';

function cloneContent(content: TextbookContent): TextbookContent {
  return parseTextbookContent(JSON.parse(JSON.stringify(content)) as unknown);
}

export function createLocalContentService(
  contents: readonly TextbookContent[] = DEMO_CONTENTS,
): ContentService {
  const validatedContents = contents.map(cloneContent);

  return {
    async getTextbookContent(textbookId) {
      const content = validatedContents.find(
        (candidate) => candidate.textbook.id === textbookId,
      );

      if (!content) {
        return {
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: `Textbook not found: ${textbookId}`,
          },
        };
      }

      return { ok: true, data: cloneContent(content) };
    },
  };
}
