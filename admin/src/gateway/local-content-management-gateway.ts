import type { MediaReference } from '../../../shared/contracts/content-management';
import { LocalMediaStorage, type CreateUploadIntentInput } from '../../../content-management/media/media-storage';
import { ContentManagementService } from '../../../content-management/services/content-management-service';
import type { ManagementAction } from '../../../content-management/transport/content-management-handler';
import type { BrowserContentRepository } from '../storage/browser-content-repository';
import type { ContentManagementGateway } from './content-management-gateway';

export class LocalContentManagementGateway implements ContentManagementGateway {
  readonly mode = 'local' as const;
  readonly modeLabel = '本地演示模式 · 数据仅保存在此浏览器';
  private readonly service: ContentManagementService;
  private readonly media = new LocalMediaStorage(() => new Date(Date.now() + 10 * 60_000).toISOString());

  constructor(repository: BrowserContentRepository) {
    this.service = new ContentManagementService(repository, {
      now: () => new Date().toISOString(),
      createId: (prefix) => `${prefix}-${crypto.randomUUID()}`,
    });
  }

  async execute<T>(action: ManagementAction, payload: Record<string, unknown>): Promise<T> {
    const actorId = 'local-admin';
    switch (action) {
      case 'listContent': return await this.service.listContent(payload) as T;
      case 'getDraft': return await this.service.getDraft(String(payload.draftId ?? '')) as T;
      case 'getHistory': return await this.service.getHistory(String(payload.draftId ?? '')) as T;
      case 'preview': return await this.service.previewDraft(String(payload.draftId ?? '')) as T;
      case 'saveDraft': return (payload.draftId
        ? await this.service.updateDraft({ ...payload, actorId } as never)
        : await this.service.createDraft({ ...payload, actorId } as never)) as T;
      case 'submitForReview': return await this.service.submitForReview({ ...payload, actorId } as never) as T;
      case 'approve': return await this.service.approve({ ...payload, actorId } as never) as T;
      case 'reject': return await this.service.reject({ ...payload, actorId } as never) as T;
      case 'publish': return await this.service.publish({ ...payload, actorId } as never) as T;
      case 'withdraw': return await this.service.withdraw({ ...payload, actorId } as never) as T;
      case 'rollback': return await this.service.rollback({ ...payload, actorId } as never) as T;
      case 'createUploadIntent': return await this.media.createUploadIntent(payload as never) as T;
    }
  }

  async uploadMedia(file: File, input: CreateUploadIntentInput): Promise<MediaReference> {
    const intent = await this.media.createUploadIntent(input);
    return {
      id: intent.mediaId,
      storageKey: await toDataUrl(file),
      mediaType: input.mimeType.startsWith('image/') ? 'image' : 'audio',
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      sha256: input.sha256,
      rightsSource: input.rightsSource,
      reviewed: false,
    };
  }
}

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Media encoding failed')));
    reader.addEventListener('error', () => reject(reader.error ?? new Error('Media encoding failed')));
    reader.readAsDataURL(file);
  });
}
