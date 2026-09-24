import { CloudContentRepository } from '../../../content-management/repositories/cloud-content-repository';
import type { BrowserContentStore } from './browser-content-store';

export class BrowserContentRepository extends CloudContentRepository {
  constructor(store: BrowserContentStore) {
    super({
      loadState: async () => store.load(),
      runTransaction: async (change) => {
        const changed = await change(store.load());
        store.save(changed.state);
        return changed.result;
      },
    });
  }
}
