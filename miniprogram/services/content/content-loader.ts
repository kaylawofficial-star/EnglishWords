import type {
  ContentErrorCode,
  TextbookContent,
} from '../../../shared/contracts/content';
import type { ContentService } from './content-service';

export type ContentSnapshot =
  | { status: 'idle' }
  | { status: 'loading'; textbookId: string }
  | { status: 'ready'; textbookId: string; content: TextbookContent }
  | {
      status: 'error';
      textbookId: string;
      error: { code: ContentErrorCode; message: string };
    };

export class ContentLoader {
  private snapshot: ContentSnapshot = { status: 'idle' };
  private currentTextbookId: string | undefined;
  private inFlight:
    | { textbookId: string; promise: Promise<ContentSnapshot>; requestId: number }
    | undefined;
  private nextRequestId = 0;

  constructor(
    private readonly service: Pick<ContentService, 'getTextbookContent'>,
  ) {}

  getSnapshot(): ContentSnapshot {
    return this.snapshot;
  }

  load(textbookId: string, force = false): Promise<ContentSnapshot> {
    if (
      !force &&
      this.inFlight &&
      this.inFlight.textbookId === textbookId
    ) {
      return this.inFlight.promise;
    }

    if (
      !force &&
      this.snapshot.status === 'ready' &&
      this.snapshot.textbookId === textbookId
    ) {
      return Promise.resolve(this.snapshot);
    }

    const requestId = ++this.nextRequestId;
    this.currentTextbookId = textbookId;
    this.snapshot = { status: 'loading', textbookId };

    const promise = this.service.getTextbookContent(textbookId).then((response) => {
      const nextSnapshot: ContentSnapshot = response.ok
        ? { status: 'ready', textbookId, content: response.data }
        : { status: 'error', textbookId, error: response.error };

      if (this.inFlight?.requestId === requestId) {
        this.snapshot = nextSnapshot;
        this.inFlight = undefined;
      }
      return nextSnapshot;
    });

    this.inFlight = { textbookId, promise, requestId };
    return promise;
  }

  retry(): Promise<ContentSnapshot> {
    if (!this.currentTextbookId) {
      throw new Error('No textbook has been loaded');
    }
    return this.load(this.currentTextbookId, true);
  }
}
