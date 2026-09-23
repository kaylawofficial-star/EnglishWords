import { parseManagedContentState } from '../../shared/validation/content-management';
import { ContentManagementError } from '../services/content-errors';
import { createEmptyManagedContentState } from '../testing/create-managed-content-fixture';
import {
  createDraftId,
  parseDraftId,
  type ContentRepository,
  type ManagedDraftBundle,
  type PublishTransactionInput,
  type WithdrawTransactionInput,
} from './content-repository';
import type {
  AuditEvent,
  ManagedContentState,
  ReviewRecord,
} from '../../shared/contracts/content-management';

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryContentRepository implements ContentRepository {
  private state: ManagedContentState;

  constructor(initialState: ManagedContentState = createEmptyManagedContentState()) {
    this.state = clone(parseManagedContentState(initialState));
  }

  async findAssetByNormalizedWord(word: string) {
    const found = this.state.assets.find((asset) => asset.normalizedWord === word);
    return found ? clone(found) : undefined;
  }

  async getDraftBundle(draftId: string): Promise<ManagedDraftBundle | undefined> {
    const ids = parseDraftId(draftId);
    if (!ids) return undefined;
    const [assetVersionId, placementVersionId] = ids;
    const assetVersion = this.state.assetVersions.find((item) => item.id === assetVersionId);
    const placementVersion = this.state.placementVersions.find((item) => item.id === placementVersionId);
    if (!assetVersion || !placementVersion) return undefined;
    const asset = this.state.assets.find((item) => item.id === assetVersion.assetId);
    const placement = this.state.placements.find((item) => item.id === placementVersion.placementId);
    if (!asset || !placement || placement.assetId !== asset.id) return undefined;
    return clone({ id: createDraftId(assetVersion.id, placementVersion.id), asset, assetVersion, placement, placementVersion });
  }

  async saveDraftBundle(bundle: ManagedDraftBundle, expectedRevision?: number): Promise<void> {
    const next = clone(this.state);
    const currentAssetVersion = next.assetVersions.find((item) => item.id === bundle.assetVersion.id);
    const currentPlacementVersion = next.placementVersions.find((item) => item.id === bundle.placementVersion.id);
    if (expectedRevision !== undefined) {
      const currentRevision = Math.max(currentAssetVersion?.revision ?? 0, currentPlacementVersion?.revision ?? 0);
      if (!currentAssetVersion || !currentPlacementVersion || currentRevision !== expectedRevision) {
        throw new ContentManagementError('REVISION_CONFLICT', 'Draft changed in another editor', { currentRevision });
      }
    } else if (currentAssetVersion || currentPlacementVersion) {
      throw new ContentManagementError('DUPLICATE', 'Draft version already exists');
    }

    if (!next.assets.some((item) => item.id === bundle.asset.id)) next.assets.push(clone(bundle.asset));
    if (!next.placements.some((item) => item.id === bundle.placement.id)) next.placements.push(clone(bundle.placement));
    replaceOrPush(next.assetVersions, clone(bundle.assetVersion));
    replaceOrPush(next.placementVersions, clone(bundle.placementVersion));
    this.state = clone(parseManagedContentState(next));
  }

  async appendReview(review: ReviewRecord): Promise<void> {
    const next = clone(this.state);
    next.reviews.push(clone(review));
    this.state = clone(parseManagedContentState(next));
  }

  async appendAudit(event: AuditEvent): Promise<void> {
    const next = clone(this.state);
    next.audits.push(clone(event));
    this.state = clone(parseManagedContentState(next));
  }

  async listState(): Promise<ManagedContentState> {
    return clone(this.state);
  }

  async findPublicationByRequestId(requestId: string) {
    const found = this.state.publications.find((item) => item.requestId === requestId);
    return found ? clone(found) : undefined;
  }

  async getPublication(publicationId: string) {
    const found = this.state.publications.find((item) => item.id === publicationId);
    return found ? clone(found) : undefined;
  }

  async publishAtomically(input: PublishTransactionInput) {
    return this.applyPublication(input);
  }

  async rollbackAtomically(input: PublishTransactionInput) {
    return this.applyPublication(input);
  }

  async withdrawAtomically(input: WithdrawTransactionInput): Promise<void> {
    const next = clone(this.state);
    const currentId = next.currentPublicationByPlacement[input.placementId];
    if (currentId !== input.publicationId) {
      throw new ContentManagementError('REVISION_CONFLICT', 'Current publication changed');
    }
    const publication = next.publications.find((item) => item.id === input.publicationId);
    if (!publication || publication.status !== 'published') {
      throw new ContentManagementError('NOT_FOUND', 'Current publication not found');
    }
    delete next.currentPublicationByPlacement[input.placementId];
    next.audits.push(clone(input.audit));
    this.state = clone(parseManagedContentState(next));
  }

  private applyPublication(input: PublishTransactionInput) {
    const existing = this.state.publications.find((item) => item.requestId === input.publication.requestId);
    if (existing) return Promise.resolve(clone(existing));
    const next = clone(this.state);
    const currentId = next.currentPublicationByPlacement[input.publication.placementId] ?? null;
    if (currentId !== input.expectedCurrentPublicationId) {
      throw new ContentManagementError('REVISION_CONFLICT', 'Current publication changed');
    }
    next.publications.push(clone(input.publication));
    next.currentPublicationByPlacement[input.publication.placementId] = input.publication.id;
    next.audits.push(clone(input.audit));
    this.state = clone(parseManagedContentState(next));
    return Promise.resolve(clone(input.publication));
  }
}

function replaceOrPush<T extends { id: string }>(items: T[], item: T): void {
  const index = items.findIndex((candidate) => candidate.id === item.id);
  if (index === -1) items.push(item);
  else items[index] = item;
}
