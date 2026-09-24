import { describe, expect, it } from 'vitest';
import {
  ASSET_FIELD_KEYS,
  PLACEMENT_FIELD_KEYS,
  availableActions,
  mapManagementError,
  normalizeWordDisplay,
  validateEditorFields,
  validateHighRiskConfirmation,
} from '../../admin/src/view-model/content-editor';
import { previewSectionOrder } from '../../admin/src/view-model/content-preview';

describe('content editor workflow', () => {
  it('keeps reusable asset fields separate from textbook placement fields', () => {
    expect(ASSET_FIELD_KEYS).toEqual([
      'word', 'baseMeaning', 'audio', 'mnemonicStory', 'image', 'distractors', 'correctionCandidates',
    ]);
    expect(PLACEMENT_FIELD_KEYS).toEqual([
      'textbookId', 'unitId', 'order', 'textbookMeaning', 'ageCopyOverride',
    ]);
  });

  it('validates required editor fields and shows a normalized word', () => {
    expect(normalizeWordDisplay('  School ')).toBe('school');
    expect(validateEditorFields({
      word: '', baseMeaning: '', mnemonicStory: '', textbookId: '', unitId: '',
      order: 0, textbookMeaning: '', ageCopyOverride: '', distractors: [], correctionCandidates: [],
    })).toMatchObject({
      word: expect.any(String), baseMeaning: expect.any(String), textbookId: expect.any(String),
      order: expect.any(String), distractors: expect.any(String), correctionCandidates: expect.any(String),
    });
  });

  it('keeps the student preview in the complete learning order', () => {
    expect(previewSectionOrder).toEqual(['standard-audio', 'mnemonic', 'meaning-check', 'correction']);
  });

  it('offers only state-appropriate lifecycle actions', () => {
    expect(availableActions('draft', false)).toEqual(['save', 'preview', 'submit']);
    expect(availableActions('in_review', false)).toEqual(['preview', 'approve', 'reject']);
    expect(availableActions('approved', false)).toEqual(['preview', 'publish']);
    expect(availableActions('approved', true)).toEqual(['preview', 'withdraw', 'rollback']);
  });

  it('maps domain failures to actionable Chinese guidance', () => {
    expect(mapManagementError({ code: 'REVISION_CONFLICT' })).toContain('刷新');
    expect(mapManagementError({ code: 'UNAUTHORIZED' })).toContain('管理员');
    expect(mapManagementError(new Error('offline'))).toContain('稍后重试');
  });

  it('requires a reason and explicit confirmation for high-risk actions', () => {
    expect(validateHighRiskConfirmation('withdraw', '', false)).toMatchObject({ reason: expect.any(String), confirmation: expect.any(String) });
    expect(validateHighRiskConfirmation('rollback', '恢复已核对版本', true)).toEqual({});
  });
});
