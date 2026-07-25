export const classes = Object.freeze({
  unknown: "?",
  none: "NONE",
  application: "A",
  medium: "M",
  high: "H",
});

export const levels = Object.freeze({
  none: "none",
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
});

export const levelOrder = Object.freeze([
  levels.none,
  levels.low,
  levels.medium,
  levels.high,
  levels.critical,
]);

export const levelGuidance = Object.freeze({
  [levels.none]:
    "レビュー不要（一般文書・マーケティング資産のみ）。CI green でマージ可",
  [levels.low]: "通常レビューで可",
  [levels.medium]: "AI レビューに加え、M ファイルを人間が確認",
  [levels.high]: "人間レビュー必須。AI は補助",
  [levels.critical]:
    "人間精読必須（テスト・migration・レビュー／CI ガードへの接触）",
});

export const levelForClass = (reviewClass) => {
  switch (reviewClass) {
    case classes.none:
      return levels.none;
    case classes.application:
      return levels.low;
    case classes.medium:
      return levels.medium;
    case classes.high:
    case classes.unknown:
    default:
      return levels.high;
  }
};

export const compareLevels = (left, right) =>
  levelOrder.indexOf(left) - levelOrder.indexOf(right);

export const maxLevel = (left, right) =>
  compareLevels(left, right) >= 0 ? left : right;

export const parseLevel = (value) => {
  if (levelOrder.includes(value)) {
    return value;
  }
  throw new Error(
    `unknown level ${JSON.stringify(value)} (want ${levelOrder.join("|")})`,
  );
};
