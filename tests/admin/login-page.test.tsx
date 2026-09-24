import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LoginPage } from '../../admin/src/pages/login-page';

it('collects both the CloudBase environment and custom authentication ticket', () => {
  const html = renderToStaticMarkup(
    <LoginPage busy={false} error="" onLocal={vi.fn()} onCloud={vi.fn()} />,
  );

  expect(html).toContain('id="environment-id"');
  expect(html).toContain('id="custom-ticket"');
  expect(html).toContain('type="password"');
});

it('offers the original local data for export after recovery mode starts', () => {
  const html = renderToStaticMarkup(
    <LoginPage
      busy={false}
      error="本地内容损坏"
      rawBackup="{not-json"
      onExportBackup={vi.fn()}
      onLocal={vi.fn()}
      onCloud={vi.fn()}
    />,
  );

  expect(html).toContain('导出损坏数据备份');
  expect(html).toContain('不会自动覆盖或删除');
});
