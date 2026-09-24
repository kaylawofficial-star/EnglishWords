import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it('builds the admin studio into self-contained hashed assets', () => {
  rmSync(resolve('dist/admin'), { recursive: true, force: true });
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error('npm_execpath is required to run the admin build test');
  execFileSync(process.execPath, [npmCli, 'run', 'build:admin'], { stdio: 'inherit' });

  expect(existsSync(resolve('dist/admin/index.html'))).toBe(true);
  const assets = readdirSync(resolve('dist/admin/assets'));
  expect(assets.some((name) => /^index-[\w-]+\.js$/.test(name))).toBe(true);
  expect(assets.some((name) => /^index-[\w-]+\.css$/.test(name))).toBe(true);
  for (const name of assets) {
    const content = readFileSync(resolve('dist/admin/assets', name), 'utf8');
    expect(content).not.toMatch(/(?:from|import)\s*['"]\.\.\//);
  }
});
