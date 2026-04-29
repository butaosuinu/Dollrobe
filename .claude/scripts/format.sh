#!/bin/bash
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

if [ -z "$file_path" ] || [ ! -f "$file_path" ]; then
  exit 0
fi

case "$file_path" in
  */.claude/*|*/.mcp.json)
    exit 0
    ;;
esac

ext="${file_path##*.}"

case "$ext" in
  ts|tsx|js|jsx|css|json|md)
    pnpm exec oxfmt "$file_path" --write 2>/dev/null
    ;;
esac

case "$ext" in
  ts|tsx)
    pnpm exec oxlint "$file_path" 2>&1
    ;;
esac

case "$file_path" in
  */src/app/sw.ts) tsconfig="tsconfig.sw.json" ;;
  */workers/*.test.ts) tsconfig="tsconfig.workers-test.json" ;;
  */workers/*.ts) tsconfig="tsconfig.workers.json" ;;
  */src/lib/image/extract-colors.worker.ts|*/src/lib/image/extract-colors-core.ts|*/src/lib/image/extract-colors-types.ts|*/src/lib/image/opencv-loader.ts) tsconfig="tsconfig.worker.json" ;;
  */src/*.ts|*/src/*.tsx) tsconfig="tsconfig.app.json" ;;
  *) tsconfig="" ;;
esac

if [ -n "$tsconfig" ]; then
  pnpm exec tsc-files --noEmit -p "$tsconfig" "$file_path" 2>&1
fi

exit 0
