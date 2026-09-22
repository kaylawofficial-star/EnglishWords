import { describe, expect, it, vi } from 'vitest';
import { ContentLoader } from '../../miniprogram/services/content/content-loader';
import type {
  ContentServiceResponse,
  TextbookContent,
} from '../../shared/contracts/content';
import { DEMO_CONTENTS } from '../../shared/fixtures/demo-content';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function contentWithId(id: string): TextbookContent {
  const source = DEMO_CONTENTS[0]!;
  return {
    textbook: { ...source.textbook, id, displayName: id },
    units: source.units.map((unit) => ({ ...unit, textbookId: id })),
    entries: source.entries.map((entry) => ({ ...entry })),
  };
}

const successResponse: ContentServiceResponse = {
  ok: true,
  data: DEMO_CONTENTS[0]!,
};
const unavailableResponse: ContentServiceResponse = {
  ok: false,
  error: {
    code: 'UNAVAILABLE',
    message: 'Content service is unavailable',
  },
};

describe('ContentLoader', () => {
  it('shares one in-flight request for the same textbook', async () => {
    const deferred = createDeferred<ContentServiceResponse>();
    const service = { getTextbookContent: vi.fn(() => deferred.promise) };
    const loader = new ContentLoader(service);

    const first = loader.load('book-1');
    const second = loader.load('book-1');

    expect(first).toBe(second);
    expect(service.getTextbookContent).toHaveBeenCalledTimes(1);
    deferred.resolve(successResponse);
    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
  });

  it('starts a fresh request when retrying after failure', async () => {
    const service = {
      getTextbookContent: vi
        .fn()
        .mockResolvedValueOnce(unavailableResponse)
        .mockResolvedValueOnce(successResponse),
    };
    const loader = new ContentLoader(service);

    await loader.load('book-1');
    expect(loader.getSnapshot()).toEqual({
      status: 'error',
      textbookId: 'book-1',
      error: unavailableResponse.error,
    });
    await loader.retry();

    expect(service.getTextbookContent).toHaveBeenCalledTimes(2);
    expect(loader.getSnapshot().status).toBe('ready');
  });

  it('loads a different textbook instead of reusing the ready cache', async () => {
    const service = {
      getTextbookContent: vi.fn(async (id: string): Promise<ContentServiceResponse> => ({
        ok: true,
        data: contentWithId(id),
      })),
    };
    const loader = new ContentLoader(service);

    await loader.load('book-1');
    await loader.load('book-2');

    expect(service.getTextbookContent).toHaveBeenCalledTimes(2);
    const snapshot = loader.getSnapshot();
    expect(snapshot.status).toBe('ready');
    if (snapshot.status === 'ready') {
      expect(snapshot.textbookId).toBe('book-2');
      expect(snapshot.content.textbook.id).toBe('book-2');
    }
  });

  it('does not let a stale request replace the latest textbook', async () => {
    const first = createDeferred<ContentServiceResponse>();
    const second = createDeferred<ContentServiceResponse>();
    const service = {
      getTextbookContent: vi.fn((id: string) =>
        id === 'book-1' ? first.promise : second.promise,
      ),
    };
    const loader = new ContentLoader(service);

    const firstLoad = loader.load('book-1');
    const secondLoad = loader.load('book-2');
    second.resolve({ ok: true, data: contentWithId('book-2') });
    await secondLoad;
    first.resolve({ ok: true, data: contentWithId('book-1') });
    await firstLoad;

    const snapshot = loader.getSnapshot();
    expect(snapshot.status).toBe('ready');
    if (snapshot.status === 'ready') {
      expect(snapshot.textbookId).toBe('book-2');
    }
  });
});
