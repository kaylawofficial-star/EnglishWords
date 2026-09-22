# 微信小程序试点骨架 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立可由微信开发者工具导入的原生 TypeScript 小程序骨架，通过统一内容服务在“学习”和“家长”两个 Tab 加载同一套可配置教材数据，并提供微信云函数、自动化检查和部署文档。

**Architecture:** 页面只依赖 `ContentService` 与共享 `ContentLoader`，本地演示适配器和微信云函数适配器返回同一响应契约。根目录共享契约负责类型和运行时校验；esbuild 将小程序 TypeScript、共享代码和云函数分别构建到 `dist/`，因此源码可以共享而微信运行产物不需要跨根目录引用。

**Tech Stack:** 微信原生小程序、TypeScript 5、esbuild、Vitest、微信云开发云函数、Node.js 20+

**Spec:** `docs/superpowers/specs/2026-09-22-wechat-pilot-foundation-design.md`

## Global Constraints

- 客户端必须使用微信原生小程序与 TypeScript，不引入 Taro 等跨端框架。
- 客户端页面不得直接访问云数据库，只能调用统一内容服务接口。
- 页面、教材数据契约和核心模型不得写死“湘少版”“三年级”或固定单元数量。
- 没有 AppID 或云环境 ID 时必须使用明确标识的本地演示模式。
- 云函数失败或返回无效数据时必须显示可恢复错误，不得伪装成本地或云端成功。
- 仓库只保存非敏感配置示例，不提交密钥、私有凭据或真实生产配置。
- 保留现有 `prototype/` 网页原型，不删除、不嵌入、不重写。
- Issue #1 不实现账号、学习记录、复习、发音、周报、支付、内容审核或离线同步。

## Review Focus

- 空字符串或未知教材 ID：内容服务应返回 `NOT_FOUND`，不得返回默认教材或调用错误教材。
- 云函数成功返回但响应结构缺字段：云端适配器应返回 `INVALID_RESPONSE`，页面应显示重试状态。
- 云函数 Promise 拒绝：云端适配器应返回 `UNAVAILABLE`，再次点击重试应发起新请求。
- 演示数据含重复 ID、错误父子关系或非正整数顺序：运行时校验应拒绝整套内容。
- 两个 Tab 同时请求同一教材：共享加载器应复用同一个进行中的 Promise，避免重复请求与不同状态。

---

### Task 1: 建立工具链与共享内容契约

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `shared/contracts/content.ts`
- Create: `shared/validation/content.ts`
- Test: `tests/contracts/content-validation.test.ts`

**Interfaces:**
- Consumes: 无。
- Produces: `Textbook`, `Unit`, `VocabularyEntry`, `TextbookContent`, `ContentErrorCode`, `ContentServiceResponse`, `parseTextbookContent(value: unknown): TextbookContent`。

- [ ] **Step 1: 创建 Node/TypeScript 测试工具链**

创建 `package.json`：

```json
{
  "name": "k12-english-word-voyage",
  "version": "0.1.0",
  "private": true,
  "engines": { "node": ">=20" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "node scripts/build.mjs",
    "check": "npm run typecheck && npm run test && npm run build"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "esbuild": "^0.25.0",
    "miniprogram-api-typings": "^4.0.0",
    "typescript": "^5.9.0",
    "vitest": "^3.2.0"
  }
}
```

创建 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noEmit": true,
    "types": ["node", "miniprogram-api-typings"],
    "skipLibCheck": true
  },
  "include": ["shared/**/*.ts", "miniprogram/**/*.ts", "cloudfunctions/**/*.ts", "tests/**/*.ts", "vitest.config.ts"]
}
```

创建 `vitest.config.ts`：

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['tests/**/*.test.ts'], clearMocks: true }
});
```

运行：`npm install`

预期：生成 `package-lock.json`，安装成功且没有生产依赖。

- [ ] **Step 2: 写共享契约验证的失败测试**

在 `tests/contracts/content-validation.test.ts` 写入：

```ts
import { describe, expect, it } from 'vitest';
import { parseTextbookContent } from '../../shared/validation/content';

const validContent = {
  textbook: {
    id: 'demo-primary-3-first', edition: 'demo-edition', year: 2026,
    stage: 'primary', grade: 3, term: 'first', displayName: '演示教材 · 三年级上册'
  },
  units: [{ id: 'unit-1', textbookId: 'demo-primary-3-first', name: 'Unit 1', order: 1 }],
  entries: [{ id: 'word-morning', unitId: 'unit-1', word: 'morning', meaning: '早晨；上午', order: 1 }]
} as const;

describe('parseTextbookContent', () => {
  it('accepts a valid configurable textbook', () => {
    expect(parseTextbookContent(validContent)).toEqual(validContent);
  });

  it.each([
    ['duplicate unit id', { ...validContent, units: [validContent.units[0], validContent.units[0]] }],
    ['orphan entry', { ...validContent, entries: [{ ...validContent.entries[0], unitId: 'missing' }] }],
    ['non-positive order', { ...validContent, units: [{ ...validContent.units[0], order: 0 }] }]
  ])('rejects %s', (_name, value) => {
    expect(() => parseTextbookContent(value)).toThrow();
  });
});
```

- [ ] **Step 3: 运行测试并确认失败**

运行：`npm test -- tests/contracts/content-validation.test.ts`

预期：FAIL，原因是 `shared/validation/content` 尚不存在。

- [ ] **Step 4: 实现最小契约和运行时校验**

在 `shared/contracts/content.ts` 定义：

```ts
export type SchoolStage = 'primary' | 'junior';
export type SchoolTerm = 'first' | 'second';

export interface Textbook {
  id: string; edition: string; year: number; stage: SchoolStage;
  grade: number; term: SchoolTerm; displayName: string;
}
export interface Unit { id: string; textbookId: string; name: string; order: number; }
export interface VocabularyEntry { id: string; unitId: string; word: string; meaning: string; order: number; }
export interface TextbookContent { textbook: Textbook; units: Unit[]; entries: VocabularyEntry[]; }

export type ContentErrorCode = 'NOT_FOUND' | 'UNAVAILABLE' | 'INVALID_RESPONSE';
export type ContentServiceResponse =
  | { ok: true; data: TextbookContent }
  | { ok: false; error: { code: ContentErrorCode; message: string } };
```

在 `shared/validation/content.ts` 实现 `parseTextbookContent(value: unknown)`：逐字段确认对象、非空字符串、年份与年级为正整数、枚举值合法、ID 唯一、单元属于当前教材、词条引用存在单元、顺序为正整数。校验失败统一抛出 `ContentValidationError`，错误消息包含字段路径。

- [ ] **Step 5: 运行单测与类型检查**

运行：

```bash
npm test -- tests/contracts/content-validation.test.ts
npm run typecheck
```

预期：全部 PASS。

- [ ] **Step 6: 提交契约与工具链**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts shared tests/contracts
git commit -m "feat: add shared textbook content contracts"
```

### Task 2: 添加演示教材与本地内容适配器

**Files:**
- Create: `shared/fixtures/demo-content.ts`
- Create: `miniprogram/services/content/content-service.ts`
- Create: `miniprogram/adapters/local/local-content-service.ts`
- Test: `tests/services/local-content-service.test.ts`

**Interfaces:**
- Consumes: `TextbookContent`, `ContentServiceResponse`, `parseTextbookContent`。
- Produces: `ContentService.getTextbookContent(textbookId: string): Promise<ContentServiceResponse>` 与 `createLocalContentService(contents?: readonly TextbookContent[]): ContentService`。

- [ ] **Step 1: 写本地适配器失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { createLocalContentService } from '../../miniprogram/adapters/local/local-content-service';

describe('local content service', () => {
  it('returns configured content by textbook id', async () => {
    const service = createLocalContentService();
    const result = await service.getTextbookContent('demo-primary-3-first');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.textbook.id).toBe('demo-primary-3-first');
  });

  it.each(['', 'unknown-textbook'])('does not fall back for id %j', async (id) => {
    const result = await createLocalContentService().getTextbookContent(id);
    expect(result).toEqual({ ok: false, error: { code: 'NOT_FOUND', message: `Textbook not found: ${id}` } });
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

运行：`npm test -- tests/services/local-content-service.test.ts`

预期：FAIL，模块尚不存在。

- [ ] **Step 3: 实现演示数据和接口**

在 `shared/fixtures/demo-content.ts` 创建一套教材、两个单元和至少三个基础词条，导出：

```ts
import type { TextbookContent } from '../contracts/content';
import { parseTextbookContent } from '../validation/content';

export const DEMO_TEXTBOOK_ID = 'demo-primary-3-first';
export const DEMO_CONTENTS: readonly TextbookContent[] = [
  parseTextbookContent({
    textbook: {
      id: DEMO_TEXTBOOK_ID,
      edition: 'demo-edition',
      year: 2026,
      stage: 'primary',
      grade: 3,
      term: 'first',
      displayName: '演示教材 · 三年级上册'
    },
    units: [
      { id: 'demo-unit-1', textbookId: DEMO_TEXTBOOK_ID, name: 'Unit 1', order: 1 },
      { id: 'demo-unit-2', textbookId: DEMO_TEXTBOOK_ID, name: 'Unit 2', order: 2 }
    ],
    entries: [
      { id: 'demo-morning', unitId: 'demo-unit-1', word: 'morning', meaning: '早晨；上午', order: 1 },
      { id: 'demo-hello', unitId: 'demo-unit-1', word: 'hello', meaning: '你好', order: 2 },
      { id: 'demo-school', unitId: 'demo-unit-2', word: 'school', meaning: '学校', order: 1 }
    ]
  })
];
```

演示内容只出现在 fixture 中；页面不得包含教材名称、单元数或词条数组。

在 `miniprogram/services/content/content-service.ts` 定义 `ContentService` 接口。在本地适配器中按精确教材 ID 查找，找到后再次经过 `parseTextbookContent` 并返回深拷贝；未找到时返回 `NOT_FOUND`，不回退到第一本教材。

- [ ] **Step 4: 增加调用方无法修改共享 fixture 的测试**

在同一测试文件增加：取得一次内容后修改返回值，再次读取时仍获得原始内容。

- [ ] **Step 5: 运行测试与类型检查**

运行：

```bash
npm test -- tests/services/local-content-service.test.ts
npm run typecheck
```

预期：全部 PASS。

- [ ] **Step 6: 提交本地内容适配器**

```bash
git add shared/fixtures miniprogram/services miniprogram/adapters tests/services/local-content-service.test.ts
git commit -m "feat: add configurable local textbook content"
```

### Task 3: 添加云端适配器与运行环境选择

**Files:**
- Create: `miniprogram/adapters/cloud/cloud-content-service.ts`
- Create: `miniprogram/config/runtime.ts`
- Create: `miniprogram/services/content/create-content-service.ts`
- Test: `tests/services/cloud-content-service.test.ts`
- Test: `tests/services/create-content-service.test.ts`

**Interfaces:**
- Consumes: `ContentService`, `ContentServiceResponse`, `parseTextbookContent`。
- Produces: `CloudFunctionCaller`, `createCloudContentService(caller)`, `RuntimeConfig`, `createContentService(config, cloudCaller?)`。

- [ ] **Step 1: 写云适配器失败、无效响应和成功测试**

```ts
import { describe, expect, it, vi } from 'vitest';
import { DEMO_CONTENTS } from '../../shared/fixtures/demo-content';
import { createCloudContentService } from '../../miniprogram/adapters/cloud/cloud-content-service';

const validContent = DEMO_CONTENTS[0]!;
const validEnvelope = { ok: true, data: validContent };

it('maps a rejected cloud call to UNAVAILABLE', async () => {
  const caller = { callFunction: vi.fn().mockRejectedValue(new Error('offline')) };
  const result = await createCloudContentService(caller).getTextbookContent('book-1');
  expect(result).toEqual({ ok: false, error: { code: 'UNAVAILABLE', message: 'Content service is unavailable' } });
});

it('rejects a malformed success envelope', async () => {
  const caller = { callFunction: vi.fn().mockResolvedValue({ result: { ok: true, data: {} } }) };
  const result = await createCloudContentService(caller).getTextbookContent('book-1');
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.code).toBe('INVALID_RESPONSE');
});

it('returns validated cloud content', async () => {
  const caller = { callFunction: vi.fn().mockResolvedValue({ result: validEnvelope }) };
  expect((await createCloudContentService(caller).getTextbookContent('book-1')).ok).toBe(true);
});
```

- [ ] **Step 2: 运行云适配器测试并确认失败**

运行：`npm test -- tests/services/cloud-content-service.test.ts`

预期：FAIL，云适配器尚不存在。

- [ ] **Step 3: 实现云端适配器**

定义：

```ts
export interface CloudFunctionCaller {
  callFunction(options: { name: string; data: Record<string, unknown> }): Promise<{ result?: unknown }>;
}
```

`createCloudContentService` 调用 `content-service`，传入 `{ action: 'getTextbookContent', textbookId }`。先验证响应 envelope，再用 `parseTextbookContent` 验证成功数据。调用拒绝映射为 `UNAVAILABLE`，无效 envelope 或数据映射为 `INVALID_RESPONSE`；服务端明确返回的 `NOT_FOUND` 保持不变。

- [ ] **Step 4: 写环境选择失败测试**

覆盖：本地模式返回本地服务；云模式缺少环境 ID 时抛出配置错误；云模式缺少 caller 时抛出配置错误；环境为 `pilot` 或 `production` 时不能使用空云环境 ID。

- [ ] **Step 5: 实现运行配置和服务工厂**

```ts
export interface RuntimeConfig {
  environment: 'local' | 'pilot' | 'production';
  contentMode: 'local' | 'cloud';
  textbookId: string;
  cloudEnvironmentId: string;
}

export const runtimeConfig: RuntimeConfig = {
  environment: 'local', contentMode: 'local',
  textbookId: 'demo-primary-3-first', cloudEnvironmentId: ''
};
```

`createContentService` 根据 `contentMode` 选择适配器，云模式必须同时具备非空 `cloudEnvironmentId` 和 `CloudFunctionCaller`。

- [ ] **Step 6: 运行相关测试和类型检查**

运行：

```bash
npm test -- tests/services/cloud-content-service.test.ts tests/services/create-content-service.test.ts
npm run typecheck
```

预期：全部 PASS。

- [ ] **Step 7: 提交云适配与环境配置**

```bash
git add miniprogram/adapters/cloud miniprogram/config miniprogram/services/content tests/services
git commit -m "feat: isolate local and cloud content services"
```

### Task 4: 建立跨 Tab 共享内容加载器

**Files:**
- Create: `miniprogram/services/content/content-loader.ts`
- Test: `tests/services/content-loader.test.ts`

**Interfaces:**
- Consumes: `ContentService.getTextbookContent(textbookId)`。
- Produces: `ContentLoader.load(textbookId, force?: boolean)`, `ContentLoader.retry()`, `ContentLoader.getSnapshot()`, `ContentSnapshot`。

- [ ] **Step 1: 写并发复用和重试失败测试**

```ts
import { describe, expect, it, vi } from 'vitest';
import type { ContentServiceResponse } from '../../shared/contracts/content';
import { DEMO_CONTENTS } from '../../shared/fixtures/demo-content';
import { ContentLoader } from '../../miniprogram/services/content/content-loader';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const successResponse: ContentServiceResponse = { ok: true, data: DEMO_CONTENTS[0]! };
const unavailableResponse: ContentServiceResponse = {
  ok: false,
  error: { code: 'UNAVAILABLE', message: 'Content service is unavailable' }
};

it('shares one in-flight request for the same textbook', async () => {
  const deferred = createDeferred<ContentServiceResponse>();
  const service = { getTextbookContent: vi.fn(() => deferred.promise) };
  const loader = new ContentLoader(service);
  const first = loader.load('book-1');
  const second = loader.load('book-1');
  expect(service.getTextbookContent).toHaveBeenCalledTimes(1);
  deferred.resolve(successResponse);
  await expect(Promise.all([first, second])).resolves.toHaveLength(2);
});

it('starts a fresh request when retrying after failure', async () => {
  const service = { getTextbookContent: vi.fn()
    .mockResolvedValueOnce(unavailableResponse)
    .mockResolvedValueOnce(successResponse) };
  const loader = new ContentLoader(service);
  await loader.load('book-1');
  await loader.retry();
  expect(service.getTextbookContent).toHaveBeenCalledTimes(2);
  expect(loader.getSnapshot().status).toBe('ready');
});
```

- [ ] **Step 2: 运行测试并确认失败**

运行：`npm test -- tests/services/content-loader.test.ts`

预期：FAIL，`ContentLoader` 尚不存在。

- [ ] **Step 3: 实现状态机**

`ContentSnapshot` 只有四种状态：`idle`、`loading`、`ready`、`error`。`load` 记录当前教材 ID 和进行中的 Promise；同教材并发调用返回同一 Promise。失败后清除进行中的 Promise但保留教材 ID，使 `retry()` 发起新请求。不同教材 ID 必须发起新请求并替换快照。

- [ ] **Step 4: 补充不同教材切换和错误信息测试**

验证不同教材不共享缓存；错误快照包含 `ContentErrorCode` 和可展示消息；成功后旧错误被清除。

- [ ] **Step 5: 运行测试和类型检查**

```bash
npm test -- tests/services/content-loader.test.ts
npm run typecheck
```

预期：全部 PASS。

- [ ] **Step 6: 提交共享加载器**

```bash
git add miniprogram/services/content/content-loader.ts tests/services/content-loader.test.ts
git commit -m "feat: share textbook loading across tabs"
```

### Task 5: 实现云函数骨架

**Files:**
- Create: `cloudfunctions/health-check/src/index.ts`
- Create: `cloudfunctions/content-service/src/index.ts`
- Test: `tests/cloudfunctions/health-check.test.ts`
- Test: `tests/cloudfunctions/content-service.test.ts`

**Interfaces:**
- Consumes: `DEMO_CONTENTS`, `ContentServiceResponse`。
- Produces: `healthCheckMain(): Promise<HealthCheckResponse>`，`contentServiceMain(event): Promise<ContentServiceResponse>`。

- [ ] **Step 1: 写云函数处理器失败测试**

健康检查必须返回 `{ ok: true, data: { status: 'ok', timestamp: <ISO string> } }`。内容服务测试覆盖有效教材、空教材 ID、未知教材 ID 和未知 action；后面三种返回明确错误，不抛出未处理异常。

```ts
expect(await contentServiceMain({ action: 'getTextbookContent', textbookId: '' }))
  .toEqual({ ok: false, error: { code: 'NOT_FOUND', message: 'Textbook not found: ' } });
```

- [ ] **Step 2: 运行测试并确认失败**

运行：`npm test -- tests/cloudfunctions`

预期：FAIL，处理器尚不存在。

- [ ] **Step 3: 实现无状态云函数处理器**

健康检查不访问数据库。内容服务只处理 `getTextbookContent`，从 `DEMO_CONTENTS` 精确查找教材并返回共享 envelope；未知 action 返回 `INVALID_RESPONSE`。处理器不读取页面状态、不使用微信身份，也不把湘少版逻辑写入分支。

- [ ] **Step 4: 运行云函数测试和类型检查**

```bash
npm test -- tests/cloudfunctions
npm run typecheck
```

预期：全部 PASS。

- [ ] **Step 5: 提交云函数骨架**

```bash
git add cloudfunctions tests/cloudfunctions
git commit -m "feat: add cloud content function skeletons"
```

### Task 6: 构建小程序双 Tab 界面与产物生成

**Files:**
- Create: `miniprogram/app.ts`
- Create: `miniprogram/app.json`
- Create: `miniprogram/app.wxss`
- Create: `miniprogram/types/app.d.ts`
- Create: `miniprogram/pages/learn/index.ts`
- Create: `miniprogram/pages/learn/index.json`
- Create: `miniprogram/pages/learn/index.wxml`
- Create: `miniprogram/pages/learn/index.wxss`
- Create: `miniprogram/pages/learn/view-model.ts`
- Create: `miniprogram/pages/parent/index.ts`
- Create: `miniprogram/pages/parent/index.json`
- Create: `miniprogram/pages/parent/index.wxml`
- Create: `miniprogram/pages/parent/index.wxss`
- Create: `miniprogram/pages/parent/view-model.ts`
- Create: `scripts/build.mjs`
- Test: `tests/pages/view-models.test.ts`
- Test: `tests/build/build-output.test.ts`

**Interfaces:**
- Consumes: `RuntimeConfig`, `createContentService`, `ContentLoader`, `TextbookContent`。
- Produces: `AppOption.globalData.contentLoader`, `createLearnViewModel(content)`, `createParentViewModel(content)`, `dist/miniprogram/` 与 `dist/cloudfunctions/`。

- [ ] **Step 1: 写页面视图模型失败测试**

学习视图模型从输入内容计算教材名、首个单元名和总词数；家长视图模型计算教材元信息与单元数。用第二套不同年级、三个单元的 fixture 再运行同一断言，证明页面逻辑没有固定教材名或单元数量。

```ts
import { expect, it } from 'vitest';
import { DEMO_CONTENTS } from '../../shared/fixtures/demo-content';
import { parseTextbookContent } from '../../shared/validation/content';
import { createLearnViewModel } from '../../miniprogram/pages/learn/view-model';
import { createParentViewModel } from '../../miniprogram/pages/parent/view-model';

it('derives both tabs from arbitrary textbook content', () => {
  const demo = DEMO_CONTENTS[0]!;
  expect(createLearnViewModel(demo)).toMatchObject({
    textbookName: '演示教材 · 三年级上册', currentUnitName: 'Unit 1', totalWords: 3
  });
  expect(createParentViewModel(demo).unitCount).toBe(2);

  const alternate = parseTextbookContent({
    textbook: { id: 'alternate', edition: 'other', year: 2027, stage: 'primary', grade: 5, term: 'second', displayName: '另一套教材' },
    units: [1, 2, 3].map((order) => ({ id: `alt-${order}`, textbookId: 'alternate', name: `Module ${order}`, order })),
    entries: [{ id: 'alt-word', unitId: 'alt-1', word: 'river', meaning: '河流', order: 1 }]
  });
  expect(createLearnViewModel(alternate).textbookName).toBe('另一套教材');
  expect(createParentViewModel(alternate).unitCount).toBe(3);
});
```

- [ ] **Step 2: 运行测试并确认失败**

运行：`npm test -- tests/pages/view-models.test.ts`

预期：FAIL，页面视图模型尚不存在。

- [ ] **Step 3: 实现共享 App 初始化与页面逻辑**

`app.ts` 创建一次 `ContentService` 和一次 `ContentLoader` 并放入 `globalData`。本地模式不调用 `wx.cloud.init`；云模式使用配置的环境 ID 初始化，并通过一个符合 `CloudFunctionCaller` 的包装器调用 `wx.cloud.callFunction`。

两个页面在 `onLoad` 中调用同一个 loader，订阅最终快照并映射为三种界面状态：加载中、已加载、可重试错误。`retry` 事件只调用 `contentLoader.retry()`。页面不直接 import fixture，也不调用数据库。

- [ ] **Step 4: 创建双 Tab 配置和基础样式**

`app.json` 注册 `pages/learn/index` 与 `pages/parent/index`，配置固定的纯文字“学习”“家长”tabBar，避免为工程骨架引入临时图标资产。页面视觉遵循 `DESIGN.md` 的平静海岛色彩与儿童可读字号，但本任务只展示教材摘要、演示模式标识和服务状态，不实现今日航程或周报内容。

- [ ] **Step 5: 写构建输出失败测试**

测试先删除 `dist/`，执行 `npm run build`，然后断言存在：

```text
dist/miniprogram/app.js
dist/miniprogram/app.json
dist/miniprogram/pages/learn/index.js
dist/miniprogram/pages/learn/index.wxml
dist/miniprogram/pages/parent/index.js
dist/cloudfunctions/health-check/index.js
dist/cloudfunctions/content-service/index.js
```

同时读取输出 JS，确认没有残留指向根目录 `shared/` 的运行时 import。

```ts
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it('builds a self-contained WeChat project', () => {
  rmSync(resolve('dist'), { recursive: true, force: true });
  execFileSync('npm', ['run', 'build'], { stdio: 'inherit', shell: process.platform === 'win32' });
  const required = [
    'dist/miniprogram/app.js', 'dist/miniprogram/app.json',
    'dist/miniprogram/pages/learn/index.js', 'dist/miniprogram/pages/learn/index.wxml',
    'dist/miniprogram/pages/parent/index.js',
    'dist/cloudfunctions/health-check/index.js', 'dist/cloudfunctions/content-service/index.js'
  ];
  for (const path of required) expect(existsSync(resolve(path)), path).toBe(true);
  expect(readFileSync(resolve('dist/miniprogram/pages/learn/index.js'), 'utf8')).not.toMatch(/from ['"].*shared\//);
});
```

- [ ] **Step 6: 实现 esbuild 构建脚本**

`scripts/build.mjs` 执行以下确定性步骤：

1. 删除并重新创建 `dist/`；
2. 将小程序 `app.ts`、页面 `index.ts` 作为独立 `iife` bundle 输出到对应 `.js`；
3. 复制 `app.json`、WXML、WXSS 和页面 JSON；
4. 将两个云函数以 Node 20/CommonJS 格式 bundle 到各自目录；
5. 为每个云函数写入只包含 `{ "name": "...", "version": "1.0.0", "main": "index.js" }` 的 `package.json`；
6. 任一必需静态文件缺失时以非零状态退出。

- [ ] **Step 7: 运行页面测试、构建测试和类型检查**

```bash
npm test -- tests/pages/view-models.test.ts tests/build/build-output.test.ts
npm run typecheck
npm run build
```

预期：全部 PASS，`dist/` 可生成且不会提交到 Git。

- [ ] **Step 8: 提交小程序界面和构建系统**

```bash
git add miniprogram scripts tests/pages tests/build .gitignore
git commit -m "feat: add native mini program tab shell"
```

在 `.gitignore` 增加 `node_modules/`、`dist/`、`project.private.config.json`，保留现有 `.superpowers/`。

### Task 7: 添加微信项目配置、部署文档和最终验证

**Files:**
- Create: `project.config.json`
- Create: `project.private.config.example.json`
- Create: `README.md`
- Create: `docs/deployment/wechat-cloud.md`
- Modify: `docs/superpowers/specs/2026-09-22-wechat-pilot-foundation-design.md`

**Interfaces:**
- Consumes: `dist/miniprogram/`、`dist/cloudfunctions/`、`RuntimeConfig`。
- Produces: 微信开发者工具导入配置、无 AppID 的本地演示说明、试点/生产云环境部署步骤。

- [ ] **Step 1: 创建微信项目配置**

`project.config.json` 使用：

```json
{
  "description": "K12 英语单词速记微信小程序",
  "compileType": "miniprogram",
  "miniprogramRoot": "dist/miniprogram/",
  "cloudfunctionRoot": "dist/cloudfunctions/",
  "appid": "touristappid",
  "setting": { "es6": true, "minified": true, "postcss": true },
  "projectname": "k12-english-word-voyage"
}
```

示例私有配置说明取得 AppID 后将 `appid` 替换为真实值；真实私有配置已由 `.gitignore` 排除。

- [ ] **Step 2: 编写根 README**

README 必须给出：Node 20+ 前提、`npm install`、`npm run check`、构建输出位置、微信开发者工具导入目录、本地演示模式说明，以及“当前没有 AppID，因此未完成真实云环境验证”的明确限制。

- [ ] **Step 3: 编写云开发部署文档**

`docs/deployment/wechat-cloud.md` 按顺序说明：

1. 注册小程序并取得 AppID；
2. 创建互相隔离的试点和生产云环境；
3. 修改 `runtime.ts` 中的环境、内容模式和云环境 ID；
4. 运行 `npm run check`；
5. 在微信开发者工具中导入仓库根目录；
6. 上传 `health-check` 与 `content-service`；
7. 验证两个 Tab 读取相同教材，并验证断网时出现重试错误；
8. 迁移独立腾讯云时替换云函数 caller、数据访问、存储和身份适配，不修改页面契约。

- [ ] **Step 4: 更新设计文档状态**

将设计文档状态从“已获用户批准，待实施计划”改为“已实施并通过自动化验证；真实微信云环境验证等待 AppID”。不要改变已批准的设计内容。

- [ ] **Step 5: 运行完整验证**

```bash
npm run check
git diff --check
git status --short
```

预期：类型检查、所有 Vitest 测试和构建检查通过；只有本任务文件发生变化，用户已有未跟踪图片、临时目录和竞品分析文件保持未暂存。

- [ ] **Step 6: 执行代码审查**

按 `implement` 技能要求运行 `code-review`，固定比较点为实施开始前的设计提交 `858dd9b`。修复所有阻塞 Issue #1 验收的 Standards 或 Spec 问题，并重新运行 `npm run check`。

- [ ] **Step 7: 提交文档与最终修正**

```bash
git add project.config.json project.private.config.example.json README.md docs/deployment docs/superpowers/specs
git commit -m "docs: add WeChat cloud development setup"
```

- [ ] **Step 8: 报告完成、推送并关闭 Issue #1**

确认 `git log 858dd9b..HEAD --oneline` 只包含 Issue #1 实施提交。先向用户发送简短进度报告，说明自动化验证结果和真实云环境尚需 AppID；随后执行：

```bash
git push origin master
```

推送成功后，向 GitHub Issue #1 评论验证摘要和提交范围并关闭 Issue。最终向用户确认远程提交，并列出已解除阻塞的 Issues（#2、#3、#7）。
