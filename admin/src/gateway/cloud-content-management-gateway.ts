import cloudbase from '@cloudbase/js-sdk';
import type { MediaReference } from '../../../shared/contracts/content-management';
import type { CreateUploadIntentInput, UploadIntent } from '../../../content-management/media/media-storage';
import type { ManagementAction } from '../../../content-management/transport/content-management-handler';
import { unwrapManagementEnvelope, type ContentManagementGateway } from './content-management-gateway';

interface CloudbaseApp {
  auth(): {
    signInWithCustomTicket(getTicket: () => Promise<string>): Promise<unknown>;
  };
  callFunction?(input: { name: string; data: unknown }): Promise<{ result?: unknown }>;
  uploadFile?(input: { cloudPath: string; filePath: File }): Promise<{ fileID: string }>;
}

type CloudbaseInitializer = (config: { env: string }) => CloudbaseApp;

export class CloudContentManagementGateway implements ContentManagementGateway {
  readonly mode = 'cloud' as const;
  readonly modeLabel = '微信云开发模式';
  private readonly app: CloudbaseApp;

  private constructor(app: CloudbaseApp) {
    this.app = app;
  }

  static async connect(
    environmentId: string,
    customTicket: string,
    initialize: CloudbaseInitializer = cloudbase.init as CloudbaseInitializer,
  ): Promise<CloudContentManagementGateway> {
    if (!environmentId.trim()) throw new Error('CloudBase environment ID is required');
    if (!customTicket.trim()) throw new Error('CloudBase custom ticket is required');
    const app = initialize({ env: environmentId });
    await app.auth().signInWithCustomTicket(() => Promise.resolve(customTicket));
    return new CloudContentManagementGateway(app);
  }

  async execute<T>(action: ManagementAction, payload: Record<string, unknown>): Promise<T> {
    if (!this.app.callFunction) throw new Error('CloudBase functions are unavailable');
    const response = await this.app.callFunction({ name: 'content-management', data: { action, payload } });
    return unwrapManagementEnvelope<T>(response.result);
  }

  async uploadMedia(file: File, input: CreateUploadIntentInput): Promise<MediaReference> {
    const intent = await this.execute<UploadIntent>('createUploadIntent', { ...input });
    if (!this.app.uploadFile) throw new Error('CloudBase storage is unavailable');
    const uploaded = await this.app.uploadFile({ cloudPath: intent.storageKey, filePath: file });
    return {
      id: intent.mediaId,
      storageKey: uploaded.fileID,
      mediaType: input.mimeType.startsWith('image/') ? 'image' : 'audio',
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      sha256: input.sha256,
      rightsSource: input.rightsSource,
      reviewed: false,
    };
  }
}
