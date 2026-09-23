# Versioned Content Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight web content studio and shared lifecycle service that can create, preview, review, publish, withdraw, and roll back one reusable vocabulary asset with textbook-specific placement while preserving every historical version.

**Architecture:** Platform-neutral domain contracts and lifecycle rules sit behind `ContentManagementService`; in-memory, browser-persistent, and WeChat Cloud adapters implement explicit ports. A React admin app and a TypeScript CLI use the management gateway, while the Mini Program continues to read only validated published projections through `ContentService`.

**Tech Stack:** TypeScript 5.9, Vitest, React 19, Vite 6, esbuild, native WeChat Mini Program, WeChat Cloud Functions, CloudBase Web SDK, browser `localStorage`, Node 20+.

**Spec:** `docs/superpowers/specs/2026-09-23-versioned-content-publishing-design.md`

## Global Constraints

- Vocabulary assets and textbook placements are stored and versioned separately.
- Established versions are immutable; corrections create new versions.
- Saving or importing a draft never grants approval.
- Only an explicit human approval record permits publication.
- Publish, withdraw, and rollback operations are authorized and audited server-side.
- Student reads return only approved, published, non-withdrawn projections.
- Historical publication/version identifiers remain resolvable after update, withdrawal, or rollback.
- The admin app and Mini Program never access database collections directly.
- Local mode works without AppID; real WeChat Cloud validation remains explicitly pending AppID.
- First release has one configured administrator and no open registration or complex role system.
- Media binaries stay outside the database; records contain storage references, checksums, and rights metadata.
- Preserve the existing calm interface language; the adult admin app uses stable forms and no child-game decoration.

## Review Focus

- A normalized spelling collision such as `School` versus ` school ` must reuse the same stable asset rather than create duplicates; Task 2 pins this behavior.
- Two stale editor sessions must not silently overwrite one another; Task 2 tests optimistic revision rejection.
- Replaying the same publish request after a timeout must return the original publication rather than create a duplicate; Task 3 tests request idempotency.
- Withdrawing or rolling back the current publication must not make a historical learning-reference lookup fail; Task 3 tests historical resolution.
- Corrupt browser-persisted JSON must produce a recoverable Chinese error and retain an exportable backup instead of crashing the admin app; Task 5 tests recovery behavior.

---

### Task 1: Define versioned content contracts and validation

**Files:**
- Create: `shared/contracts/content-management.ts`
- Create: `shared/validation/content-management.ts`
- Modify: `shared/contracts/content.ts`
- Modify: `shared/validation/content.ts`
- Modify: `shared/fixtures/demo-content.ts`
- Test: `tests/contracts/content-management-validation.test.ts`
- Test: `tests/contracts/published-content-validation.test.ts`

**Interfaces:**
- Consumes: existing `Textbook`, `Unit`, `ContentErrorCode`, and runtime validation conventions.
- Produces: `VocabularyAsset`, `VocabularyAssetVersion`, `TextbookPlacement`, `TextbookPlacementVersion`, `ReviewRecord`, `Publication`, `AuditEvent`, `MediaReference`, `ManagedContentState`, `PublishedVocabularyEntry`, `parseManagedContentState(value)`, and `parseTextbookContent(value)`.

- [ ] **Step 1: Write failing management-contract tests**

Cover a complete valid aggregate and reject: duplicate IDs, a placement pointing to another asset, non-positive versions/revisions, an approved review targeting mismatched versions, invalid media checksums, fewer than two unique distractors, and empty correction candidates.

```ts
const validState = createManagedContentFixture();
expect(parseManagedContentState(validState)).toEqual(validState);
expect(() => parseManagedContentState({
  ...validState,
  assetVersions: [{ ...validState.assetVersions[0], version: 0 }],
})).toThrow(/version/);
```

- [ ] **Step 2: Run the management-contract tests and verify RED**

Run: `npm test -- tests/contracts/content-management-validation.test.ts`

Expected: FAIL because the new contracts and parser do not exist.

- [ ] **Step 3: Add exact domain contracts**

Define these public shapes:

```ts
export type WorkflowStatus = 'draft' | 'in_review' | 'approved';
export type PublicationStatus = 'published' | 'withdrawn';

export interface MediaReference {
  id: string;
  storageKey: string;
  mediaType: 'image' | 'audio';
  mimeType: string;
  byteSize: number;
  sha256: string;
  rightsSource: string;
  reviewed: boolean;
}

export interface VocabularyAsset {
  id: string;
  normalizedWord: string;
  createdAt: string;
}

export interface VocabularyAssetVersion {
  id: string;
  assetId: string;
  version: number;
  revision: number;
  status: WorkflowStatus;
  word: string;
  baseMeaning: string;
  audio: MediaReference;
  mnemonicStory: string;
  image: MediaReference;
  distractors: string[];
  correctionCandidates: string[];
  createdBy: string;
  createdAt: string;
}

export interface TextbookPlacement {
  id: string;
  assetId: string;
  textbookId: string;
  unitId: string;
}

export interface TextbookPlacementVersion {
  id: string;
  placementId: string;
  version: number;
  revision: number;
  status: WorkflowStatus;
  textbookMeaning: string;
  order: number;
  ageCopyOverride: string;
  createdBy: string;
  createdAt: string;
}
```

Add `ReviewRecord`, `Publication`, and `AuditEvent` with immutable IDs, target version IDs, actor, timestamp, result/reason, and request ID where applicable. `ManagedContentState` contains arrays for all records and `currentPublicationByPlacement: Record<string, string>`.

- [ ] **Step 4: Implement runtime validation**

Follow the existing parser style: reject unknown object shapes, invalid ISO timestamps, malformed SHA-256 values, orphan references, duplicate stable/version IDs, version sequences below one, invalid workflow transitions encoded in persisted state, and current pointers that do not reference a published record.

- [ ] **Step 5: Write failing published-projection tests**

Extend `VocabularyEntry` into a required versioned student entry:

```ts
export interface PublishedVocabularyEntry extends VocabularyEntry {
  assetId: string;
  assetVersionId: string;
  placementId: string;
  placementVersionId: string;
  publicationId: string;
  publishedAt: string;
  audio: MediaReference;
  mnemonicStory: string;
  image: MediaReference;
  distractors: string[];
  correctionCandidates: string[];
}
```

Assert `parseTextbookContent` rejects an entry missing any version ID or using an unreviewed media reference.

- [ ] **Step 6: Update the demo fixture and parser**

Give every demo entry deterministic asset, placement, publication, audio, and image references. Keep the existing textbook/unit IDs so Issue #1 page tests remain stable.

- [ ] **Step 7: Run contract tests and typecheck**

Run:

```bash
npm test -- tests/contracts/content-management-validation.test.ts tests/contracts/published-content-validation.test.ts tests/contracts/content-validation.test.ts
npm run typecheck
```

Expected: all contract tests PASS and typecheck exits 0.

- [ ] **Step 8: Commit**

```bash
git add shared tests/contracts
git commit -m "feat: define versioned vocabulary content contracts"
```

---

### Task 2: Implement draft editing and human review lifecycle

**Files:**
- Create: `content-management/repositories/content-repository.ts`
- Create: `content-management/repositories/in-memory-content-repository.ts`
- Create: `content-management/services/content-management-service.ts`
- Create: `content-management/services/content-errors.ts`
- Create: `content-management/services/content-preview-projector.ts`
- Create: `content-management/testing/create-managed-content-fixture.ts`
- Test: `tests/content-management/draft-review-lifecycle.test.ts`
- Test: `tests/content-management/concurrency.test.ts`

**Interfaces:**
- Consumes: Task 1 contracts and parser.
- Produces: `ContentRepository`, `InMemoryContentRepository`, `ContentManagementService`, `ContentManagementError`, `normalizeWord(word)`, `listContent(filters)`, `getDraft(draftId)`, `createDraft(input)`, `updateDraft(input)`, `previewDraft(draftId)`, `submitForReview(input)`, `approve(input)`, and `reject(input)`.

- [ ] **Step 1: Write failing lifecycle tests**

Test this public sequence:

```ts
const draft = await service.createDraft({
  actorId: 'admin-1', word: 'school', textbookId: 'demo-primary-3-first',
  unitId: 'demo-unit-2', textbookMeaning: '学校', order: 1,
  content: completeContentFields,
});
expect(draft.assetVersion.status).toBe('draft');
await service.submitForReview({ actorId: 'admin-1', draftId: draft.id, expectedRevision: 1 });
await service.approve({ actorId: 'admin-1', draftId: draft.id, checklist: allTrueChecklist });
```

Also prove saving/importing does not approve, incomplete review checklists are rejected, rejected content returns to draft via a new revision, and editing `in_review` or `approved` content is rejected.

The same test must call `previewDraft` before review and assert it returns the exact student sequence—standard audio, mnemonic story/image, textbook meaning/distractors, and correction candidates—without creating a review, publication, or learning record.

- [ ] **Step 2: Run lifecycle tests and verify RED**

Run: `npm test -- tests/content-management/draft-review-lifecycle.test.ts`

Expected: FAIL because the service and repository do not exist.

- [ ] **Step 3: Define repository and domain errors**

Use explicit repository methods rather than exposing collections:

```ts
export interface ContentRepository {
  findAssetByNormalizedWord(word: string): Promise<VocabularyAsset | undefined>;
  getDraftBundle(draftId: string): Promise<ManagedDraftBundle | undefined>;
  saveDraftBundle(bundle: ManagedDraftBundle, expectedRevision?: number): Promise<void>;
  appendReview(review: ReviewRecord): Promise<void>;
  appendAudit(event: AuditEvent): Promise<void>;
  listState(): Promise<ManagedContentState>;
}
```

`ContentManagementError` exposes codes `NOT_FOUND`, `INVALID_STATE`, `VALIDATION_FAILED`, `REVISION_CONFLICT`, and `DUPLICATE` without leaking storage errors.

- [ ] **Step 4: Implement draft and review transitions**

Normalize words with `trim().toLocaleLowerCase('en-US')`. Reuse an existing stable asset when the normalized spelling matches. Keep asset and placement versions separate, but return them as one `ManagedDraftBundle` for editing and review.

Every successful command appends an audit event. Submission freezes the reviewed revision; approval requires every checklist item to be `true` and creates an immutable review record.

`listContent` returns only summary metadata and supports word, textbook, unit, and lifecycle filters. `getDraft` returns one editable bundle. `previewDraft` uses `content-preview-projector.ts` to create a validated preview model from the draft pair without changing repository state.

- [ ] **Step 5: Write failing normalization and concurrency tests**

Assert `School`, ` school `, and `SCHOOL` share one `VocabularyAsset`. Load revision 1 twice, save the first as revision 2, then assert the second save fails with `REVISION_CONFLICT` and does not overwrite revision 2.

- [ ] **Step 6: Implement optimistic revision protection**

The in-memory repository deep-clones reads/writes and compares `expectedRevision` before replacement. Conflict errors include the current revision but not the full stored content.

- [ ] **Step 7: Run lifecycle, concurrency, and type checks**

Run:

```bash
npm test -- tests/content-management/draft-review-lifecycle.test.ts tests/content-management/concurrency.test.ts
npm run typecheck
```

Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add content-management tests/content-management
git commit -m "feat: add vocabulary draft and review lifecycle"
```

---

### Task 3: Publish, withdraw, rollback, and resolve historical content

**Files:**
- Modify: `content-management/repositories/content-repository.ts`
- Modify: `content-management/repositories/in-memory-content-repository.ts`
- Modify: `content-management/services/content-management-service.ts`
- Create: `content-management/services/published-content-projector.ts`
- Modify: `miniprogram/services/content/content-service.ts`
- Modify: `miniprogram/adapters/local/local-content-service.ts`
- Modify: `cloudfunctions/content-service/src/index.ts`
- Test: `tests/content-management/publication-lifecycle.test.ts`
- Test: `tests/content-management/published-projection.test.ts`
- Modify: `tests/services/local-content-service.test.ts`
- Modify: `tests/cloudfunctions/content-service.test.ts`

**Interfaces:**
- Consumes: approved asset/placement versions and review records from Task 2.
- Produces: `publish(input)`, `withdraw(input)`, `rollback(input)`, `getPublicationHistory(placementId)`, `resolveHistoricalPublication(publicationId)`, and `projectPublishedTextbook(state, textbookId)`.

- [ ] **Step 1: Write failing publication lifecycle tests**

Assert that draft or merely submitted content cannot publish. An approved pair publishes atomically, creates one audit record, and becomes the placement's current pointer. Missing or unreviewed media, absent distractors, and version-pair mismatch all fail without changing the prior current pointer.

- [ ] **Step 2: Run lifecycle tests and verify RED**

Run: `npm test -- tests/content-management/publication-lifecycle.test.ts`

Expected: FAIL because publication commands do not exist.

- [ ] **Step 3: Extend the repository with atomic publication commands**

```ts
export interface PublishTransactionInput {
  publication: Publication;
  audit: AuditEvent;
  expectedCurrentPublicationId: string | null;
}

publishAtomically(input: PublishTransactionInput): Promise<Publication>;
withdrawAtomically(input: WithdrawTransactionInput): Promise<void>;
rollbackAtomically(input: RollbackTransactionInput): Promise<Publication>;
findPublicationByRequestId(requestId: string): Promise<Publication | undefined>;
getPublication(publicationId: string): Promise<Publication | undefined>;
```

The in-memory implementation applies changes to a cloned state and swaps the clone only after all checks succeed.

- [ ] **Step 4: Implement publish, withdraw, and rollback**

`publish` validates both target versions have matching approved reviews and reviewed media, then checks `requestId` for idempotency. `withdraw` marks the current publication withdrawn and clears the current pointer. `rollback` creates a new publication pointing to the selected historical version pair; it never reactivates or mutates the old record.

- [ ] **Step 5: Write failing idempotency and historical-resolution tests**

Call `publish` twice with the same request ID and expect the same publication ID and one record. Publish v1 and v2, withdraw v2, roll back to v1, and prove `resolveHistoricalPublication(v2.id)` still returns the original v2 projection.

- [ ] **Step 6: Implement the published projector**

`projectPublishedTextbook(state, textbookId)` joins only current non-withdrawn publications to their asset and placement versions and returns validated `TextbookContent`. Sort units by unit order and entries by placement order. Historical resolution projects the selected publication without changing current visibility.

- [ ] **Step 7: Wire the existing student services**

Extend `ContentService` with:

```ts
getTextbookContent(textbookId: string): Promise<ContentServiceResponse>;
getHistoricalPublication(publicationId: string): Promise<ContentServiceResponse>;
```

Update local and cloud adapters plus the `content-service` cloud handler. Unknown, withdrawn-current, and non-published data return `NOT_FOUND`; malformed projections return `INVALID_RESPONSE` with developer diagnostics.

- [ ] **Step 8: Run publication and student-service tests**

Run:

```bash
npm test -- tests/content-management/publication-lifecycle.test.ts tests/content-management/published-projection.test.ts tests/services tests/cloudfunctions/content-service.test.ts
npm run typecheck
```

Expected: all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add content-management miniprogram cloudfunctions tests
git commit -m "feat: publish and restore versioned vocabulary content"
```

---

### Task 4: Add authorization, media ports, and the cloud management function

**Files:**
- Create: `content-management/auth/admin-auth-provider.ts`
- Create: `content-management/media/media-storage.ts`
- Create: `content-management/media/wechat-media-storage.ts`
- Create: `content-management/repositories/cloud-content-repository.ts`
- Create: `content-management/transport/content-management-handler.ts`
- Create: `cloudfunctions/content-management/src/index.ts`
- Create: `cloudfunctions/content-management/src/cloud-database.ts`
- Create: `cloudfunctions/content-management/src/wechat-context.ts`
- Modify: `scripts/build.mjs`
- Test: `tests/content-management/authorization.test.ts`
- Test: `tests/content-management/media-validation.test.ts`
- Test: `tests/content-management/cloud-content-repository.test.ts`
- Test: `tests/cloudfunctions/content-management.test.ts`
- Modify: `tests/build/build-output.test.ts`

**Interfaces:**
- Consumes: Task 2/3 service commands.
- Produces: `AdminAuthProvider.requireAdmin(context)`, `MediaStorage.createUploadIntent(input)`, `MediaStorage.verify(reference)`, `createContentManagementHandler(dependencies)`, and cloud function `main(event, context)`.

- [ ] **Step 1: Write failing authorization tests**

Exercise the transport handler, not UI visibility. Anonymous and non-allowlisted identities must receive `UNAUTHORIZED` for save, review, publish, withdraw, rollback, and upload-intent actions. An allowlisted administrator reaches the service command with the resolved actor ID.

- [ ] **Step 2: Run authorization tests and verify RED**

Run: `npm test -- tests/content-management/authorization.test.ts`

Expected: FAIL because auth and transport modules do not exist.

- [ ] **Step 3: Implement auth and transport action routing**

```ts
export interface AdminAuthProvider {
  requireAdmin(context: unknown): Promise<{ actorId: string }>;
}

export type ManagementAction =
  | 'listContent' | 'getDraft' | 'saveDraft' | 'submitForReview'
  | 'approve' | 'reject' | 'preview' | 'publish'
  | 'withdraw' | 'rollback' | 'createUploadIntent';
```

Parse every event before dispatch. Convert domain errors into stable error envelopes. Do not return stack traces, allowlists, storage credentials, or review-only data through student endpoints.

- [ ] **Step 4: Write failing media tests**

Reject unsupported MIME types, zero/oversized files, malformed checksums, missing rights source, and unreviewed media during publication. A valid image/audio request returns an expiring upload intent with a generated storage key under `content/<asset-id>/<media-id>`.

- [ ] **Step 5: Implement media ports and local/cloud adapters**

```ts
export interface UploadIntent {
  mediaId: string;
  storageKey: string;
  expiresAt: string;
  uploadToken: string;
}

export interface MediaStorage {
  createUploadIntent(input: CreateUploadIntentInput): Promise<UploadIntent>;
  verify(reference: MediaReference): Promise<void>;
}
```

The local adapter emits deterministic test intents. The WeChat adapter emits a cloud path and short-lived opaque token understood by the admin cloud client; no permanent secret is returned.

- [ ] **Step 6: Write failing cloud repository contract tests**

Run the same save/read, revision-conflict, atomic-publish, idempotency, withdraw, rollback, and historical-resolution contract against `CloudContentRepository` with an injected fake database port. Assert collection operations use stable IDs and a database transaction for publication pointer changes.

- [ ] **Step 7: Implement the cloud database and media adapters**

`cloud-database.ts` wraps the minimum WeChat database calls needed by `CloudContentRepository`; it does not expose the SDK to domain code. Store stable assets, immutable versions, reviews, publications, audits, and current pointers in separate collections. `WechatMediaStorage` creates scoped cloud paths and verifies media metadata against stored upload records.

- [ ] **Step 8: Write the cloud function wrapper**

Resolve the caller identity from trusted WeChat/CloudBase context, compare it with `CONTENT_ADMIN_IDS`, instantiate cloud repository/media adapters, and delegate to `createContentManagementHandler`. Keep context resolution in `wechat-context.ts` so tests can inject fake identity and database ports.

- [ ] **Step 9: Add the cloud function to the build**

Bundle `cloudfunctions/content-management/src/index.ts` as Node 20 CommonJS under `dist/cloudfunctions/content-management/`, generate its package manifest, and extend the build-output test to require both files.

- [ ] **Step 10: Run auth, media, repository, cloud, build, and type checks**

Run:

```bash
npm test -- tests/content-management/authorization.test.ts tests/content-management/media-validation.test.ts tests/content-management/cloud-content-repository.test.ts tests/cloudfunctions/content-management.test.ts tests/build/build-output.test.ts
npm run typecheck
npm run build
```

Expected: all tests PASS and the third cloud function is present.

- [ ] **Step 11: Commit**

```bash
git add content-management cloudfunctions scripts tests
git commit -m "feat: secure content management cloud commands"
```

---

### Task 5: Build the browser-persistent management gateway and React admin app

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tsconfig.json`
- Create: `admin/index.html`
- Create: `admin/src/main.tsx`
- Create: `admin/src/app.tsx`
- Create: `admin/src/styles.css`
- Create: `admin/src/gateway/content-management-gateway.ts`
- Create: `admin/src/gateway/local-content-management-gateway.ts`
- Create: `admin/src/gateway/cloud-content-management-gateway.ts`
- Create: `admin/src/storage/browser-content-store.ts`
- Create: `admin/src/storage/browser-content-repository.ts`
- Create: `admin/src/view-model/content-editor.ts`
- Create: `admin/src/view-model/content-preview.ts`
- Create: `admin/src/pages/login-page.tsx`
- Create: `admin/src/pages/content-list-page.tsx`
- Create: `admin/src/pages/content-editor-page.tsx`
- Create: `admin/src/pages/content-preview-page.tsx`
- Create: `admin/src/pages/version-history-page.tsx`
- Create: `vite.admin.config.ts`
- Test: `tests/admin/browser-content-store.test.ts`
- Test: `tests/admin/editor-workflow.test.ts`
- Test: `tests/admin/admin-build.test.ts`

**Interfaces:**
- Consumes: management commands and contracts from Tasks 1–4.
- Produces: browser `ContentManagementGateway`, local/cloud gateway implementations, five admin pages, and `dist/admin/`.

- [ ] **Step 1: Install the UI dependencies**

Add runtime dependencies `react`, `react-dom`, and `@cloudbase/js-sdk`; add dev dependencies `@types/react`, `@types/react-dom`, and `vite@^6`. Set `jsx` to `react-jsx` and include `admin/**/*.ts` plus `admin/**/*.tsx` in TypeScript checks.

- [ ] **Step 2: Write failing browser-store tests**

Use an injected `Storage` fake. Assert round-trip persistence, schema validation on read, and atomic replacement after a successful write. For malformed stored JSON, expect:

```ts
expect(() => store.load()).toThrowErrorMatchingObject({ code: 'CORRUPT_LOCAL_CONTENT' });
expect(store.exportRawBackup()).toBe(originalCorruptText);
```

- [ ] **Step 3: Run browser-store tests and verify RED**

Run: `npm test -- tests/admin/browser-content-store.test.ts`

Expected: FAIL because browser storage does not exist.

- [ ] **Step 4: Implement browser persistence and gateways**

`BrowserContentStore` validates through `parseManagedContentState`; corrupt data is not overwritten. `BrowserContentRepository` implements the same repository contract with an in-memory transaction copy followed by one validated `localStorage` replacement. `LocalContentManagementGateway` composes that repository and service with actor `local-admin` and clearly reports local mode. `CloudContentManagementGateway` initializes the CloudBase Web SDK from runtime configuration, calls only the `content-management` cloud function, uploads media through the SDK using server-issued intents, and validates every response.

- [ ] **Step 5: Write failing editor workflow tests**

Test pure view-model functions for required fields, normalized word display, asset-versus-placement field separation, full preview ordering, state-dependent button availability, Chinese error mapping, and high-risk confirmation requirements.

- [ ] **Step 6: Implement the five-page admin application**

Use one routed application state without adding a router dependency. Required interactions:

- Login chooses configured cloud login or visibly marked local admin mode.
- List filters by word, textbook, unit, and lifecycle status.
- Editor separates reusable asset and textbook placement panels.
- Preview renders audio, mnemonic story/image, textbook meaning/distractors, and corrections in student order.
- History shows immutable versions/audits and requires reason plus confirmation for withdraw/rollback.

Every control has a text label, keyboard focus style, loading state, success message, and actionable Chinese error. Adult body text is at least 16px and touch targets are at least 44px.

- [ ] **Step 7: Write and pass the admin build test**

Add `build:admin` using `vite --config vite.admin.config.ts build`. The test removes `dist/admin`, runs the script through `npm_execpath`, and asserts `dist/admin/index.html` plus hashed JS/CSS assets exist without imports that escape the output directory.

Run:

```bash
npm test -- tests/admin/browser-content-store.test.ts tests/admin/editor-workflow.test.ts tests/admin/admin-build.test.ts
npm run typecheck
npm run build:admin
```

Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add admin package.json package-lock.json tsconfig.json vite.admin.config.ts tests/admin
git commit -m "feat: add lightweight vocabulary content studio"
```

---

### Task 6: Add validated content-pack import and export CLI

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `tools/content-cli.ts`
- Create: `content-packs/demo-school.json`
- Test: `tests/tools/content-cli.test.ts`

**Interfaces:**
- Consumes: Task 1 parser and Task 2 draft creation commands.
- Produces: `npm run content -- validate <file>`, `export <file>`, and `import <file>`; import output is draft-only.

- [ ] **Step 1: Add `tsx` and write failing CLI tests**

Run the CLI as a child process against temporary content packs. Test valid validation, malformed contract rejection with a field path, deterministic export, and import output where every version status is `draft` and no review/publication records exist.

- [ ] **Step 2: Run CLI tests and verify RED**

Run: `npm test -- tests/tools/content-cli.test.ts`

Expected: FAIL because the CLI does not exist.

- [ ] **Step 3: Implement explicit commands**

Use this syntax:

```text
npm run content -- validate content-packs/demo-school.json
npm run content -- import content-packs/demo-school.json --out tmp/imported-content.json
npm run content -- export tmp/imported-content.json --out tmp/exported-content.json
```

Reject unknown commands/options and overwrite only when `--force` is supplied. Never accept an option that publishes or writes approval records. Sort arrays by stable ID/version before export so repeated exports are byte-stable.

- [ ] **Step 4: Add the complete demo content pack**

The `school` pack contains reviewed media metadata, a mnemonic story, image/audio references, at least three distractors, two correction candidates, and one placement in `demo-unit-2`. Import deliberately strips review/publication state to prove the manual gate.

- [ ] **Step 5: Run CLI and type checks**

Run:

```bash
npm test -- tests/tools/content-cli.test.ts
npm run content -- validate content-packs/demo-school.json
npm run typecheck
```

Expected: tests PASS and validation exits 0.

- [ ] **Step 6: Commit**

```bash
git add tools content-packs package.json package-lock.json tests/tools
git commit -m "feat: add validated vocabulary content packs"
```

---

### Task 7: Prove the complete lifecycle and document deployment

**Files:**
- Create: `tests/e2e/content-publishing-lifecycle.test.ts`
- Modify: `tests/build/build-output.test.ts`
- Modify: `tests/admin/admin-build.test.ts`
- Modify: `scripts/build.mjs`
- Modify: `package.json`
- Modify: `project.config.json`
- Modify: `README.md`
- Modify: `docs/deployment/wechat-cloud.md`
- Modify: `docs/superpowers/specs/2026-09-23-versioned-content-publishing-design.md`

**Interfaces:**
- Consumes: every public interface from Tasks 1–6.
- Produces: one automated end-to-end lifecycle, combined build/check commands, admin/cloud deployment instructions, and implemented spec status.

- [ ] **Step 1: Write the failing end-to-end lifecycle test**

Using only public gateways/services:

1. import the `school` content pack as draft;
2. confirm student lookup returns `NOT_FOUND`;
3. preview the complete entry;
4. submit and approve every checklist item;
5. publish v1 and confirm student lookup returns all rich fields and version IDs;
6. create and publish v2 with a textbook-only meaning override;
7. prove another textbook placement still uses its original meaning;
8. withdraw v2 and confirm current student lookup excludes it;
9. resolve v2 historically;
10. roll back to v1 and confirm current lookup returns v1 while v2 history remains resolvable.

- [ ] **Step 2: Run the lifecycle test and verify RED**

Run: `npm test -- tests/e2e/content-publishing-lifecycle.test.ts`

Expected: FAIL until all adapters are assembled through one gateway fixture.

- [ ] **Step 3: Add the integration composition and pass the lifecycle test**

Create only the smallest test/development composition needed to assemble the in-memory repository, local media adapter, local admin identity, management service, and student projection. Do not add a fourth production architecture.

- [ ] **Step 4: Integrate all build commands**

Make `npm run build` generate:

```text
dist/miniprogram/
dist/admin/
dist/cloudfunctions/health-check/
dist/cloudfunctions/content-service/
dist/cloudfunctions/content-management/
```

Make the build-output tests call focused build scripts without invoking `npm test`, and make `npm run check` run typecheck, all Vitest tests, CLI demo validation, and the combined build without recursive script loops.

- [ ] **Step 5: Update configuration and documentation**

Document:

- local admin URL and explicit local-mode warning;
- the single-admin allowlist configuration;
- CloudBase web authentication setup;
- required database collections and indexes;
- media MIME/size/rights requirements;
- uploading all three cloud functions;
- importing a content pack creates drafts only;
- preview/review/publish/withdraw/rollback acceptance steps;
- historical version IDs required by future learning records;
- real cloud auth, storage, transaction, and device validation still waiting for AppID.

Update the design status to `已实施并通过自动化验证；真实微信云环境验证等待 AppID` only after the full check passes.

- [ ] **Step 6: Run complete verification**

Run:

```bash
npm run check
git diff --check
git status --short
```

Expected: typecheck passes; all tests pass; all three cloud functions, Mini Program, and admin app build; only Issue #2 files are changed; existing user image/tmp/research files remain untracked and unstaged.

- [ ] **Step 7: Run the required whole-branch code review**

Use `code-review` with fixed point `502c071`. Review both repository standards and `docs/superpowers/specs/2026-09-23-versioned-content-publishing-design.md`. Fix every Critical/Important finding through a failing regression test followed by a green full suite. Ledger any deferred Minor finding.

- [ ] **Step 8: Commit final integration and documentation**

```bash
git add package.json scripts project.config.json README.md docs tests/e2e
git commit -m "docs: complete versioned content publishing workflow"
```

- [ ] **Step 9: Report, merge, push, and close Issue #2**

Before pushing, report the completed lifecycle and verification totals to the user, explicitly noting that real WeChat Cloud validation still requires AppID. Then fast-forward the isolated branch into local `master`, rerun `npm run check`, push `origin/master`, comment the commit range and verification summary on Issue #2, and close it. Confirm which dependent issues are newly unblocked. Preserve all unrelated untracked user files.
