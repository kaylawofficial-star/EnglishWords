import {
  createCloudContentService,
  type CloudFunctionCaller,
} from '../../adapters/cloud/cloud-content-service';
import { createLocalContentService } from '../../adapters/local/local-content-service';
import type { RuntimeConfig } from '../../config/runtime';
import type { ContentService } from './content-service';

export function createContentService(
  config: RuntimeConfig,
  cloudCaller?: CloudFunctionCaller,
): ContentService {
  if (config.contentMode === 'local') {
    return createLocalContentService();
  }

  if (config.cloudEnvironmentId.trim().length === 0) {
    throw new Error('Cloud environment id is required');
  }
  if (!cloudCaller) {
    throw new Error('Cloud function caller is required');
  }

  return createCloudContentService(cloudCaller);
}
