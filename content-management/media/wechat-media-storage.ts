import type { MediaReference } from '../../shared/contracts/content-management';
import { LocalMediaStorage, validateUploadInput, type CreateUploadIntentInput, type MediaStorage, type UploadIntent } from './media-storage';

export class WechatMediaStorage implements MediaStorage {
  private readonly validator = new LocalMediaStorage(() => new Date().toISOString());
  constructor(
    private readonly createIntent: (input: CreateUploadIntentInput) => Promise<UploadIntent>,
    private readonly verifyStoredReference: (reference: MediaReference) => Promise<boolean>,
  ) {}

  async createUploadIntent(input: CreateUploadIntentInput): Promise<UploadIntent> {
    validateUploadInput(input);
    return this.createIntent(input);
  }

  async verify(reference: MediaReference): Promise<void> {
    await this.validator.verify(reference);
    if (!(await this.verifyStoredReference(reference))) throw new Error('Stored media could not be verified');
  }
}

