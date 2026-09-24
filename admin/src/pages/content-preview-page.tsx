import { useEffect, useState } from 'react';
import type { ContentPreview } from '../../../content-management/services/content-preview-projector';
import type { ContentManagementGateway } from '../gateway/content-management-gateway';
import { mapManagementError } from '../view-model/content-editor';
import { orderedPreviewSteps } from '../view-model/content-preview';

export function ContentPreviewPage({ gateway, draftId, onBack }: { gateway: ContentManagementGateway; draftId: string; onBack: () => void }) {
  const [preview, setPreview] = useState<ContentPreview>();
  const [error, setError] = useState('');
  useEffect(() => {
    gateway.execute<ContentPreview>('preview', { draftId }).then(setPreview).catch((reason) => setError(mapManagementError(reason)));
  }, [gateway, draftId]);

  return (
    <main className="page-content narrow-page" id="main-content" tabIndex={-1}>
      <header className="page-heading"><div><p className="eyebrow">STUDENT EXPERIENCE</p><h1>完整学习预览</h1><p>按学生实际看到和听到的顺序核对内容。</p></div><button className="button button-secondary" onClick={onBack}>返回</button></header>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {!preview && !error && <div className="empty-state">正在生成预览…</div>}
      <div className="preview-flow">
        {preview && orderedPreviewSteps(preview).map((step, index) => (
          <article className="preview-card" key={step.kind}>
            <span className="step-number">{String(index + 1).padStart(2, '0')}</span>
            {step.kind === 'standard-audio' && <><h2>标准发音</h2><audio controls src={step.audio.storageKey} /><p>{step.audio.rightsSource}</p></>}
            {step.kind === 'mnemonic' && <><h2>谐音故事与画面</h2><p className="story-copy">{step.story}</p><img src={step.image.storageKey} alt="词汇谐音故事配图" /></>}
            {step.kind === 'meaning-check' && <><h2>教材词义辨析</h2><p className="meaning-answer">{step.meaning}</p><div className="chip-list">{step.distractors.map((item) => <span key={item}>{item}</span>)}</div></>}
            {step.kind === 'correction' && <><h2>发音纠正</h2><ul>{step.candidates.map((item) => <li key={item}>{item}</li>)}</ul></>}
          </article>
        ))}
      </div>
    </main>
  );
}
