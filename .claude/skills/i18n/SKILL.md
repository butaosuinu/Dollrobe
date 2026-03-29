---
name: i18n
description: UIテキストの追加・変更・新規コンポーネント作成時に必ず参照する。Lingui.js による国際化ルール、翻訳ワークフロー、マクロの使い分けガイド。src/ 配下の .tsx ファイルでユーザーに表示されるテキストを扱う場合、このスキルに従うこと。
---

# Lingui.js i18n ガイド

対応言語: ja (ソース), en, ko, zh
翻訳ファイル: `src/locales/{locale}/messages.po`
ラベル定数: `src/lib/i18n-labels.ts`

## マクロの使い分け

### `<Trans>` — JSX コンテンツ

```tsx
import { Trans } from "@lingui/react/macro";

<p><Trans>この服は収納中です</Trans></p>
<button><Trans>保存</Trans></button>

// 変数を含む場合
<Trans>{count}着の服が見つかりました</Trans>
```

### `t` — 属性値（placeholder, aria-label, title, alt 等）

```tsx
import { useLingui } from "@lingui/react/macro";

const MyComponent = () => {
  const { t } = useLingui();
  return <input placeholder={t`服の名前を入力`} aria-label={t`検索`} />;
};
```

### `msg` — 定数・ラベル定義

```tsx
import { msg } from "@lingui/core/macro";

export const LABELS = Object.freeze({
  tops: msg`トップス`,
  bottoms: msg`ボトムス`,
});
```

`msg` で定義した値をコンポーネントで使用する場合:

```tsx
import { useLingui } from "@lingui/react";

const { i18n } = useLingui();
const text = i18n._(LABELS.tops);
```

## 禁止パターン

```tsx
// BAD: ハードコードされた日本語
<button>保存</button>
<input placeholder="服の名前" />
<p>登録しました</p>

// GOOD: Lingui マクロで囲む
<button><Trans>保存</Trans></button>
<input placeholder={t`服の名前`} />
<p><Trans>登録しました</Trans></p>
```

```tsx
// BAD: 条件分岐内での文字列直書き
<p>{isNew ? "新規登録" : "編集"}</p>

// GOOD: Trans を条件分岐で使う
<p>{isNew ? <Trans>新規登録</Trans> : <Trans>編集</Trans>}</p>
```

```tsx
// BAD: テンプレートリテラルでメッセージを組み立て
const message = `${count}件の結果`;

// GOOD: Trans 内で変数を使う
<Trans>{count}件の結果</Trans>;
```

## ラベル定数の追加ルール

新しい enum/ユニオン型の表示ラベルを追加する場合:

1. `src/lib/i18n-labels.ts` に `msg` マクロで定数を追加
2. `satisfies Record<UnionType, ReturnType<typeof msg>>` で型安全性を保証
3. コンポーネント側では `i18n._(LABEL[key])` で使用

## 翻訳ワークフロー

### UI テキスト変更後の手順

1. コンポーネント実装で Lingui マクロを適用
2. `pnpm i18n:extract` — PO ファイルにエントリが追加される
3. `src/locales/{en,ko,zh}/messages.po` の新規エントリ（`msgstr ""` の行）に翻訳を記入
4. `pnpm i18n:compile` — .mjs ファイルを再生成
5. `pnpm i18n:check` — 未翻訳エントリがないことを確認

### PO ファイル編集時の注意

- ja の PO ファイルは編集不要（sourceLocale なので extract 時に自動で msgid = msgstr）
- プレースホルダー `{0}`, `{1}`, `{variableName}` 等はそのまま翻訳先にも含めること
- 翻訳文はネイティブチェック不要だが、明らかに不自然な機械翻訳は避ける
- `pnpm i18n:extract` 実行時に不要エントリは自動削除される

## チェックリスト

UI テキスト変更を含む作業の完了前に確認:

- [ ] 新規・変更テキストが全て Lingui マクロで囲まれている
- [ ] `pnpm i18n:extract` を実行した
- [ ] en, ko, zh の PO ファイルで新規エントリに翻訳を記入した
- [ ] `pnpm i18n:compile` を実行した
- [ ] `pnpm i18n:check` が成功する
