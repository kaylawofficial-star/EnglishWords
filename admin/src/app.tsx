import { useState } from 'react';
import type { ContentManagementGateway } from './gateway/content-management-gateway';
import { LocalContentManagementGateway } from './gateway/local-content-management-gateway';
import { BrowserContentRepository } from './storage/browser-content-repository';
import { BrowserContentStore } from './storage/browser-content-store';
import { LoginPage } from './pages/login-page';
import { ContentListPage } from './pages/content-list-page';
import { ContentEditorPage } from './pages/content-editor-page';
import { ContentPreviewPage } from './pages/content-preview-page';
import { VersionHistoryPage } from './pages/version-history-page';

type Route =
  | { name: 'list' }
  | { name: 'editor'; draftId?: string }
  | { name: 'preview'; draftId: string }
  | { name: 'history'; draftId: string };

export function App() {
  const [gateway, setGateway] = useState<ContentManagementGateway>();
  const [route, setRoute] = useState<Route>({ name: 'list' });
  const [loginError, setLoginError] = useState('');
  const [rawBackup, setRawBackup] = useState<string>();
  const [busy, setBusy] = useState(false);

  const enterLocal = () => {
    setBusy(true); setLoginError('');
    const store = new BrowserContentStore(window.localStorage);
    try {
      store.load();
      setRawBackup(undefined);
      setGateway(new LocalContentManagementGateway(new BrowserContentRepository(store)));
    } catch (error) {
      setRawBackup(store.exportRawBackup() ?? undefined);
      setLoginError(error instanceof Error ? error.message : '本地模式启动失败。');
    } finally { setBusy(false); }
  };

  const enterCloud = async (environmentId: string, customTicket: string) => {
    setBusy(true); setLoginError('');
    try {
      const { CloudContentManagementGateway } = await import('./gateway/cloud-content-management-gateway');
      setGateway(await CloudContentManagementGateway.connect(environmentId, customTicket));
    }
    catch { setLoginError('云环境配置无效，请核对环境 ID。'); }
    finally { setBusy(false); }
  };

  const exportBackup = () => {
    if (!rawBackup) return;
    const url = URL.createObjectURL(new Blob([rawBackup], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `vocabulary-content-recovery-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!gateway) return <LoginPage busy={busy} error={loginError} rawBackup={rawBackup} onExportBackup={exportBackup} onLocal={enterLocal} onCloud={enterCloud} />;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <header className="app-header">
        <button className="brand-button" onClick={() => setRoute({ name: 'list' })} aria-label="返回内容列表"><span className="brand-mark small">W</span><span><strong>词舟</strong><small>内容工作台</small></span></button>
        <div className="header-actions"><span className={`mode-pill mode-${gateway.mode}`}>{gateway.modeLabel}</span><button className="button button-ghost" onClick={() => setGateway(undefined)}>退出</button></div>
      </header>
      {route.name === 'list' && <ContentListPage gateway={gateway} onCreate={() => setRoute({ name: 'editor' })} onEdit={(draftId) => setRoute({ name: 'editor', draftId })} onPreview={(draftId) => setRoute({ name: 'preview', draftId })} onHistory={(draftId) => setRoute({ name: 'history', draftId })} />}
      {route.name === 'editor' && <ContentEditorPage gateway={gateway} draftId={route.draftId} onBack={() => setRoute({ name: 'list' })} onSaved={(draftId) => setRoute({ name: 'editor', draftId })} onPreview={(draftId) => setRoute({ name: 'preview', draftId })} />}
      {route.name === 'preview' && <ContentPreviewPage gateway={gateway} draftId={route.draftId} onBack={() => setRoute({ name: 'editor', draftId: route.draftId })} />}
      {route.name === 'history' && <VersionHistoryPage gateway={gateway} draftId={route.draftId} onBack={() => setRoute({ name: 'list' })} />}
    </div>
  );
}
