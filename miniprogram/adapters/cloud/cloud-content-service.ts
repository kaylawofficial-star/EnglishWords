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

export type ContentDiagnostic = (
  message: string,
  details: Record<string, unknown>,
) => void;

const defaultDiagnostic: ContentDiagnostic = (message, details) => {
  console.warn(`[content-service] ${message}`, details);
};

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

function invalidResponse(
  diagnostic: ContentDiagnostic,
  message: string,
  details: Record<string, unknown>,
): ContentServiceResponse {
  diagnostic(message, details);
  return {
    ok: false,
    error: {
      code: 'INVALID_RESPONSE',
      message: 'Content service returned an invalid response',
    },
  };
}

function parseResponse(
  value: unknown,
  diagnostic: ContentDiagnostic,
): ContentServiceResponse {
  if (!isRecord(value) || typeof value.ok !== 'boolean') {
    return invalidResponse(
      diagnostic,
      'Content service response has an invalid envelope',
      { reason: 'Expected an object with a boolean ok field' },
    );
  }

  if (value.ok) {
    try {
      return { ok: true, data: parseTextbookContent(value.data) };
    } catch (error) {
      return invalidResponse(
        diagnostic,
        'Content service response failed content validation',
        { reason: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  if (!isRecord(value.error)) {
    return invalidResponse(
      diagnostic,
      'Content service error response is malformed',
      { reason: 'Expected an error object' },
    );
  }
  const { code, message } = value.error;
  if (!isErrorCode(code) || typeof message !== 'string' || message.length === 0) {
    return invalidResponse(
      diagnostic,
      'Content service error response is malformed',
      { reason: 'Expected a supported error code and non-empty message' },
    );
  }
  return { ok: false, error: { code, message } };
}

export function createCloudContentService(
  caller: CloudFunctionCaller,
  diagnostic: ContentDiagnostic = defaultDiagnostic,
): ContentService {
  return {
    async getTextbookContent(textbookId) {
      return callAndParse('getTextbookContent', { textbookId });
    },
    async getHistoricalPublication(publicationId) {
      return callAndParse('getHistoricalPublication', { publicationId });
    },
  };

  async function callAndParse(
    action: string,
    data: Record<string, unknown>,
  ): Promise<ContentServiceResponse> {
      try {
        const response = await caller.callFunction({
          name: 'content-service',
          data: { action, ...data },
        });
        return parseResponse(response.result, diagnostic);
      } catch {
        return {
          ok: false,
          error: {
            code: 'UNAVAILABLE',
            message: 'Content service is unavailable',
          },
        };
      }
  }
}
