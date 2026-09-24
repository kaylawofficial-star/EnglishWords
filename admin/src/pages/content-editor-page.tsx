import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import type { MediaReference, ReviewChecklist, WorkflowStatus } from '../../../shared/contracts/content-management';
import type { ManagedDraftBundle } from '../../../content-management/repositories/content-repository';
import type { ContentManagementGateway } from '../gateway/content-management-gateway';
import { availableActions, mapManagementError, normalizeWordDisplay, validateEditorFields, type EditorFields } from '../view-model/content-editor';

interface EditorPageProps {
  gateway: ContentManagementGateway;
  draftId?: string | undefined;
  onBack: () => void;
  onSaved: (draftId: string) => void;
  onPreview: (draftId: string) => void;
}

interface EditorForm extends EditorFields {
  audio?: MediaReference;
  image?: MediaReference;
}

const emptyForm: EditorForm = {
  word: '', baseMeaning: '', mnemonicStory: '', textbookId: '', unitId: '', order: 1,
  textbookMeaning: '', ageCopyOverride: '', distractors: ['', '', ''], correctionCandidates: [''],
};

const completeChecklist: ReviewChecklist = {
  meaning: true, audio: true, mnemonic: true, ageAppropriate: true,
  mediaRights: true, distractors: true, pronunciationRisk: true,
};

export function ContentEditorPage({ gateway, draftId, onBack, onSaved, onPreview }: EditorPageProps) {
  const [form, setForm] = useState<EditorForm>(emptyForm);
  const [bundle, setBundle] = useState<ManagedDraftBundle>();
  const [errors, setErrors] = useState<Partial<Record<keyof EditorFields | 'audio' | 'image', string>>>({});
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('内容与教材及素材授权均已核对。');
  const status: WorkflowStatus = bundle?.assetVersion.status ?? 'draft';
  const actions = useMemo(() => availableActions(status, false), [status]);

  useEffect(() => {
    if (!draftId) return;
    gateway.execute<ManagedDraftBundle>('getDraft', { draftId }).then((value) => {
      setBundle(value);
      setForm({
        word: value.assetVersion.word, baseMeaning: value.assetVersion.baseMeaning,
        mnemonicStory: value.assetVersion.mnemonicStory, textbookId: value.placement.textbookId,
        unitId: value.placement.unitId, order: value.placementVersion.order,
        textbookMeaning: value.placementVersion.textbookMeaning, ageCopyOverride: value.placementVersion.ageCopyOverride,
        distractors: value.assetVersion.distractors, correctionCandidates: value.assetVersion.correctionCandidates,
        audio: value.assetVersion.audio, image: value.assetVersion.image,
      });
    }).catch((reason) => setFailure(mapManagementError(reason)));
  }, [gateway, draftId]);

  const update = <K extends keyof EditorForm>(key: K, value: EditorForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const updateList = (key: 'distractors' | 'correctionCandidates', value: string) => update(key, value.split('\n'));

  const upload = async (kind: 'audio' | 'image', event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setFailure('');
    try {
      const sha256 = await digestFile(file);
      const reference = await gateway.uploadMedia(file, {
        assetId: bundle?.asset.id ?? (normalizeWordDisplay(form.word) || 'new-asset'),
        mimeType: file.type, byteSize: file.size, sha256, rightsSource: '管理员确认具备使用授权',
      });
      update(kind, { ...reference, reviewed: true });
      setNotice(`${kind === 'audio' ? '音频' : '图片'}已上传并标记为待审核素材。`);
    } catch (reason) { setFailure(mapManagementError(reason)); }
    finally { setBusy(false); }
  };

  const save = async (event?: FormEvent) => {
    event?.preventDefault();
    const nextErrors = { ...validateEditorFields(form) } as typeof errors;
    if (!form.audio) nextErrors.audio = '请上传标准发音音频';
    if (!form.image) nextErrors.image = '请上传谐音故事图片';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setBusy(true); setFailure(''); setNotice('');
    try {
      const payload = bundle ? {
        draftId: bundle.id,
        expectedRevision: bundle.assetVersion.revision,
        changes: {
          word: form.word, baseMeaning: form.baseMeaning, audio: form.audio,
          mnemonicStory: form.mnemonicStory, image: form.image,
          distractors: form.distractors.filter(Boolean), correctionCandidates: form.correctionCandidates.filter(Boolean),
          textbookMeaning: form.textbookMeaning, order: form.order, ageCopyOverride: form.ageCopyOverride,
        },
      } : {
        word: form.word, textbookId: form.textbookId, unitId: form.unitId,
        textbookMeaning: form.textbookMeaning, order: form.order, ageCopyOverride: form.ageCopyOverride,
        content: {
          baseMeaning: form.baseMeaning, audio: form.audio, mnemonicStory: form.mnemonicStory, image: form.image,
          distractors: form.distractors.filter(Boolean), correctionCandidates: form.correctionCandidates.filter(Boolean),
        },
      };
      const saved = await gateway.execute<ManagedDraftBundle>('saveDraft', payload);
      setBundle(saved); setNotice('草稿已保存。'); onSaved(saved.id);
    } catch (reason) { setFailure(mapManagementError(reason)); }
    finally { setBusy(false); }
  };

  const runAction = async (action: 'submitForReview' | 'approve' | 'reject' | 'publish') => {
    if (!bundle) return;
    setBusy(true); setFailure(''); setNotice('');
    try {
      if (action === 'submitForReview') {
        const value = await gateway.execute<ManagedDraftBundle>(action, { draftId: bundle.id, expectedRevision: bundle.assetVersion.revision });
        setBundle(value);
      } else if (action === 'approve' || action === 'reject') {
        const value = await gateway.execute<ManagedDraftBundle>(action, { draftId: bundle.id, checklist: completeChecklist, notes: reviewNotes });
        setBundle(value);
      } else {
        await gateway.execute(action, { draftId: bundle.id, requestId: crypto.randomUUID() });
      }
      setNotice(action === 'submitForReview' ? '已提交人工审核。' : action === 'approve' ? '审核已通过。' : action === 'reject' ? '已退回草稿。' : '新版本已发布。');
    } catch (reason) { setFailure(mapManagementError(reason)); }
    finally { setBusy(false); }
  };

  return (
    <main className="page-content" id="main-content" tabIndex={-1}>
      <header className="page-heading"><div><p className="eyebrow">CONTENT EDITOR</p><h1>{draftId ? '编辑词汇内容' : '新建词汇内容'}</h1><p>资产内容可跨教材复用，教材编排保持独立版本。</p></div><button className="button button-secondary" onClick={onBack}>返回列表</button></header>
      {failure && <div className="notice notice-error" role="alert">{failure}</div>}
      {notice && <div className="notice notice-success" role="status">{notice}</div>}
      <form onSubmit={save} className="editor-layout">
        <section className="editor-panel">
          <div className="panel-heading"><span className="panel-index">A</span><div><h2>可复用词汇资产</h2><p>在不同教材中共享拼写、基础词义与学习素材。</p></div></div>
          <div className="form-grid two-columns">
            <Field label="英文单词" error={errors.word}><input value={form.word} onChange={(event) => update('word', event.target.value)} /><small>规范化：{normalizeWordDisplay(form.word) || '—'}</small></Field>
            <Field label="基础词义" error={errors.baseMeaning}><input value={form.baseMeaning} onChange={(event) => update('baseMeaning', event.target.value)} /></Field>
          </div>
          <Field label="谐音故事" error={errors.mnemonicStory}><textarea rows={4} value={form.mnemonicStory} onChange={(event) => update('mnemonicStory', event.target.value)} /></Field>
          <div className="form-grid two-columns">
            <Field label="标准音频" error={errors.audio}><input type="file" accept="audio/mpeg,audio/mp4" onChange={(event) => void upload('audio', event)} /><small>{form.audio?.storageKey ?? '尚未上传'}</small></Field>
            <Field label="故事图片" error={errors.image}><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void upload('image', event)} /><small>{form.image?.storageKey ?? '尚未上传'}</small></Field>
          </div>
          <div className="form-grid two-columns">
            <Field label="干扰项（每行一个）" error={errors.distractors}><textarea rows={4} value={form.distractors.join('\n')} onChange={(event) => updateList('distractors', event.target.value)} /></Field>
            <Field label="纠音候选（每行一个）" error={errors.correctionCandidates}><textarea rows={4} value={form.correctionCandidates.join('\n')} onChange={(event) => updateList('correctionCandidates', event.target.value)} /></Field>
          </div>
        </section>
        <section className="editor-panel">
          <div className="panel-heading"><span className="panel-index">B</span><div><h2>教材专属编排</h2><p>只影响当前教材、单元和呈现顺序。</p></div></div>
          <div className="form-grid two-columns">
            <Field label="教材 ID" error={errors.textbookId}><input disabled={Boolean(bundle)} value={form.textbookId} onChange={(event) => update('textbookId', event.target.value)} /></Field>
            <Field label="单元 ID" error={errors.unitId}><input disabled={Boolean(bundle)} value={form.unitId} onChange={(event) => update('unitId', event.target.value)} /></Field>
            <Field label="词序" error={errors.order}><input type="number" min="1" value={form.order} onChange={(event) => update('order', Number(event.target.value))} /></Field>
            <Field label="教材词义" error={errors.textbookMeaning}><input value={form.textbookMeaning} onChange={(event) => update('textbookMeaning', event.target.value)} /></Field>
          </div>
          <Field label="适龄表达覆盖" error={errors.ageCopyOverride}><textarea rows={3} value={form.ageCopyOverride} onChange={(event) => update('ageCopyOverride', event.target.value)} /></Field>
          {status === 'in_review' && <Field label="审核说明"><textarea rows={3} value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} /></Field>}
        </section>
        <aside className="action-bar" aria-label="内容操作">
          <div><span className={`status status-${status}`}>{status === 'draft' ? '草稿' : status === 'in_review' ? '待审核' : '已审核'}</span><strong>{bundle ? `版本 ${bundle.assetVersion.version}` : '尚未保存'}</strong></div>
          <div className="action-buttons">
            {actions.includes('save') && <button className="button button-primary" disabled={busy} type="submit">{busy ? '处理中…' : '保存草稿'}</button>}
            {actions.includes('preview') && bundle && <button className="button button-secondary" type="button" onClick={() => onPreview(bundle.id)}>完整预览</button>}
            {actions.includes('submit') && bundle && <button className="button button-secondary" disabled={busy} type="button" onClick={() => void runAction('submitForReview')}>提交审核</button>}
            {actions.includes('approve') && <button className="button button-primary" disabled={busy} type="button" onClick={() => void runAction('approve')}>审核通过</button>}
            {actions.includes('reject') && <button className="button button-danger-ghost" disabled={busy} type="button" onClick={() => void runAction('reject')}>退回修改</button>}
            {actions.includes('publish') && <button className="button button-accent" disabled={busy} type="button" onClick={() => void runAction('publish')}>发布版本</button>}
          </div>
        </aside>
      </form>
    </main>
  );
}

function Field({ label, error, children }: { label: string; error?: string | undefined; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}{error && <em role="alert">{error}</em>}</label>;
}

async function digestFile(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
