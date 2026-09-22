import { describe, expect, it } from 'vitest';
import { healthCheckMain } from '../../cloudfunctions/health-check/src/index';

describe('health-check cloud function', () => {
  it('returns a stateless service health response', async () => {
    const response = await healthCheckMain();

    expect(response.ok).toBe(true);
    expect(response.data.status).toBe('ok');
    expect(Number.isNaN(Date.parse(response.data.timestamp))).toBe(false);
  });
});
