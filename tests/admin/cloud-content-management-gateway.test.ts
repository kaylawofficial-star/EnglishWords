import { expect, it, vi } from 'vitest';
import { CloudContentManagementGateway } from '../../admin/src/gateway/cloud-content-management-gateway';

it('signs in with a custom ticket before calling management functions', async () => {
  const signInWithCustomTicket = vi.fn(async (getTicket: () => Promise<string>) => {
    expect(await getTicket()).toBe('signed-custom-ticket');
  });
  const callFunction = vi.fn().mockResolvedValue({ result: { ok: true, data: [] } });
  const initialize = vi.fn(() => ({
    auth: () => ({ signInWithCustomTicket }),
    callFunction,
  }));

  const gateway = await CloudContentManagementGateway.connect(
    'cloud-env',
    'signed-custom-ticket',
    initialize,
  );
  await gateway.execute('listContent', {});

  expect(initialize).toHaveBeenCalledWith({ env: 'cloud-env' });
  expect(signInWithCustomTicket).toHaveBeenCalledOnce();
  expect(signInWithCustomTicket.mock.invocationCallOrder[0])
    .toBeLessThan(callFunction.mock.invocationCallOrder[0]!);
});
