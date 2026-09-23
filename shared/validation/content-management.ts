import type {
  AuditAction,
  AuditEvent,
  ManagedContentState,
  MediaReference,
  Publication,
  PublicationStatus,
  ReviewChecklist,
  ReviewRecord,
  ReviewResult,
  TextbookPlacement,
  TextbookPlacementVersion,
  VocabularyAsset,
  VocabularyAssetVersion,
  WorkflowStatus,
} from '../contracts/content-management';
import { ContentValidationError } from './content';

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ContentValidationError(path, 'expected an object');
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new ContentValidationError(path, 'expected an array');
  return value;
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ContentValidationError(path, 'expected a non-empty string');
  }
  return value;
}

function integer(value: unknown, path: string): number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new ContentValidationError(path, 'expected a positive integer');
  }
  return value as number;
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw new ContentValidationError(path, 'expected a boolean');
  return value;
}

function iso(value: unknown, path: string): string {
  const parsed = string(value, path);
  if (Number.isNaN(Date.parse(parsed))) throw new ContentValidationError(path, 'expected an ISO timestamp');
  return parsed;
}

function enumeration<T extends string>(value: unknown, path: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new ContentValidationError(path, `expected one of ${allowed.join(', ')}`);
  }
  return value as T;
}

function unique<T extends { id: string }>(items: T[], path: string): void {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (seen.has(item.id)) throw new ContentValidationError(`${path}[${index}].id`, `duplicate id ${item.id}`);
    seen.add(item.id);
  });
}

function stringList(value: unknown, path: string, minimum = 1): string[] {
  const values = array(value, path).map((item, index) => string(item, `${path}[${index}]`));
  if (new Set(values).size < minimum) {
    throw new ContentValidationError(path, `expected at least ${minimum} unique values`);
  }
  return values;
}

export function parseMediaReference(value: unknown, path: string): MediaReference {
  const item = record(value, path);
  const sha256 = string(item.sha256, `${path}.sha256`);
  if (!/^[a-f0-9]{64}$/i.test(sha256)) {
    throw new ContentValidationError(`${path}.sha256`, 'expected a SHA-256 checksum');
  }
  return {
    id: string(item.id, `${path}.id`),
    storageKey: string(item.storageKey, `${path}.storageKey`),
    mediaType: enumeration(item.mediaType, `${path}.mediaType`, ['image', 'audio']),
    mimeType: string(item.mimeType, `${path}.mimeType`),
    byteSize: integer(item.byteSize, `${path}.byteSize`),
    sha256,
    rightsSource: string(item.rightsSource, `${path}.rightsSource`),
    reviewed: boolean(item.reviewed, `${path}.reviewed`),
  };
}

function parseAsset(value: unknown, index: number): VocabularyAsset {
  const path = `assets[${index}]`; const item = record(value, path);
  return { id: string(item.id, `${path}.id`), normalizedWord: string(item.normalizedWord, `${path}.normalizedWord`), createdAt: iso(item.createdAt, `${path}.createdAt`) };
}

function parseAssetVersion(value: unknown, index: number): VocabularyAssetVersion {
  const path = `assetVersions[${index}]`; const item = record(value, path);
  return {
    id: string(item.id, `${path}.id`), assetId: string(item.assetId, `${path}.assetId`),
    version: integer(item.version, `${path}.version`), revision: integer(item.revision, `${path}.revision`),
    status: enumeration<WorkflowStatus>(item.status, `${path}.status`, ['draft', 'in_review', 'approved']),
    word: string(item.word, `${path}.word`), baseMeaning: string(item.baseMeaning, `${path}.baseMeaning`),
    audio: parseMediaReference(item.audio, `${path}.audio`), mnemonicStory: string(item.mnemonicStory, `${path}.mnemonicStory`),
    image: parseMediaReference(item.image, `${path}.image`), distractors: stringList(item.distractors, `${path}.distractors`, 2),
    correctionCandidates: stringList(item.correctionCandidates, `${path}.correctionCandidates`),
    createdBy: string(item.createdBy, `${path}.createdBy`), createdAt: iso(item.createdAt, `${path}.createdAt`),
  };
}

function parsePlacement(value: unknown, index: number): TextbookPlacement {
  const path = `placements[${index}]`; const item = record(value, path);
  return { id: string(item.id, `${path}.id`), assetId: string(item.assetId, `${path}.assetId`), textbookId: string(item.textbookId, `${path}.textbookId`), unitId: string(item.unitId, `${path}.unitId`) };
}

function parsePlacementVersion(value: unknown, index: number): TextbookPlacementVersion {
  const path = `placementVersions[${index}]`; const item = record(value, path);
  return {
    id: string(item.id, `${path}.id`), placementId: string(item.placementId, `${path}.placementId`),
    version: integer(item.version, `${path}.version`), revision: integer(item.revision, `${path}.revision`),
    status: enumeration<WorkflowStatus>(item.status, `${path}.status`, ['draft', 'in_review', 'approved']),
    textbookMeaning: string(item.textbookMeaning, `${path}.textbookMeaning`), order: integer(item.order, `${path}.order`),
    ageCopyOverride: string(item.ageCopyOverride, `${path}.ageCopyOverride`), createdBy: string(item.createdBy, `${path}.createdBy`),
    createdAt: iso(item.createdAt, `${path}.createdAt`),
  };
}

function parseChecklist(value: unknown, path: string): ReviewChecklist {
  const item = record(value, path);
  return {
    meaning: boolean(item.meaning, `${path}.meaning`), audio: boolean(item.audio, `${path}.audio`),
    mnemonic: boolean(item.mnemonic, `${path}.mnemonic`), ageAppropriate: boolean(item.ageAppropriate, `${path}.ageAppropriate`),
    mediaRights: boolean(item.mediaRights, `${path}.mediaRights`), distractors: boolean(item.distractors, `${path}.distractors`),
    pronunciationRisk: boolean(item.pronunciationRisk, `${path}.pronunciationRisk`),
  };
}

function parseReview(value: unknown, index: number): ReviewRecord {
  const path = `reviews[${index}]`; const item = record(value, path);
  return {
    id: string(item.id, `${path}.id`), assetVersionId: string(item.assetVersionId, `${path}.assetVersionId`),
    placementVersionId: string(item.placementVersionId, `${path}.placementVersionId`), reviewerId: string(item.reviewerId, `${path}.reviewerId`),
    result: enumeration<ReviewResult>(item.result, `${path}.result`, ['approved', 'rejected']),
    checklist: parseChecklist(item.checklist, `${path}.checklist`), notes: string(item.notes, `${path}.notes`),
    reviewedAt: iso(item.reviewedAt, `${path}.reviewedAt`),
  };
}

function parsePublication(value: unknown, index: number): Publication {
  const path = `publications[${index}]`; const item = record(value, path);
  const publication: Publication = {
    id: string(item.id, `${path}.id`), placementId: string(item.placementId, `${path}.placementId`),
    assetVersionId: string(item.assetVersionId, `${path}.assetVersionId`), placementVersionId: string(item.placementVersionId, `${path}.placementVersionId`),
    status: enumeration<PublicationStatus>(item.status, `${path}.status`, ['published', 'withdrawn']),
    sequence: integer(item.sequence, `${path}.sequence`), requestId: string(item.requestId, `${path}.requestId`),
    publishedBy: string(item.publishedBy, `${path}.publishedBy`), publishedAt: iso(item.publishedAt, `${path}.publishedAt`),
  };
  if (item.withdrawnBy !== undefined) publication.withdrawnBy = string(item.withdrawnBy, `${path}.withdrawnBy`);
  if (item.withdrawnAt !== undefined) publication.withdrawnAt = iso(item.withdrawnAt, `${path}.withdrawnAt`);
  if (item.withdrawalReason !== undefined) publication.withdrawalReason = string(item.withdrawalReason, `${path}.withdrawalReason`);
  return publication;
}

function parseAudit(value: unknown, index: number): AuditEvent {
  const path = `audits[${index}]`; const item = record(value, path);
  return {
    id: string(item.id, `${path}.id`), action: enumeration<AuditAction>(item.action, `${path}.action`, ['created', 'updated', 'submitted', 'approved', 'rejected', 'published', 'withdrawn', 'rolled_back']),
    actorId: string(item.actorId, `${path}.actorId`), targetId: string(item.targetId, `${path}.targetId`),
    reason: string(item.reason, `${path}.reason`), createdAt: iso(item.createdAt, `${path}.createdAt`),
  };
}

export function parseManagedContentState(value: unknown): ManagedContentState {
  const root = record(value, 'state');
  const state: ManagedContentState = {
    assets: array(root.assets, 'assets').map(parseAsset), assetVersions: array(root.assetVersions, 'assetVersions').map(parseAssetVersion),
    placements: array(root.placements, 'placements').map(parsePlacement), placementVersions: array(root.placementVersions, 'placementVersions').map(parsePlacementVersion),
    reviews: array(root.reviews, 'reviews').map(parseReview), publications: array(root.publications, 'publications').map(parsePublication),
    audits: array(root.audits, 'audits').map(parseAudit), currentPublicationByPlacement: {},
  };
  unique(state.assets, 'assets');
  unique(state.assetVersions, 'assetVersions');
  unique(state.placements, 'placements');
  unique(state.placementVersions, 'placementVersions');
  unique(state.reviews, 'reviews');
  unique(state.publications, 'publications');
  unique(state.audits, 'audits');
  const pointers = record(root.currentPublicationByPlacement, 'currentPublicationByPlacement');
  for (const [placementId, publicationId] of Object.entries(pointers)) state.currentPublicationByPlacement[placementId] = string(publicationId, `currentPublicationByPlacement.${placementId}`);

  const assetIds = new Set(state.assets.map((item) => item.id));
  const assetsByVersion = new Map(state.assetVersions.map((item) => [item.id, item]));
  const placementsById = new Map(state.placements.map((item) => [item.id, item]));
  const placementsByVersion = new Map(state.placementVersions.map((item) => [item.id, item]));
  const publicationsById = new Map(state.publications.map((item) => [item.id, item]));
  state.assetVersions.forEach((item, index) => { if (!assetIds.has(item.assetId)) throw new ContentValidationError(`assetVersions[${index}].assetId`, `unknown asset ${item.assetId}`); });
  state.placements.forEach((item, index) => { if (!assetIds.has(item.assetId)) throw new ContentValidationError(`placements[${index}].assetId`, `unknown asset ${item.assetId}`); });
  state.placementVersions.forEach((item, index) => { if (!placementsById.has(item.placementId)) throw new ContentValidationError(`placementVersions[${index}].placementId`, `unknown placement ${item.placementId}`); });
  state.reviews.forEach((item, index) => {
    const assetVersion = assetsByVersion.get(item.assetVersionId); const placementVersion = placementsByVersion.get(item.placementVersionId);
    if (!assetVersion) throw new ContentValidationError(`reviews[${index}].assetVersionId`, `unknown asset version ${item.assetVersionId}`);
    if (!placementVersion) throw new ContentValidationError(`reviews[${index}].placementVersionId`, `unknown placement version ${item.placementVersionId}`);
    const placement = placementsById.get(placementVersion.placementId)!;
    if (placement.assetId !== assetVersion.assetId) throw new ContentValidationError(`reviews[${index}]`, 'version pair belongs to different assets');
  });
  state.publications.forEach((item, index) => {
    const placement = placementsById.get(item.placementId); const assetVersion = assetsByVersion.get(item.assetVersionId); const placementVersion = placementsByVersion.get(item.placementVersionId);
    if (!placement || !assetVersion || !placementVersion || placementVersion.placementId !== item.placementId || placement.assetId !== assetVersion.assetId) {
      throw new ContentValidationError(`publications[${index}]`, 'publication references a mismatched version pair');
    }
    if (!state.reviews.some((review) => review.assetVersionId === item.assetVersionId && review.placementVersionId === item.placementVersionId && review.result === 'approved')) {
      throw new ContentValidationError(`publications[${index}]`, 'publication requires an approved review');
    }
  });
  for (const [placementId, publicationId] of Object.entries(state.currentPublicationByPlacement)) {
    const publication = publicationsById.get(publicationId);
    if (!publication || publication.placementId !== placementId || publication.status !== 'published') {
      throw new ContentValidationError(`currentPublicationByPlacement.${placementId}`, 'expected a current published record');
    }
  }
  return state;
}
