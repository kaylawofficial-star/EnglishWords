import { describe, expect, it } from 'vitest';
import { createLocalContentService } from '../../miniprogram/adapters/local/local-content-service';

describe('local content service', () => {
  it('returns configured content by textbook id', async () => {
    const service = createLocalContentService();
    const result = await service.getTextbookContent('demo-primary-3-first');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.textbook.id).toBe('demo-primary-3-first');
    }
  });

  it.each(['', 'unknown-textbook'])('does not fall back for id %j', async (id) => {
    const result = await createLocalContentService().getTextbookContent(id);

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: `Textbook not found: ${id}`,
      },
    });
  });

  it('does not expose shared fixture state to callers', async () => {
    const service = createLocalContentService();
    const first = await service.getTextbookContent('demo-primary-3-first');
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    first.data.textbook.displayName = '被调用方修改';
    first.data.units.length = 0;

    const second = await service.getTextbookContent('demo-primary-3-first');
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.data.textbook.displayName).toBe('演示教材 · 三年级上册');
      expect(second.data.units).toHaveLength(2);
    }
  });
});
