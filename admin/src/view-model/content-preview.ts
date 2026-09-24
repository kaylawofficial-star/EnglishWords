import type { ContentPreview, ContentPreviewStep } from '../../../content-management/services/content-preview-projector';

export const previewSectionOrder: ContentPreviewStep['kind'][] = [
  'standard-audio', 'mnemonic', 'meaning-check', 'correction',
];

export function orderedPreviewSteps(preview: ContentPreview): ContentPreviewStep[] {
  return [...preview.steps].sort((left, right) =>
    previewSectionOrder.indexOf(left.kind) - previewSectionOrder.indexOf(right.kind));
}
