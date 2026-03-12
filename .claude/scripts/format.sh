#!/bin/bash
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

if [ -z "$file_path" ] || [ ! -f "$file_path" ]; then
  exit 0
fi

ext="${file_path##*.}"

case "$ext" in
  ts|tsx|js|jsx|css|json|md)
    pnpm exec oxfmt "$file_path" --write 2>/dev/null
    ;;
esac

exit 0
