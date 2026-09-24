import { useEffect, useState } from 'react';
import type { AuditEvent, Publication, ReviewRecord, TextbookPlacementVersion, VocabularyAssetVersion } from '../../../shared/contracts/content-management';
import type { ContentManagementGateway } from '../gateway/content-management-gateway';
import { mapManagementError, validateHighRiskConfirmation } from '../view-model/content-editor';

interface HistoryData {
  assetVersions: VocabularyAssetVersion[];
  placementVersions: TextbookPlacementVersion[];
  reviews: ReviewRecord[];
  publications: Publication[];
  audits: AuditEvent[];
  currentPublicationId: string | null;
  placementId: string;
}

export function VersionHistoryPage({ gateway, draftId, onBack }: { gateway: ContentManagementGateway; draftId: string; onBack: () => void }) {
  const [history, setHistory] = useState<HistoryData>();
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [selectedPublicationId, setSelectedPublicationId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => gateway.execute<HistoryData>('getHistory', { draftId }).then((value) => {
    setHistory(value);
    setSelectedPublicationId(value.publications[value.publications.length - 1]?.id ?? '');
  }).catch((reasonValue) => setError(mapManagementError(reasonValue)));
  useEffect(() => { void load(); }, [gateway, draftId]);

  const executeRisk = async (action: 'withdraw' | 'rollback') => {
    const errors = validateHighRiskConfirmation(action, reason, confirmed);
    if (errors.reason || errors.confirmation) { setError([errors.reason, errors.confirmation].filter(Boolean).join('；')); return; }
    if (!history) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (action === 'withdraw') await gateway.execute('withdraw', { placementId: history.placementId, reason });
      else await gateway.execute('rollback', { publicationId: selectedPublicationId, requestId: crypto.randomUUID(), reason });
      setNotice(action === 'withdraw' ? '当前发布已下架，历史版本保持不变。' : '已创建新的回滚发布记录。');
      setConfirmed(false); setReason(''); await load();
    } catch (reasonValue) { setError(mapManagementError(reasonValue)); }
    finally { setBusy(false); }
  };

  return (
    <main className="page-content" id="main-content" tabIndex={-1}>
      <header className="page-heading"><div><p className="eyebrow">VERSION LEDGER</p><h1>版本历史与审计</h1><p>历史版本不可修改；下架和回滚只改变当前发布指针。</p></div><button className="button button-secondary" onClick={onBack}>返回列表</button></header>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {notice && <div className="notice notice-success" role="status">{notice}</div>}
      {!history && !error && <div className="empty-state">正在读取版本账本…</div>}
      {history && <div className="history-layout">
        <section className="history-stack">
          <article className="history-card"><h2>词汇资产版本</h2>{history.assetVersions.map((item) => <div className="history-line" key={item.id}><strong>v{item.version} · {item.word}</strong><span>{item.status} · 修订 {item.revision}</span><time>{formatTime(item.createdAt)}</time></div>)}</article>
          <article className="history-card"><h2>教材编排版本</h2>{history.placementVersions.map((item) => <div className="history-line" key={item.id}><strong>v{item.version} · 词序 {item.order}</strong><span>{item.textbookMeaning} · {item.status}</span><time>{formatTime(item.createdAt)}</time></div>)}</article>
          <article className="history-card"><h2>发布与审核记录</h2>{history.publications.length === 0 && <p className="muted">尚无发布记录。</p>}{history.publications.map((item) => <div className="history-line" key={item.id}><strong>发布序列 {item.sequence}{item.id === history.currentPublicationId ? ' · 当前' : ''}</strong><span>{item.id}</span><time>{formatTime(item.publishedAt)}</time></div>)}{history.reviews.map((item) => <div className="history-line" key={item.id}><strong>{item.result === 'approved' ? '审核通过' : '审核退回'}</strong><span>{item.notes}</span><time>{formatTime(item.reviewedAt)}</time></div>)}</article>
          <article className="history-card"><h2>审计轨迹</h2>{history.audits.map((item) => <div className="history-line" key={item.id}><strong>{item.action}</strong><span>{item.reason} · {item.actorId}</span><time>{formatTime(item.createdAt)}</time></div>)}</article>
        </section>
        <aside className="risk-panel">
          <p className="eyebrow">HIGH-RISK ACTIONS</p><h2>下架或回滚</h2><p>请先核对影响范围。系统会保留全部历史记录。</p>
          <label className="field"><span>回滚目标发布</span><select value={selectedPublicationId} onChange={(event) => setSelectedPublicationId(event.target.value)}>{history.publications.map((item) => <option key={item.id} value={item.id}>序列 {item.sequence} · {formatTime(item.publishedAt)}</option>)}</select></label>
          <label className="field"><span>操作原因</span><textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          <label className="confirm-row"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>我已核对当前发布及学生端影响</span></label>
          <div className="risk-actions"><button className="button button-danger-ghost" disabled={busy || !history.currentPublicationId} onClick={() => void executeRisk('withdraw')}>下架当前版本</button><button className="button button-accent" disabled={busy || !selectedPublicationId} onClick={() => void executeRisk('rollback')}>回滚为新发布</button></div>
        </aside>
      </div>}
    </main>
  );
}

function formatTime(value: string) { return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
