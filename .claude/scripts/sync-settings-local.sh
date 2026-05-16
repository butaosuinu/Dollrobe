#!/bin/bash
# Stop hook: worktree の .claude/settings.local.json が symlink でない場合、
# parent 側へ permission を merge してから symlink を貼り直す。
# parent repo セッションでは no-op。

set -uo pipefail

TOP="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0

# git-dir / git-common-dir はサブディレクトリから呼ぶと相対パス（例: "../../.git"）
# を返すことがあるため、両方とも絶対パスに正規化してから比較する。
# 一致すれば main worktree（= parent）なので no-op。
GIT_DIR_RAW="$(git rev-parse --git-dir 2>/dev/null)" || exit 0
GIT_COMMON_RAW="$(git rev-parse --git-common-dir 2>/dev/null)" || exit 0
GIT_DIR_ABS="$(cd "$GIT_DIR_RAW" 2>/dev/null && pwd -P)" || exit 0
GIT_COMMON_ABS="$(cd "$GIT_COMMON_RAW" 2>/dev/null && pwd -P)" || exit 0
[ "$GIT_DIR_ABS" = "$GIT_COMMON_ABS" ] && exit 0

PARENT_ROOT="${GIT_COMMON_ABS%/.git}"
[ -d "$PARENT_ROOT" ] || exit 0

PARENT_SETTINGS="$PARENT_ROOT/.claude/settings.local.json"
WT_SETTINGS="$TOP/.claude/settings.local.json"

[ -L "$WT_SETTINGS" ] && exit 0

# 並行 Stop hook の read-modify-write 競合を防ぐため parent 側に排他ロックを取る。
# mkdir はアトミックなので flock 非依存（macOS/Linux 共通）。
mkdir -p "$PARENT_ROOT/.claude"
LOCK_DIR="$PARENT_ROOT/.claude/.settings-local.lock"
LOCK_ACQUIRED=0
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    LOCK_ACQUIRED=1
    trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT INT TERM
    break
  fi
  sleep 0.2
done
# 6 秒待ってもロックが取れなければ諦める（次回 Stop で再試行される）。
[ "$LOCK_ACQUIRED" = "1" ] || exit 0

if [ -f "$WT_SETTINGS" ]; then
  if [ ! -f "$PARENT_SETTINGS" ]; then
    printf '{}\n' > "$PARENT_SETTINGS"
  fi

  # jq が無い、または merge / mv に失敗した場合は worktree のファイルを保持して終了。
  # （マージなしで rm すると permission が失われるため）
  command -v jq >/dev/null 2>&1 || exit 0
  TMP="$(mktemp)"
  if jq -s '
    .[0] as $a | .[1] as $b |
    ($a * $b) |
    .permissions = (
      (($a.permissions // {}) * ($b.permissions // {}))
      | .allow = ((($a.permissions.allow // []) + ($b.permissions.allow // [])) | unique)
      | .deny  = ((($a.permissions.deny  // []) + ($b.permissions.deny  // [])) | unique)
      | .ask   = ((($a.permissions.ask   // []) + ($b.permissions.ask   // [])) | unique)
    )
  ' "$PARENT_SETTINGS" "$WT_SETTINGS" > "$TMP"; then
    # mv が成功した場合のみ worktree ファイルを削除する。
    if mv "$TMP" "$PARENT_SETTINGS"; then
      rm -f "$WT_SETTINGS"
    else
      rm -f "$TMP"
      exit 0
    fi
  else
    rm -f "$TMP"
    exit 0
  fi
fi

mkdir -p "$(dirname "$WT_SETTINGS")"
[ -f "$PARENT_SETTINGS" ] || printf '{}\n' > "$PARENT_SETTINGS"
ln -s "$PARENT_SETTINGS" "$WT_SETTINGS"
