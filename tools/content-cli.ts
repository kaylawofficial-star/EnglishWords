import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ManagedContentState } from '../shared/contracts/content-management';
import { parseManagedContentState } from '../shared/validation/content-management';
import { InMemoryContentRepository } from '../content-management/repositories/in-memory-content-repository';
import { ContentManagementService } from '../content-management/services/content-management-service';

type Command = 'validate' | 'import' | 'export';

interface Arguments {
  command: Command;
  input: string;
  output?: string;
  force: boolean;
}

async function main(): Promise<void> {
  const args = parseArguments(process.argv.slice(2));
  const state = readState(args.input);
  if (args.command === 'validate') {
    process.stdout.write(`内容包校验通过：${args.input}\n`);
    return;
  }
  const output = args.output!;
  const next = args.command === 'import' ? await importAsDrafts(state) : state;
  writeState(output, next, args.force);
  process.stdout.write(`${args.command === 'import' ? '草稿内容包已生成' : '内容包已导出'}：${output}\n`);
}

function parseArguments(values: string[]): Arguments {
  const [commandValue, inputValue, ...options] = values;
  if (!isCommand(commandValue) || !inputValue || inputValue.startsWith('--')) usage();
  let output: string | undefined;
  let force = false;
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (option === '--force') {
      force = true;
      continue;
    }
    if (option === '--out') {
      const value = options[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--out 需要文件路径');
      output = value;
      index += 1;
      continue;
    }
    throw new Error(`未知选项：${option}`);
  }
  if (commandValue === 'validate' && (output || force)) throw new Error('validate 不接受 --out 或 --force');
  if (commandValue !== 'validate' && !output) throw new Error(`${commandValue} 需要 --out <file>`);
  return { command: commandValue, input: resolve(inputValue), ...(output ? { output: resolve(output) } : {}), force };
}

function isCommand(value: string | undefined): value is Command {
  return value === 'validate' || value === 'import' || value === 'export';
}

function usage(): never {
  throw new Error('用法：content <validate|import|export> <file> [--out <file>] [--force]');
}

function readState(path: string): ManagedContentState {
  const raw = readFileSync(path, 'utf8');
  return parseManagedContentState(JSON.parse(raw));
}

async function importAsDrafts(state: ManagedContentState): Promise<ManagedContentState> {
  const repository = new InMemoryContentRepository();
  let nextId = 0;
  const service = new ContentManagementService(repository, {
    now: () => '2026-01-01T00:00:00.000Z',
    createId: (prefix) => `import-${prefix}-${++nextId}`,
  });
  for (const placementVersion of [...state.placementVersions].sort((left, right) => left.id.localeCompare(right.id))) {
    const placement = state.placements.find((item) => item.id === placementVersion.placementId);
    if (!placement) continue;
    const assetVersion = state.assetVersions
      .filter((item) => item.assetId === placement.assetId)
      .sort((left, right) => right.version - left.version)[0];
    if (!assetVersion) continue;
    await service.createDraft({
      actorId: 'content-pack-import', word: assetVersion.word,
      textbookId: placement.textbookId, unitId: placement.unitId,
      textbookMeaning: placementVersion.textbookMeaning, order: placementVersion.order,
      ageCopyOverride: placementVersion.ageCopyOverride,
      content: {
        baseMeaning: assetVersion.baseMeaning, audio: assetVersion.audio,
        mnemonicStory: assetVersion.mnemonicStory, image: assetVersion.image,
        distractors: assetVersion.distractors, correctionCandidates: assetVersion.correctionCandidates,
      },
    });
  }
  const imported = await repository.listState();
  return parseManagedContentState({ ...imported, audits: [] });
}

function writeState(path: string, state: ManagedContentState, force: boolean): void {
  if (existsSync(path) && !force) throw new Error(`输出文件已存在；如需覆盖请添加 --force：${path}`);
  writeFileSync(path, `${JSON.stringify(sortState(state), null, 2)}\n`, 'utf8');
}

function sortState(state: ManagedContentState): ManagedContentState {
  const byId = <T extends { id: string }>(items: T[]) => [...items].sort((left, right) => left.id.localeCompare(right.id));
  return {
    assets: byId(state.assets),
    assetVersions: byId(state.assetVersions),
    placements: byId(state.placements),
    placementVersions: byId(state.placementVersions),
    reviews: byId(state.reviews),
    publications: byId(state.publications),
    audits: byId(state.audits),
    currentPublicationByPlacement: Object.fromEntries(Object.entries(state.currentPublicationByPlacement).sort(([left], [right]) => left.localeCompare(right))),
  };
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
