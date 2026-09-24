import { useState, type FormEvent } from 'react';

interface LoginPageProps {
  busy: boolean;
  error: string;
  onLocal: () => void;
  onCloud: (environmentId: string) => void;
}

export function LoginPage({ busy, error, onLocal, onCloud }: LoginPageProps) {
  const [environmentId, setEnvironmentId] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onCloud(environmentId);
  };

  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">W</div>
        <p className="eyebrow">Vocabulary Content Studio</p>
        <h1 id="login-title">词舟内容工作台</h1>
        <p className="lead">把词汇资产、教材编排、人工审核与版本发布放在一条清晰的工作流里。</p>
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        <button className="button button-primary button-block" disabled={busy} onClick={onLocal}>
          {busy ? '正在进入…' : '进入本地演示模式'}
        </button>
        <p className="mode-note">无需 AppID，数据只保存在当前浏览器，可完整演示审核与发布流程。</p>
        <div className="divider"><span>或连接微信云开发</span></div>
        <form onSubmit={submit} className="stack-form">
          <label htmlFor="environment-id">CloudBase 环境 ID</label>
          <input id="environment-id" value={environmentId} onChange={(event) => setEnvironmentId(event.target.value)} placeholder="例如 cloud1-xxxx" />
          <button className="button button-secondary button-block" disabled={busy || !environmentId.trim()} type="submit">连接云环境</button>
        </form>
      </section>
    </main>
  );
}
