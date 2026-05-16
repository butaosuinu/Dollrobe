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

if [ -f "$WT_SETTINGS" ]; then
  if [ ! -f "$PARENT_SETTINGS" ]; then
    mkdir -p "$(dirname "$PARENT_SETTINGS")"
    printf '{}\n' > "$PARENT_SETTINGS"
  fi

  # jq が無い、または merge に失敗した場合は worktree のファイルを保持して終了。
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
    mv "$TMP" "$PARENT_SETTINGS"
    rm -f "$WT_SETTINGS"
  else
    rm -f "$TMP"
    exit 0
  fi
fi

mkdir -p "$(dirname "$WT_SETTINGS")"
[ -f "$PARENT_SETTINGS" ] || printf '{}\n' > "$PARENT_SETTINGS"
ln -s "$PARENT_SETTINGS" "$WT_SETTINGS"
