import type { WorkflowStatus } from '../../../shared/contracts/content-management';

export const ASSET_FIELD_KEYS = [
  'word', 'baseMeaning', 'audio', 'mnemonicStory', 'image', 'distractors', 'correctionCandidates',
] as const;

export const PLACEMENT_FIELD_KEYS = [
  'textbookId', 'unitId', 'order', 'textbookMeaning', 'ageCopyOverride',
] as const;

export interface EditorFields {
  word: string;
  baseMeaning: string;
  mnemonicStory: string;
  textbookId: string;
  unitId: string;
  order: number;
  textbookMeaning: string;
  ageCopyOverride: string;
  distractors: string[];
  correctionCandidates: string[];
}

export function normalizeWordDisplay(word: string): string {
  return word.trim().toLocaleLowerCase('en-US');
}

export function validateEditorFields(fields: EditorFields): Partial<Record<keyof EditorFields, string>> {
  const errors: Partial<Record<keyof EditorFields, string>> = {};
  for (const key of ['word', 'baseMeaning', 'mnemonicStory', 'textbookId', 'unitId', 'textbookMeaning', 'ageCopyOverride'] as const) {
    if (!fields[key].trim()) errors[key] = '此项为必填项';
  }
  if (!Number.isInteger(fields.order) || fields.order <= 0) errors.order = '词序必须是大于 0 的整数';
  if (new Set(fields.distractors.map((item) => item.trim()).filter(Boolean)).size < 2) errors.distractors = '至少填写 2 个不同的干扰项';
  if (fields.correctionCandidates.every((item) => !item.trim())) errors.correctionCandidates = '至少填写 1 条纠音提示';
  return errors;
}

export type EditorAction = 'save' | 'preview' | 'submit' | 'approve' | 'reject' | 'publish' | 'withdraw' | 'rollback';

export function availableActions(status: WorkflowStatus, hasCurrentPublication: boolean): EditorAction[] {
  if (status === 'draft') return ['save', 'preview', 'submit'];
  if (status === 'in_review') return ['preview', 'approve', 'reject'];
  return hasCurrentPublication ? ['preview', 'withdraw', 'rollback'] : ['preview', 'publish'];
}

export function mapManagementError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  switch (code) {
    case 'REVISION_CONFLICT': return '内容已被更新，请刷新后核对最新版本再保存。';
    case 'UNAUTHORIZED': return '管理员身份已失效，请重新登录。';
    case 'VALIDATION_FAILED': return '内容未通过校验，请检查必填项、素材授权和审核状态。';
    case 'INVALID_STATE': return '当前状态不能执行此操作，请按流程完成上一阶段。';
    case 'NOT_FOUND': return '未找到目标内容，请返回列表刷新后重试。';
    case 'CORRUPT_LOCAL_CONTENT': return '本地内容已损坏，请先导出原始备份再恢复。';
    default: return '操作未完成，请检查网络后稍后重试。';
  }
}

export function validateHighRiskConfirmation(
  _action: 'withdraw' | 'rollback',
  reason: string,
  confirmed: boolean,
): { reason?: string; confirmation?: string } {
  return {
    ...(!reason.trim() ? { reason: '请填写操作原因' } : {}),
    ...(!confirmed ? { confirmation: '请确认已核对影响范围' } : {}),
  };
}
