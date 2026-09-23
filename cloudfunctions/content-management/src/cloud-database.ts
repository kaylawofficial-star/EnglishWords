import type { ManagedContentState } from '../../../shared/contracts/content-management';
import { parseManagedContentState } from '../../../shared/validation/content-management';
import type { CloudStatePort } from '../../../content-management/repositories/cloud-content-repository';

interface QueryResult {
  data: Array<Record<string, unknown>>;
}

interface WechatDocument {
  set(input: { data: Record<string, unknown> }): Promise<unknown>;
  remove(): Promise<unknown>;
}

interface WechatCollection {
  get(): Promise<QueryResult>;
  doc(id: string): WechatDocument;
}

interface WechatDatabaseSession {
  collection(name: string): WechatCollection;
}

export interface WechatDatabase extends WechatDatabaseSession {
  runTransaction<T>(callback: (transaction: WechatDatabaseSession) => Promise<T>): Promise<T>;
}

const COLLECTIONS = {
  assets: 'content_assets',
  assetVersions: 'content_asset_versions',
  placements: 'content_placements',
  placementVersions: 'content_placement_versions',
  reviews: 'content_reviews',
  publications: 'content_publications',
  audits: 'content_audits',
  currentPublications: 'content_current_publications',
} as const;

export function createWechatCloudStatePort(database: WechatDatabase): CloudStatePort {
  return {
    loadState: () => loadState(database),
    runTransaction: (change) => database.runTransaction(async (transaction) => {
      const current = await loadState(transaction);
      const changed = await change(current);
      const next = parseManagedContentState(changed.state);
      await persistState(transaction, current, next);
      return changed.result;
    }),
  };
}

async function loadState(database: WechatDatabaseSession): Promise<ManagedContentState> {
  const [assets, assetVersions, placements, placementVersions, reviews, publications, audits, pointers] = await Promise.all([
    loadCollection(database, COLLECTIONS.assets),
    loadCollection(database, COLLECTIONS.assetVersions),
    loadCollection(database, COLLECTIONS.placements),
    loadCollection(database, COLLECTIONS.placementVersions),
    loadCollection(database, COLLECTIONS.reviews),
    loadCollection(database, COLLECTIONS.publications),
    loadCollection(database, COLLECTIONS.audits),
    loadCollection(database, COLLECTIONS.currentPublications),
  ]);

  return parseManagedContentState({
    assets,
    assetVersions,
    placements,
    placementVersions,
    reviews,
    publications,
    audits,
    currentPublicationByPlacement: Object.fromEntries(pointers.map((pointer) => [
      String(pointer.placementId),
      pointer.publicationId,
    ])),
  });
}

async function loadCollection(database: WechatDatabaseSession, name: string): Promise<Array<Record<string, unknown>>> {
  const result = await database.collection(name).get();
  return result.data.map(({ _id: _ignored, ...document }) => document);
}

async function persistState(
  database: WechatDatabaseSession,
  previous: ManagedContentState,
  next: ManagedContentState,
): Promise<void> {
  await Promise.all([
    upsertAll(database, COLLECTIONS.assets, next.assets),
    upsertAll(database, COLLECTIONS.assetVersions, next.assetVersions),
    upsertAll(database, COLLECTIONS.placements, next.placements),
    upsertAll(database, COLLECTIONS.placementVersions, next.placementVersions),
    upsertAll(database, COLLECTIONS.reviews, next.reviews),
    upsertAll(database, COLLECTIONS.publications, next.publications),
    upsertAll(database, COLLECTIONS.audits, next.audits),
    persistPointers(database, previous.currentPublicationByPlacement, next.currentPublicationByPlacement),
  ]);
}

async function upsertAll(database: WechatDatabaseSession, collectionName: string, records: ReadonlyArray<{ id: string }>): Promise<void> {
  await Promise.all(records.map((record) => database.collection(collectionName).doc(record.id).set({
    data: { ...record },
  })));
}

async function persistPointers(
  database: WechatDatabaseSession,
  previous: Record<string, string>,
  next: Record<string, string>,
): Promise<void> {
  const collection = database.collection(COLLECTIONS.currentPublications);
  await Promise.all([
    ...Object.entries(next).map(([placementId, publicationId]) => collection.doc(placementId).set({
      data: { placementId, publicationId },
    })),
    ...Object.keys(previous)
      .filter((placementId) => next[placementId] === undefined)
      .map((placementId) => collection.doc(placementId).remove()),
  ]);
}
