import { cp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';

const root = process.cwd();
const distRoot = resolve(root, 'dist');
const miniProgramDist = resolve(distRoot, 'miniprogram');

const miniProgramEntries = {
  app: resolve(root, 'miniprogram/app.ts'),
  'pages/learn/index': resolve(root, 'miniprogram/pages/learn/index.ts'),
  'pages/parent/index': resolve(root, 'miniprogram/pages/parent/index.ts'),
};

const staticFiles = [
  'miniprogram/app.json',
  'miniprogram/app.wxss',
  'miniprogram/sitemap.json',
  'miniprogram/pages/learn/index.json',
  'miniprogram/pages/learn/index.wxml',
  'miniprogram/pages/learn/index.wxss',
  'miniprogram/pages/parent/index.json',
  'miniprogram/pages/parent/index.wxml',
  'miniprogram/pages/parent/index.wxss',
];

const cloudFunctions = [
  { name: 'health-check', entry: 'cloudfunctions/health-check/src/index.ts' },
  { name: 'content-service', entry: 'cloudfunctions/content-service/src/index.ts' },
  { name: 'content-management', entry: 'cloudfunctions/content-management/src/index.ts' },
];

async function assertFile(path) {
  const info = await stat(resolve(root, path));
  if (!info.isFile()) throw new Error(`Required build input is not a file: ${path}`);
}

await Promise.all([
  ...Object.values(miniProgramEntries).map((path) => assertFile(path)),
  ...staticFiles.map((path) => assertFile(path)),
  ...cloudFunctions.map(({ entry }) => assertFile(entry)),
]);

await rm(distRoot, { recursive: true, force: true });
await mkdir(miniProgramDist, { recursive: true });

await build({
  entryPoints: miniProgramEntries,
  outdir: miniProgramDist,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  logLevel: 'info',
});

for (const source of staticFiles) {
  const relativePath = source.replace(/^miniprogram\//, '');
  const destination = resolve(miniProgramDist, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await cp(resolve(root, source), destination);
}

for (const cloudFunction of cloudFunctions) {
  const outputDirectory = resolve(distRoot, 'cloudfunctions', cloudFunction.name);
  await mkdir(outputDirectory, { recursive: true });
  await build({
    entryPoints: [resolve(root, cloudFunction.entry)],
    outfile: resolve(outputDirectory, 'index.js'),
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node20',
    external: cloudFunction.name === 'content-management' ? ['wx-server-sdk'] : [],
    logLevel: 'info',
  });
  await writeFile(
    resolve(outputDirectory, 'package.json'),
    `${JSON.stringify({
      name: cloudFunction.name,
      version: '1.0.0',
      main: 'index.js',
      ...(cloudFunction.name === 'content-management'
        ? { dependencies: { 'wx-server-sdk': 'latest' } }
        : {}),
    }, null, 2)}\n`,
    'utf8',
  );
}
