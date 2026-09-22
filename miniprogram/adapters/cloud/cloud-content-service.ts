import type {
  ContentErrorCode,
  ContentServiceResponse,
} from '../../../shared/contracts/content';
import { parseTextbookContent } from '../../../shared/validation/content';
import type { ContentService } from '../../services/content/content-service';

export interface CloudFunctionCaller {
  callFunction(options: {
    name: string;
    data: Record<string, unknown>;
  }): Promise<{ result?: unknown }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isErrorCode(value: unknown): value is ContentErrorCode {
  return (
    value === 'NOT_FOUND' ||
    value === 'UNAVAILABLE' ||
    value === 'INVALID_RESPONSE'
  );
}

function invalidResponse(): ContentServiceResponse {
  return {
    ok: false,
    error: {
      code: 'INVALID_RESPONSE',
      message: 'Content service returned an invalid response',
    },
  };
}

function parseResponse(value: unknown): ContentServiceResponse {
  if (!isRecord(value) || typeof value.ok !== 'boolean') {
    return invalidResponse();
  }

  if (value.ok) {
    try {
      return { ok: true, data: parseTextbookContent(value.data) };
    } catch {
      return invalidResponse();
    }
  }

  if (!isRecord(value.error)) {
    return invalidResponse();
  }
  const { code, message } = value.error;
  if (!isErrorCode(code) || typeof message !== 'string' || message.length === 0) {
    return invalidResponse();
  }
  return { ok: false, error: { code, message } };
}

export function createCloudContentService(
  caller: CloudFunctionCaller,
): ContentService {
  return {
    async getTextbookContent(textbookId) {
      try {
        const response = await caller.callFunction({
          name: 'content-service',
          data: { action: 'getTextbookContent', textbookId },
        });
        return parseResponse(response.result);
      } catch {
        return {
          ok: false,
          error: {
            code: 'UNAVAILABLE',
            message: 'Content service is unavailable',
          },
        };
      }
    },
  };
}
