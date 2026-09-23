export type SchoolStage = 'primary' | 'junior';
export type SchoolTerm = 'first' | 'second';

export interface Textbook {
  id: string;
  edition: string;
  year: number;
  stage: SchoolStage;
  grade: number;
  term: SchoolTerm;
  displayName: string;
}

export interface Unit {
  id: string;
  textbookId: string;
  name: string;
  order: number;
}

export interface VocabularyEntry {
  id: string;
  unitId: string;
  word: string;
  meaning: string;
  order: number;
}

export interface PublishedVocabularyEntry extends VocabularyEntry {
  assetId: string;
  assetVersionId: string;
  placementId: string;
  placementVersionId: string;
  publicationId: string;
  publishedAt: string;
  audio: MediaReference;
  mnemonicStory: string;
  image: MediaReference;
  distractors: string[];
  correctionCandidates: string[];
}

export interface TextbookContent {
  textbook: Textbook;
  units: Unit[];
  entries: PublishedVocabularyEntry[];
}

export type ContentErrorCode =
  | 'NOT_FOUND'
  | 'UNAVAILABLE'
  | 'INVALID_RESPONSE';

export type ContentServiceResponse =
  | { ok: true; data: TextbookContent }
  | {
      ok: false;
      error: { code: ContentErrorCode; message: string };
    };
import type { MediaReference } from './content-management';
