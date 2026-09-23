import { describe, expect, it, vi } from 'vitest';
import { createCloudContentService } from '../../miniprogram/adapters/cloud/cloud-content-service';
import { DEMO_CONTENTS } from '../../shared/fixtures/demo-content';

const validContent = DEMO_CONTENTS[0]!;

describe('cloud content service', () => {
  it('maps a rejected cloud call to UNAVAILABLE', async () => {
    const caller = {
      callFunction: vi.fn().mockRejectedValue(new Error('offline')),
    };

    const result = await createCloudContentService(caller).getTextbookContent('book-1');

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'UNAVAILABLE',
        message: 'Content service is unavailable',
      },
    });
  });

  it('rejects a malformed success envelope', async () => {
    const diagnostic = vi.fn();
    const caller = {
      callFunction: vi.fn().mockResolvedValue({ result: { ok: true, data: {} } }),
    };

    const result = await createCloudContentService(caller, diagnostic)
      .getTextbookContent('book-1');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_RESPONSE');
    }
    expect(diagnostic).toHaveBeenCalledWith(
      'Content service response failed content validation',
      expect.objectContaining({ reason: expect.any(String) }),
    );
  });

  it('returns validated cloud content and sends the requested id', async () => {
    const caller = {
      callFunction: vi.fn().mockResolvedValue({
        result: { ok: true, data: validContent },
      }),
    };

    const result = await createCloudContentService(caller).getTextbookContent(
      'demo-primary-3-first',
    );

    expect(result).toEqual({ ok: true, data: validContent });
    expect(caller.callFunction).toHaveBeenCalledWith({
      name: 'content-service',
      data: {
        action: 'getTextbookContent',
        textbookId: 'demo-primary-3-first',
      },
    });
  });

  it('preserves an explicit service error', async () => {
    const caller = {
      callFunction: vi.fn().mockResolvedValue({
        result: {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Textbook not found: missing' },
        },
      }),
    };

    await expect(
      createCloudContentService(caller).getTextbookContent('missing'),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Textbook not found: missing' },
    });
  });
});
