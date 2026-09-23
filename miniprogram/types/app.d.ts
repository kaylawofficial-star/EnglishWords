import type { RuntimeConfig } from '../config/runtime';
import type { ContentLoader } from '../services/content/content-loader';

declare global {
  interface AppOption {
    globalData: {
      contentLoader: ContentLoader;
      runtimeConfig: RuntimeConfig;
    };
  }
}

export {};
