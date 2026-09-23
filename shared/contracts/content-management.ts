export type WorkflowStatus = 'draft' | 'in_review' | 'approved';
export type PublicationStatus = 'published' | 'withdrawn';
export type ReviewResult = 'approved' | 'rejected';
export type AuditAction =
  | 'created'
  | 'updated'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'withdrawn'
  | 'rolled_back';

export interface MediaReference {
  id: string;
  storageKey: string;
  mediaType: 'image' | 'audio';
  mimeType: string;
  byteSize: number;
  sha256: string;
  rightsSource: string;
  reviewed: boolean;
}

export interface VocabularyAsset {
  id: string;
  normalizedWord: string;
  createdAt: string;
}

export interface VocabularyAssetVersion {
  id: string;
  assetId: string;
  version: number;
  revision: number;
  status: WorkflowStatus;
  word: string;
  baseMeaning: string;
  audio: MediaReference;
  mnemonicStory: string;
  image: MediaReference;
  distractors: string[];
  correctionCandidates: string[];
  createdBy: string;
  createdAt: string;
}

export interface TextbookPlacement {
  id: string;
  assetId: string;
  textbookId: string;
  unitId: string;
}

export interface TextbookPlacementVersion {
  id: string;
  placementId: string;
  version: number;
  revision: number;
  status: WorkflowStatus;
  textbookMeaning: string;
  order: number;
  ageCopyOverride: string;
  createdBy: string;
  createdAt: string;
}

export interface ReviewChecklist {
  meaning: boolean;
  audio: boolean;
  mnemonic: boolean;
  ageAppropriate: boolean;
  mediaRights: boolean;
  distractors: boolean;
  pronunciationRisk: boolean;
}

export interface ReviewRecord {
  id: string;
  assetVersionId: string;
  placementVersionId: string;
  reviewerId: string;
  result: ReviewResult;
  checklist: ReviewChecklist;
  notes: string;
  reviewedAt: string;
}

export interface Publication {
  id: string;
  placementId: string;
  assetVersionId: string;
  placementVersionId: string;
  status: PublicationStatus;
  sequence: number;
  requestId: string;
  publishedBy: string;
  publishedAt: string;
  withdrawnBy?: string;
  withdrawnAt?: string;
  withdrawalReason?: string;
}

export interface AuditEvent {
  id: string;
  action: AuditAction;
  actorId: string;
  targetId: string;
  reason: string;
  createdAt: string;
}

export interface ManagedContentState {
  assets: VocabularyAsset[];
  assetVersions: VocabularyAssetVersion[];
  placements: TextbookPlacement[];
  placementVersions: TextbookPlacementVersion[];
  reviews: ReviewRecord[];
  publications: Publication[];
  audits: AuditEvent[];
  currentPublicationByPlacement: Record<string, string>;
}

