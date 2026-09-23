import { createLocalContentService } from '../../../miniprogram/adapters/local/local-content-service';
import type { ContentServiceResponse } from '../../../shared/contracts/content';

export interface ContentServiceEvent {
  action?: unknown;
  textbookId?: unknown;
  publicationId?: unknown;
}

const contentService = createLocalContentService();

export async function contentServiceMain(
  event: ContentServiceEvent,
): Promise<ContentServiceResponse> {
  if (event.action === 'getHistoricalPublication') {
    const publicationId = typeof event.publicationId === 'string' ? event.publicationId : '';
    return contentService.getHistoricalPublication(publicationId);
  }
  if (event.action !== 'getTextbookContent') {
    return {
      ok: false,
      error: {
        code: 'INVALID_RESPONSE',
        message: 'Unsupported content service action',
      },
    };
  }

  const textbookId = typeof event.textbookId === 'string' ? event.textbookId : '';
  return contentService.getTextbookContent(textbookId);
}

export const main = contentServiceMain;
