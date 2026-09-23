import type {
  AuditEvent,
  ManagedContentState,
  ReviewRecord,
  TextbookPlacement,
  TextbookPlacementVersion,
  VocabularyAsset,
  VocabularyAssetVersion,
} from '../../shared/contracts/content-management';

export interface ManagedDraftBundle {
  id: string;
  asset: VocabularyAsset;
  assetVersion: VocabularyAssetVersion;
  placement: TextbookPlacement;
  placementVersion: TextbookPlacementVersion;
}

export function createDraftId(assetVersionId: string, placementVersionId: string): string {
  return `${assetVersionId}::${placementVersionId}`;
}

export function parseDraftId(draftId: string): [string, string] | undefined {
  const parts = draftId.split('::');
  return parts.length === 2 && parts[0] && parts[1]
    ? [parts[0], parts[1]]
    : undefined;
}

export interface ContentRepository {
  findAssetByNormalizedWord(word: string): Promise<VocabularyAsset | undefined>;
  getDraftBundle(draftId: string): Promise<ManagedDraftBundle | undefined>;
  saveDraftBundle(bundle: ManagedDraftBundle, expectedRevision?: number): Promise<void>;
  appendReview(review: ReviewRecord): Promise<void>;
  appendAudit(event: AuditEvent): Promise<void>;
  listState(): Promise<ManagedContentState>;
}

