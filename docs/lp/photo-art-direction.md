# LP 写真 — Art Direction Anchor

このドキュメントは LP 用の AI 生成写真 7 枚を作るときに **毎回先頭に貼る不変プロンプト** を保管する。Claude が美術監督、codex imagegen が実行担当の分業を支える。

## 運用ルール

- 各シーンを生成するときは、必ず **「STYLE ANCHOR（このファイル本文）」+「SCENE BRIEF（`photo-briefs.md` の該当行）」+「TECHNICAL」** の3ブロックを連結したプロンプトで codex を呼ぶ
- STYLE ANCHOR を**1 単語でも変更したら**、すでに採用済みの画像は**全枚再生成**する
- 「禁則事項」のどれかを破った出力は採用しない

---

## STYLE ANCHOR（コピペ用 / 英語）

```text
Editorial still-life photograph, magazine product-shot aesthetic
(Kinfolk / Real Simple style), shot on medium-format film with
natural soft north-window morning light. Backdrop: warm cream
linen fabric (#FAF7F0), gentle highlights, no harsh shadows,
no harsh specular reflections.

Color palette is strictly limited to three tones:
- dusty mauve pink (#C29CAE) as primary accent
- pale lavender (#BAB1D2) as secondary accent
- warm cream (#FAF7F0) as background and neutral
Other colors may appear only in muted, desaturated form.

Composition: clean magazine layout with ~30% negative space,
single clear focal point, centered or rule-of-thirds placement,
shallow but NOT exaggerated depth of field. No on-image text,
no logos, no watermarks, no UI elements.

Subject domain: 1/3-scale ball-jointed-doll (BJD) garments and
related collection accessories — miniature hangers, miniature
drawers, fabric, ribbon, small QR/NFC sticker labels. Garments
must read as miniature (visible stitching scale, tiny buttons,
small fabric grain). The clothes should look hand-sewn and
carefully crafted.

DO NOT include in any image:
- doll bodies, doll faces, doll heads, full doll figures
- human faces, human full hands, fingers in detail
  (only fingertips, sleeve cuffs, or wrist edges may be partially
   visible at frame edge if a scene requires action)
- AI-typical hyperreal sheen, plastic 3D-render look, chrome,
  neon, oversaturated colors, exaggerated bokeh
- text overlays, captions, brand logos, watermarks
- modern smartphone UI on screen (phone screens, if shown,
  must be off / black / motion-blurred)

Mood overall: quiet, gentle, slightly melancholic but warm.
Suggests careful collection-keeping, not industrial product retail.
```

---

## カラーパレット（補足）

| トークン             | LP 内 oklch             | 近似 HEX  | プロンプト内表記           |
| -------------------- | ----------------------- | --------- | -------------------------- |
| primary (mauve)      | `oklch(0.65 0.08 350)`  | `#C29CAE` | dusty mauve pink           |
| accent (lavender)    | `oklch(0.78 0.06 290)`  | `#BAB1D2` | pale lavender              |
| surface base (cream) | `oklch(0.985 0.005 85)` | `#FAF7F0` | warm cream                 |
| text primary         | `oklch(0.25 0.02 285)`  | `#2C2733` | （写真には使わない、参考） |

---

## TECHNICAL ブロック（用途別）

Problem セクション（3枚）:

```text
Aspect ratio: 1:1
Output: 2048 x 2048 PNG, photographic
```

Steps セクション（4枚）:

```text
Aspect ratio: 4:5 (portrait)
Output: 1638 x 2048 PNG, photographic
```

---

## codex 呼び出しテンプレート

```sh
# 1 枚生成する例（problem-where-is-it.png）
codex exec --image \
  "$(cat docs/lp/photo-art-direction.md | sed -n '/^## STYLE ANCHOR/,/^---$/p')

[SCENE BRIEF]
$(SCENE_BRIEF_FROM_PHOTO_BRIEFS_MD)

[TECHNICAL]
Aspect ratio: 1:1
Output: 2048 x 2048 PNG, photographic" \
  --output public/lp/photos/_raw/problem-where-is-it.png
```

実際の codex CLI のフラグ名は環境次第のため、`docs/lp/photo-briefs.md` には**プレーンなプロンプト全文**を載せる。コピペ運用が最終手段。

---

## レビュー観点（Claude が担当）

7 枚生成後、以下の3観点で全てパスしたものだけ採用する。

| 観点         | 合格基準                                                                          |
| ------------ | --------------------------------------------------------------------------------- |
| 統一感       | 並べたとき同じ「号の雑誌の同じ特集」に見える光・色・余白か                        |
| 被写体正しさ | ドール服のスケール感が伝わる。人体・顔が映っていない。手が映る場合は袖口/指先のみ |
| 構図         | 余白 30%、焦点が明確、LP の既存トーンと衝突しない                                 |

不合格は **STYLE ANCHOR は触らず、SCENE BRIEF を 1〜2 語修正**して個別再生成。
