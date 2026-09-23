import type { MediaReference } from '../../shared/contracts/content-management';
import type { ManagedDraftBundle } from '../repositories/content-repository';

export type ContentPreviewStep =
  | { kind: 'standard-audio'; audio: MediaReference }
  | { kind: 'mnemonic'; story: string; image: MediaReference }
  | { kind: 'meaning-check'; meaning: string; distractors: string[] }
  | { kind: 'correction'; candidates: string[] };

export interface ContentPreview {
  draftId: string;
  steps: ContentPreviewStep[];
}

export function projectContentPreview(bundle: ManagedDraftBundle): ContentPreview {
  return {
    draftId: bundle.id,
    steps: [
      { kind: 'standard-audio', audio: structuredClone(bundle.assetVersion.audio) },
      { kind: 'mnemonic', story: bundle.assetVersion.mnemonicStory, image: structuredClone(bundle.assetVersion.image) },
      { kind: 'meaning-check', meaning: bundle.placementVersion.textbookMeaning, distractors: [...bundle.assetVersion.distractors] },
      { kind: 'correction', candidates: [...bundle.assetVersion.correctionCandidates] },
    ],
  };
}

