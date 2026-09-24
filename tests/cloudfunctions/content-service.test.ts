import { describe, expect, it } from 'vitest';
import { createContentServiceMain, contentServiceMain } from '../../cloudfunctions/content-service/src/index';
import type { ContentService } from '../../miniprogram/services/content/content-service';

describe('content-service cloud function', () => {
  it('reads student content through the configured managed-content service', async () => {
    const service: ContentService = {
      getTextbookContent: async (textbookId) => ({
        ok: false,
        error: { code: 'NOT_FOUND', message: `managed:${textbookId}` },
      }),
      getHistoricalPublication: async (publicationId) => ({
        ok: false,
        error: { code: 'NOT_FOUND', message: `managed-history:${publicationId}` },
      }),
    };
    const main = createContentServiceMain(service);

    await expect(main({ action: 'getTextbookContent', textbookId: 'cloud-book' }))
      .resolves.toMatchObject({ error: { message: 'managed:cloud-book' } });
    await expect(main({ action: 'getHistoricalPublication', publicationId: 'cloud-publication' }))
      .resolves.toMatchObject({ error: { message: 'managed-history:cloud-publication' } });
  });

  it('returns configured content for an exact textbook id', async () => {
    const response = await contentServiceMain({
      action: 'getTextbookContent',
      textbookId: 'demo-primary-3-first',
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.textbook.id).toBe('demo-primary-3-first');
    }
  });

  it.each(['', 'unknown-textbook'])('returns NOT_FOUND for id %j', async (id) => {
    await expect(
      contentServiceMain({ action: 'getTextbookContent', textbookId: id }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', message: `Textbook not found: ${id}` },
    });
  });

  it('returns INVALID_RESPONSE for an unsupported action', async () => {
    await expect(
      contentServiceMain({ action: 'deleteEverything', textbookId: 'demo-primary-3-first' }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: 'INVALID_RESPONSE',
        message: 'Unsupported content service action',
      },
    });
  });

  it('resolves historical content without making it current', async () => {
    const response = await contentServiceMain({
      action: 'getHistoricalPublication',
      publicationId: 'publication-demo-school-v1',
    });
    expect(response.ok).toBe(true);
    if (response.ok) expect(response.data.entries[0]?.word).toBe('school');
  });
});
