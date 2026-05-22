# Doll Wardrobe

ドール服（1/3・MSD・SD などのスケールドール用）を管理する PWA アプリ。
QR スキャンで物理的な収納場所とデジタル在庫を紐づけ、「どの服がどの引き出しにあるか」を常に把握できるようにする。

## 技術スタック

| レイヤー       | 技術                                               |
| -------------- | -------------------------------------------------- |
| フロントエンド | Next.js 15 (App Router) + TypeScript + Tailwind v4 |
| 状態管理       | Jotai + jotai-trpc                                 |
| オフライン     | Dexie.js (IndexedDB) + PWA (Serwist)               |
| QR スキャン    | jsQR（ブラウザネイティブ）                         |
| API            | Cloudflare Workers + Hono + tRPC                   |
| DB             | Cloudflare D1 (SQLite) + Drizzle ORM               |
| 画像           | Cloudflare R2                                      |
| 認証           | better-auth                                        |

## 前提条件

- **Node.js** 22 以上
- **pnpm** 10.28.2

```bash
corepack enable
corepack prepare pnpm@10.28.2 --activate
```

## ローカル開発環境の構築

### 1. リポジトリのクローンと依存インストール

```bash
git clone <repository-url>
cd algiers
pnpm install
```

### 2. Cloudflare リソースの設定

`wrangler.jsonc` 内の以下のプレースホルダーを Cloudflare ダッシュボードから取得した実 ID に置き換える。staging / production 用のリソースは `env.staging` / `env.production` セクションで同じ binding 名（`DB` / `BUCKET` / `KV` / `QUEUE`）に別 ID を割り当てる。

| 場所                                  | D1 `database_id`        | KV `id`                 |
| ------------------------------------- | ----------------------- | ----------------------- |
| トップレベル（`pnpm dev:workers` 用） | `YOUR_D1_ID`            | `YOUR_KV_ID`            |
| `env.staging`                         | `YOUR_STAGING_D1_ID`    | `YOUR_STAGING_KV_ID`    |
| `env.production`                      | `YOUR_PRODUCTION_D1_ID` | `YOUR_PRODUCTION_KV_ID` |

R2 バケット名と Queue 名も env 毎に `-staging` / `-production` サフィックスで分離されている。`TRUSTED_ORIGINS` / `ALLOWED_ORIGINS` の実ドメインも `env.staging` / `env.production` の `vars` で上書きする。

ローカル開発のみであれば、Wrangler がローカル D1/KV/R2 を自動で作成するためこの手順はスキップできる。

### 3. ローカル DB マイグレーション

```bash
pnpm db:migrate:local
```

## 開発サーバーの起動

フロントエンドと Workers をそれぞれ別のターミナルで起動する。

```bash
# ターミナル 1: Next.js 開発サーバー (http://localhost:3000)
pnpm dev

# ターミナル 2: Cloudflare Workers 開発サーバー (http://localhost:8787)
pnpm dev:workers
```

## 管理者（admin）の付与

`/admin` 配下の管理画面（ユーザー一覧・凍結・メトリクス・監査ログ）は `role = "admin"` を持つユーザーのみアクセスできる。初期 admin は D1 を直接更新して付与する。

### ローカル環境

```bash
pnpm wrangler d1 execute doll-wardrobe-db --local \
  --command "UPDATE \"user\" SET role='admin' WHERE email = 'you@example.com';"
```

### 本番環境

```bash
pnpm wrangler d1 execute doll-wardrobe-db --remote \
  --command "UPDATE \"user\" SET role='admin' WHERE email = 'you@example.com';"
```

`role` を `'user'` に戻すと admin 権限を剥奪できる。

### ユーザー凍結（frozen）の運用

**凍結は必ず `/admin/users/[id]` の凍結 UI から行う**。UI 経由なら以下が batch でアトミックに実行される:

1. `user.frozen = 1` 更新
2. 該当ユーザーの既存 better-auth session を `DELETE FROM "session" WHERE "userId" = ?` で全消去
3. `admin_audit_logs` に `user.freeze` を記録

SQL で `frozen = 1` を直接立てるだけでは **既存セッションが残ったまま** になり、認証経路（better-auth ネイティブの `/api/auth/*` 等）によっては凍結後もリクエストが通る可能性がある（tRPC / REST の主経路は `resolveAuthenticatedUserId` の frozen チェックで弾けるが、全パスは保証しない）。

緊急時に CLI から凍結する必要がある場合は session 削除も併せて実行する:

```bash
pnpm wrangler d1 execute doll-wardrobe-db --local --command "
UPDATE \"user\" SET frozen=1 WHERE email='target@example.com';
DELETE FROM \"session\" WHERE userId IN (SELECT id FROM \"user\" WHERE email='target@example.com');
"
```

> better-auth が管理する `user` テーブルの `role` / `frozen` カラムを直接更新する運用。スクリプト化は MVP 段階では行わない。

## スクリプト一覧

| コマンド                         | 説明                                   |
| -------------------------------- | -------------------------------------- |
| `pnpm dev`                       | Next.js 開発サーバー (Turbopack)       |
| `pnpm dev:workers`               | Workers ローカルサーバー               |
| `pnpm build`                     | Next.js プロダクションビルド           |
| `pnpm build:workers`             | Workers ビルド（ドライラン）           |
| `pnpm test`                      | 全テスト実行                           |
| `pnpm test:watch`                | テスト（ウォッチモード）               |
| `pnpm test:workers`              | Workers テストのみ                     |
| `pnpm typecheck`                 | TypeScript 型チェック                  |
| `pnpm lint`                      | OxLint + ESLint                        |
| `pnpm format`                    | OxFmt フォーマット                     |
| `pnpm format:check`              | フォーマットチェック                   |
| `pnpm db:migrate:staging`        | D1 マイグレーション（staging 環境）    |
| `pnpm db:migrate:production`     | D1 マイグレーション（production 環境） |
| `pnpm db:migrate:local`          | D1 マイグレーション（ローカル）        |
| `pnpm deploy:workers:staging`    | Workers デプロイ（staging 環境）       |
| `pnpm deploy:workers:production` | Workers デプロイ（production 環境）    |
| `pnpm cf-typegen`                | `worker-configuration.d.ts` 生成       |

## テスト

```bash
# 全テスト（フロントエンド + Workers）
pnpm test

# Workers テストのみ
pnpm test:workers

# ウォッチモード
pnpm test:watch
```

- フロントエンドテスト: Vitest + happy-dom + React Testing Library + MSW
- Workers テスト: Vitest + Miniflare（ローカル D1/KV/R2）

## 静的解析

```bash
# 型チェック
pnpm typecheck

# Lint
pnpm lint

# フォーマットチェック
pnpm format:check

# フォーマット自動修正
pnpm format
```

## ディレクトリ構成

```
├── src/
│   ├── app/              # Next.js App Router（ページ）
│   ├── components/       # React コンポーネント
│   ├── lib/              # ユーティリティ（信頼度計算、QR 生成等）
│   ├── stores/           # Jotai アトム
│   └── types/            # 型定義
├── workers/
│   ├── src/
│   │   ├── db/           # Drizzle ORM スキーマ・バリデーション
│   │   ├── trpc/         # tRPC ルーター
│   │   ├── services/     # ビジネスロジック層
│   │   └── repositories/ # データアクセス層
│   └── migrations/       # D1 マイグレーション SQL
├── public/               # 静的ファイル・PWA マニフェスト
├── wrangler.jsonc        # Cloudflare Workers 設定（staging / production env を物理分離）
└── drizzle.config.ts     # Drizzle Kit 設定
```

## デプロイ

```bash
# staging
pnpm deploy:workers:staging

# production
pnpm deploy:workers:production
```

Cloudflare Workers へデプロイする。事前に `wrangler login` で認証が必要。`pnpm cf-typegen` で `wrangler types` を実行すると `worker-configuration.d.ts` に staging / production 両方のバインディング型が生成される。
