import type {
  MediaReference,
  ReviewChecklist,
  ReviewRecord,
  VocabularyAssetVersion,
  TextbookPlacementVersion,
  Publication,
} from '../../shared/contracts/content-management';
import type { ContentRepository, ManagedDraftBundle } from '../repositories/content-repository';
import { createDraftId } from '../repositories/content-repository';
import { ContentManagementError } from './content-errors';
import { projectContentPreview } from './content-preview-projector';
import { LocalMediaStorage, type MediaStorage } from '../media/media-storage';

export interface ContentFields {
  baseMeaning: string;
  audio: MediaReference;
  mnemonicStory: string;
  image: MediaReference;
  distractors: string[];
  correctionCandidates: string[];
}

export interface CreateDraftInput {
  actorId: string;
  word: string;
  textbookId: string;
  unitId: string;
  textbookMeaning: string;
  order: number;
  ageCopyOverride: string;
  content: ContentFields;
}

export interface UpdateDraftChanges extends Partial<ContentFields> {
  word?: string;
  textbookMeaning?: string;
  order?: number;
  ageCopyOverride?: string;
}

interface ServiceDependencies {
  now: () => string;
  createId: (prefix: string) => string;
  mediaStorage?: Pick<MediaStorage, 'verify'>;
}

export function normalizeWord(word: string): string {
  const normalized = word.trim().toLocaleLowerCase('en-US');
  if (!normalized) throw new ContentManagementError('VALIDATION_FAILED', 'Word is required');
  return normalized;
}

export class ContentManagementService {
  private readonly mediaStorage: Pick<MediaStorage, 'verify'>;

  constructor(
    private readonly repository: ContentRepository,
    private readonly dependencies: ServiceDependencies,
  ) {
    this.mediaStorage = dependencies.mediaStorage ?? new LocalMediaStorage(dependencies.now);
  }

  async createDraft(input: CreateDraftInput): Promise<ManagedDraftBundle> {
    validateCreateInput(input);
    const normalizedWord = normalizeWord(input.word);
    const state = await this.repository.listState();
    const existingAsset = await this.repository.findAssetByNormalizedWord(normalizedWord);
    const asset = existingAsset ?? {
      id: this.dependencies.createId('asset'), normalizedWord, createdAt: this.dependencies.now(),
    };
    const assetVersionNumber = 1 + Math.max(0, ...state.assetVersions.filter((item) => item.assetId === asset.id).map((item) => item.version));
    const assetVersionId = this.dependencies.createId('asset-version');
    const existingPlacement = state.placements.find((item) =>
      item.assetId === asset.id && item.textbookId === input.textbookId && item.unitId === input.unitId);
    const placementId = existingPlacement?.id ?? this.dependencies.createId('placement');
    const placementVersionNumber = 1 + Math.max(0, ...state.placementVersions
      .filter((item) => item.placementId === placementId)
      .map((item) => item.version));
    const placementVersionId = this.dependencies.createId('placement-version');
    const bundle: ManagedDraftBundle = {
      id: createDraftId(assetVersionId, placementVersionId),
      asset,
      assetVersion: {
        id: assetVersionId, assetId: asset.id, version: assetVersionNumber, revision: 1,
        status: 'draft', word: input.word.trim(), baseMeaning: input.content.baseMeaning,
        audio: structuredClone(input.content.audio), mnemonicStory: input.content.mnemonicStory,
        image: structuredClone(input.content.image), distractors: [...input.content.distractors],
        correctionCandidates: [...input.content.correctionCandidates], createdBy: input.actorId,
        createdAt: this.dependencies.now(),
      },
      placement: existingPlacement ?? { id: placementId, assetId: asset.id, textbookId: input.textbookId, unitId: input.unitId },
      placementVersion: {
        id: placementVersionId, placementId, version: placementVersionNumber, revision: 1, status: 'draft',
        textbookMeaning: input.textbookMeaning, order: input.order,
        ageCopyOverride: input.ageCopyOverride, createdBy: input.actorId, createdAt: this.dependencies.now(),
      },
    };
    await this.repository.saveDraftBundle(bundle);
    await this.audit('created', input.actorId, bundle.id, 'Created draft');
    return structuredClone(bundle);
  }

  async getDraft(draftId: string): Promise<ManagedDraftBundle> {
    const bundle = await this.repository.getDraftBundle(draftId);
    if (!bundle) throw new ContentManagementError('NOT_FOUND', 'Draft not found');
    return bundle;
  }

  async listContent(filters: { word?: string; textbookId?: string; unitId?: string; status?: string } = {}) {
    const state = await this.repository.listState();
    return state.placementVersions.flatMap((placementVersion) => {
      const placement = state.placements.find((item) => item.id === placementVersion.placementId);
      if (!placement) return [];
      const asset = state.assets.find((item) => item.id === placement.assetId);
      const assetVersion = [...state.assetVersions].filter((item) => item.assetId === asset?.id).sort((a, b) => b.version - a.version)[0];
      if (!asset || !assetVersion) return [];
      if (filters.word && !asset.normalizedWord.includes(normalizeWord(filters.word))) return [];
      if (filters.textbookId && placement.textbookId !== filters.textbookId) return [];
      if (filters.unitId && placement.unitId !== filters.unitId) return [];
      if (filters.status && placementVersion.status !== filters.status) return [];
      return [{
        draftId: createDraftId(assetVersion.id, placementVersion.id), placementId: placement.id,
        word: assetVersion.word, textbookId: placement.textbookId, unitId: placement.unitId,
        status: placementVersion.status,
        currentPublicationId: state.currentPublicationByPlacement[placement.id] ?? null,
      }];
    });
  }

  async previewDraft(draftId: string) {
    return projectContentPreview(await this.getDraft(draftId));
  }

  async getHistory(draftId: string) {
    const bundle = await this.getDraft(draftId);
    const state = await this.repository.listState();
    const publications = state.publications.filter((item) => item.placementId === bundle.placement.id);
    const publicationIds = new Set(publications.map((item) => item.id));
    return {
      assetVersions: state.assetVersions.filter((item) => item.assetId === bundle.asset.id),
      placementVersions: state.placementVersions.filter((item) => item.placementId === bundle.placement.id),
      reviews: state.reviews.filter((item) => item.assetVersionId === bundle.assetVersion.id || item.placementVersionId === bundle.placementVersion.id),
      publications,
      audits: state.audits.filter((item) => item.targetId === bundle.id || publicationIds.has(item.targetId)),
      currentPublicationId: state.currentPublicationByPlacement[bundle.placement.id] ?? null,
      placementId: bundle.placement.id,
    };
  }

  async updateDraft(input: { actorId: string; draftId: string; expectedRevision: number; changes: UpdateDraftChanges }) {
    const bundle = await this.getDraft(input.draftId);
    requireStatus(bundle, 'draft');
    const next = structuredClone(bundle);
    applyChanges(next, input.changes);
    next.assetVersion.revision += 1;
    next.placementVersion.revision += 1;
    await this.repository.saveDraftBundle(next, input.expectedRevision);
    await this.audit('updated', input.actorId, next.id, 'Updated draft');
    return next;
  }

  async submitForReview(input: { actorId: string; draftId: string; expectedRevision: number }) {
    const bundle = await this.getDraft(input.draftId);
    requireStatus(bundle, 'draft');
    const next = withStatus(bundle, 'in_review');
    await this.repository.saveDraftBundle(next, input.expectedRevision);
    await this.audit('submitted', input.actorId, next.id, 'Submitted for review');
    return next;
  }

  async approve(input: { actorId: string; draftId: string; checklist: ReviewChecklist; notes: string }) {
    if (!Object.values(input.checklist).every(Boolean)) {
      throw new ContentManagementError('VALIDATION_FAILED', 'Every review checklist item must pass');
    }
    return this.finishReview(input, 'approved');
  }

  async reject(input: { actorId: string; draftId: string; checklist: ReviewChecklist; notes: string }) {
    return this.finishReview(input, 'rejected');
  }

  async publish(input: { actorId: string; draftId: string; requestId: string }): Promise<Publication> {
    const existing = await this.repository.findPublicationByRequestId(input.requestId);
    if (existing) return existing;
    const bundle = await this.getDraft(input.draftId);
    if (bundle.assetVersion.status !== 'approved' || bundle.placementVersion.status !== 'approved') {
      throw new ContentManagementError('INVALID_STATE', 'Only approved content can be published');
    }
    const state = await this.repository.listState();
    const approved = state.reviews.some((review) =>
      review.assetVersionId === bundle.assetVersion.id &&
      review.placementVersionId === bundle.placementVersion.id &&
      review.result === 'approved',
    );
    if (!approved || !bundle.assetVersion.audio.reviewed || !bundle.assetVersion.image.reviewed || new Set(bundle.assetVersion.distractors).size < 2) {
      throw new ContentManagementError('VALIDATION_FAILED', 'Content is incomplete or lacks approval');
    }
    await this.mediaStorage.verify(bundle.assetVersion.audio);
    await this.mediaStorage.verify(bundle.assetVersion.image);
    const publication: Publication = {
      id: this.dependencies.createId('publication'), placementId: bundle.placement.id,
      assetVersionId: bundle.assetVersion.id, placementVersionId: bundle.placementVersion.id,
      status: 'published', sequence: 1 + state.publications.filter((item) => item.placementId === bundle.placement.id).length,
      requestId: input.requestId, publishedBy: input.actorId, publishedAt: this.dependencies.now(),
    };
    const currentId = state.currentPublicationByPlacement[bundle.placement.id] ?? null;
    return this.repository.publishAtomically({
      publication,
      expectedCurrentPublicationId: currentId,
      audit: { id: this.dependencies.createId('audit'), action: 'published', actorId: input.actorId, targetId: publication.id, reason: 'Published approved content', createdAt: this.dependencies.now() },
    });
  }

  async withdraw(input: { actorId: string; placementId: string; reason: string }): Promise<void> {
    if (!input.reason.trim()) throw new ContentManagementError('VALIDATION_FAILED', 'Withdrawal reason is required');
    const state = await this.repository.listState();
    const publicationId = state.currentPublicationByPlacement[input.placementId];
    if (!publicationId) throw new ContentManagementError('NOT_FOUND', 'Current publication not found');
    await this.repository.withdrawAtomically({
      placementId: input.placementId, publicationId, actorId: input.actorId,
      reason: input.reason, withdrawnAt: this.dependencies.now(),
      audit: { id: this.dependencies.createId('audit'), action: 'withdrawn', actorId: input.actorId, targetId: publicationId, reason: input.reason, createdAt: this.dependencies.now() },
    });
  }

  async rollback(input: { actorId: string; publicationId: string; requestId: string; reason: string }): Promise<Publication> {
    const existing = await this.repository.findPublicationByRequestId(input.requestId);
    if (existing) return existing;
    const historical = await this.repository.getPublication(input.publicationId);
    if (!historical) throw new ContentManagementError('NOT_FOUND', 'Historical publication not found');
    const state = await this.repository.listState();
    const publication: Publication = {
      id: this.dependencies.createId('publication'), placementId: historical.placementId,
      assetVersionId: historical.assetVersionId, placementVersionId: historical.placementVersionId,
      status: 'published', sequence: 1 + state.publications.filter((item) => item.placementId === historical.placementId).length,
      requestId: input.requestId, publishedBy: input.actorId, publishedAt: this.dependencies.now(),
    };
    return this.repository.rollbackAtomically({
      publication,
      expectedCurrentPublicationId: state.currentPublicationByPlacement[historical.placementId] ?? null,
      audit: { id: this.dependencies.createId('audit'), action: 'rolled_back', actorId: input.actorId, targetId: publication.id, reason: input.reason, createdAt: this.dependencies.now() },
    });
  }

  async getPublicationHistory(placementId: string): Promise<Publication[]> {
    return (await this.repository.listState()).publications.filter((item) => item.placementId === placementId);
  }

  async resolveHistoricalPublication(publicationId: string): Promise<Publication> {
    const publication = await this.repository.getPublication(publicationId);
    if (!publication) throw new ContentManagementError('NOT_FOUND', 'Historical publication not found');
    return publication;
  }

  private async finishReview(input: { actorId: string; draftId: string; checklist: ReviewChecklist; notes: string }, result: 'approved' | 'rejected') {
    if (!input.notes.trim()) throw new ContentManagementError('VALIDATION_FAILED', 'Review notes are required');
    const bundle = await this.getDraft(input.draftId);
    requireStatus(bundle, 'in_review');
    const next = withStatus(bundle, result === 'approved' ? 'approved' : 'draft');
    if (result === 'approved') {
      next.assetVersion.audio.reviewed = true;
      next.assetVersion.image.reviewed = true;
    }
    await this.repository.saveDraftBundle(next, bundle.assetVersion.revision);
    const review: ReviewRecord = {
      id: this.dependencies.createId('review'), assetVersionId: next.assetVersion.id,
      placementVersionId: next.placementVersion.id, reviewerId: input.actorId,
      result, checklist: structuredClone(input.checklist), notes: input.notes,
      reviewedAt: this.dependencies.now(),
    };
    await this.repository.appendReview(review);
    await this.audit(result, input.actorId, next.id, input.notes);
    return next;
  }

  private async audit(action: 'created' | 'updated' | 'submitted' | 'approved' | 'rejected', actorId: string, targetId: string, reason: string) {
    await this.repository.appendAudit({ id: this.dependencies.createId('audit'), action, actorId, targetId, reason, createdAt: this.dependencies.now() });
  }
}

function validateCreateInput(input: CreateDraftInput): void {
  if (!input.actorId.trim() || !input.textbookId.trim() || !input.unitId.trim() || !input.textbookMeaning.trim() || !input.ageCopyOverride.trim()) {
    throw new ContentManagementError('VALIDATION_FAILED', 'Required draft fields are missing');
  }
  if (!Number.isInteger(input.order) || input.order <= 0) throw new ContentManagementError('VALIDATION_FAILED', 'Order must be positive');
}

function requireStatus(bundle: ManagedDraftBundle, status: 'draft' | 'in_review'): void {
  if (bundle.assetVersion.status !== status || bundle.placementVersion.status !== status) {
    throw new ContentManagementError('INVALID_STATE', `Expected ${status} content`);
  }
}

function withStatus(bundle: ManagedDraftBundle, status: 'draft' | 'in_review' | 'approved'): ManagedDraftBundle {
  const next = structuredClone(bundle);
  next.assetVersion.status = status; next.assetVersion.revision += 1;
  next.placementVersion.status = status; next.placementVersion.revision += 1;
  return next;
}

function applyChanges(bundle: ManagedDraftBundle, changes: UpdateDraftChanges): void {
  const asset = bundle.assetVersion; const placement = bundle.placementVersion;
  if (changes.word !== undefined) asset.word = changes.word.trim();
  if (changes.baseMeaning !== undefined) asset.baseMeaning = changes.baseMeaning;
  if (changes.audio !== undefined) asset.audio = structuredClone(changes.audio);
  if (changes.mnemonicStory !== undefined) asset.mnemonicStory = changes.mnemonicStory;
  if (changes.image !== undefined) asset.image = structuredClone(changes.image);
  if (changes.distractors !== undefined) asset.distractors = [...changes.distractors];
  if (changes.correctionCandidates !== undefined) asset.correctionCandidates = [...changes.correctionCandidates];
  if (changes.textbookMeaning !== undefined) placement.textbookMeaning = changes.textbookMeaning;
  if (changes.order !== undefined) placement.order = changes.order;
  if (changes.ageCopyOverride !== undefined) placement.ageCopyOverride = changes.ageCopyOverride;
}
