import type { ContentManagementService } from '../services/content-management-service';

export const MANAGEMENT_ACTIONS = [
  'listContent', 'getDraft', 'getHistory', 'saveDraft', 'submitForReview',
  'approve', 'reject', 'preview', 'publish', 'withdraw', 'rollback', 'createUploadIntent',
] as const;

export type ManagementAction = typeof MANAGEMENT_ACTIONS[number];
export type ServiceManagementAction = Exclude<ManagementAction, 'createUploadIntent'>;

export function isManagementAction(value: unknown): value is ManagementAction {
  return typeof value === 'string' && MANAGEMENT_ACTIONS.includes(value as ManagementAction);
}

export async function executeContentManagementCommand(
  service: ContentManagementService,
  action: ServiceManagementAction,
  payload: Record<string, unknown>,
  actorId: string,
): Promise<unknown> {
  switch (action) {
    case 'listContent': return service.listContent(payload);
    case 'getDraft': return service.getDraft(String(payload.draftId ?? ''));
    case 'getHistory': return service.getHistory(String(payload.draftId ?? ''));
    case 'preview': return service.previewDraft(String(payload.draftId ?? ''));
    case 'saveDraft': return payload.draftId
      ? service.updateDraft({ ...payload, actorId } as never)
      : service.createDraft({ ...payload, actorId } as never);
    case 'submitForReview': return service.submitForReview({ ...payload, actorId } as never);
    case 'approve': return service.approve({ ...payload, actorId } as never);
    case 'reject': return service.reject({ ...payload, actorId } as never);
    case 'publish': return service.publish({ ...payload, actorId } as never);
    case 'withdraw': return service.withdraw({ ...payload, actorId } as never);
    case 'rollback': return service.rollback({ ...payload, actorId } as never);
  }
}
