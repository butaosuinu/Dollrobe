# Cloudflare デプロイ運用ガイド

Dollrobe の Cloudflare D1 / Workers デプロイと **D1 マイグレーション運用** をまとめる。スキーマ変更を伴う PR を出す前に必ず本書を読むこと。

## TL;DR

- **D1 は forward-only**。`migrations apply` を取り消す SQL は存在しない。壊れたら「逆方向の新しいマイグレーション」を当てて前進ロールバックする。
- **expand & contract** を厳守する。列追加・データ移行・列削除は **必ず別 PR** に分け、間に十分な運用期間と検証を入れる。
- スキーマは `workers/src/db/schema.ts` (Drizzle) が source of truth。SQL は `pnpm drizzle-kit generate` で生成し、コミット後 main マージで CD が apply する。
- 緊急時は `pnpm db:migrate:staging` / `pnpm db:migrate:production` で手動 apply できる。

## Environments と secrets

| 環境        | D1 database name                                      | Wrangler env      |
| ----------- | ----------------------------------------------------- | ----------------- |
| local (dev) | `doll-wardrobe-db` (Miniflare)                        | (なし、`--local`) |
| staging     | `doll-wardrobe-db` (Cloudflare 上の staging リソース) | `staging`         |
| production  | `doll-wardrobe-db` (同 production リソース)           | `production`      |

**重要**: D1 の指定は **database name** (`doll-wardrobe-db`) で行う。`wrangler.toml` の binding 名 (`DB`) は env 設定変更で変わり得るが、database name は不変。

### 必要な GitHub Secrets

- `CLOUDFLARE_API_TOKEN` — D1 / Workers にアクセスできる API トークン。
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare アカウント ID。

### 必要な GitHub Environments

- `staging` — main への push で自動デプロイ。レビュアー不要。
- `production` — `workflow_dispatch` 経由のみ。**required reviewers** を設定して承認ゲートにする。

## D1 マイグレーション運用 (expand & contract)

### 基本ルール

1. **列追加と列削除は別 PR に分ける**。同じ PR でやらない。
2. **データ移行 (backfill) は専用 PR**。スキーマ変更 PR と混ぜない。
3. **D1 は forward-only**。古いコードと新スキーマ、新しいコードと古いスキーマ、どちらの組み合わせでも壊れないように設計する。
4. **NULLABLE で追加 / DEFAULT を付ける**。NOT NULL を後付けする場合は backfill 完了後に別 PR で。

### 典型フロー: 列リネーム (`old_name` → `new_name`)

1. **Expand PR** — 新列 `new_name` を `NULLABLE` で追加。アプリは両列を書き込み、`old_name` を読む。
2. **Backfill PR** — `UPDATE table SET new_name = old_name WHERE new_name IS NULL` を SQL マイグレーションで実行。
3. **Code switch PR** — アプリが `new_name` を読むように切り替え。`old_name` は読まないが書き込みは残す（古いコードのため）。
4. **(運用期間) — 全プロセスが新コードに切り替わったことを確認。**
5. **Contract PR** — `old_name` を DROP。アプリから `old_name` への書き込みも削除。

### 典型フロー: 列追加

1. 新列を `NULLABLE` または `DEFAULT` 付きで追加。
2. アプリで書き込み開始（読みはまだ optional 扱い）。
3. （必要なら）backfill PR で既存行に値を埋める。
4. アプリで読み・必須化。必要なら別 PR で `NOT NULL` 化。

### 典型フロー: 列削除

1. アプリから当該列の読み・書きを除去する PR をマージ。
2. 全環境で安定稼働を確認。
3. 別 PR で `DROP COLUMN` を含むマイグレーションを追加。

## `drizzle-kit generate` → CD apply フロー

1. `workers/src/db/schema.ts` を編集する（Drizzle テーブル定義）。
2. `pnpm drizzle-kit generate` を実行 → `workers/migrations/NNNN_*.sql` が生成される。
3. **生成 SQL を必ず human review する**。Drizzle は SQLite で `ALTER TABLE` の制約があり、必要なら table 再作成戦略になる。意図通りか確認。
4. ファイル名は連番 4 桁 + snake_case 説明（既存 `0001_initial.sql` … 命名規則に準拠）。
5. PR を出して CI 緑 + レビュー承認後、main にマージ。
6. **CD (`.github/workflows/deploy.yml`) が `migrate-d1-staging` ジョブを自動実行** → staging の D1 に apply。
7. staging で smoke 確認後、Actions タブから **`Deploy` workflow を `workflow_dispatch`** で実行 → production 環境の required reviewer による承認 → `migrate-d1-production` が走る。

## 手動運用 (緊急時 / ローカルから)

`CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を環境変数にセットして実行する。

```bash
# staging
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... pnpm db:migrate:staging

# production
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... pnpm db:migrate:production
```

### 適用状況の確認

```bash
pnpm wrangler d1 migrations list doll-wardrobe-db --remote --env staging
pnpm wrangler d1 migrations list doll-wardrobe-db --remote --env production
```

### アドホッククエリ

```bash
pnpm wrangler d1 execute doll-wardrobe-db --remote --env staging --command "SELECT * FROM d1_migrations ORDER BY id DESC LIMIT 5"
```

## 失敗時のロールバック

**原則: D1 は forward-only。`migrations apply` の取り消し SQL は存在しない**。以下のいずれかで対処する。

### スキーマが壊れた場合

1. **逆方向の新しいマイグレーション** を `NNNN_revert_xxx.sql` として追加する（DROP / 値を元に戻す UPDATE など）。
2. 通常の PR フローで staging → production の順に apply する。

### Worker コードが壊れた場合（スキーマは無傷）

1. `pnpm wrangler rollback --env <staging|production>` で Worker 単独を直前のデプロイに戻す。
2. **DB スキーマには触らない**。expand & contract を守っていれば旧コードでも動くはず。

### 最終手段: D1 point-in-time restore

Cloudflare ダッシュボードから D1 の point-in-time restore が可能。**運用上は最終手段** として位置付け、通常運用では使わない（人手承認が必要、復元中はサービス停止）。

## マイグレーション PR チェックリスト

PR を出す前に確認:

- [ ] `pnpm drizzle-kit generate` で生成した SQL を目視レビューした。
- [ ] expand / backfill / contract を別 PR に分けている。
- [ ] 新列は `NULLABLE` または `DEFAULT` 付き（NOT NULL は backfill 後の別 PR）。
- [ ] 古いアプリコードと新スキーマの組み合わせで壊れないことを確認した。
- [ ] 必要なら backfill SQL を別 PR で用意した。
- [ ] `pnpm precheck` が緑。
- [ ] PR 説明に「expand / backfill / contract のどのフェーズか」を書いた。

## 関連ファイル

- `.github/workflows/deploy.yml` — CD 定義
- `workers/migrations/` — D1 マイグレーション SQL（連番）
- `workers/src/db/schema.ts` — Drizzle テーブル定義（source of truth）
- `drizzle.config.ts` — drizzle-kit 設定
- `wrangler.toml` — Wrangler / Cloudflare バインディング定義
