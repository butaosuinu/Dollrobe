import { customType } from "drizzle-orm/sqlite-core";

export const jsonArrayColumn = customType<{
  data: readonly string[];
  driverData: string;
}>({
  dataType: () => "text",
  toDriver: (value) => JSON.stringify(value),
  fromDriver: (value) => {
    if (typeof value !== "string") {
      return [];
    }
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (item: unknown): item is string => typeof item === "string",
    );
  },
});
