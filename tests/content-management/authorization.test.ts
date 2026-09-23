import { describe, expect, it, vi } from 'vitest';
import { createContentManagementHandler } from '../../content-management/transport/content-management-handler';

const actions = ['saveDraft', 'submitForReview', 'approve', 'reject', 'publish', 'withdraw', 'rollback', 'createUploadIntent'] as const;

describe('content management authorization', () => {
  it.each(actions)('rejects unauthorized %s before invoking a command', async (action) => {
    const execute = vi.fn();
    const handler = createContentManagementHandler({
      auth: { requireAdmin: vi.fn().mockRejectedValue(new Error('denied')) },
      execute,
      mediaStorage: { createUploadIntent: vi.fn(), verify: vi.fn() },
    });
    await expect(handler({ action, payload: {} }, {})).resolves.toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } });
    expect(execute).not.toHaveBeenCalled();
  });

  it('passes the trusted actor id to an authorized command', async () => {
    const execute = vi.fn().mockResolvedValue({ saved: true });
    const handler = createContentManagementHandler({
      auth: { requireAdmin: vi.fn().mockResolvedValue({ actorId: 'admin-1' }) }, execute,
      mediaStorage: { createUploadIntent: vi.fn(), verify: vi.fn() },
    });
    await expect(handler({ action: 'saveDraft', payload: { draftId: 'draft-1' } }, { openId: 'trusted' }))
      .resolves.toEqual({ ok: true, data: { saved: true } });
    expect(execute).toHaveBeenCalledWith('saveDraft', { draftId: 'draft-1' }, 'admin-1');
  });
});

