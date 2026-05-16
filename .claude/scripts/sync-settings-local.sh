#!/bin/bash
# Stop hook: worktree の .claude/settings.local.json が symlink でない場合、
# parent 側へ permission を merge してから symlink を貼り直す。
# parent repo セッションでは no-op。

set -uo pipefail

TOP="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
GIT_COMMON="$(git rev-parse --git-common-dir 2>/dev/null)" || exit 0

case "$GIT_COMMON" in
  "$TOP/.git" | ".git") exit 0 ;;
esac

PARENT_GIT="$(cd "$GIT_COMMON" 2>/dev/null && pwd -P)" || exit 0
PARENT_ROOT="${PARENT_GIT%/.git}"
[ -d "$PARENT_ROOT" ] || exit 0

PARENT_SETTINGS="$PARENT_ROOT/.claude/settings.local.json"
WT_SETTINGS="$TOP/.claude/settings.local.json"

[ -L "$WT_SETTINGS" ] && exit 0

if [ -f "$WT_SETTINGS" ]; then
  if [ ! -f "$PARENT_SETTINGS" ]; then
    mkdir -p "$(dirname "$PARENT_SETTINGS")"
    printf '{}\n' > "$PARENT_SETTINGS"
  fi
  if command -v jq >/dev/null 2>&1; then
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
    else
      rm -f "$TMP"
    fi
  fi
  rm -f "$WT_SETTINGS"
fi

mkdir -p "$(dirname "$WT_SETTINGS")"
[ -f "$PARENT_SETTINGS" ] || printf '{}\n' > "$PARENT_SETTINGS"
ln -s "$PARENT_SETTINGS" "$WT_SETTINGS"
