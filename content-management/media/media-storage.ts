import type { MediaReference } from '../../shared/contracts/content-management';
import { ContentManagementError } from '../services/content-errors';

export interface CreateUploadIntentInput {
  assetId: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  rightsSource: string;
}

export interface UploadIntent {
  mediaId: string;
  storageKey: string;
  expiresAt: string;
  uploadToken: string;
}

export interface MediaStorage {
  createUploadIntent(input: CreateUploadIntentInput): Promise<UploadIntent>;
  verify(reference: MediaReference): Promise<void>;
}

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'audio/mpeg', 'audio/mp4']);

export function validateUploadInput(input: CreateUploadIntentInput): void {
  if (!input.assetId.trim() || !ALLOWED_MIME_TYPES.has(input.mimeType)) fail('Unsupported media type');
  if (!Number.isInteger(input.byteSize) || input.byteSize <= 0 || input.byteSize > 10_000_000) fail('Media size is invalid');
  if (!/^[a-f0-9]{64}$/i.test(input.sha256)) fail('Media checksum is invalid');
  if (!input.rightsSource.trim()) fail('Media rights source is required');
}

export class LocalMediaStorage implements MediaStorage {
  private nextId = 0;
  constructor(private readonly expiresAt: () => string) {}

  async createUploadIntent(input: CreateUploadIntentInput): Promise<UploadIntent> {
    validateUploadInput(input);
    const mediaId = `local-media-${++this.nextId}`;
    const extension = input.mimeType.startsWith('image/') ? 'image' : 'audio';
    return {
      mediaId,
      storageKey: `content/${input.assetId}/${mediaId}-${extension}`,
      expiresAt: this.expiresAt(),
      uploadToken: `local-upload-${mediaId}`,
    };
  }

  async verify(reference: MediaReference): Promise<void> {
    validateUploadInput({ assetId: 'verify', mimeType: reference.mimeType, byteSize: reference.byteSize, sha256: reference.sha256, rightsSource: reference.rightsSource });
    if (!reference.reviewed) fail('Media must be reviewed');
  }
}

function fail(message: string): never {
  throw new ContentManagementError('VALIDATION_FAILED', message);
}

