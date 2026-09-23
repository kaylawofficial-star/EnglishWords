import type { ManagedContentState, Publication } from '../../shared/contracts/content-management';
import type { Textbook, TextbookContent, Unit } from '../../shared/contracts/content';
import { parseTextbookContent } from '../../shared/validation/content';
import { ContentManagementError } from './content-errors';

export interface TextbookCatalog {
  textbooks: readonly Textbook[];
  units: readonly Unit[];
}

export function projectPublishedTextbook(
  state: ManagedContentState,
  textbookId: string,
  catalog: TextbookCatalog,
): TextbookContent {
  const publications = Object.values(state.currentPublicationByPlacement)
    .map((id) => state.publications.find((item) => item.id === id))
    .filter((item): item is Publication => item?.status === 'published');
  return project(state, publications, textbookId, catalog);
}

export function projectHistoricalPublication(
  state: ManagedContentState,
  publicationId: string,
  catalog: TextbookCatalog,
): TextbookContent {
  const publication = state.publications.find((item) => item.id === publicationId);
  if (!publication) throw new ContentManagementError('NOT_FOUND', 'Historical publication not found');
  const placement = state.placements.find((item) => item.id === publication.placementId);
  if (!placement) throw new ContentManagementError('NOT_FOUND', 'Historical placement not found');
  return project(state, [publication], placement.textbookId, catalog);
}

function project(
  state: ManagedContentState,
  publications: Publication[],
  textbookId: string,
  catalog: TextbookCatalog,
): TextbookContent {
  const textbook = catalog.textbooks.find((item) => item.id === textbookId);
  if (!textbook) throw new ContentManagementError('NOT_FOUND', 'Textbook not found');
  const units = catalog.units
    .filter((item) => item.textbookId === textbookId)
    .sort((a, b) => a.order - b.order);
  const entries = publications.flatMap((publication) => {
    const placement = state.placements.find((item) => item.id === publication.placementId);
    const assetVersion = state.assetVersions.find((item) => item.id === publication.assetVersionId);
    const placementVersion = state.placementVersions.find((item) => item.id === publication.placementVersionId);
    if (!placement || placement.textbookId !== textbookId || !assetVersion || !placementVersion) return [];
    return [{
      id: publication.id,
      unitId: placement.unitId,
      word: assetVersion.word,
      meaning: placementVersion.textbookMeaning,
      order: placementVersion.order,
      assetId: placement.assetId,
      assetVersionId: assetVersion.id,
      placementId: placement.id,
      placementVersionId: placementVersion.id,
      publicationId: publication.id,
      publishedAt: publication.publishedAt,
      audio: structuredClone(assetVersion.audio),
      mnemonicStory: assetVersion.mnemonicStory,
      image: structuredClone(assetVersion.image),
      distractors: [...assetVersion.distractors],
      correctionCandidates: [...assetVersion.correctionCandidates],
    }];
  }).sort((a, b) => a.order - b.order);
  return parseTextbookContent({ textbook, units, entries });
}
