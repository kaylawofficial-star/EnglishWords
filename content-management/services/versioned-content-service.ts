import type { ContentService } from '../../miniprogram/services/content/content-service';
import type { ContentRepository } from '../repositories/content-repository';
import { projectHistoricalPublication, projectPublishedTextbook, type TextbookCatalog } from './published-content-projector';

export function createVersionedContentService(
  repository: Pick<ContentRepository, 'listState'>,
  catalog: TextbookCatalog,
): ContentService {
  return {
    async getTextbookContent(textbookId) {
      try {
        const content = projectPublishedTextbook(await repository.listState(), textbookId, catalog);
        return content.entries.length > 0
          ? { ok: true, data: content }
          : { ok: false, error: { code: 'NOT_FOUND', message: `Published content not found: ${textbookId}` } };
      } catch (error) {
        return failure(error);
      }
    },
    async getHistoricalPublication(publicationId) {
      try {
        return { ok: true, data: projectHistoricalPublication(await repository.listState(), publicationId, catalog) };
      } catch (error) {
        return failure(error);
      }
    },
  };
}

function failure(error: unknown) {
  const candidate = error as { code?: unknown; message?: unknown };
  return {
    ok: false as const,
    error: {
      code: candidate.code === 'NOT_FOUND' ? 'NOT_FOUND' as const : 'UNAVAILABLE' as const,
      message: typeof candidate.message === 'string' ? candidate.message : 'Content service unavailable',
    },
  };
}
