import type { CloudFunctionCaller } from './adapters/cloud/cloud-content-service';
import { runtimeConfig } from './config/runtime';
import { ContentLoader } from './services/content/content-loader';
import { createContentService } from './services/content/create-content-service';

let cloudCaller: CloudFunctionCaller | undefined;

if (runtimeConfig.contentMode === 'cloud') {
  wx.cloud.init({
    env: runtimeConfig.cloudEnvironmentId,
    traceUser: true,
  });
  cloudCaller = {
    async callFunction(options) {
      const response = await wx.cloud.callFunction(options);
      return { result: response.result };
    },
  };
}

const contentService = createContentService(runtimeConfig, cloudCaller);

App<AppOption>({
  globalData: {
    contentLoader: new ContentLoader(contentService),
    runtimeConfig,
  },
});
