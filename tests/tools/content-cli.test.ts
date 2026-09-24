import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ManagedContentState } from '../../shared/contracts/content-management';

let directory = '';
const npmCli = process.env.npm_execpath;

beforeAll(() => { directory = mkdtempSync(join(tmpdir(), 'content-cli-')); });
afterAll(() => { rmSync(directory, { recursive: true, force: true }); });

function run(...args: string[]) {
  if (!npmCli) throw new Error('npm_execpath is required');
  return spawnSync(process.execPath, [npmCli, 'run', 'content', '--', ...args], { encoding: 'utf8' });
}

function validState(): ManagedContentState {
  const createdAt = '2026-09-23T00:00:00.000Z';
  return {
    assets: [{ id: 'asset-school', normalizedWord: 'school', createdAt }],
    assetVersions: [{
      id: 'asset-version-school-1', assetId: 'asset-school', version: 1, revision: 2, status: 'approved',
      word: 'school', baseMeaning: '学校',
      audio: { id: 'audio-school', storageKey: 'media/school.mp3', mediaType: 'audio', mimeType: 'audio/mpeg', byteSize: 1200, sha256: 'a'.repeat(64), rightsSource: '自制录音', reviewed: true },
      mnemonicStory: '在 school 里学习。',
      image: { id: 'image-school', storageKey: 'media/school.webp', mediaType: 'image', mimeType: 'image/webp', byteSize: 2400, sha256: 'b'.repeat(64), rightsSource: '自制插画', reviewed: true },
      distractors: ['医院', '公园', '车站'], correctionCandidates: ['注意长元音', '结尾轻读'], createdBy: 'admin', createdAt,
    }],
    placements: [{ id: 'placement-school-demo', assetId: 'asset-school', textbookId: 'demo-primary-3-first', unitId: 'demo-unit-2' }],
    placementVersions: [{ id: 'placement-version-school-1', placementId: 'placement-school-demo', version: 1, revision: 2, status: 'approved', textbookMeaning: '学校', order: 1, ageCopyOverride: '校园', createdBy: 'admin', createdAt }],
    reviews: [{ id: 'review-school-1', assetVersionId: 'asset-version-school-1', placementVersionId: 'placement-version-school-1', reviewerId: 'admin', result: 'approved', checklist: { meaning: true, audio: true, mnemonic: true, ageAppropriate: true, mediaRights: true, distractors: true, pronunciationRisk: true }, notes: '审核通过', reviewedAt: createdAt }],
    publications: [{ id: 'publication-school-1', placementId: 'placement-school-demo', assetVersionId: 'asset-version-school-1', placementVersionId: 'placement-version-school-1', status: 'published', sequence: 1, requestId: 'request-school-1', publishedBy: 'admin', publishedAt: createdAt }],
    audits: [
      { id: 'audit-z', action: 'published', actorId: 'admin', targetId: 'publication-school-1', reason: '发布', createdAt },
      { id: 'audit-a', action: 'approved', actorId: 'admin', targetId: 'asset-version-school-1::placement-version-school-1', reason: '审核', createdAt },
    ],
    currentPublicationByPlacement: { 'placement-school-demo': 'publication-school-1' },
  };
}

describe('content pack CLI', () => {
  it('validates a complete content pack', () => {
    const input = join(directory, 'valid.json');
    writeFileSync(input, JSON.stringify(validState()), 'utf8');
    const result = run('validate', input);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('内容包校验通过');
  });

  it('rejects malformed contracts with a field path', () => {
    const invalid = validState();
    invalid.assetVersions[0]!.assetId = 'missing-asset';
    const input = join(directory, 'invalid.json');
    writeFileSync(input, JSON.stringify(invalid), 'utf8');
    const result = run('validate', input);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('assetVersions[0].assetId');
  });

  it('imports approved content as drafts without review or publication state', () => {
    const input = join(directory, 'approved.json');
    const output = join(directory, 'imported.json');
    writeFileSync(input, JSON.stringify(validState()), 'utf8');
    const result = run('import', input, '--out', output);
    expect(result.status, result.stderr).toBe(0);
    const imported = JSON.parse(readFileSync(output, 'utf8')) as ManagedContentState;
    expect(imported.assetVersions.every((item) => item.status === 'draft')).toBe(true);
    expect(imported.placementVersions.every((item) => item.status === 'draft')).toBe(true);
    expect(imported.reviews).toEqual([]);
    expect(imported.publications).toEqual([]);
    expect(imported.audits).toEqual([]);
    expect(imported.currentPublicationByPlacement).toEqual({});
  });

  it('exports byte-stable JSON with arrays sorted by stable id', () => {
    const input = join(directory, 'unsorted.json');
    const first = join(directory, 'export-1.json');
    const second = join(directory, 'export-2.json');
    writeFileSync(input, JSON.stringify(validState()), 'utf8');
    expect(run('export', input, '--out', first).status).toBe(0);
    expect(run('export', first, '--out', second).status).toBe(0);
    expect(readFileSync(second, 'utf8')).toBe(readFileSync(first, 'utf8'));
    expect((JSON.parse(readFileSync(first, 'utf8')) as ManagedContentState).audits.map((item) => item.id)).toEqual(['audit-a', 'audit-z']);
  });
});
