import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const styles = readFileSync(resolve('miniprogram/app.wxss'), 'utf8');

it('keeps child-facing copy at least 16px with Chinese system fonts', () => {
  expect(styles).toContain('"PingFang SC", "Microsoft YaHei"');

  for (const className of [
    'page-intro',
    'mode-notice',
    'card-label',
    'metric-label',
    'status-copy',
    'retry-button',
  ]) {
    const block = styles.match(new RegExp(`\\.${className} \\{([^}]*)\\}`))?.[1];
    expect(block, className).toContain('font-size: 32rpx');
  }
});
