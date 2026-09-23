import type { ContentErrorCode } from '../../shared/contracts/content';

const CONTENT_ERROR_MESSAGES: Record<ContentErrorCode, string> = {
  NOT_FOUND: '还没有找到这套教材，请让家长检查教材设置后再试。',
  UNAVAILABLE: '网络或内容服务暂时不可用，请稍后再试。',
  INVALID_RESPONSE: '教材内容暂时无法读取，请稍后再试。',
};

export function createContentErrorMessage(code: ContentErrorCode): string {
  return CONTENT_ERROR_MESSAGES[code];
}
