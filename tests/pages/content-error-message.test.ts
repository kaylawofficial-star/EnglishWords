import { expect, it } from 'vitest';
import { createContentErrorMessage } from '../../miniprogram/pages/content-error-message';

it('turns service error codes into actionable Chinese page copy', () => {
  expect(createContentErrorMessage('NOT_FOUND')).toBe(
    '还没有找到这套教材，请让家长检查教材设置后再试。',
  );
  expect(createContentErrorMessage('UNAVAILABLE')).toBe(
    '网络或内容服务暂时不可用，请稍后再试。',
  );
  expect(createContentErrorMessage('INVALID_RESPONSE')).toBe(
    '教材内容暂时无法读取，请稍后再试。',
  );
});
