import type { AdminAuthProvider } from '../auth/admin-auth-provider';
import type { MediaStorage } from '../media/media-storage';

export type ManagementAction =
  | 'listContent' | 'getDraft' | 'getHistory' | 'saveDraft' | 'submitForReview'
  | 'approve' | 'reject' | 'preview' | 'publish'
  | 'withdraw' | 'rollback' | 'createUploadIntent';

export interface ManagementEvent {
  action?: unknown;
  payload?: unknown;
}

interface HandlerDependencies {
  auth: AdminAuthProvider;
  execute: (action: Exclude<ManagementAction, 'createUploadIntent'>, payload: Record<string, unknown>, actorId: string) => Promise<unknown>;
  mediaStorage: MediaStorage;
}

export function createContentManagementHandler(dependencies: HandlerDependencies) {
  return async (event: ManagementEvent, context: unknown) => {
    let actorId: string;
    try {
      actorId = (await dependencies.auth.requireAdmin(context)).actorId;
    } catch {
      return { ok: false as const, error: { code: 'UNAUTHORIZED', message: '管理员身份验证失败' } };
    }
    if (!isAction(event.action) || !isRecord(event.payload)) {
      return { ok: false as const, error: { code: 'INVALID_REQUEST', message: '管理请求格式无效' } };
    }
    try {
      const data = event.action === 'createUploadIntent'
        ? await dependencies.mediaStorage.createUploadIntent(event.payload as never)
        : await dependencies.execute(event.action, event.payload, actorId);
      return { ok: true as const, data };
    } catch (error) {
      const candidate = error as { code?: unknown; message?: unknown };
      return {
        ok: false as const,
        error: {
          code: typeof candidate.code === 'string' ? candidate.code : 'UNAVAILABLE',
          message: typeof candidate.message === 'string' ? candidate.message : '管理服务暂时不可用',
        },
      };
    }
  };
}

function isAction(value: unknown): value is ManagementAction {
  return typeof value === 'string' && ['listContent', 'getDraft', 'getHistory', 'saveDraft', 'submitForReview', 'approve', 'reject', 'preview', 'publish', 'withdraw', 'rollback', 'createUploadIntent'].includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
