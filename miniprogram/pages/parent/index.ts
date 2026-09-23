import type { ContentSnapshot } from '../../services/content/content-loader';
import { createParentViewModel, type ParentViewModel } from './view-model';

interface ParentPageData {
  status: 'loading' | 'ready' | 'error';
  isLocalMode: boolean;
  viewModel: ParentViewModel | null;
  errorMessage: string;
}

Page<ParentPageData, WechatMiniprogram.Page.CustomOption>({
  data: {
    status: 'loading',
    isLocalMode: true,
    viewModel: null,
    errorMessage: '',
  },

  onLoad() {
    const { runtimeConfig } = getApp<AppOption>().globalData;
    this.setData({ isLocalMode: runtimeConfig.contentMode === 'local' });
    void this.loadContent(false);
  },

  retry() {
    void this.loadContent(true);
  },

  async loadContent(forceRetry: boolean) {
    const { contentLoader, runtimeConfig } = getApp<AppOption>().globalData;
    this.setData({ status: 'loading', errorMessage: '' });
    const snapshot = forceRetry
      ? await contentLoader.retry()
      : await contentLoader.load(runtimeConfig.textbookId);
    this.applySnapshot(snapshot);
  },

  applySnapshot(snapshot: ContentSnapshot) {
    if (snapshot.status === 'ready') {
      this.setData({
        status: 'ready',
        viewModel: createParentViewModel(snapshot.content),
        errorMessage: '',
      });
      return;
    }
    if (snapshot.status === 'error') {
      this.setData({
        status: 'error',
        viewModel: null,
        errorMessage: snapshot.error.message,
      });
    }
  },
});
