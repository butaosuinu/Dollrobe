# Dollrobe Repository Guide

## 基本方針

- 原則として日本語で報告・相談する。コード、識別子、既存の英語 UI 文言は
  周辺実装に合わせる。
- 作業前に関連する実装、隣接テスト、設定ファイルを読む。推測だけで API、
  データモデル、画面挙動を変更しない。
- 情報が食い違う場合は、`package.json`、各種 config、型定義、実装、テストを
  README や `CLAUDE.md` の古い記述より優先する。差異が作業に影響する場合は
  明示する。
- 変更は依頼された範囲に限定し、既存の未コミット変更を保持する。無関係な
  整形、リネーム、依存更新、リファクタリングを混ぜない。
- コメントは「なぜ必要か」を説明する場合だけ追加する。作業ログやコードを
  言い換えただけのコメントは残さない。
- commit、push、PR 作成、Cloudflare への deploy、remote migration は、依頼に
  含まれる場合だけ実行する。

## プロジェクト概要

Dollrobe は、ドール服と物理的な収納場所を QR / NFC で結び付ける
オフラインファースト PWA である。現在の依存バージョンは必ず
`package.json` を正とする。

- Web: Next.js App Router、React、TypeScript、Tailwind CSS
- Client state / offline: Jotai、Dexie (IndexedDB)、Serwist
- API: Cloudflare Workers、Hono、tRPC
- Data: D1、Drizzle ORM、R2、KV、Queues
- Auth / observability: better-auth、Sentry
- i18n: Lingui（日本語を source locale とし、英語・韓国語・中国語を提供）

次のドメイン不変条件を壊さないこと。

- オフライン時の読み書きと、オンライン復帰後の同期を両立させる。
- ユーザーデータの取得・更新は常に `userId` でスコープする。admin 経路は
  専用の認可境界を通す。
- 信頼度は保存済みのスコアではなく、スキャン履歴などから導出する。
- D1 のドメインスキーマは `workers/src/db/schema.ts` を source of truth とする。
- 収納・スキャン操作は物理状態とデジタル状態のずれを減らす記録イベント
  として扱う。

## ディレクトリと責務

- `src/app/`: Next.js の route、layout、loading UI。公開・認証・管理画面を含む。
- `src/components/`: 再利用 UI。ドメイン別 component と `ui/` の共通部品。
- `src/stores/`: Jotai atom。Dexie、tRPC、同期キューとの連携を担う。
- `src/hooks/`: ブラウザ機能や UI 向け hook。
- `src/lib/`: 純粋ロジック、tRPC client、Dexie、CSV、QR、NFC、画像処理。
- `src/types/`: frontend / Workers で共有するドメイン型。
- `src/i18n/`, `src/locales/`: Lingui 初期化と `ja/en/ko/zh` カタログ。
- `src/test/`: frontend の共通 render、MSW、factory、mock、DOM helper。
- `workers/src/trpc/routers/`: 薄い tRPC procedure と認可境界。
- `workers/src/services/`: ビジネスルールとユースケース。
- `workers/src/repositories/`: Drizzle を使った D1 アクセス。
- `workers/src/db/`: schema、validation、client、DB helper。
- `workers/src/lib/`: 層をまたぐ共通ユーティリティ。logger、Sentry、共有 Zod 入力
  schema (`schemas.ts`)、D1 helper (`d1-helpers.ts`)。上位層に依存しない。
- `workers/src/routes/`: Hono の非 tRPC route。
- `workers/src/mcp/`, `queues/`, `scheduled/`: MCP、Queue consumer、cron。
- `workers/migrations/`: Wrangler が適用する連番付き D1 migration。
- `e2e/`: Playwright の重要ユーザーフローと fixture。
- `docs/`: Cloudflare deploy / runbook などの運用文書。

## セットアップと主要コマンド

Node.js 22 以上、`pnpm@10.28.2` を使用する。依存がない環境では
`pnpm install --frozen-lockfile` を先に実行する。

- `pnpm dev`: Next.js (`http://localhost:3000`)
- `pnpm dev:workers`: Wrangler (`http://localhost:8787`)
- `pnpm db:migrate:local`: ローカル D1 migration
- `pnpm typecheck`: app、Workers、service worker、image worker の型検査
- `pnpm lint`: OxLint + ESLint
- `pnpm depcruise`: dependency-cruiser によるアーキテクチャ境界検査
- `pnpm format` / `pnpm format:check`: OxFmt の適用 / 検査
- `pnpm i18n:check`: `en/ko/zh` の未翻訳検査
- `pnpm test`: frontend + Workers の Vitest projects (`vitest.config.ts`)
- `pnpm test:workers`: Workers テストのみ
- `pnpm test:coverage`: coverage 計測
- `pnpm test:e2e`: Playwright。Next.js と Wrangler は設定から起動される
- `pnpm build`: Next.js build
- `pnpm build:workers`: Workers deploy の dry-run
- `pnpm review-risk`: main との差分に対する PR review risk のローカル判定
- `pnpm test:review-risk`: review-risk 判定器の専用 test
- `pnpm precheck`: typecheck、lint、depcruise、format check、i18n check
- `pnpm precheck:full`: `precheck` + Vitest + review-risk test

実装中は変更箇所に近いテストを先に実行し、完了時に変更範囲に応じて検証を
広げる。`precheck` には build と E2E が含まれないため、必要な場合は別途実行
する。

### 変更ファイル単位の型検査

素早い反復には `pnpm exec tsc-files --noEmit -p <config> <files...>` を使う。
`-p` を省略した `tsc-files` や、個別ファイルを直接渡す `tsc` は使わない。

- 通常の `src/**`: `tsconfig.app.json`
- Workers 本体: `tsconfig.workers.json`
- Workers の `*.test.ts`: `tsconfig.workers-test.json`
- `src/app/sw.ts`: `tsconfig.sw.json`
- image Web Worker 関連: `tsconfig.worker.json`
- `e2e/**`: `pnpm exec tsc --noEmit -p tsconfig.e2e.json`

個別の ESLint は `pnpm exec eslint <files...>` を使う。最終的には対象を限定
しない `pnpm precheck` で、config 間の境界も確認する。

## TypeScript と実装規約

- `.oxfmtrc.json` に従い、2 spaces、semicolon、double quotes、trailing comma、
  80 columns を使用する。手作業で formatter と争わない。
- type-only の参照には `import type` を使い、`interface` より `type` を優先
  する。
- `any`、無根拠な型 assertion、non-null assertion を避ける。外部入力は Zod
  または type guard で狭める。
- `const`、`readonly`、immutable update を優先する。既存 atom や mock state
  を直接 mutate しない。
- 引数が増える関数は RORO (Receive an Object, Return an Object) にする。
  ESLint の上限は 3 parameters。
- `try/catch` と `.then()` は原則禁止。既存の
  `await expression.catch(handler)` パターンを使う。
- `export *` や re-export だけの barrel を新設せず、実ファイルから直接
  import する。`@/`、`@shared/`、`@shared/lib/` alias を既存用途に合わせる。
- PascalCase component、`useSomething.ts` hook、`*Atoms.ts` atom、
  `*.test.ts(x)` test の命名を維持する。

## React、状態管理、UI

- 既存の `src/components/ui/` とドメイン component を再利用し、同種の UI を
  route 内に重複実装しない。
- 非同期データ取得は既存の Jotai async atom + Suspense + ErrorBoundary
  パターンに合わせる。`useEffect` 内で fetch して loading / error state を
  手動管理しない。
- オフライン対応の entity 変更では、Dexie の更新、`syncQueue` への追加、
  関連 atom の refresh という既存の一連の流れを維持する。
- UI 変更では mobile viewport、keyboard 操作、focus、loading、empty、
  error state を確認する。意味のある HTML と accessible name を優先する。

## i18n

`src/**/*.tsx` のユーザー表示文字列を直書きしない。UI 文言の追加・変更時は
`.agents/skills/i18n/SKILL.md` も参照する。

- JSX text: `<Trans>` from `@lingui/react/macro`
- props や実行時文字列: `t` from `@lingui/core/macro`
- 定数 message descriptor: `msg` from `@lingui/core/macro`
- aria-label、title、placeholder、alt も翻訳対象

文言変更後は次の順で実行する。

1. `pnpm i18n:extract`
2. `src/locales/{en,ko,zh}/messages.po` の新規 `msgstr` を翻訳
3. `pnpm i18n:compile`
4. `pnpm i18n:check`

自動生成され gitignore される `messages.js` / `messages.mjs` を force add
しない。

## Workers とデータアクセス

- `workers/src/index.ts` は Hono middleware、better-auth、tRPC、画像 route、
  MCP、cron / queue の composition root として保つ。
- tRPC router は入力検証、認可、service 呼び出し、error mapping に留める。
  ビジネスルールを router や repository に埋め込まない。
- service は既存の `ServiceResult<T>`、`serviceOk`、`serviceError`、
  `throwIfError` の使い方を周辺コードに合わせる。
- repository は Drizzle query builder を優先し、schema から型を導出する。
  user-owned data には `userId` 条件を必ず含める。
- リクエストスコープの logger を引数で渡し、`logger.child()` で context を
  追加する。Workers 本体で `console.log` を追加しない。
- `workers/src/db/validation.ts` と共有入力 schema (`workers/src/lib/schemas.ts`。
  tRPC router と MCP tool が共用する) の責務を確認し、同じ validation を複数箇所
  に複製しない。
- auth、frozen user、admin、API key / MCP scope を変更する場合は、許可経路
  だけでなく拒否経路と既存 session の扱いもテストする。

## テスト規約

Testing Trophy に従い、実ユーザーに近い integration test を中心にする。
純粋関数は unit test、主要な複数サービス間フローだけ E2E で検証する。
不具合修正では可能な限り、修正前に失敗する regression test を追加する。

### Frontend

- test は実装の隣に `*.test.ts(x)` として置く。
- React test は `.agents/skills/rtl-best-practices/SKILL.md` に従い、
  `renderWithProviders`、`userEvent`、role / label / visible text query を
  優先する。実装詳細や CSS class を主な assertion にしない。
- `src/test/setup.ts` で集約済みの module を test ごとに再 `vi.mock` しない。
  `src/test/mocks/modules/` の `setupXxx` helper を使う。
- tRPC は `trpcQuery` / `trpcMutation` で procedure 単位に override する。
  `*/trpc/*` の wildcard MSW handler を追加しない。
- DOM / media / canvas / file / Dexie の helper は `src/test/helpers/` と
  `src/test/testUtils.tsx` を再利用する。

### Workers と E2E

- Workers test は Miniflare の D1 / KV / R2 / Queue binding と migration を
  利用し、認可・永続化・error mapping を一緒に検証する。
- logger は `workers/src/test/helpers.ts` の `createTestLogger()` を使う。
- DB fixture / caller は `workers/test/helpers/` と `workers/src/test/` の既存
  helper を優先する。
- Playwright は `e2e/fixtures/` と `e2e/helpers/` を再利用し、QR scan、CSV
  import、doll、garment、location、auth などの重要フローだけ追加する。
- coverage の数字だけを満たすテストは書かない。`pnpm test:coverage` の branch
  coverage は 80% 以上を維持する。

## D1、Cloudflare、機密情報

- schema / migration 変更前に `docs/cloudflare-deploy.md`、障害対応時は
  `docs/cloudflare-runbook.md` を読む。
- D1 migration は forward-only と考え、expand、backfill、code switch、
  contract を分離する。生成 SQL は必ず人間が読める形で確認する。
- `wrangler.jsonc` の local / staging / production は物理的に別リソース。
  binding 名が同じでも ID と resource name を混同しない。
- `.dev.vars`、`.env*`、secret、実 Cloudflare ID を commit しない。
- `NEXT_PUBLIC_WORKERS_URL` は web build 時に埋め込まれる。web deploy / build
  の問題を調べる際は設定値と対象環境を確認する。
- remote D1 apply、production command、rollback、gradual deployment は、
  明示された対象環境と承認なしに実行しない。

## 完了条件と PR

最低限、変更に近い test と `pnpm precheck` を通す。さらに次を目安にする。

- frontend / shared logic: `pnpm test` または関連 test
- Workers: 関連 Workers test + `pnpm build:workers`
- route、config、build 周辺: `pnpm build`
- browser workflow: 関連 Playwright spec または `pnpm test:e2e`
- 広範な変更: `pnpm precheck:full`
- UI 変更: desktop / mobile の確認と screenshot

実行できなかった検証や既知の失敗は、理由と影響範囲を完了報告に書く。
commit は一つの論理変更に絞り、短い imperative message（Conventional Commit
prefix と日本語説明を使用可）にする。PR には挙動の要約、検証コマンド、
関連 issue、UI screenshot、migration / env / Cloudflare 設定への影響を記載
する。

### PR review risk

`tools/reviewrisk` は `docs/review-risk.ja.md` の分類規範から PR の review risk
を判定する。新しい path や重要境界を追加する場合は、実装・正典・専用 test を
同じ変更で更新する。未分類 path は安全側に high とする。test file は A、通常の
GitHub workflow は H であり、critical は test・test support の削除、test の
skip・focus 追加、review gate・review-risk・quality script・既存 migration の
変更、workflow の削除、patch 読み取り不能など S1-S8 / S12 に限定する。
