import type {
  AuditEvent,
  ManagedContentState,
  ReviewRecord,
  TextbookPlacement,
  TextbookPlacementVersion,
  VocabularyAsset,
  VocabularyAssetVersion,
  Publication,
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
  publishAtomically(input: PublishTransactionInput): Promise<Publication>;
  withdrawAtomically(input: WithdrawTransactionInput): Promise<void>;
  rollbackAtomically(input: PublishTransactionInput): Promise<Publication>;
  findPublicationByRequestId(requestId: string): Promise<Publication | undefined>;
  getPublication(publicationId: string): Promise<Publication | undefined>;
}

export interface PublishTransactionInput {
  publication: Publication;
  audit: AuditEvent;
  expectedCurrentPublicationId: string | null;
}

export interface WithdrawTransactionInput {
  placementId: string;
  publicationId: string;
  actorId: string;
  reason: string;
  withdrawnAt: string;
  audit: AuditEvent;
}
