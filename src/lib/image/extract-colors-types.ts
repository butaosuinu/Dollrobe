export type ExtractColorsRequest = {
  readonly type: "extract";
  readonly file: File;
};

export type ExtractColorsResponse =
  | { readonly type: "result"; readonly presetColors: readonly string[] }
  | { readonly type: "error"; readonly message: string };

export type ColorExtractionResult = {
  readonly presetColors: readonly string[];
};
