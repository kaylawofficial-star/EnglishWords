export type ContentManagementErrorCode =
  | 'NOT_FOUND'
  | 'INVALID_STATE'
  | 'VALIDATION_FAILED'
  | 'REVISION_CONFLICT'
  | 'DUPLICATE';

export class ContentManagementError extends Error {
  readonly currentRevision?: number;

  constructor(
    readonly code: ContentManagementErrorCode,
    message: string,
    options: { currentRevision?: number } = {},
  ) {
    super(message);
    this.name = 'ContentManagementError';
    if (options.currentRevision !== undefined) {
      this.currentRevision = options.currentRevision;
    }
  }
}

