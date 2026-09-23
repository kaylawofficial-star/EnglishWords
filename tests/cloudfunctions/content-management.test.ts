import { expect, it } from 'vitest';
import { createContentManagementMain } from '../../cloudfunctions/content-management/src/index';
import { InMemoryContentRepository } from '../../content-management/repositories/in-memory-content-repository';

it('authorizes a configured administrator and rejects everyone else', async () => {
  const main = createContentManagementMain({
    repository: new InMemoryContentRepository(), allowedActorIds: new Set(['admin-openid']),
    now: () => '2026-09-23T00:00:00.000Z', createId: (prefix) => `${prefix}-1`,
  });
  await expect(main({ action: 'listContent', payload: {} }, { OPENID: 'other' })).resolves.toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } });
  await expect(main({ action: 'listContent', payload: {} }, { OPENID: 'admin-openid' })).resolves.toEqual({ ok: true, data: [] });
});
