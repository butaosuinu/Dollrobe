type CreateTestFileOptions = {
  readonly name?: string;
  readonly type?: string;
  readonly content?: string | Blob;
};

export const createTestFile = ({
  name = "test.bin",
  type = "application/octet-stream",
  content = "dummy",
}: CreateTestFileOptions = {}): File => new File([content], name, { type });

export const createPngFile = (name = "test.png"): File =>
  createTestFile({ name, type: "image/png" });

export const createJpegFile = (name = "test.jpg"): File =>
  createTestFile({ name, type: "image/jpeg" });

export const createCsvFile = (content: string, name = "test.csv"): File =>
  createTestFile({ name, type: "text/csv", content });

export const createJsonFile = (content: string, name = "test.json"): File =>
  createTestFile({ name, type: "application/json", content });
