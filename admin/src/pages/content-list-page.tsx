import { useEffect, useMemo, useState } from 'react';
import type { ContentManagementGateway } from '../gateway/content-management-gateway';
import { mapManagementError } from '../view-model/content-editor';

export interface ContentListItem {
  draftId: string;
  placementId: string;
  word: string;
  textbookId: string;
  unitId: string;
  status: 'draft' | 'in_review' | 'approved';
  currentPublicationId: string | null;
}

interface ContentListPageProps {
  gateway: ContentManagementGateway;
  onCreate: () => void;
  onEdit: (draftId: string) => void;
  onPreview: (draftId: string) => void;
  onHistory: (draftId: string) => void;
}

const statusLabel = { draft: '草稿', in_review: '待审核', approved: '已审核' } as const;

export function ContentListPage({ gateway, onCreate, onEdit, onPreview, onHistory }: ContentListPageProps) {
  const [items, setItems] = useState<ContentListItem[]>([]);
  const [filters, setFilters] = useState({ word: '', textbookId: '', unitId: '', status: '' });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setBusy(true);
    gateway.execute<ContentListItem[]>('listContent', {}).then((value) => {
      if (active) setItems(value);
    }).catch((reason) => {
      if (active) setError(mapManagementError(reason));
    }).finally(() => {
      if (active) setBusy(false);
    });
    return () => { active = false; };
  }, [gateway]);

  const filtered = useMemo(() => items.filter((item) =>
    (!filters.word || item.word.toLocaleLowerCase().includes(filters.word.toLocaleLowerCase())) &&
    (!filters.textbookId || item.textbookId.includes(filters.textbookId)) &&
    (!filters.unitId || item.unitId.includes(filters.unitId)) &&
    (!filters.status || item.status === filters.status)), [items, filters]);

  return (
    <main className="page-content" id="main-content" tabIndex={-1}>
      <header className="page-heading">
        <div><p className="eyebrow">CONTENT LIBRARY</p><h1>内容列表</h1><p>筛选、核对并推进每一条教材词汇。</p></div>
        <button className="button button-primary" onClick={onCreate}>新建词条</button>
      </header>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      <section className="filter-panel" aria-label="内容筛选">
        <label>英文词<input value={filters.word} onChange={(event) => setFilters({ ...filters, word: event.target.value })} /></label>
        <label>教材<input value={filters.textbookId} onChange={(event) => setFilters({ ...filters, textbookId: event.target.value })} /></label>
        <label>单元<input value={filters.unitId} onChange={(event) => setFilters({ ...filters, unitId: event.target.value })} /></label>
        <label>状态<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">全部</option><option value="draft">草稿</option><option value="in_review">待审核</option><option value="approved">已审核</option></select></label>
      </section>
      <section className="content-table" aria-live="polite">
        {busy && <div className="empty-state">正在读取内容…</div>}
        {!busy && filtered.length === 0 && <div className="empty-state"><strong>还没有匹配内容</strong><span>新建第一条词汇，或调整筛选条件。</span></div>}
        {filtered.map((item) => (
          <article className="content-row" key={item.draftId}>
            <div className="word-cell"><strong>{item.word}</strong><span>{item.textbookId} · {item.unitId}</span></div>
            <span className={`status status-${item.status}`}>{statusLabel[item.status]}</span>
            <span className={`publication ${item.currentPublicationId ? 'is-live' : ''}`}>{item.currentPublicationId ? '当前已发布' : '未发布'}</span>
            <div className="row-actions">
              <button className="button button-ghost" onClick={() => onPreview(item.draftId)}>预览</button>
              <button className="button button-ghost" onClick={() => onHistory(item.draftId)}>历史</button>
              <button className="button button-secondary" onClick={() => onEdit(item.draftId)}>编辑</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
