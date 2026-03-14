# ドール服管理システム — CLAUDE.md

## General Guidelines

- **常に日本語で返答してください** (Always respond in Japanese)
- ファイル保存時に内容が変更される場合がありますが、これは oxfmt によるフォーマットなので気にしないでください
- 過剰なコメントは**禁止**
- 作業ログ的なコメントは**禁止**

## Static Analysis Rules

### TypeScript Type Checking

- **lspの使用を優先してください**
- lspが使えない場合の代替手段
  - **ファイル単位での型チェックを実行すること**
  - 全体型チェックよりも、作業対象ファイルの型チェックを優先する
  - ファイル単位での実行コマンド: `npx tsc-files --noEmit path/to/file.ts` または `npx tsc-files --noEmit path/to/file.tsx`
  - プロジェクト全体の型チェック: `pnpm typecheck` または `pnpm build`

#### 注意事項

- `npx tsc --noEmit path/to/file.ts` は使用禁止（tsconfig.json設定が無視されるため）
- ファイル単位の型チェックには必ず `tsc-files` を使用すること

### Linting (OxLint + ESLint)

- **ファイル単位でのLint実行を優先すること**
- 全体lintingよりも、作業対象ファイルのlintingを優先する
- ファイル単位での実行コマンド: `npx oxlint path/to/file.ts && npx eslint path/to/file.ts` または `npx oxlint path/to/file.tsx && npx eslint path/to/file.tsx`
- プロジェクト全体のlinting: `pnpm lint` （必要な場合のみ使用）

### Formatting (OxFmt)

- **ファイル単位でのフォーマット実行を優先すること**
- 全ファイル: `npx oxfmt path/to/file --write`
- プロジェクト全体のフォーマット: `pnpm format` （必要な場合のみ使用）

## Github Guidelines

- `gh` コマンドを使用して issue や PR にアクセスすること

---

## プロジェクト概要

ドール服（1/3・MSD・SD などのスケールドール用）を管理する PWA アプリ。
QR スキャンで物理的な収納場所とデジタル在庫を紐づけ、「どの服がどの引き出しにあるか」を常に把握できるようにする。

**対象ユーザー**: 最大 100 人程度（開発者の友人含む）  
**最重要課題**: 物理とデジタルの同期ズレ（ドリフト問題）を低コストで解決する

---

## 技術スタック

| レイヤー        | 技術                                                   |
| --------------- | ------------------------------------------------------ |
| フロントエンド  | Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 |
| オフライン      | Dexie.js (IndexedDB) + PWA                             |
| QR スキャン     | jsQR（ブラウザネイティブ、アプリ不要）                 |
| API             | Cloudflare Workers + Hono                              |
| DB              | Cloudflare D1 (SQLite)                                 |
| 画像            | Cloudflare R2 (S3 互換)                                |
| KV / セッション | Cloudflare KV                                          |
| Cron / Queue    | Cloudflare Queues + Cron Triggers                      |
| 認証・状態管理  | **Claude Code 上で詳細設計**                           |

---

## ディレクトリ構成

```
/
├── CLAUDE.md
├── wrangler.toml
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── page.tsx           # ダッシュボード
│   │   ├── garments/          # 服一覧・詳細・登録
│   │   ├── locations/         # 収納場所グリッド
│   │   ├── scan/              # QR スキャン画面
│   │   └── coordinates/       # コーデ一覧（Phase 3）
│   ├── components/
│   │   ├── ui/
│   │   ├── garment/
│   │   ├── location/
│   │   └── scan/
│   ├── lib/
│   │   ├── confidence.ts      # 信頼度計算（純粋関数）
│   │   ├── db/dexie.ts        # IndexedDB スキーマ
│   │   └── qr/                # スキャン・ラベル生成
│   └── types/index.ts         # 全型定義（フロント・バック共通）
└── workers/
    ├── src/
    │   ├── index.ts           # Hono + tRPC サーバー
    │   ├── auth.ts            # better-auth 設定
    │   ├── types.ts           # Env 型定義
    │   ├── trpc/
    │   │   ├── index.ts       # tRPC 初期化・ミドルウェア
    │   │   ├── router.ts      # AppRouter 合成
    │   │   ├── lib/
    │   │   │   ├── schemas.ts     # Zod 入力スキーマ
    │   │   │   └── d1-helpers.ts  # Row 型・マッパー
    │   │   └── routers/       # 薄い tRPC ルーター
    │   │       ├── garment.ts
    │   │       ├── location.ts
    │   │       ├── scan.ts
    │   │       └── coordinate.ts  # Phase 3 切り出しポイント
    │   ├── services/          # ビジネスロジック層
    │   │   ├── types.ts       # ServiceResult 型
    │   │   ├── garment-service.ts
    │   │   ├── location-service.ts
    │   │   └── scan-service.ts
    │   └── repositories/      # データアクセス層
    │       ├── garment-repository.ts
    │       ├── location-repository.ts
    │       └── scan-repository.ts
    └── migrations/
        └── 0001_initial.sql
```

---

## コアデータモデル（`src/types/index.ts`）

```typescript
type DollSize = "1/3" | "MSD" | "SD" | "YoSD" | "1/6" | "other";
type GarmentCategory =
  | "tops"
  | "bottoms"
  | "dress"
  | "outer"
  | "shoes"
  | "accessory"
  | "other";
type GarmentStatus = "stored" | "checked_out" | "lost";
type ConfidenceLabel = "confirmed" | "uncertain" | "unknown";
// confirmed : 0.70〜1.00 / uncertain : 0.30〜0.69 / unknown : 0.00〜0.29

export type Garment = {
  id: string;
  userId: string;
  name: string;
  category: GarmentCategory;
  dollSize: DollSize;
  colors: string[]; // HSL 文字列配列
  tags: string[];
  imageUrl: string | null; // R2 URL
  locationId: string | null; // null = 取出し中
  status: GarmentStatus;
  lastScannedAt: number; // Unix timestamp (ms)
  confidenceDecayDays: number; // デフォルト 30。季節物は 90 など
  checkedOutAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type StorageCase = {
  id: string;
  userId: string;
  name: string; // "衣装ケース A"
  rows: number;
  cols: number;
  createdAt: number;
};

export type StorageLocation = {
  id: string;
  userId: string;
  caseId: string;
  label: string; // "A-1" など
  row: number;
  col: number;
  createdAt: number;
};

export type Coordinate = {
  id: string;
  userId: string;
  name: string;
  garmentIds: string[];
  isAiGenerated: boolean;
  memo: string | null;
  createdAt: number;
  updatedAt: number;
};
```

---

## D1 スキーマ（`workers/migrations/0001_initial.sql`）

```sql
CREATE TABLE garments (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL,
  name                  TEXT NOT NULL,
  category              TEXT NOT NULL,
  doll_size             TEXT NOT NULL,
  colors                TEXT NOT NULL DEFAULT '[]',
  tags                  TEXT NOT NULL DEFAULT '[]',
  image_url             TEXT,
  location_id           TEXT REFERENCES storage_locations(id),
  status                TEXT NOT NULL DEFAULT 'stored',
  last_scanned_at       INTEGER NOT NULL,
  confidence_decay_days INTEGER NOT NULL DEFAULT 30,
  checked_out_at        INTEGER,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL
);

CREATE TABLE storage_cases (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
  name TEXT NOT NULL, rows INTEGER NOT NULL DEFAULT 5,
  cols INTEGER NOT NULL DEFAULT 3, created_at INTEGER NOT NULL
);

CREATE TABLE storage_locations (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
  case_id TEXT NOT NULL REFERENCES storage_cases(id),
  label TEXT NOT NULL, row_num INTEGER NOT NULL,
  col_num INTEGER NOT NULL, created_at INTEGER NOT NULL
);

CREATE TABLE coordinates (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
  name TEXT NOT NULL, garment_ids TEXT NOT NULL DEFAULT '[]',
  is_ai_generated INTEGER NOT NULL DEFAULT 0,
  memo TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);

CREATE INDEX idx_garments_user_id     ON garments(user_id);
CREATE INDEX idx_garments_location_id ON garments(location_id);
CREATE INDEX idx_garments_status      ON garments(status);
CREATE INDEX idx_locations_case_id    ON storage_locations(case_id);
```

---

## 信頼度ロジック（`src/lib/confidence.ts`）

**純粋関数のみ。フロント・バック両方から import する。**

```typescript
import type { Garment, ConfidenceLabel } from "@/types";

// 信頼度はDBに保存しない。lastScannedAt と confidenceDecayDays から常に計算する。
export function getConfidence(g: Garment): number {
  if (g.status !== "stored") return 0;
  const days = (Date.now() - g.lastScannedAt) / 86_400_000;
  return Math.max(0, 1 - days / g.confidenceDecayDays);
}

export function getConfidenceLabel(c: number): ConfidenceLabel {
  if (c >= 0.7) return "confirmed";
  if (c >= 0.3) return "uncertain";
  return "unknown";
}

// 場所QRスキャン時の機会確認対象
export function getItemsNeedingReview(garments: Garment[], locationId: string) {
  return garments.filter(
    (g) =>
      g.locationId === locationId &&
      g.status === "stored" &&
      getConfidence(g) < 0.7,
  );
}

// 孤立したチェックアウト検出（デフォルト3日）
export function getOrphanedCheckouts(garments: Garment[], thresholdDays = 3) {
  return garments.filter((g) => {
    if (g.status !== "checked_out" || !g.checkedOutAt) return false;
    return (Date.now() - g.checkedOutAt) / 86_400_000 >= thresholdDays;
  });
}
```

---

## QR スキーム

```
服側 QR:    dwg://g/{garment-id}
場所側 QR:  dwg://l/{location-id}
```

**スキャンフロー**: 場所 QR スキャン → `activeLocationId` セット → 服 QR 連続スキャン → 「全部ある ✓」タップ → 対象全件の `lastScannedAt` をリセット

**iOS 制約**: Web NFC API は Android Chrome のみ。引き出しには QR + NFC シールを両方貼付。

---

## Workers API（`workers/src/index.ts`）

```typescript
// ルーターはドメインで分割する。
// Phase 3 で /api/coordinate の向き先を外部サービスに変えてもフロントは無変更。
app.route("/api/garments", garmentRoutes);
app.route("/api/locations", locationRoutes);
app.route("/api/scan", scanRoutes);
app.route("/api/sync", syncRoutes);
app.route("/api/coordinate", coordinateRoutes); // ← Phase 3 切り出しポイント
app.route("/api/digest", digestRoutes); // Cron から呼ばれる
```

| Method     | Path                       | 説明                                    |
| ---------- | -------------------------- | --------------------------------------- |
| GET/POST   | `/api/garments`            | 服一覧・登録                            |
| PUT/DELETE | `/api/garments/:id`        | 服更新・削除                            |
| GET/POST   | `/api/locations`           | 収納場所一覧・登録                      |
| POST       | `/api/scan/checkin`        | チェックイン                            |
| POST       | `/api/scan/checkout`       | チェックアウト                          |
| POST       | `/api/scan/confirm-all`    | 機会確認（全件 lastScannedAt リセット） |
| POST       | `/api/scan/orphan-resolve` | 孤立チェックアウトの 3 択解決           |
| POST       | `/api/sync`                | クライアント差分同期                    |

### Env 型

```typescript
export type Env = {
  DB: D1Database;
  BUCKET: R2Bucket;
  KV: KVNamespace;
  QUEUE: Queue;
  R2_PUBLIC_URL: string;
  // 認証関連の env は Claude Code 上で設計
};
```

---

## wrangler.toml 最小構成

```toml
name = "doll-wardrobe-api"
main = "workers/src/index.ts"
compatibility_date = "2025-01-01"

[[d1_databases]]
binding = "DB"
database_name = "doll-wardrobe-db"
database_id = "YOUR_D1_ID"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "doll-wardrobe-images"

[[kv_namespaces]]
binding = "KV"
id = "YOUR_KV_ID"

[[queues.producers]]
binding = "QUEUE"
queue = "doll-wardrobe-digest"

[[queues.consumers]]
queue = "doll-wardrobe-digest"
max_batch_size = 10

[triggers]
crons = ["0 9 * * 1"]  # 毎週月曜 9:00 UTC
```

---

## 設計原則

1. **収納動作 = 記録動作** — QR スキャンそのものが記録イベント。手入力しない。
2. **信頼度は DB に保存しない** — `lastScannedAt` から常に計算する。
3. **機会確認は場所 QR スキャン時のみ** — その場にいる瞬間を使う。
4. **通知は週 1 回のダイジェストのみ** — 個別通知は出さない。
5. **孤立チェックアウトは 3 択** — どの答えでも状態が前進する設計。
6. **`/api/coordinate` は独立** — 他ルーターと密結合させない。Phase 3 の切り出し口。
7. **オフラインファースト** — 読み取りは IndexedDB から。Workers への書き込みは非同期同期。

---

## フェーズロードマップ

**Phase 1** — QR スキャン + 服・収納場所 CRUD + IndexedDB + PWA マニフェスト  
**Phase 2** — 収納グリッド UI + 信頼度表示 + 機会確認 + 週次ダイジェスト + マルチユーザー認証  
**Phase 3** — コーデ提案（Claude API → 必要なら外部 Go/Rust サービスに切り替え）

---

## 未設計（Claude Code 上で検討）

- 認証方式の詳細（Clerk vs 自前 JWT vs その他）
- 状態管理の詳細設計（Zustand のスライス構成、IndexedDB との同期戦略）

## Testing Standards

### Testing Trophy に従うテスト戦略

#### Testing Trophy とは

- **Kent C. Dodds の Testing Trophy**に従ってテスト戦略を構築する
- 下から順に: Static Analysis → Unit Tests → Integration Tests → E2E Tests
- **インテグレーションテストが最も重要**であり、最も多くの価値を提供する
- テストピラミッドではなく、インテグレーションテストを最重要視する Testing Trophy の形を採用

#### 各テストレベルの役割と優先順位

1. **Static Analysis（静的解析）** - 基盤
   - TypeScript 型チェック、ESLint、OxFmt
   - 基本的な構文エラーや型エラーを早期発見
   - コードの品質と一貫性を保証

2. **Unit Tests（ユニットテスト）** - 限定的使用
   - 純粋な関数、ユーティリティ関数のテスト
   - ビジネスロジックのテスト（カスタム Hooks 等）
   - モック使用は最小限に抑制
   - 複雑な計算ロジックや独立した関数のみを対象

3. **Integration Tests（インテグレーションテスト）** - **最重要**
   - **React コンポーネントのテスト - これが最も価値が高い**
   - 実際のユーザー操作をシミュレート
   - MSW を使用して API レスポンスをモック
   - 実際の DOM 操作とユーザーインタラクションを検証
   - コンポーネント間の連携を検証
   - **実際のユーザー体験に最も近いテスト**

4. **E2E Tests（エンドツーエンドテスト）** - 最小限
   - 重要なユーザーフローの検証
   - 実際のブラウザでの動作確認
   - インテグレーションテストでカバーできない統合的なシナリオのみ

### Test Philosophy

- **Kent C. Dodds の Testing Trophy に厳密に従う**
- **インテグレーションテストを最優先**で実装する
- ビジネスロジックに対してユニットテストを実施する
- デトロイト学派に従う
- React コンポーネントに対してはインテグレーションテストを実施する
- **実際のユーザー体験に近いテストを優先**し、過度なモックは避ける

## Important Conventions

### TypeScript Guidelines

- **バレルファイル（index.ts）禁止**
  - `index.ts` や `index.tsx` によるre-exportは使用禁止
  - 常に直接ファイルパスでインポートすること

- **型の使用**
  - `any`型は使用禁止
  - 型アサーション（Type Assertion）は使用禁止
  - タイプエイリアス（type）をインターフェース（interface）より優先して使用
  - 型名はアッパーキャメルケース（PascalCase）を使用

```typescript
// 良い例
type User = {
  id: number;
  name: string;
};

type ProductData = {
  id: string;
  price: number;
};
```

- **変数とイミュータブル性**
  - `let`は基本的に使用禁止。`const`を優先的に使用
  - 宣言済みのオブジェクトのプロパティをミュータブルに更新することを禁止
  - `for`よりも`map`、`filter`などの高階関数の使用を優先
  - オブジェクトのプロパティを更新するようなミュータブルな走査を禁止

```typescript
// 良い例
const newArray = array.map((item) => transformItem(item));

// 新しいオブジェクトを作成する（イミュータブル）
const updatedUser = { ...user, age: 30 };

// オブジェクトのイミュータブルな更新
const user = { name: "John", age: 25 };
const updatedUser = { ...user, age: 26 };

// 配列のイミュータブルな更新
const items = [1, 2, 3];
const newItems = [...items, 4];
const filteredItems = items.filter((item) => item > 1);
const mappedItems = items.map((item) => item * 2);
```

- **命名規則**
  - 変数名や関数名はロアキャメルケース（camelCase）を使用
  - 定数は大文字のスネークケース（UPPER_SNAKE_CASE）を使用
  - クラス・型名はアッパーキャメルケース（PascalCase）を使用

```typescript
// 良い例
const userName = "John";
const MAX_RETRIES = 3;
const API_ENDPOINT = "https://api.example.com";
function calculateTotal(items) {
  /* ... */
}
class UserRepository {
  /* ... */
}
```

- **値の扱い**
  - `null`の使用は DOM 関連の返り値を扱う場合以外では禁止
  - 値がない場合も常に`undefined`を使用
  - オブジェクトのプロパティが存在しない場合は`undefined`を使用

```typescript
// 良い例
const user = {
  name: "John",
  address: undefined, // 住所情報がない
};
const getValue = () => undefined; // 値が存在しない場合

// DOM関連の例外的な使用
const element = document.querySelector(".not-exist"); // null が返される可能性あり
if (element === null) {
  // DOM要素が存在しない場合の処理
}
```

- **条件と比較**
  - boolean 以外の変数で `!変数名` のような曖昧な比較を行わない
  - null、undefined、空文字列などの判定は厳密に比較演算子を使用
  - ただし、null と undefined を同時に弾く目的での `変数 != null` のような比較は許可

```typescript
// 良い例
if (value === null) {
  // nullの場合の処理
}

if (value === undefined) {
  // undefinedの場合の処理
}

if (array.length === 0) {
  // 配列が空の場合の処理
}

if (text === "") {
  // 文字列が空の場合の処理
}

// nullとundefinedを同時に弾く例外的なケース
if (value != null) {
  // valueがnullでもundefinedでもない場合の処理
  // これは許可される例外パターン
}
```

- **マジックナンバー・文字列の禁止**
  - コード内で直接数値や文字列リテラルを使用せず、常に定数を使用
  - `Object.freeze()`を使用して定数オブジェクトを作成
  - TypeScript の`as const`アサーションを活用して型安全性を高める

```typescript
// 良い例
export const REVIEW_OPTION_TYPE = Object.freeze({
  TEXT: 1,
  TEXTAREA: 2,
  SCORE: 3,
  RADIO: 4,
  CHECKBOX: 5,
  SELECT: 6,
});

// 型の定義と組み合わせる
export type ReviewOptionTypeKey = keyof typeof REVIEW_OPTION_TYPE;
export type ReviewOptionType = (typeof REVIEW_OPTION_TYPE)[ReviewOptionTypeKey];

// 使用例
if (option.type === REVIEW_OPTION_TYPE.TEXT) {
  // テキスト入力の処理
}

export const REVIEW_SETTING_TYPE = Object.freeze({
  BASIC: "basic",
  DESIGN: "design",
  PATTERN_TEST: "pattern_test",
});
```

- **RORO パターン（Receive an Object, Return an Object）**
  - 関数の引数と戻り値の両方でオブジェクトを使用
  - オブジェクトの分割代入を活用して必要なプロパティのみを取り出す

```typescript
// React コンポーネントでの適用
type ReviewData = {
  id: string;
  title: string;
  content: string;
};

type Props = {
  reviewData: ReviewData;
};

const ReviewComponent = ({ reviewData }: Props) => {
  const { id, title, content } = reviewData;
  // ...処理...
  return <div>{title}</div>;
};

// 通常の関数での適用
const calculateTax = ({
  amount,
  taxRate = 0.1,
  includeDiscount = false,
  discountRate = 0,
}) => {
  let taxableAmount = amount;

  if (includeDiscount) {
    taxableAmount = amount * (1 - discountRate);
  }

  const tax = taxableAmount * taxRate;
  const total = taxableAmount + tax;

  return {
    originalAmount: amount,
    taxableAmount,
    tax,
    total,
    effectiveTaxRate: taxRate,
    discountApplied: includeDiscount,
  };
};

// 使用例
const { total, tax } = calculateTax({
  amount: 1000,
  includeDiscount: true,
  discountRate: 0.05,
});
```

- **非同期処理**
  - await/catch を使用する
  - `Promise.then().catch()`の使用禁止
  - `try/catch`の使用禁止

### React Suspense パターン

非同期データ取得には React Suspense と ErrorBoundary を使用し、手動のローディング/エラー状態管理を避ける。

#### 基本構造

```tsx
// レイアウトコンポーネントで Suspense と ErrorBoundary をラップ
<ErrorBoundary fallback={ErrorFallback}>
  <Suspense fallback={<LoadingState />}>
    <DataComponent />
  </Suspense>
</ErrorBoundary>
```

#### Jotai での Suspense 対応 atom

```typescript
// Suspense 対応の非同期 atom
export const dataSuspenseAtom = atom(async (get) => {
  const result = await invoke<Data[]>("load_data").catch((err: unknown) => {
    throw err instanceof Error
      ? err
      : new Error("データの読み込みに失敗しました");
  });
  return result;
});

// リフレッシュ用パターン
const refreshTriggerAtom = atom(0);

export const dataWithRefreshAtom = atom(async (get) => {
  get(refreshTriggerAtom); // 依存関係を作成
  return await invoke<Data[]>("load_data");
});

export const refreshDataAtom = atom(null, (_get, set) => {
  set(refreshTriggerAtom, (prev) => prev + 1);
});
```

#### コンポーネントでの使用

```tsx
// ローディング/エラー状態の条件分岐は不要
const DataList = () => {
  const data = useAtomValue(dataSuspenseAtom); // Suspense が自動でローディング処理

  if (data.length === 0) {
    return <EmptyState />;
  }

  return <List items={data} />;
};
```

#### ErrorBoundary の実装

- React の制約によりクラスコンポーネントで実装（`getDerivedStateFromError` が必要）
- `src/components/error/ErrorBoundary.tsx` を参照

#### テストでの Suspense atom のモック

Suspense 対応 atom はテスト環境で非同期解決が難しいため、同期的な atom でモックする。

```typescript
const mockData = vi.hoisted(() => ({
  value: [] as Data[],
}));

vi.mock("../stores/dataAtoms", async () => {
  const original = await vi.importActual("../stores/dataAtoms");
  return {
    ...original,
    dataSuspenseAtom: atom(() => mockData.value), // 同期的な atom でモック
  };
});

// テスト内で値を設定
beforeEach(() => {
  mockData.value = [];
});

it("データが表示される", () => {
  mockData.value = [{ id: "1", name: "Test" }];
  render(<DataList />);
  expect(screen.getByText("Test")).toBeInTheDocument();
});
```

#### 禁止事項

- コンポーネント内での `isLoading` / `error` 状態管理
- `useEffect` 内でのデータ取得と状態更新
- ローディング/エラーの条件分岐による表示切り替え

```typescript
// 良い例 - await/catchパターン
const fetchUserData = async (id: string) => {
  const response = await fetch(`/api/users/${id}`).catch((error) => {
    return { ok: false, error };
  });

  if (!response.ok) {
    return {
      ok: false,
      error: response.error || new Error("Failed to fetch user data"),
    };
  }

  const data = await response.json().catch((error) => {
    return { ok: false, error };
  });

  if (!data.ok) {
    return { ok: false, error: data.error };
  }

  return { ok: true, data };
};

// 使用例
const result = await fetchUserData("123");
if (result.ok) {
  const userData = result.data;
  // 成功時の処理
} else {
  // エラーハンドリング
  console.error(result.error);
}
```
