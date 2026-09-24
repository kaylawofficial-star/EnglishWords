import type { MediaReference } from '../../../shared/contracts/content-management';
import type { CreateUploadIntentInput } from '../../../content-management/media/media-storage';
import type { ManagementAction } from '../../../content-management/transport/content-management-handler';

export interface ContentManagementGateway {
  readonly mode: 'local' | 'cloud';
  readonly modeLabel: string;
  execute<T>(action: ManagementAction, payload: Record<string, unknown>): Promise<T>;
  uploadMedia(file: File, input: CreateUploadIntentInput): Promise<MediaReference>;
}

export class GatewayError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'GatewayError';
  }
}

export interface ManagementEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export function unwrapManagementEnvelope<T>(value: unknown): T {
  if (!isRecord(value) || typeof value.ok !== 'boolean') {
    throw new GatewayError('INVALID_RESPONSE', '管理服务返回了无法识别的数据。');
  }
  if (value.ok) {
    if (!('data' in value)) throw new GatewayError('INVALID_RESPONSE', '管理服务响应缺少数据。');
    return value.data as T;
  }
  const error = value.error;
  if (!isRecord(error) || typeof error.code !== 'string' || typeof error.message !== 'string') {
    throw new GatewayError('INVALID_RESPONSE', '管理服务返回了无法识别的错误。');
  }
  throw new GatewayError(error.code, error.message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
