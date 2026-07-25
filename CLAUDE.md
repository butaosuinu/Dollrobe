# ドール服管理システム — CLAUDE.md

## General Guidelines

- **常に日本語で返答してください** (Always respond in Japanese)
- ファイル保存時に内容が変更される場合がありますが、これは oxfmt によるフォーマットなので気にしないでください
- 過剰なコメントは**禁止**
- 作業ログ的なコメントは**禁止**

## Static Analysis Rules

### 自動チェック（PostToolUse hook）

以下は Edit/Write のたびに自動実行される（手動実行不要）:

- **oxfmt** — フォーマット自動修正
- **oxlint** — 高速 lint チェック

### ファイル変更完了時のチェック（必須）

1ファイルの変更が完了した時点で、以下を**必ず手動実行**すること:

1. **型チェック**: `npx tsc-files --noEmit -p <tsconfig> <file>`
2. **ESLint**: `npx eslint <file>`

#### tsconfig 選択ルール（`-p` フラグ必須）

| ファイルの場所                                                                                                       | 使用する tsconfig               |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `src/` 配下（下記 Worker 専用ファイル・`src/app/sw.ts` 除く）                                                        | `-p tsconfig.app.json`          |
| `workers/` 本体コード（`*.test.ts` 除く）                                                                            | `-p tsconfig.workers.json`      |
| `workers/` テストコード（`*.test.ts`）                                                                               | `-p tsconfig.workers-test.json` |
| `src/app/sw.ts`                                                                                                      | `-p tsconfig.sw.json`           |
| `src/lib/image/extract-colors.worker.ts` / `extract-colors-core.ts` / `extract-colors-types.ts` / `opencv-loader.ts` | `-p tsconfig.worker.json`       |

#### 禁止事項

- `npx tsc --noEmit path/to/file.ts` は使用禁止（tsconfig.json 設定が無視されるため）
- `-p` なしの `npx tsc-files --noEmit path/to/file.ts` は使用禁止（CI と異なる tsconfig が使われるため）

### アーキテクチャ境界の検査（dependency-cruiser）

- `pnpm depcruise` が import グラフを解析し、アーキテクチャ境界を検査する（`precheck` に含まれる）
- 検査対象: workers ⇔ src の境界、workers 内のレイヤリング（trpc → services → repositories/db）、循環依存、孤立モジュール、バレルファイル禁止
- 設定は `.dependency-cruiser.cjs`。全ルールが severity `error`
- 違反した場合は原則コード側を直す。正当な例外（新規エントリポイント等）に限り設定の `pathNot` に追記する
- **検出は近似**であり、green は「違反が無い」ことの証明ではない。レイヤリングは直接 import のエッジのみを見る（多段経由は検出しない）、孤立モジュールは import も被 import も両方ゼロのファイルのみ、バレル禁止は `index.ts(x)` が import された時点でのみ発火する（dead code やバレルの網羅検出は担保しない）

### PR 作成前の最終チェック（必須）

- **PR 作成前に `pnpm precheck` を必ず実行すること**
- エラーが残っている状態での PR 作成は禁止
- テストも含めた完全チェック: `pnpm precheck:full`

### Formatting (OxFmt)

- PostToolUse hook で自動実行されるため、通常は手動実行不要
- 手動実行が必要な場合: `npx oxfmt path/to/file --write`
- プロジェクト全体のフォーマット: `pnpm format`（必要な場合のみ使用）

### i18n（Lingui.js）

#### 必須ルール

- `src/` 配下の `.tsx` ファイルでユーザーに表示される文字列は、必ず Lingui マクロで囲むこと
  - JSX コンテンツ: `<Trans>テキスト</Trans>`（import 元: `@lingui/react/macro`）
  - 属性値（placeholder, aria-label, title 等）: `t` マクロ（import 元: `@lingui/react/macro` の `useLingui`）
  - 定数・ラベル定義: `msg` マクロ（import 元: `@lingui/core/macro`）
- ハードコードされた日本語文字列の直書きは禁止

#### UI テキスト変更後の手順（必須）

1. `pnpm i18n:extract` — PO ファイルを更新
2. `src/locales/{en,ko,zh}/messages.po` の新規エントリ（`msgstr ""`）に翻訳を記入
3. `pnpm i18n:compile` — コンパイル済みファイルを再生成

#### 自動検証

- `pnpm i18n:check` が precheck に組み込まれている — en/ko/zh に未翻訳エントリがあると失敗する
- 詳細なマクロの使い分け・パターンは `/i18n` スキルを参照

## Github Guidelines

- `gh` コマンドを使用して issue や PR にアクセスすること

## Cloudflare Operations

- 障害対応・ロールバック・gradual deployments の運用ルールは [`docs/cloudflare-runbook.md`](docs/cloudflare-runbook.md) を参照
- Sentry へのエラー転送は `workers/src/lib/sentry.ts` 経由で `Sentry.withSentry` でラップ済み

---

## プロジェクト概要

ドール服（1/3・MSD・SD などのスケールドール用）を管理する PWA アプリ。
QR スキャンで物理的な収納場所とデジタル在庫を紐づけ、「どの服がどの引き出しにあるか」を常に把握できるようにする。

**対象ユーザー**: 最大 100 人程度（開発者の友人含む）  
**最重要課題**: 物理とデジタルの同期ズレ（ドリフト問題）を低コストで解決する

---

## 技術スタック

| レイヤー        | 技術                                                   |
| --------------- | ------------------------------------------------------ |
| フロントエンド  | Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 |
| オフライン      | Dexie.js (IndexedDB) + PWA                             |
| QR スキャン     | jsQR（ブラウザネイティブ、アプリ不要）                 |
| API             | Cloudflare Workers + Hono                              |
| DB              | Cloudflare D1 (SQLite)                                 |
| ORM             | Drizzle ORM + drizzle-zod                              |
| 画像            | Cloudflare R2 (S3 互換)                                |
| KV / セッション | Cloudflare KV                                          |
| Cron / Queue    | Cloudflare Queues + Cron Triggers                      |
| 認証・状態管理  | **Claude Code 上で詳細設計**                           |

---

## ディレクトリ構成

```
/
├── CLAUDE.md
├── wrangler.jsonc
├── drizzle.config.ts          # Drizzle Kit マイグレーション設定
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── page.tsx           # ダッシュボード
│   │   ├── garments/          # 服一覧・詳細・登録
│   │   ├── locations/         # 収納場所グリッド
│   │   ├── scan/              # QR スキャン画面
│   │   └── coordinates/       # コーデ一覧（Phase 3）
│   ├── components/
│   │   ├── ui/
│   │   ├── garment/
│   │   ├── location/
│   │   └── scan/
│   ├── lib/
│   │   ├── confidence.ts      # 信頼度計算（純粋関数）
│   │   ├── db/dexie.ts        # IndexedDB スキーマ
│   │   └── qr/                # スキャン・ラベル生成
│   └── types/index.ts         # 全型定義（フロント・バック共通）
└── workers/
    ├── src/
    │   ├── index.ts           # Hono + tRPC サーバー
    │   ├── auth.ts            # better-auth 設定
    │   ├── types.ts           # Env 型定義
    │   ├── db/                # Drizzle ORM（ドメインモデル層）
    │   │   ├── schema.ts      # テーブル定義（source of truth）
    │   │   ├── client.ts      # DrizzleDB インスタンス生成
    │   │   ├── helpers.ts     # JSON 配列 customType
    │   │   └── validation.ts  # drizzle-zod による Zod バリデーション
    │   ├── lib/               # 層をまたぐ共通ユーティリティ
    │   │   ├── schemas.ts     # Zod 入力スキーマ（validation.ts から re-export + スキャン系）
    │   │   ├── d1-helpers.ts  # wrapDbError（DB エラーの構造化ログ + TRPCError 変換）
    │   │   └── logger.ts      # 構造化ロガー
    │   ├── trpc/
    │   │   ├── index.ts       # tRPC 初期化・ミドルウェア
    │   │   ├── router.ts      # AppRouter 合成
    │   │   └── routers/       # 薄い tRPC ルーター
    │   │       ├── garment.ts
    │   │       ├── location.ts
    │   │       ├── scan.ts
    │   │       └── coordinate.ts  # Phase 3 切り出しポイント
    │   ├── services/          # ビジネスロジック層
    │   │   ├── types.ts       # ServiceResult 型
    │   │   ├── garment-service.ts
    │   │   ├── location-service.ts
    │   │   └── scan-service.ts
    │   └── repositories/      # データアクセス層（Drizzle query builder）
    │       ├── garment-repository.ts
    │       ├── location-repository.ts
    │       └── scan-repository.ts
    └── migrations/
        ├── 0001_initial.sql
        ├── 0002_auth.sql
        └── 0003_garment_metadata.sql
```

---

## コアデータモデル（`src/types/index.ts`）

```typescript
type DollSize =
  | "SD"
  | "SD13"
  | "SD17"
  | "MSD"
  | "YoSD"
  | "DD"
  | "DDdy"
  | "DDS"
  | "DDP"
  | "MDD"
  | "other";
type GarmentCategory =
  | "tops"
  | "bottoms"
  | "onepiece"
  | "dress"
  | "set"
  | "outer"
  | "underwear"
  | "socks"
  | "shoes"
  | "hat"
  | "accessory"
  | "other";
type GarmentStatus = "stored" | "checked_out" | "lost";
type ConfidenceLabel = "confirmed" | "uncertain" | "unknown";
// confirmed : 0.70〜1.00 / uncertain : 0.30〜0.69 / unknown : 0.00〜0.29

export type Garment = {
  id: string;
  userId: string;
  name: string;
  category: GarmentCategory;
  dollSize: DollSize;
  colors: string[]; // HSL 文字列配列
  tags: string[];
  imageUrl: string | null; // R2 URL
  locationId: string | null; // null = 取出し中
  status: GarmentStatus;
  lastScannedAt: number; // Unix timestamp (ms)
  confidenceDecayDays: number; // デフォルト 30。季節物は 90 など
  brand: string | undefined; // メーカー/ディーラー名
  checkedOutAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type StorageCase = {
  id: string;
  userId: string;
  name: string; // "衣装ケース A"
  rows: number;
  cols: number;
  createdAt: number;
};

export type StorageLocation = {
  id: string;
  userId: string;
  caseId: string;
  label: string; // "A-1" など
  row: number;
  col: number;
  createdAt: number;
};

export type Coordinate = {
  id: string;
  userId: string;
  name: string;
  garmentIds: string[];
  isAiGenerated: boolean;
  memo: string | null;
  createdAt: number;
  updatedAt: number;
};
```

---

## DB スキーマ

**スキーマ定義の source of truth は `workers/src/db/schema.ts`（Drizzle ORM テーブル定義）。**

- マイグレーション SQL は `workers/migrations/0001_initial.sql` に存在するが、スキーマの主体は Drizzle に移行済み
- バリデーションスキーマは `workers/src/db/validation.ts` で drizzle-zod により自動生成
- JSON 配列カラム（colors, tags, garmentIds）は `db/helpers.ts` の `jsonArrayColumn` customType で SQLite TEXT ↔ `string[]` をマッピング
- リポジトリ層は raw SQL ではなく Drizzle query builder を使用
- マイグレーション運用は **expand & contract**（列追加・データ移行・列削除を別 PR）。詳細・CD フロー・ロールバック手順は [`docs/cloudflare-deploy.md`](docs/cloudflare-deploy.md) を参照

---

## 信頼度ロジック（`src/lib/confidence.ts`）

**純粋関数のみ。フロント・バック両方から import する。**

```typescript
import type { Garment, ConfidenceLabel } from "@/types";

// 信頼度はDBに保存しない。lastScannedAt と confidenceDecayDays から常に計算する。
export function getConfidence(g: Garment): number {
  if (g.status !== "stored") return 0;
  const days = (Date.now() - g.lastScannedAt) / 86_400_000;
  return Math.max(0, 1 - days / g.confidenceDecayDays);
}

export function getConfidenceLabel(c: number): ConfidenceLabel {
  if (c >= 0.7) return "confirmed";
  if (c >= 0.3) return "uncertain";
  return "unknown";
}

// 場所QRスキャン時の機会確認対象
export function getItemsNeedingReview(garments: Garment[], locationId: string) {
  return garments.filter(
    (g) =>
      g.locationId === locationId &&
      g.status === "stored" &&
      getConfidence(g) < 0.7,
  );
}

// 孤立したチェックアウト検出（デフォルト3日）
export function getOrphanedCheckouts(garments: Garment[], thresholdDays = 3) {
  return garments.filter((g) => {
    if (g.status !== "checked_out" || !g.checkedOutAt) return false;
    return (Date.now() - g.checkedOutAt) / 86_400_000 >= thresholdDays;
  });
}
```

---

## QR スキーム

```
服側 QR:    dwg://g/{garment-id}
場所側 QR:  dwg://l/{location-id}
```

**スキャンフロー**: 場所 QR スキャン → `activeLocationId` セット → 服 QR 連続スキャン → 「全部ある ✓」タップ → 対象全件の `lastScannedAt` をリセット

**iOS 制約**: Web NFC API は Android Chrome のみ。引き出しには QR + NFC シールを両方貼付。

---

## 構造化ロガー（`workers/src/lib/logger.ts`）

リクエストスコープ化された構造化ロガー。すべてのログは JSON 形式で出力され、`requestId` で相関可能。

### アーキテクチャ

```
リクエスト受信
  → requestId ミドルウェア（Hono 組み込み）
  → createLogger() で requestId 付きロガー生成 → c.set("logger", ...)
  → tRPC loggingMiddleware（procedure/type をコンテキスト追加）
  → サービス層 → リポジトリ層（引数でロガーを受け取る）
```

### 使い方のルール

- **`console.log` の直接使用は禁止** — 必ずロガーを使うこと
- ロガーは `createLogger()` で生成（`workers/src/lib/logger.ts`）
- 各層（サービス・リポジトリ）ではロガーを**引数として受け取る**（DI パターン）
- コンテキスト拡張には `logger.child()` を使用

```typescript
// サービス層での使い方
export const listGarments = async ({
  drizzleDb,
  userId,
  logger,
}: {
  readonly drizzleDb: DrizzleDb;
  readonly userId: string;
  readonly logger: Logger;
}): Promise<ServiceResult<readonly Garment[]>> => {
  // ...
};
```

### ログレベル

環境変数 `LOG_LEVEL` で設定（デフォルト: `"info"`）。レベル: `debug` | `info` | `warn` | `error`

### エラーハンドリング

リポジトリ層の DB エラーは `wrapDbError({ context, logger })` でキャッチし、構造化ログ出力 + `TRPCError` をスロー。

```typescript
.catch(wrapDbError({ context: "fetch garments", logger }))
```

### テストでのロガー

テストでは `createLogger({ minLevel: "error" })` を使用し、info/debug ログを抑制する。

### Sentry 連携

- `NEXT_PUBLIC_SENTRY_DSN` が設定されている場合のみ有効化
- クライアント: セッションリプレイ 10%、エラー時 100%
- サーバー: トレース 100% サンプリング

---

## Workers API（`workers/src/index.ts`）

```typescript
// ルーターはドメインで分割する。
// Phase 3 で /api/coordinate の向き先を外部サービスに変えてもフロントは無変更。
app.route("/api/garments", garmentRoutes);
app.route("/api/locations", locationRoutes);
app.route("/api/scan", scanRoutes);
app.route("/api/sync", syncRoutes);
app.route("/api/coordinate", coordinateRoutes); // ← Phase 3 切り出しポイント
app.route("/api/digest", digestRoutes); // Cron から呼ばれる
```

| Method     | Path                       | 説明                                    |
| ---------- | -------------------------- | --------------------------------------- |
| GET/POST   | `/api/garments`            | 服一覧・登録                            |
| PUT/DELETE | `/api/garments/:id`        | 服更新・削除                            |
| GET/POST   | `/api/locations`           | 収納場所一覧・登録                      |
| POST       | `/api/scan/checkin`        | チェックイン                            |
| POST       | `/api/scan/checkout`       | チェックアウト                          |
| POST       | `/api/scan/confirm-all`    | 機会確認（全件 lastScannedAt リセット） |
| POST       | `/api/scan/orphan-resolve` | 孤立チェックアウトの 3 択解決           |
| POST       | `/api/sync`                | クライアント差分同期                    |

### Env 型

```typescript
export type Env = {
  DB: D1Database;
  BUCKET: R2Bucket;
  KV: KVNamespace;
  QUEUE: Queue;
  R2_PUBLIC_URL: string;
  // 認証関連の env は Claude Code 上で設計
};
```

---

## wrangler.jsonc 構成（staging / production 物理分離）

トップレベルは `pnpm dev:workers` / `pnpm build:workers --dry-run` 用のローカル既定値。実デプロイは `--env staging` / `--env production` で別 D1 / R2 / KV / Queue にバインドされる。週次ダイジェスト用 `triggers.crons` は production のみ。

```jsonc
{
  "name": "doll-wardrobe-api",
  "main": "workers/src/index.ts",
  "compatibility_date": "2025-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "upload_source_maps": true,
  // ローカル既定値
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "doll-wardrobe-db",
      "database_id": "YOUR_D1_ID",
      "migrations_dir": "workers/migrations",
    },
  ],
  "r2_buckets": [
    { "binding": "BUCKET", "bucket_name": "doll-wardrobe-images" },
  ],
  "kv_namespaces": [{ "binding": "KV", "id": "YOUR_KV_ID" }],
  "queues": {
    "producers": [{ "binding": "QUEUE", "queue": "doll-wardrobe-digest" }],
    "consumers": [{ "queue": "doll-wardrobe-digest", "max_batch_size": 10 }],
  },
  "env": {
    "staging": {
      "name": "doll-wardrobe-api-staging",
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "doll-wardrobe-db-staging",
          "database_id": "YOUR_STAGING_D1_ID",
          "migrations_dir": "workers/migrations",
        },
      ],
      "r2_buckets": [
        { "binding": "BUCKET", "bucket_name": "doll-wardrobe-images-staging" },
      ],
      "kv_namespaces": [{ "binding": "KV", "id": "YOUR_STAGING_KV_ID" }],
      "queues": {
        "producers": [
          { "binding": "QUEUE", "queue": "doll-wardrobe-digest-staging" },
        ],
        "consumers": [
          { "queue": "doll-wardrobe-digest-staging", "max_batch_size": 10 },
        ],
      },
      "vars": {
        "TRUSTED_ORIGINS": "https://staging.dollrobe.example",
        "ALLOWED_ORIGINS": "https://staging.dollrobe.example",
        "LOG_LEVEL": "debug",
      },
    },
    "production": {
      /* staging と同形。リソース名・ID を -production に差し替え、triggers.crons を追加 */
      "triggers": { "crons": ["0 9 * * 1"] },
    },
  },
}
```

デプロイは `pnpm deploy:workers:staging` / `pnpm deploy:workers:production`。型は `pnpm cf-typegen` で `worker-configuration.d.ts` に生成される（gitignore 済み）。

---

## 設計原則

1. **収納動作 = 記録動作** — QR スキャンそのものが記録イベント。手入力しない。
2. **信頼度は DB に保存しない** — `lastScannedAt` から常に計算する。
3. **機会確認は場所 QR スキャン時のみ** — その場にいる瞬間を使う。
4. **通知は週 1 回のダイジェストのみ** — 個別通知は出さない。
5. **孤立チェックアウトは 3 択** — どの答えでも状態が前進する設計。
6. **`/api/coordinate` は独立** — 他ルーターと密結合させない。Phase 3 の切り出し口。
7. **オフラインファースト** — 読み取りは IndexedDB から。Workers への書き込みは非同期同期。
8. **ドメインモデルは Drizzle テーブル定義が source of truth** — `db/schema.ts` から型・バリデーションを導出する。

---

## フェーズロードマップ

**Phase 1** — QR スキャン + 服・収納場所 CRUD + IndexedDB + PWA マニフェスト  
**Phase 2** — 収納グリッド UI + 信頼度表示 + 機会確認 + 週次ダイジェスト + マルチユーザー認証  
**Phase 3** — コーデ提案（Claude API → 必要なら外部 Go/Rust サービスに切り替え）

---

## 未設計（Claude Code 上で検討）

- 認証方式の詳細（Clerk vs 自前 JWT vs その他）
- 状態管理の詳細設計（Zustand のスライス構成、IndexedDB との同期戦略）

## Testing Standards

### Testing Trophy に従うテスト戦略

#### Testing Trophy とは

- **Kent C. Dodds の Testing Trophy**に従ってテスト戦略を構築する
- 下から順に: Static Analysis → Unit Tests → Integration Tests → E2E Tests
- **インテグレーションテストが最も重要**であり、最も多くの価値を提供する
- テストピラミッドではなく、インテグレーションテストを最重要視する Testing Trophy の形を採用

#### 各テストレベルの役割と優先順位

1. **Static Analysis（静的解析）** - 基盤
   - TypeScript 型チェック、ESLint、OxFmt
   - 基本的な構文エラーや型エラーを早期発見
   - コードの品質と一貫性を保証

2. **Unit Tests（ユニットテスト）** - 限定的使用
   - 純粋な関数、ユーティリティ関数のテスト
   - ビジネスロジックのテスト（カスタム Hooks 等）
   - モック使用は最小限に抑制
   - 複雑な計算ロジックや独立した関数のみを対象
   - **「純粋なビジネスロジック相当」の具体例**（DB・I/O・DOM 依存が無いもの）:
     - `src/lib/confidence.ts` のような純粋関数（信頼度・分類・並び替え等の計算ロジック）
     - バリデーション・データ変換ユーティリティ
     - カスタム Hook 内の純粋ロジック（副作用を含まない部分）
   - UI コンポーネント・サービス層・リポジトリ層は原則インテグレーションテストで扱う

3. **Integration Tests（インテグレーションテスト）** - **最重要**
   - **React コンポーネントのテスト - これが最も価値が高い**
   - 実際のユーザー操作をシミュレート
   - MSW を使用して API レスポンスをモック
   - 実際の DOM 操作とユーザーインタラクションを検証
   - コンポーネント間の連携を検証
   - **実際のユーザー体験に最も近いテスト**

4. **E2E Tests（エンドツーエンドテスト）** - 最小限
   - 重要なユーザーフローの検証
   - 実際のブラウザでの動作確認
   - インテグレーションテストでカバーできない統合的なシナリオのみ

### Test Philosophy

- **Kent C. Dodds の Testing Trophy に厳密に従う**
- **インテグレーションテストを最優先**で実装する
- ビジネスロジックに対してユニットテストを実施する
- デトロイト学派に従う
- React コンポーネントに対してはインテグレーションテストを実施する
- **実際のユーザー体験に近いテストを優先**し、過度なモックは避ける
- カバレッジは目的ではなく**最低保証**である。数字を満たすためだけのテストは書かない
- インテグレーションテストで自然に網羅される分岐はそちらを優先し、純粋関数の分岐はユニットテストで明示的に網羅する

### カバレッジ要件（必須）

- **分岐網羅（branch coverage）80% 以上を必達**とする
- 計測コマンド: `pnpm test:coverage`
- 計測対象は `vitest.config.ts` の `coverage.include` / `coverage.exclude` に従う
  - 主な除外: `src/types/`, `src/locales/`, `src/app/**/{layout,loading,error,not-found}.tsx`, `src/app/sw.ts`, `src/lib/image/extract-colors*.ts`, `src/lib/image/opencv-loader.ts`, `workers/src/types.ts`, `workers/src/db/schema.ts`, `e2e/`, `scripts/`
- **PR 作成前に `pnpm test:coverage` を実行し、branches が 80% を下回らないことを確認すること**
- 80% を下回る場合は、不足分のテストを追加してから PR を作成する
- 例外的に閾値未達のまま進める必要がある場合は、PR 説明にその理由を必ず明記する（自動的なスキップ・閾値の引き下げは禁止）

### テストモック基盤（必須ルール）

#### vi.mock の集約（`src/test/setup.ts`）

以下のモジュールは `setup.ts` で `vi.mock` 済みのため、**各テストファイルでの再 `vi.mock` 禁止**。状態の制御は対応する `setupXxx` ヘルパー（`src/test/mocks/modules/`）で行うこと。

- `next/navigation` → `setupNextNavigation`
- `next/link` → 自動（`<a>` タグへ展開）
- `jsqr` → `setupJsqr` / `createMockQRCode`
- `@/hooks/useNfcReader` → `setupUseNfcReader`
- `@/hooks/useColorExtraction` → `setupUseColorExtraction`
- `@/lib/image/compressImage` → 自動（`{file, width, height}` を即座に解決する `vi.fn()` モック。`vi.mocked(compressImage).mockImplementationOnce(...)` で個別テストの挙動を上書き可能）

ID 生成・ブランド候補・画像アップロード・NFC capability・オンライン同期は集約モックを置かず、実装をそのまま使う:

- `@paralleldrive/cuid2` の `createId()` は実 ID を返す。テストは固定値ではなく形式（`/^[a-z0-9]+$/i` 等）でアサートすること
- `@/hooks/useImageUpload` は実フックを使い、`POST */api/images/upload/*` を `server.use(http.post(...))` で個別 MSW ハンドルする
- `@/hooks/useNfcSupported` は実フックを使い、必要なら `vi.spyOn(nfcCapability, "isNfcSupported").mockReturnValue(...)` で切り替える
- `@/hooks/useBrandSuggestions` は `garmentsAtom` から導出されるため、`testDb.garment.create({brand: "..."})` + `seedDbFromTestDb()` で投入する
- `@/hooks/useOnlineSync` は実フックを使う（`sync.pull`/`sync.push` のデフォルトハンドラに依存する）

新規に集約モックを追加する場合は `src/test/mocks/modules/` に factory + setup を作り、`setup.ts` に `vi.mock` 登録する。**個別テストファイルでの `vi.mock` は、そのテスト固有のローカル component をスタブ化する場合に限定する。**

#### tRPC モック（dispatcher 方式）

- MSW の wildcard handler（`http.all("*/trpc/*", ...)`）の使用は**禁止**
- 全テスト共通のデフォルト resolver は `src/test/mocks/trpc/defaults.ts` の `registerDefaultQuery` / `registerDefaultMutation` に登録する
- 個別テストでオーバーライドする場合は `server.use(trpcQuery(path, resolver))` / `server.use(trpcMutation(path, resolver))` を使う（`src/test/mocks/trpc/handlerFactory.ts`）
- `clearTrpcOverrides()` は `setup.ts` の `afterEach` で自動実行されるため明示呼び出し不要

#### 共通テストヘルパー（優先利用）

以下のユーティリティを各テストで再実装することは**禁止**。必ず既存ヘルパーを利用する:

- `src/test/helpers/canvas.ts` — `installCanvas2DContext` / `installCanvas2DContextNull` / `installCanvasToBlob` / `installCanvasToDataURL` / `installVideoReadyState`（`afterEach` での復元は `restoreCanvasMocks` が `setup.ts` で自動実行）
- `src/test/helpers/mediaDevices.ts` — `installMediaDevices` / `createMockMediaStream` / `createMockTrack`
- `src/test/helpers/files.ts` — `createTestFile` / `createPngFile` / `createJpegFile` / `createCsvFile` / `createJsonFile`
- `src/test/helpers/fileInput.ts` — `fireFileSelect` / `fireSingleFileSelect`
- `src/test/helpers/responses.ts` — `createJsonResponse` / `createTextResponse` / `createErrorResponse`
- `src/test/helpers/seedDb.ts` — `seedDbFromTestDb`（`testDb` の内容を IndexedDB に投入）

`Object.defineProperty(HTMLCanvasElement.prototype, ...)` 等を**直接書く**のは禁止。必ず `installXxx` 系ヘルパー経由で行うこと（プロトタイプ復元が `setup.ts` の `afterEach` で一元管理されるため）。

#### Workers 側のテストロガー

- workers 側のテストでは `createLogger({ minLevel: "error" })` を直接書かず、`workers/src/test/helpers.ts` の `createTestLogger()` を使うこと

#### モック state のイミュータブル更新

- `src/test/mocks/modules/` の各 setup ヘルパーが返す state オブジェクトのプロパティを**直接書き換えてはならない**
- 状態を変更する場合は、再度 `setupXxx({...})` を呼び出すか、ヘルパーが提供する setter（例: `setupNextNavigation` の `setSearchParams` / `setParams` / `setPathname`）を使うこと

## Important Conventions

### TypeScript Guidelines

- **バレルファイル（index.ts）禁止**
  - `index.ts` や `index.tsx` によるre-exportは使用禁止
  - 常に直接ファイルパスでインポートすること

- **型の使用**
  - `any`型は使用禁止
  - 型アサーション（Type Assertion）は使用禁止
  - タイプエイリアス（type）をインターフェース（interface）より優先して使用
  - 型名はアッパーキャメルケース（PascalCase）を使用

```typescript
// 良い例
type User = {
  id: number;
  name: string;
};

type ProductData = {
  id: string;
  price: number;
};
```

- **変数とイミュータブル性**
  - `let`は基本的に使用禁止。`const`を優先的に使用
  - 宣言済みのオブジェクトのプロパティをミュータブルに更新することを禁止
  - `for`よりも`map`、`filter`などの高階関数の使用を優先
  - オブジェクトのプロパティを更新するようなミュータブルな走査を禁止

```typescript
// 良い例
const newArray = array.map((item) => transformItem(item));

// 新しいオブジェクトを作成する（イミュータブル）
const updatedUser = { ...user, age: 30 };

// オブジェクトのイミュータブルな更新
const user = { name: "John", age: 25 };
const updatedUser = { ...user, age: 26 };

// 配列のイミュータブルな更新
const items = [1, 2, 3];
const newItems = [...items, 4];
const filteredItems = items.filter((item) => item > 1);
const mappedItems = items.map((item) => item * 2);
```

- **命名規則**
  - 変数名や関数名はロアキャメルケース（camelCase）を使用
  - 定数は大文字のスネークケース（UPPER_SNAKE_CASE）を使用
  - クラス・型名はアッパーキャメルケース（PascalCase）を使用

```typescript
// 良い例
const userName = "John";
const MAX_RETRIES = 3;
const API_ENDPOINT = "https://api.example.com";
function calculateTotal(items) {
  /* ... */
}
class UserRepository {
  /* ... */
}
```

- **値の扱い**
  - `null`の使用は DOM 関連の返り値を扱う場合以外では禁止
  - 値がない場合も常に`undefined`を使用
  - オブジェクトのプロパティが存在しない場合は`undefined`を使用

```typescript
// 良い例
const user = {
  name: "John",
  address: undefined, // 住所情報がない
};
const getValue = () => undefined; // 値が存在しない場合

// DOM関連の例外的な使用
const element = document.querySelector(".not-exist"); // null が返される可能性あり
if (element === null) {
  // DOM要素が存在しない場合の処理
}
```

- **条件と比較**
  - boolean 以外の変数で `!変数名` のような曖昧な比較を行わない
  - null、undefined、空文字列などの判定は厳密に比較演算子を使用
  - ただし、null と undefined を同時に弾く目的での `変数 != null` のような比較は許可

```typescript
// 良い例
if (value === null) {
  // nullの場合の処理
}

if (value === undefined) {
  // undefinedの場合の処理
}

if (array.length === 0) {
  // 配列が空の場合の処理
}

if (text === "") {
  // 文字列が空の場合の処理
}

// nullとundefinedを同時に弾く例外的なケース
if (value != null) {
  // valueがnullでもundefinedでもない場合の処理
  // これは許可される例外パターン
}
```

- **マジックナンバー・文字列の禁止**
  - コード内で直接数値や文字列リテラルを使用せず、常に定数を使用
  - `Object.freeze()`を使用して定数オブジェクトを作成
  - TypeScript の`as const`アサーションを活用して型安全性を高める

```typescript
// 良い例
export const REVIEW_OPTION_TYPE = Object.freeze({
  TEXT: 1,
  TEXTAREA: 2,
  SCORE: 3,
  RADIO: 4,
  CHECKBOX: 5,
  SELECT: 6,
});

// 型の定義と組み合わせる
export type ReviewOptionTypeKey = keyof typeof REVIEW_OPTION_TYPE;
export type ReviewOptionType = (typeof REVIEW_OPTION_TYPE)[ReviewOptionTypeKey];

// 使用例
if (option.type === REVIEW_OPTION_TYPE.TEXT) {
  // テキスト入力の処理
}

export const REVIEW_SETTING_TYPE = Object.freeze({
  BASIC: "basic",
  DESIGN: "design",
  PATTERN_TEST: "pattern_test",
});
```

- **RORO パターン（Receive an Object, Return an Object）**
  - 関数の引数と戻り値の両方でオブジェクトを使用
  - オブジェクトの分割代入を活用して必要なプロパティのみを取り出す

```typescript
// React コンポーネントでの適用
type ReviewData = {
  id: string;
  title: string;
  content: string;
};

type Props = {
  reviewData: ReviewData;
};

const ReviewComponent = ({ reviewData }: Props) => {
  const { id, title, content } = reviewData;
  // ...処理...
  return <div>{title}</div>;
};

// 通常の関数での適用
const calculateTax = ({
  amount,
  taxRate = 0.1,
  includeDiscount = false,
  discountRate = 0,
}) => {
  let taxableAmount = amount;

  if (includeDiscount) {
    taxableAmount = amount * (1 - discountRate);
  }

  const tax = taxableAmount * taxRate;
  const total = taxableAmount + tax;

  return {
    originalAmount: amount,
    taxableAmount,
    tax,
    total,
    effectiveTaxRate: taxRate,
    discountApplied: includeDiscount,
  };
};

// 使用例
const { total, tax } = calculateTax({
  amount: 1000,
  includeDiscount: true,
  discountRate: 0.05,
});
```

- **非同期処理**
  - await/catch を使用する
  - `Promise.then().catch()`の使用禁止
  - `try/catch`の使用禁止

### React Suspense パターン

非同期データ取得には React Suspense と ErrorBoundary を使用し、手動のローディング/エラー状態管理を避ける。

#### 基本構造

```tsx
// レイアウトコンポーネントで Suspense と ErrorBoundary をラップ
<ErrorBoundary fallback={ErrorFallback}>
  <Suspense fallback={<LoadingState />}>
    <DataComponent />
  </Suspense>
</ErrorBoundary>
```

#### Jotai での Suspense 対応 atom

```typescript
// Suspense 対応の非同期 atom
export const dataSuspenseAtom = atom(async (get) => {
  const result = await invoke<Data[]>("load_data").catch((err: unknown) => {
    throw err instanceof Error
      ? err
      : new Error("データの読み込みに失敗しました");
  });
  return result;
});

// リフレッシュ用パターン
const refreshTriggerAtom = atom(0);

export const dataWithRefreshAtom = atom(async (get) => {
  get(refreshTriggerAtom); // 依存関係を作成
  return await invoke<Data[]>("load_data");
});

export const refreshDataAtom = atom(null, (_get, set) => {
  set(refreshTriggerAtom, (prev) => prev + 1);
});
```

#### コンポーネントでの使用

```tsx
// ローディング/エラー状態の条件分岐は不要
const DataList = () => {
  const data = useAtomValue(dataSuspenseAtom); // Suspense が自動でローディング処理

  if (data.length === 0) {
    return <EmptyState />;
  }

  return <List items={data} />;
};
```

#### ErrorBoundary の実装

- React の制約によりクラスコンポーネントで実装（`getDerivedStateFromError` が必要）
- `src/components/error/ErrorBoundary.tsx` を参照

#### テストでの Suspense atom のモック

Suspense 対応 atom はテスト環境で非同期解決が難しいため、同期的な atom でモックする。

```typescript
const mockData = vi.hoisted(() => ({
  value: [] as Data[],
}));

vi.mock("../stores/dataAtoms", async () => {
  const original = await vi.importActual("../stores/dataAtoms");
  return {
    ...original,
    dataSuspenseAtom: atom(() => mockData.value), // 同期的な atom でモック
  };
});

// テスト内で値を設定
beforeEach(() => {
  mockData.value = [];
});

it("データが表示される", () => {
  mockData.value = [{ id: "1", name: "Test" }];
  render(<DataList />);
  expect(screen.getByText("Test")).toBeInTheDocument();
});
```

#### 禁止事項

- コンポーネント内での `isLoading` / `error` 状態管理
- `useEffect` 内でのデータ取得と状態更新
- ローディング/エラーの条件分岐による表示切り替え

```typescript
// 良い例 - await/catchパターン
const fetchUserData = async (id: string) => {
  const response = await fetch(`/api/users/${id}`).catch((error) => {
    return { ok: false, error };
  });

  if (!response.ok) {
    return {
      ok: false,
      error: response.error || new Error("Failed to fetch user data"),
    };
  }

  const data = await response.json().catch((error) => {
    return { ok: false, error };
  });

  if (!data.ok) {
    return { ok: false, error: data.error };
  }

  return { ok: true, data };
};

// 使用例
const result = await fetchUserData("123");
if (result.ok) {
  const userData = result.data;
  // 成功時の処理
} else {
  // エラーハンドリング
  console.error(result.error);
}
```
