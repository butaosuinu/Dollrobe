#!/bin/bash
set -euo pipefail

LOCALES=("en" "ko" "zh")
ERRORS=0

for locale in "${LOCALES[@]}"; do
  PO_FILE="src/locales/${locale}/messages.po"

  if [ ! -f "$PO_FILE" ]; then
    echo "ERROR: $PO_FILE not found"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  UNTRANSLATED=$(awk '
    /^msgid / {
      msgid = $0
      sub(/^msgid /, "", msgid)
    }
    /^msgstr ""$/ {
      if (msgid != "\"\"") {
        print msgid
      }
    }
  ' "$PO_FILE")

  if [ -n "$UNTRANSLATED" ]; then
    COUNT=$(echo "$UNTRANSLATED" | wc -l | tr -d ' ')
    echo "ERROR: $PO_FILE has $COUNT untranslated entries:"
    echo "$UNTRANSLATED" | head -10
    if [ "$COUNT" -gt 10 ]; then
      echo "  ... and $((COUNT - 10)) more"
    fi
    ERRORS=$((ERRORS + 1))
  fi
done

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "i18n check failed. Run 'pnpm i18n:extract' and fill in translations for en, ko, zh."
  exit 1
fi

echo "i18n check passed: all translations present."
