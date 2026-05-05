import { fireEvent } from "@testing-library/react";

export const fireFileSelect = (
  input: HTMLInputElement,
  files: readonly File[],
): void => {
  Object.defineProperty(input, "files", {
    configurable: true,
    value: files,
  });
  fireEvent.change(input);
};

export const fireSingleFileSelect = (
  input: HTMLInputElement,
  file: File,
): void => {
  fireFileSelect(input, [file]);
};
