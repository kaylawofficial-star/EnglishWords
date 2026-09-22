import { describe, expect, it, vi } from 'vitest';
import { createContentService } from '../../miniprogram/services/content/create-content-service';
import type { RuntimeConfig } from '../../miniprogram/config/runtime';

const localConfig: RuntimeConfig = {
  environment: 'local',
  contentMode: 'local',
  textbookId: 'demo-primary-3-first',
  cloudEnvironmentId: '',
};

describe('createContentService', () => {
  it('creates the local service without a cloud caller', async () => {
    const service = createContentService(localConfig);
    const result = await service.getTextbookContent(localConfig.textbookId);
    expect(result.ok).toBe(true);
  });

  it.each(['pilot', 'production'] as const)(
    'rejects an empty cloud environment in %s',
    (environment) => {
      const config: RuntimeConfig = {
        ...localConfig,
        environment,
        contentMode: 'cloud',
      };

      expect(() => createContentService(config, { callFunction: vi.fn() })).toThrow(
        'Cloud environment id is required',
      );
    },
  );

  it('rejects cloud mode without a cloud caller', () => {
    const config: RuntimeConfig = {
      ...localConfig,
      environment: 'pilot',
      contentMode: 'cloud',
      cloudEnvironmentId: 'pilot-env',
    };

    expect(() => createContentService(config)).toThrow(
      'Cloud function caller is required',
    );
  });

  it('creates the cloud service when configuration is complete', async () => {
    const config: RuntimeConfig = {
      ...localConfig,
      environment: 'pilot',
      contentMode: 'cloud',
      cloudEnvironmentId: 'pilot-env',
    };
    const caller = {
      callFunction: vi.fn().mockResolvedValue({
        result: {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Textbook not found: cloud-book' },
        },
      }),
    };

    const result = await createContentService(config, caller).getTextbookContent(
      'cloud-book',
    );

    expect(result.ok).toBe(false);
    expect(caller.callFunction).toHaveBeenCalledOnce();
  });
});
