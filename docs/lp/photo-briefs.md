# LP 写真 — Scene Brief 集

7 枚分のシーン仕様。各セクションには **そのままコピペして codex に投げられるプロンプト全文** を併記している。STYLE ANCHOR は `photo-art-direction.md` の本文。

## 一覧

| #   | filename                  | section                                  | aspect | mood                                 |
| --- | ------------------------- | ---------------------------------------- | ------ | ------------------------------------ |
| 1   | `problem-where-is-it.png` | Problem #1「どこにしまったか分からない」 | 1:1    | 整ったコレクションの中の小さな違和感 |
| 2   | `problem-shifted.png`     | Problem #2「収納を入れ替えたらズレる」   | 1:1    | 直された後の静かな"ズレ"             |
| 3   | `problem-missing.png`     | Problem #3「気づいたら行方不明」         | 1:1    | 静かな不在                           |
| 4   | `step-1-register.png`     | Steps #1 登録                            | 4:5    | これから始まる予感                   |
| 5   | `step-2-label.png`        | Steps #2 ラベルを貼る                    | 4:5    | 丁寧さ・準備の喜び                   |
| 6   | `step-3-scan.png`         | Steps #3 スキャン                        | 4:5    | 軽快・確認の安心                     |
| 7   | `step-4-routine.png`      | Steps #4 継続                            | 4:5    | 落ち着き・週末の整い                 |

格納先: 一次出力は `docs/lp/photo-raw/*.png`（gitignore 済み・ローカル保管のみ）、Web 配信用に webp に変換して `public/lp/photos/*.webp`。

---

## 1. `problem-where-is-it.png` ✅ 採用済み

**シーン**: 半開きの引き出しの中に、ミニチュアのドール服が美しくレイアウトされた俯瞰ショット。観る人が「これだ」と気づくのではなく、「これはどこの引き出しだったかな？」とふと思う温度感。

実際の生成物は周辺に dried baby's breath / ribbon spool / lace fragment が偶発的に追加され、editorial 感が強化された。**この副プロップス傾向は Problem セクション全体で許容**する。

```text
[STYLE ANCHOR]
<docs/lp/photo-art-direction.md の STYLE ANCHOR ブロックをここに貼る>

[SCENE BRIEF]
Scene: A small wooden drawer pulled half-open, viewed from a
slight 30° angle above. Inside the drawer, four or five tiny
BJD garments (a dusty-mauve dress with lace, a pale-lavender
blouse, a small cream cardigan, a tiny patterned skirt) are
arranged elegantly — slightly overlapping but clearly visible
as individual pieces. One garment drapes softly toward the
front edge of the drawer.

Editorial editorial styling: a small wooden ribbon spool with
mauve silk ribbon trailing, a few sprigs of dried baby's breath,
and a piece of pale lace may sit at the frame edges as quiet
editorial accents.

Focal: the carefully arranged miniature garments inside the drawer.
Props: small wooden drawer with pale grain, miniature fabric
garments, one tiny wooden hanger pushed to the corner, optional
ribbon spool / dried flowers / lace at frame edges.
Mood: calm and beautifully kept. The image shows "a kept
collection," not chaos. The viewer's question "...where did I
put that one?" should arise from familiarity, not stress.
Camera: 30° angled from above, 1:1 framing.

[TECHNICAL]
Aspect ratio: 1:1
Output: 2048 x 2048 PNG, photographic, no text, no logos.
```

---

## 2. `problem-shifted.png`

**シーン**: 並んだ 2 つの引き出しトレイ、両方とも整然としているが、片方の中に **1 つだけ「最近触られた跡」** がある。観る人がじっくり見て「あ、ここだけ違う」と気づくレベル。乱雑にはしない。

```text
[STYLE ANCHOR]
<docs/lp/photo-art-direction.md の STYLE ANCHOR ブロックをここに貼る>

[SCENE BRIEF]
Scene: Two identical small wooden compartmented trays placed
side by side on a cream linen surface, viewed from a slight 30°
angle above. Each tray is divided into a 2x3 grid of small
compartments. Both trays look beautifully organized — each
compartment holds one neatly folded BJD-scale garment in dusty
mauve, pale lavender, or cream tones.

The subtle imperfection: in the RIGHT tray, ONE compartment
near the front-right has its garment shifted half-out of its
slot, slightly twisted, as if someone took it out and put it
back in a hurry. The rest of the right tray is still neat.
Everything else is calm and editorial.

Editorial styling: a small folded square of fabric, a piece of
ribbon, or dried sprigs may sit at the frame edges as quiet
accents.

Focal: the entire two-tray composition; the eye discovers the
single shifted garment as a quiet "hmm" moment, not as chaos.
Props: two matching wooden compartmented trays with pale grain,
miniature folded garments (dusty mauve / pale lavender / cream),
optional ribbon / dried flower / lace at frame edges.
Mood: a kept system that has been touched. Calm, slightly
melancholic, the small sadness of order that quietly drifts.
NO chaos, NO mess, NO dramatic disorder.
Camera: 30° angled from above, 1:1 framing.

[TECHNICAL]
Aspect ratio: 1:1
Output: 2048 x 2048 PNG, photographic, no text, no logos.
```

---

## 3. `problem-missing.png`

**シーン**: ミニチュアの服がずらりと並んだラックを横から見たショット。中央付近に空のハンガーが1つだけぽつんとある。整然とした並びの中の、ひとつだけの不在。

```text
[STYLE ANCHOR]
<docs/lp/photo-art-direction.md の STYLE ANCHOR ブロックをここに貼る>

[SCENE BRIEF]
Scene: A miniature wooden clothing rack, photographed from a
horizontal eye-level angle (slight 30° angle, not strict
profile), holding about eight to ten BJD-scale garments on
tiny matching wooden hangers in a neat row. The garments are
beautifully kept — pale lavender, dusty mauve, and cream tones,
hung at consistent spacing.

The subtle imperfection: near the center of the rack, ONE hanger
holds nothing — it is empty, slightly catching the light. The
empty hanger faces the same direction as the others, so it reads
as a quiet vacancy, not a dramatic gap.

Editorial styling: a small ribbon spool, dried baby's breath,
or a piece of lace may sit at the frame edges as quiet accents.

Focal: the entire well-kept rack; the empty hanger is discovered
quietly by the eye after a moment.
Props: miniature wooden clothing rack, tiny wooden hangers,
8-10 BJD-scale garments hanging in a row, optional editorial
accents at frame edges.
Mood: quiet absence, the "...wait, where is that one?" feeling.
A small melancholy felt within a kept system. NO chaos, NO mess.
Camera: 30° from horizontal, slight overhead, 1:1 framing.

[TECHNICAL]
Aspect ratio: 1:1
Output: 2048 x 2048 PNG, photographic, no text, no logos.
```

---

## 4. `step-1-register.png`

**シーン**: 撮影台に置かれたドール服。フレーム端にスマホのレンズの一部と袖口がチラ見え。「登録」の瞬間。

```text
[STYLE ANCHOR]
<docs/lp/photo-art-direction.md の STYLE ANCHOR ブロックをここに貼る>

[SCENE BRIEF]
Scene: A small wooden tabletop covered in cream linen, with one
single BJD-scale dress (dusty mauve, lace trim) carefully laid
out flat in the center, slightly angled. At the very top edge of
the frame, the back corner of a smartphone lens (just the round
camera ring) and a small portion of a person's sleeve cuff are
visible — only the fabric edge, no skin, no fingers.

Focal: the laid-out miniature garment in the center.
Props: cream linen surface, one BJD dress, a small wooden ruler
beside it for scale (no numbers visible).
Mood: the careful, slightly excited beginning of cataloging
something you treasure.
Camera: top-down (90° overhead), 4:5 portrait framing.

[TECHNICAL]
Aspect ratio: 4:5 portrait
Output: 1638 x 2048 PNG, photographic, no text, no logos,
phone screen must not be visible (only the rear lens ring).
```

---

## 5. `step-2-label.png`

**シーン**: 引き出しの縁に、ピンセットで小さな QR / NFC シールを貼る瞬間。指は袖口まで。

```text
[STYLE ANCHOR]
<docs/lp/photo-art-direction.md の STYLE ANCHOR ブロックをここに貼る>

[SCENE BRIEF]
Scene: A small wooden drawer, partially in frame, with a fine
metal tweezer carefully placing a small square sticker label
onto the front edge of the drawer. The label is plain cream-
colored paper with a subtle abstract pattern (do NOT depict an
actual QR code; suggest "small square sticker" without legible
QR squares). The tweezer is held by a hand that is mostly out
of frame — only a sleeve cuff in dusty mauve fabric is visible
near the frame edge, no fingers, no skin.

Focal: the moment of placing the small label on the drawer edge.
Props: wooden drawer, fine pointed metal tweezers, one small
square cream sticker, soft cream linen surface.
Mood: meticulous care, the small joy of setup.
Camera: 30° angled from above, 4:5 portrait framing.

[TECHNICAL]
Aspect ratio: 4:5 portrait
Output: 1638 x 2048 PNG, photographic, no text, no logos,
no readable QR pattern (just a plain or softly patterned label),
no visible fingers or skin (only sleeve fabric edge).
```

---

## 6. `step-3-scan.png`

**シーン**: 開いた引き出しの上で、スマホがかざされている瞬間。スマホ画面は写さず（モーションブラーまたは黒画面）。

```text
[STYLE ANCHOR]
<docs/lp/photo-art-direction.md の STYLE ANCHOR ブロックをここに貼る>

[SCENE BRIEF]
Scene: A small wooden drawer is half-open, holding three or four
neatly arranged BJD-scale garments. Above the drawer, hovering
about 15cm up, the back of a smartphone is partially in frame —
the phone is held by an out-of-frame hand (only sleeve cuff in
pale lavender fabric is visible at frame edge). The phone screen
is NOT visible (the camera angle shows only the back of the
phone with its rear lens). The phone is slightly motion-blurred
to suggest the moment of scanning.

Focal: the scanning gesture, with the open drawer below as
context.
Props: wooden drawer, neatly folded BJD garments, smartphone
(back-side only).
Mood: light, easy, confirming. The reassurance of "yes it's here."
Camera: 45° angled from above, 4:5 portrait framing.

[TECHNICAL]
Aspect ratio: 4:5 portrait
Output: 1638 x 2048 PNG, photographic, no text, no logos,
phone screen must not be visible at all, no UI of any kind,
no visible fingers or skin (only sleeve fabric edge).
```

---

## 7. `step-4-routine.png`

**シーン**: 完璧に整理された引き出し全景。ラベルが等間隔に並び、服が畳まれている。週次の安心の暗示。

```text
[STYLE ANCHOR]
<docs/lp/photo-art-direction.md の STYLE ANCHOR ブロックをここに貼る>

[SCENE BRIEF]
Scene: A wide top-down view of a wooden compartmented drawer
fully open, divided into a 3x4 grid of small compartments. Each
compartment holds one neatly folded BJD-scale garment (varied
in pale lavender, dusty mauve, soft cream tones). Each
compartment edge has a small plain cream square label. Soft
morning light comes from the top-left, casting a gentle long
shadow across the bottom-right.

Focal: the entire orderly grid, no single hero item.
Props: wooden drawer with 12 compartments, 12 miniature folded
garments, 12 small plain cream square labels (do NOT depict QR
patterns).
Mood: calm, the satisfaction of a kept system, weekend morning
light.
Camera: top-down (90° overhead), 4:5 portrait framing.

[TECHNICAL]
Aspect ratio: 4:5 portrait
Output: 1638 x 2048 PNG, photographic, no text, no logos,
all labels must be plain cream squares without readable
patterns.
```

---

## 生成後ワークフロー

1. 7 枚を `docs/lp/photo-raw/*.png` に保存（codex の image_gen 既定サイズ・PNG）
2. Claude（美術監督）が並べてレビュー → 不合格は SCENE BRIEF を 1〜2 語修正して再生成
3. 採用枚を webp に変換し `public/lp/photos/<name>.webp` へ:
   ```sh
   for f in docs/lp/photo-raw/*.png; do
     name=$(basename "$f" .png)
     cp "$f" "/tmp/${name}.png"
     sips -Z 1280 "/tmp/${name}.png" >/dev/null
     cwebp -q 82 -quiet "/tmp/${name}.png" -o "public/lp/photos/${name}.webp"
     rm "/tmp/${name}.png"
   done
   ```
4. `src/components/marketing/ProblemSection.tsx` と `src/components/marketing/StepsSection.tsx` を編集して `next/image` で参照
5. alt 文言を Lingui マクロで多言語化（`pnpm i18n:extract` → 4 言語翻訳 → `pnpm i18n:compile`）
6. `pnpm precheck` を通す
