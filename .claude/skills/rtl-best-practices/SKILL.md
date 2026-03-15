---
name: rtl-best-practices
description: React Testing Library のベストプラクティスに従ってテストを書く・レビューする。RTL テスト、コンポーネントテスト、テストコードのレビュー、テストの修正、テストの書き方の相談を依頼された場合に使用する。コンポーネントのテストを新規作成する場合も必ず参照すること。
---

# React Testing Library ベストプラクティス

Kent C. Dodds の "Common Mistakes with React Testing Library" に基づくテストコードガイド。
テストの新規作成・既存テストのレビュー・修正時に適用する。

参照元: https://kentcdodds.com/blog/common-mistakes-with-react-testing-library

## クエリ優先度

ユーザーがアプリを使う方法に最も近いクエリを選ぶ。テストはユーザー体験を検証するためにあるので、実装詳細（CSS クラス名や DOM 構造）に依存するクエリは避ける。

### 優先順位

1. **`getByRole`** — 最優先。`name` オプションで accessible name を指定する
2. **`getByLabelText`** — フォーム要素に最適
3. **`getByPlaceholderText`** — ラベルがない場合の代替
4. **`getByText`** — 非インタラクティブ要素のテキスト
5. **`getByDisplayValue`** — input の現在値
6. **`getByAltText`** — 画像
7. **`getByTitle`** — あまり使わない
8. **`getByTestId`** — 最終手段。他のクエリで取得できない場合のみ

### 禁止パターン

`container.querySelector()` や `container.innerHTML` による DOM 直接アクセスは禁止。
CSS セレクタに依存するとリファクタリングでテストが壊れ、アクセシビリティの問題も見逃す。

```typescript
// BAD: CSS セレクタで DOM を直接クエリ
const { container } = render(<MyComponent />);
const button = container.querySelector(".btn-primary");

// GOOD: ユーザーが認識する方法でクエリ
screen.getByRole("button", { name: /送信/i });
```

```typescript
// BAD: テキストがあるのに testid を使う
screen.getByTestId("submit-button");

// GOOD: 実際のテキストでクエリ（翻訳の正しさも検証できる）
screen.getByRole("button", { name: /送信/i });
```

### `getByRole` の `name` オプションを活用する

同じロールの要素が複数ある場合、`name` でフィルタする。`getByRole` のエラーメッセージはアクセシブルなロール一覧を表示してくれるため、デバッグにも役立つ。

```typescript
// BAD: 同じテキストが複数箇所にあると失敗する
screen.getByText(/hello world/i);

// GOOD: ロール + name で一意に特定
screen.getByRole("heading", { name: /hello world/i });
```

### アイコンのテストについて

SVG アイコン（lucide-react 等）はデフォルトで ARIA ロールを持たない。`container.querySelector("svg")` でアイコンの存在を確認するのではなく、そのアイコンが伝える情報（テキストラベル等）をテストする。アイコンは視覚的装飾であり、ユーザーに伝わる情報はテキストやラベルにある。

```typescript
// BAD: SVG の DOM 構造に依存
const { container } = render(<StatusBadge label="confirmed" />);
expect(container.querySelector("svg")).toBeInTheDocument();

// GOOD: ユーザーに見えるテキストをテスト
render(<StatusBadge label="confirmed" />);
expect(screen.getByText("確定")).toBeInTheDocument();
```

## get* / query* / find\* の使い分け

3 種類のクエリバリアントには明確な使い分けがある。間違った使い方をするとエラーメッセージの質が落ち、テストのデバッグが困難になる。

| バリアント | 要素が存在すべきか | 非同期か | 用途                       |
| ---------- | ------------------ | -------- | -------------------------- |
| `getBy*`   | はい               | 同期     | 存在する要素の取得         |
| `queryBy*` | いいえ             | 同期     | 非存在の確認のみ           |
| `findBy*`  | はい               | 非同期   | 非同期で出現する要素の取得 |

### 存在確認には `getBy*` を使う

`queryBy*` は要素が見つからない場合 `null` を返すだけで、有用なエラーメッセージを出さない。存在を確認したいなら `getBy*` を使う。見つからなかった場合、利用可能なロールの一覧を含む詳細なエラーが出る。

```typescript
// BAD: queryBy* で存在確認 — 失敗時のエラーメッセージが貧弱
expect(screen.queryByRole("alert")).toBeInTheDocument();

// GOOD: getBy* で存在確認 — 失敗時にアクセシブルなロール一覧が表示される
expect(screen.getByRole("alert")).toBeInTheDocument();
```

### 非存在確認には `queryBy*` + `.not.toBeInTheDocument()` を使う

`.toBeNull()` ではなく `.not.toBeInTheDocument()` を使う。意図が明確で、jest-dom のエラーメッセージも分かりやすい。

```typescript
// BAD: toBeNull は意図が不明確
expect(screen.queryByRole("alert")).toBeNull();

// GOOD: 「DOM に存在しない」という意図が明確
expect(screen.queryByRole("alert")).not.toBeInTheDocument();
```

### 非同期取得には `findBy*` を使う

`waitFor` + `getBy*` は冗長。`findBy*` は内部で `waitFor` を使っており、よりシンプルで明確。

```typescript
// BAD: 冗長で、エラーメッセージが不十分
const button = await waitFor(() =>
  screen.getByRole("button", { name: /送信/i }),
);

// GOOD: シンプルで良好なエラーメッセージ
const button = await screen.findByRole("button", { name: /送信/i });
```

## アサーションのベストプラクティス

### jest-dom マッチャを使う

`@testing-library/jest-dom` のマッチャは失敗時に文脈のあるエラーメッセージを提供する。DOM プロパティへの直接アクセスよりも意図が明確。

```typescript
// BAD: エラーメッセージが "Expected true, received false"
expect(button.disabled).toBe(true);

// GOOD: エラーメッセージが "Expected element to be disabled"
expect(button).toBeDisabled();
```

```typescript
// BAD
expect(element.textContent).toBe("hello");
expect(element).toBeTruthy();

// GOOD
expect(element).toHaveTextContent("hello");
expect(element).toBeInTheDocument();
```

### 空のレンダリングを検証する場合

`container.innerHTML === ""` は実装詳細に依存している。コンポーネントが何もレンダリングしない場合、特定の子要素が存在しないことを確認する。

```typescript
// BAD: 実装詳細に依存
const { container } = render(<UserMenu />);
expect(container.innerHTML).toBe("");

// GOOD: ユーザーに見える要素の不在を確認
render(<UserMenu />);
expect(screen.queryByLabelText("ログアウト")).not.toBeInTheDocument();
```

### `getBy*` には明示的アサーションを付ける

`getBy*` は要素が見つからないとエラーを投げるので、暗黙的にアサーションとして機能する。ただし明示的に `expect().toBeInTheDocument()` を付けることで、テストの意図が読み手に伝わる。

```typescript
// OK: 動作するが意図が不明確
screen.getByRole("alert", { name: /エラー/i });

// BETTER: テストの意図が明確
expect(screen.getByRole("alert", { name: /エラー/i })).toBeInTheDocument();
```

## userEvent vs fireEvent

`fireEvent` は低レベルの DOM イベントを1つだけ発火させる。`userEvent` は実際のユーザー操作をシミュレートし、キーボードイベント・フォーカス移動・入力バリデーション等を含む複数のイベントを正しい順序で発火させる。実際のユーザー操作に近いテストになるため、`userEvent` を使う。

### セットアップパターン

```typescript
it("ボタンクリックで処理が実行される", async () => {
  const user = userEvent.setup();
  render(<MyComponent />);

  await user.click(screen.getByRole("button", { name: /送信/i }));

  expect(mockHandler).toHaveBeenCalled();
});
```

### テキスト入力

```typescript
// BAD: change イベント1つだけ — keydown/keypress/keyup がない
fireEvent.change(input, { target: { value: "hello" } });

// GOOD: 実際のタイピングをシミュレート
await user.type(input, "hello");

// 入力をクリアしてから入力する場合
await user.clear(input);
await user.type(input, "new value");
```

## waitFor のルール

`waitFor` は非同期処理の完了を待つためのユーティリティ。コールバックが例外を投げなくなるまで繰り返し実行される。この仕組みを理解しないと脆いテストを書いてしまう。

### 1. 空のコールバック禁止

空のコールバックは何も検証しない。テストが通っているように見えても、タイミングに依存した脆いテストになる。

```typescript
// BAD: 何も検証していない — タイミング依存で不安定
await waitFor(() => {});
expect(mockFetch).toHaveBeenCalledWith("/api/data");

// GOOD: 具体的な条件を待機する
await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/data"));
```

### 2. 副作用は waitFor の外に出す

`waitFor` のコールバックは複数回実行される可能性がある。内部で `fireEvent` や `userEvent` を呼ぶとイベントが重複発火する。

```typescript
// BAD: キーダウンが複数回発火する可能性がある
await waitFor(() => {
  fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(screen.getAllByRole("listitem")).toHaveLength(3);
});

// GOOD: 副作用は外、アサーションは中
fireEvent.keyDown(input, { key: "ArrowDown" });
await waitFor(() => {
  expect(screen.getAllByRole("listitem")).toHaveLength(3);
});
```

### 3. 単一アサーション

`waitFor` 内に複数のアサーションがあると、最初のアサーションが通っても2番目で失敗した場合にタイムアウトまで待つことになり、テスト実行が遅くなる。

```typescript
// BAD: 2番目のアサーション失敗時にタイムアウトまで待つ
await waitFor(() => {
  expect(mockFetch).toHaveBeenCalledWith("/api/data");
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

// GOOD: waitFor 内は1つ、残りは外
await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/data"));
expect(mockFetch).toHaveBeenCalledTimes(1);
```

### 4. findBy* で代替できるなら findBy* を使う

`waitFor` + `getBy*` で要素の出現を待つ場合、`findBy*` で置き換えられる。

```typescript
// BAD: 冗長
await waitFor(() => {
  expect(screen.getByText("読み込み完了")).toBeInTheDocument();
});

// GOOD: findBy* で十分
expect(await screen.findByText("読み込み完了")).toBeInTheDocument();
```

## 不要な act() ラッピング

`render()`、`fireEvent.*()` 、`userEvent.*()` は内部で `act()` を呼んでいる。自前で `act()` をラップすると冗長になるだけでなく、act の仕組みを誤解しているように見える。

act 警告が表示される場合、`act()` で包むのではなく根本原因を調べる。多くの場合、非同期処理の `await` 漏れか、テスト終了後に state 更新が発生しているのが原因。

```typescript
// BAD: render は既に act で包まれている
act(() => {
  render(<MyComponent />);
});

// GOOD
render(<MyComponent />);
```

## 不要な ARIA 属性追加の禁止

HTML のネイティブ要素にはデフォルトで暗黙的な ARIA ロールがある。テストを通すために冗長な属性を追加すると、スクリーンリーダーに重複情報を伝えてしまい、アクセシビリティを損なう。

| 要素                      | 暗黙的ロール |
| ------------------------- | ------------ |
| `<button>`                | `button`     |
| `<a href="...">`          | `link`       |
| `<input type="text">`     | `textbox`    |
| `<input type="checkbox">` | `checkbox`   |
| `<select>`                | `combobox`   |
| `<h1>`-`<h6>`             | `heading`    |
| `<img>`                   | `img`        |
| `<nav>`                   | `navigation` |

```typescript
// BAD: <button> は既に role="button" を持っている
render(<button role="button">Click me</button>);

// GOOD: セマンティック HTML をそのまま使う
render(<button>Click me</button>);
// テスト側: screen.getByRole("button", { name: /click me/i })
```

## プロジェクト固有パターン

### テストファイルのインポート構成

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
```

- `screen` は `@testing-library/react` から import する
- `cleanup` は `src/test/setup.ts` で自動実行されるので個別に呼ばない
- jest-dom マッチャも setup.ts で自動登録済み

### Jotai Suspense atom のモック

非同期の Suspense atom はテスト環境で解決が難しいため、同期的な atom に差し替える。`vi.hoisted` でモック値を巻き上げ、`beforeEach` でリセットする。

```typescript
const mockState = vi.hoisted(() => ({
  value: { items: [] as Item[] },
}));

vi.mock("@/stores/itemAtoms", async () => {
  const original = await vi.importActual("@/stores/itemAtoms");
  return {
    ...original,
    itemsSuspenseAtom: atom(() => mockState.value.items),
  };
});

// Jotai Provider でラップ
render(
  <Provider store={createStore()}>
    <MyComponent />
  </Provider>,
);
```

### MSW v2 によるハンドラオーバーライド

テスト単位で API レスポンスを変更する場合:

```typescript
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";

it("エラー時にメッセージが表示される", async () => {
  server.use(
    http.get("/api/items", () =>
      HttpResponse.json({ error: "Not found" }, { status: 404 })
    ),
  );

  render(<ItemList />);
  expect(await screen.findByText(/エラー/)).toBeInTheDocument();
});
```

## チェックリスト

テスト作成・レビュー時に確認する:

- [ ] `screen.getByRole` を最優先で使っているか
- [ ] `container.querySelector` や `container.innerHTML` を使っていないか
- [ ] 存在確認に `getBy*`、非存在確認に `queryBy*` + `.not.toBeInTheDocument()` を使っているか
- [ ] 非同期取得に `findBy*` を使っているか（不要な `waitFor` + `getBy*` がないか）
- [ ] `userEvent.setup()` を使い、`fireEvent` を避けているか
- [ ] jest-dom マッチャ（`toBeDisabled`、`toHaveTextContent` 等）を活用しているか
- [ ] `waitFor` 内で副作用を実行していないか
- [ ] `waitFor` に空のコールバックを渡していないか
- [ ] 不要な `act()` ラップがないか
- [ ] ネイティブ要素に冗長な ARIA 属性を追加していないか
- [ ] `expect(...).toBeInTheDocument()` で明示的にアサーションしているか
