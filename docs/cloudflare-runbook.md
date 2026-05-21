# Cloudflare Operations Runbook

このドキュメントは Dollrobe の Cloudflare デプロイに対する障害対応・ロールバック手順をまとめたものです。インシデント発生時に最初に読むエントリポイントです。

## 前提

- **Worker 名**: `doll-wardrobe-api` (API), `doll-wardrobe-web` (Web、子 Issue #231 で追加予定)
- **deployment 履歴**: Cloudflare Workers は **直近 100 deployment** を保持します。`wrangler rollback` で任意の過去 deployment に戻せます。
- **Durable Objects 制約**: Dollrobe は Durable Objects を使用していないため、`wrangler rollback` の DO 関連制約は該当しません。
- **Sentry**: API Worker は `@sentry/cloudflare` で計装済み。`SENTRY_DSN` が secret 設定されていればハンドラ内例外と tRPC の 5xx エラーが自動キャプチャされます。

---

## 1. デプロイ一覧の確認

最新の deployment と直近の履歴を確認するには:

```bash
wrangler deployments list --name doll-wardrobe-api
```

出力例:

```
Created:     2026-05-20 10:23:45
Author:      ci@cloudflare
Source:      Upload
Tag:         (no tag)
Message:     (no message)
Version ID:  9b1c4a3f-...
```

- **Version ID**: rollback 先を指定するキー。
- **Created**: deployment 時刻。インシデント発生時刻と突き合わせて疑わしい deployment を特定します。
- **Source**: `Upload` (CI 経由) / `Dash` (手動操作) など。

特定 version の詳細を見るには:

```bash
wrangler deployments view <version-id>
```

---

## 2. ロールバック手順

### 2.1 直近の deployment を 1 つ前に戻す

```bash
# 対話モードで一覧から選択
wrangler rollback --name doll-wardrobe-api

# 一発で直前版に戻す
wrangler rollback --name doll-wardrobe-api --message "incident: 500 spike"
```

### 2.2 特定の version-id に戻す

```bash
wrangler rollback <version-id> --name doll-wardrobe-api \
  --message "incident #XXXX: rolling back to known-good"
```

### 2.3 staging / production を両方戻すケース

両環境に同じ不具合があるなら **production を先に** 戻して影響を止めてから staging を戻す。

```bash
# 1. production を即座に戻す（ユーザー影響の停止が最優先）
wrangler rollback <version-id> --name doll-wardrobe-api --env production

# 2. staging を戻して再現確認できる状態に戻す
wrangler rollback <version-id> --name doll-wardrobe-api --env staging
```

> **注記**: `--env` フラグは子 Issue #230 で `wrangler.jsonc` に staging / production の env が定義された後に有効化されます。それまでは単一環境のみ。

### 2.4 secret / D1 / R2 / KV の扱い

- **secret**: rollback で消えません。`wrangler secret put` で投入した値はそのまま維持されます。
- **D1 マイグレーション**: コードを rollback しても DB schema は **戻りません**。schema 破壊的変更（カラム DROP など）を含む deploy を rollback する場合、事前に手動で down migration が必要です（expand & contract 運用は子 Issue #233 を参照）。
- **R2 / KV**: 状態は変わりません。

---

## 3. インシデント判断フロー

```
エラー率急増 / アラート発火
       │
       ▼
  Sentry でエラー範囲を特定
       │
       ├── 直近 deploy 後にエラーが立ち上がっている？
       │        │
       │        ├── YES → ロールバック (§2)
       │        │         + 修正を別ブランチで作業
       │        │
       │        └── NO  → ホットフィックス
       │                  + 短い PR で main → deploy
       │
       └── データ起因（特定ユーザーのみ等）
                 │
                 └── ホットフィックス + 該当データの調査
```

### 判断のしきい値

- **ロールバックを選ぶ目安**: 影響範囲が広い / 修正に 30 分以上かかる / 原因が直近 deploy 由来であることが明確
- **ホットフィックスを選ぶ目安**: 影響範囲が限定的 / 修正が 1〜2 行で済む / 原因が直近 deploy 以外（データ / 外部 API / cron 等）

迷ったら **ロールバックが先**。ホットフィックスは時間を消費します。

---

## 4. Gradual Deployments 運用ルール

重大変更（破壊的変更 / 大規模リファクタ / 認証周りの変更）は手動で段階展開します。**自動化はしません** — オペレーターが Sentry とメトリクスを目視確認することが前提です。

### 段階展開コマンド

```bash
# 1. 新バージョンをアップロード（まだ traffic は流さない）
wrangler versions upload --name doll-wardrobe-api

# 2. 10% で開始
wrangler versions deploy <new-id>@10% <prev-id>@90% --name doll-wardrobe-api

# (Sentry / メトリクスで 10 分以上観測。エラー増加なし & p99 latency 退行なし を確認)

# 3. 50% に拡大
wrangler versions deploy <new-id>@50% <prev-id>@50% --name doll-wardrobe-api

# (さらに 10 分以上観測)

# 4. 100% に切替
wrangler versions deploy <new-id>@100% --name doll-wardrobe-api
```

### 段階展開の対象判断

| 変更内容                          | 段階展開                            |
| --------------------------------- | ----------------------------------- |
| typo 修正・コメント追加           | 不要 (直接 100%)                    |
| UI 文言変更                       | 不要                                |
| 通常の機能追加                    | 不要                                |
| API スキーマ変更 (互換)           | 不要                                |
| API スキーマ変更 (破壊)           | **必須**                            |
| 認証ロジック変更                  | **必須**                            |
| パフォーマンス系大規模変更        | **必須**                            |
| DB マイグレーションを伴うリリース | **必須** (expand & contract 順序で) |

---

## 5. Sentry での確認手順

### 5.1 release タグでエラーを絞り込み

deploy 時に CI が `SENTRY_RELEASE` (git SHA) を注入します。Sentry の Issues 画面で:

```
release:<git-sha>
```

で検索すると、その deploy 由来のエラーだけが表示されます。

### 5.2 source map によるスタックトレース解読

source map は CI の `.github/actions/sentry-sourcemap-upload` composite action 経由でアップロードされます (子 Issue #232 の deploy.yml 完成後に有効化)。Sentry の Issue 詳細ページで minify されたフレームの右側に「View source map」のアイコンが出ます。

> **トラブルシューティング**: スタックトレースが minified のままなら、`SENTRY_RELEASE` と CI で upload したときの `--release` が一致しているか確認。

### 5.3 環境タグ

`environment:production` / `environment:staging` で絞り込めます。`SENTRY_ENVIRONMENT` env var (wrangler の `[vars]` または `[env.production.vars]`) で設定。

---

## 6. 緊急時の連絡フロー

1. インシデント検知（Sentry alert / メトリクス / ユーザー報告）
2. `#incident` チャンネルへ起票（チャンネル未整備の場合は GitHub Issue に `incident` ラベルで起票）
3. ロールバック判断（§3 のフロー）
4. ロールバック実施 (§2) / ホットフィックス deploy
5. ポストモーテム（同日中に Issue にまとめる）

---

## 関連リソース

- 親 Issue: [#229](https://github.com/butaosuinu/Dollrobe/issues/229) — Cloudflare デプロイ基盤整備
- Sentry composite action: `.github/actions/sentry-sourcemap-upload/action.yml`
- Workers Sentry 計装: `workers/src/lib/sentry.ts`, `workers/src/index.ts`
- Cloudflare Workers rollback 公式 doc: <https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/>
- Cloudflare Workers gradual deployments: <https://developers.cloudflare.com/workers/configuration/versions-and-deployments/gradual-deployments/>
