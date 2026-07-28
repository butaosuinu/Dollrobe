# PR review risk 判定

`tools/reviewrisk` は PR の変更 path と diff シグナルから、必要な review の
重さを機械的に判定する repository 専用 CLI である。
GitHub Actions は結果を `review:<level>` label と sticky comment に反映する。
判定は advisory であり、risk level 自体は merge を block しない。

## Level

| Level    | 基本条件                       | Review guidance                                        |
| -------- | ------------------------------ | ------------------------------------------------------ |
| none     | 全ファイルが NONE              | 一般文書・マーケティング資産のみ。CI green で merge 可 |
| low      | 最大 class が A                | 通常 review                                            |
| medium   | 最大 class が M                | AI review + M ファイルを人間が確認                     |
| high     | 最大 class が H、または S9/S10 | 人間 review 必須                                       |
| critical | S1-S8 / S12 のいずれか         | 人間精読必須                                           |

## Path class

test file (`*.test.*` / `*.spec.*`) は配置先にかかわらず A とする。
それ以外は exact rule、longest prefix rule の順に解決する。
rename は新旧 path の重い方を採用し、未知 path は fail-closed で high にする。

| Area                                           | Class | Rule IDs                                                                                                                                         |
| ---------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 一般 README・文書                              | NONE  | `readme`, `docs-general`                                                                                                                         |
| LP の静的画像（AVIF/GIF/JPEG/PNG/WebP）        | NONE  | `marketing-asset`                                                                                                                                |
| 通常 app route・component・public asset        | A     | `app-ui`, `component-ui`, `public-asset`                                                                                                         |
| i18n                                           | A     | `client-i18n`                                                                                                                                    |
| test・test harness                             | A     | `test-file`, `client-test-support`, `worker-test-support`, `e2e-test`                                                                            |
| admin/auth/settings UI                         | M     | `admin-ui`, `auth-ui`, `admin-component`, `auth-component`, `settings-component`                                                                 |
| client hook・domain logic・共有型              | M     | `client-hook`, `client-lib`, `client-type`, `client-stub`                                                                                        |
| Workers service・queue・cron・共通 logic       | M     | `worker-service`, `worker-queue`, `worker-scheduled`, `worker-lib`, `worker-rest`                                                                |
| repository / agent / GitHub 一般設定           | M     | `repo-config`, `agent-config`, `agent-guide`, `github-rest`                                                                                      |
| TypeScript・lint・test・i18n・CSS config       | M     | `tsconfig`, `lint-config`, `test-config`, `e2e-config`, `lingui-config`, `css-build-config`                                                      |
| Cloudflare 運用文書                            | M     | `ops-doc`                                                                                                                                        |
| dependency・build・Cloudflare config           | H     | `dependency-manifest`, `dependency-lock`, `dependency-cruiser-config`, `web-build-config`, `cloudflare-config`, `drizzle-config`, `env-template` |
| Sentry・MCP・OpenCV runtime                    | H     | `sentry-config`, `mcp-config`, `opencv-runtime`                                                                                                  |
| GitHub workflow / local Action / script / hook | H     | `github-workflow`, `github-action`, `script`, `dmux-hook`, `review-gate`                                                                         |
| review-risk 判定器                             | H     | `risk-tool`                                                                                                                                      |
| client auth・API・offline state                | H     | `client-auth`, `client-api`, `client-db`, `client-store`, `client-sync`, `service-worker`                                                        |
| Workers entry・auth・DB                        | H     | `worker-entry`, `worker-auth`, `worker-auth-boundary`, `worker-db`                                                                               |
| Workers user-data / HTTP boundary              | H     | `worker-repository`, `worker-trpc`, `worker-route`, `worker-middleware`, `worker-mcp`                                                            |
| admin service                                  | H     | `admin-service`                                                                                                                                  |
| D1 migration                                   | H     | `migration`                                                                                                                                      |

## Escalation signals

| ID                          | Level    | Condition                                                                             |
| --------------------------- | -------- | ------------------------------------------------------------------------------------- |
| S1-test-deleted             | critical | test file の削除、rename による test suffix の喪失、非 regular file への type change  |
| S2-test-support-deleted     | critical | test runner config、`src/test`、Workers test harness、E2E fixture/helper の削除・移動 |
| S3-test-disabled-or-focused | critical | test API の skip/fixme/todo/only、x/f prefix の追加・有効化・差し替え                 |
| S4-review-gate-modified     | critical | `.claude/settings.json`、自動 hook、code-review skill の変更                          |
| S5-risk-tool-modified       | critical | 判定器、正典、二つの review-risk workflow の変更                                      |
| S6-ci-workflow-deleted      | critical | workflow の削除、拡張子変更、subdirectory への移動                                    |
| S7-quality-gate-modified    | critical | package.json の削除・移動、JSON 上の scripts container・test/build/precheck 等の変更  |
| S8-migration-rewritten      | critical | 既存 D1 migration の変更・削除・rename                                                |
| S9-unclassified-path        | high     | rule に一致しない path                                                                |
| S10-invariant-hit           | high     | userId、auth/admin、syncQueue、環境・remote migration 境界への接触                    |
| S11-large-diff              | +1       | 非 NONE が 800 行超または 30 ファイル超。low/medium のみ一段上げる                    |
| S12-patch-unreadable        | critical | patch 本文または判定に必要な変更前後文脈が上限超過・解析不能                          |

同一 diff では Files を path 順、Reasons を level 降順・signal・path 順に固定し、
出力を決定的にする。binary の行数は 0 として集計する。Markdown は GitHub comment
の上限に余裕を持たせて UTF-8 で 60,000 bytes 以下とし、超過する理由・ファイルは
省略数を表示する。Git path は NUL 区切りの byte 列として読み、非 UTF-8 byte は
`%XX`、有効な UTF-8 path 内の `%` は `%25` へ encoding して一意に保つ。
patch 本文または test file の変更前後文脈が 64 MiB の読み取り上限を超える場合は
処理を停止せず、S12 / critical として fail-closed にする。

## CLI

```sh
pnpm review-risk -- --base origin/main --format text
pnpm review-risk -- --base origin/main --format json
pnpm review-risk -- --base origin/main --format markdown
pnpm review-risk -- --fail-at high
```

`--base` 省略時は `origin/main`、次に `main` を試す。
比較起点は base と HEAD の merge-base で、そこから tracked working tree までを
読む。通常は exit 0、`--fail-at` の threshold 以上は 1、flag・git error は 2。

## GitHub Actions

`review-risk.yml` は main 向けの同一 repository PR で実行する。
fork と Dependabot の read-only token run は label/comment を書けないため skip
する。判定前に shell-only self-modification guard を置き、判定器・正典・
workflow 自身の変更は PR 側 code を実行せず critical に固定する。
判定 JSON と comment Markdown は checkout 前に `$RUNNER_TEMP` 配下へ作成した
一時 directory に書き出し、PR が追加した symlink を出力先として辿らない。

`review-risk-guard.yml` は branch filter を設けない `pull_request_target` で
base branch 側の定義を実行する。PR head は `git fetch` と `git diff` の
入力データとしてのみ扱い、PR 側の file、script、dependency は実行しない。
自己変更時の comment は `<!-- review-risk-guard -->` という別 marker を使う。
fork PR で自己変更が取り消されたら、guard が付けた `review:critical` label と
guard comment を削除する。PR の base が main から外れた `edited` イベントでは、
既存の `review:*` label と通常・guard comment を削除する。

どちらも `contents: read`、`pull-requests: write`、`issues: write` の最小権限、
`persist-credentials: false`、workflow ごとの PR 番号単位 concurrency を使う。
通常 workflow は label と comment の各公開直前に live PR の base、head SHA、
head repository を再確認し、古い run の結果を公開しない。
`opened`、`synchronize`、`reopened` に加えて `edited` でも起動し、既存 PR の
base が main へ変更された場合も判定する。
同一 repository の write 権限保有者が別 workflow を変更できる境界までは
防御しないため、label と comment はあくまで review の判断材料である。
