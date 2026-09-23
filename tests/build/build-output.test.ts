import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it('builds a self-contained WeChat project', () => {
  rmSync(resolve('dist'), { recursive: true, force: true });
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error('npm_execpath is required to run the build test');
  execFileSync(process.execPath, [npmCli, 'run', 'build'], { stdio: 'inherit' });

  const required = [
    'dist/miniprogram/app.js',
    'dist/miniprogram/app.json',
    'dist/miniprogram/app.wxss',
    'dist/miniprogram/sitemap.json',
    'dist/miniprogram/pages/learn/index.js',
    'dist/miniprogram/pages/learn/index.json',
    'dist/miniprogram/pages/learn/index.wxml',
    'dist/miniprogram/pages/learn/index.wxss',
    'dist/miniprogram/pages/parent/index.js',
    'dist/miniprogram/pages/parent/index.json',
    'dist/miniprogram/pages/parent/index.wxml',
    'dist/miniprogram/pages/parent/index.wxss',
    'dist/cloudfunctions/health-check/index.js',
    'dist/cloudfunctions/health-check/package.json',
    'dist/cloudfunctions/content-service/index.js',
    'dist/cloudfunctions/content-service/package.json',
  ];

  for (const path of required) {
    expect(existsSync(resolve(path)), path).toBe(true);
  }

  const learnBundle = readFileSync(
    resolve('dist/miniprogram/pages/learn/index.js'),
    'utf8',
  );
  expect(learnBundle).not.toMatch(/from ['"].*shared\//);
});
