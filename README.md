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

`wrangler.toml` の以下のプレースホルダーを実際の値に置き換える。

```toml
[[d1_databases]]
database_id = "YOUR_D1_ID"   # ← Cloudflare ダッシュボードから取得

[[kv_namespaces]]
id = "YOUR_KV_ID"            # ← Cloudflare ダッシュボードから取得
```

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

`role` を `'user'` に戻すと admin 権限を剥奪できる。`frozen = 1` を立てるとログイン拒否＋既存セッション失効になる（運用は `/admin` の凍結 UI から行う）。

> better-auth が管理する `user` テーブルの `role` / `frozen` カラムを直接更新する運用。スクリプト化は MVP 段階では行わない。

## スクリプト一覧

| コマンド                | 説明                             |
| ----------------------- | -------------------------------- |
| `pnpm dev`              | Next.js 開発サーバー (Turbopack) |
| `pnpm dev:workers`      | Workers ローカルサーバー         |
| `pnpm build`            | Next.js プロダクションビルド     |
| `pnpm build:workers`    | Workers ビルド（ドライラン）     |
| `pnpm test`             | 全テスト実行                     |
| `pnpm test:watch`       | テスト（ウォッチモード）         |
| `pnpm test:workers`     | Workers テストのみ               |
| `pnpm typecheck`        | TypeScript 型チェック            |
| `pnpm lint`             | OxLint + ESLint                  |
| `pnpm format`           | OxFmt フォーマット               |
| `pnpm format:check`     | フォーマットチェック             |
| `pnpm db:migrate`       | D1 マイグレーション（本番）      |
| `pnpm db:migrate:local` | D1 マイグレーション（ローカル）  |
| `pnpm deploy:workers`   | Workers デプロイ                 |

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
├── wrangler.toml         # Cloudflare Workers 設定
└── drizzle.config.ts     # Drizzle Kit 設定
```

## デプロイ

```bash
pnpm deploy:workers
```

Cloudflare Workers へデプロイする。事前に `wrangler login` で認証が必要。
