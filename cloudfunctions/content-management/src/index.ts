import { randomUUID } from 'node:crypto';
import { AllowlistAdminAuthProvider } from '../../../content-management/auth/admin-auth-provider';
import { LocalMediaStorage, type MediaStorage } from '../../../content-management/media/media-storage';
import { WechatMediaStorage } from '../../../content-management/media/wechat-media-storage';
import { CloudContentRepository } from '../../../content-management/repositories/cloud-content-repository';
import type { ContentRepository } from '../../../content-management/repositories/content-repository';
import { ContentManagementService } from '../../../content-management/services/content-management-service';
import { createContentManagementHandler, type ManagementEvent } from '../../../content-management/transport/content-management-handler';
import { executeContentManagementCommand } from '../../../content-management/transport/content-management-commands';
import { resolveWechatActorId } from './wechat-context';
import { createWechatCloudStatePort, type WechatDatabase } from './cloud-database';

declare const require: (name: string) => any;
declare const process: { env: Record<string, string | undefined> };

export interface ContentManagementMainDependencies {
  repository: ContentRepository;
  mediaStorage?: MediaStorage;
  allowedActorIds: ReadonlySet<string>;
  now?: () => string;
  createId?: (prefix: string) => string;
}

export function createContentManagementMain(dependencies: ContentManagementMainDependencies) {
  const now = dependencies.now ?? (() => new Date().toISOString());
  const service = new ContentManagementService(dependencies.repository, {
    now,
    createId: dependencies.createId ?? ((prefix) => `${prefix}-${randomUUID()}`),
    ...(dependencies.mediaStorage ? { mediaStorage: dependencies.mediaStorage } : {}),
  });
  const handler = createContentManagementHandler({
    auth: new AllowlistAdminAuthProvider(resolveWechatActorId, dependencies.allowedActorIds),
    mediaStorage: dependencies.mediaStorage ?? new LocalMediaStorage(() => new Date(Date.now() + 10 * 60_000).toISOString()),
    execute: (action, payload, actorId) => executeContentManagementCommand(service, action, payload, actorId),
  });
  return (event: ManagementEvent, context: unknown) => handler(event, context);
}

export async function main(event: ManagementEvent) {
  const cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
  const database = cloud.database() as WechatDatabase;
  const repository = new CloudContentRepository(createWechatCloudStatePort(database));
  const mediaStorage = new WechatMediaStorage(
    async (input) => {
      const mediaId = `media-${randomUUID()}`;
      return {
        mediaId,
        storageKey: `content/${input.assetId}/${mediaId}`,
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        uploadToken: randomUUID(),
      };
    },
    async (reference) => {
      const result = await cloud.getTempFileURL({ fileList: [reference.storageKey] });
      const file = result.fileList?.[0];
      return file?.status === 0 && typeof file.tempFileURL === 'string' && file.tempFileURL.length > 0;
    },
  );
  const allowedActorIds = new Set(
    (process.env.CONTENT_ADMIN_IDS ?? '')
      .split(',')
      .map((actorId) => actorId.trim())
      .filter(Boolean),
  );
  const configuredMain = createContentManagementMain({ repository, mediaStorage, allowedActorIds });
  return configuredMain(event, cloud.getWXContext());
}
