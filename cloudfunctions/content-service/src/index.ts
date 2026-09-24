import { createLocalContentService } from '../../../miniprogram/adapters/local/local-content-service';
import type { ContentService } from '../../../miniprogram/services/content/content-service';
import type { ContentServiceResponse } from '../../../shared/contracts/content';
import { DEMO_CONTENTS } from '../../../shared/fixtures/demo-content';
import { CloudContentRepository } from '../../../content-management/repositories/cloud-content-repository';
import { createVersionedContentService } from '../../../content-management/services/versioned-content-service';
import { createWechatCloudStatePort, type WechatDatabase } from '../../content-management/src/cloud-database';

declare const require: (name: string) => any;

export interface ContentServiceEvent {
  action?: unknown;
  textbookId?: unknown;
  publicationId?: unknown;
}

export function createContentServiceMain(contentService: ContentService) {
  return async (event: ContentServiceEvent): Promise<ContentServiceResponse> => {
    if (event.action === 'getHistoricalPublication') {
      const publicationId = typeof event.publicationId === 'string' ? event.publicationId : '';
      return contentService.getHistoricalPublication(publicationId);
    }
    if (event.action !== 'getTextbookContent') {
      return {
        ok: false,
        error: {
          code: 'INVALID_RESPONSE',
          message: 'Unsupported content service action',
        },
      };
    }

    const textbookId = typeof event.textbookId === 'string' ? event.textbookId : '';
    return contentService.getTextbookContent(textbookId);
  };
}

export const contentServiceMain = createContentServiceMain(createLocalContentService());

export async function main(event: ContentServiceEvent): Promise<ContentServiceResponse> {
  const cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
  const repository = new CloudContentRepository(
    createWechatCloudStatePort(cloud.database() as WechatDatabase),
  );
  const catalog = {
    textbooks: DEMO_CONTENTS.map((content) => content.textbook),
    units: DEMO_CONTENTS.flatMap((content) => content.units),
  };
  return createContentServiceMain(createVersionedContentService(repository, catalog))(event);
}
