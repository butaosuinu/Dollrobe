import { describe, it, expect } from "vitest";
import { parsePermissions, hasScope, TOOL_REQUIRED_SCOPE } from "./scopes";

describe("parsePermissions", () => {
  it("returns 'write' when mcp permissions include write", () => {
    expect(parsePermissions({ mcp: ["read", "write"] })).toBe("write");
  });

  it("returns 'read' when mcp permissions only include read", () => {
    expect(parsePermissions({ mcp: ["read"] })).toBe("read");
  });

  it("prefers write when both are present in any order", () => {
    expect(parsePermissions({ mcp: ["write", "read"] })).toBe("write");
    expect(parsePermissions({ mcp: ["write"] })).toBe("write");
  });

  it("returns undefined when mcp key is missing", () => {
    expect(parsePermissions({})).toBeUndefined();
    expect(parsePermissions({ other: ["read"] })).toBeUndefined();
  });

  it("returns undefined when mcp value is not an array", () => {
    expect(parsePermissions({ mcp: "read" })).toBeUndefined();
    expect(parsePermissions({ mcp: { read: true } })).toBeUndefined();
  });

  it("returns undefined when mcp array does not include read or write", () => {
    expect(parsePermissions({ mcp: [] })).toBeUndefined();
    expect(parsePermissions({ mcp: ["admin"] })).toBeUndefined();
  });

  it("returns undefined for null or non-object input", () => {
    expect(parsePermissions(null)).toBeUndefined();
    expect(parsePermissions(undefined)).toBeUndefined();
    expect(parsePermissions("read")).toBeUndefined();
    expect(parsePermissions(123)).toBeUndefined();
  });
});

describe("hasScope", () => {
  it("read scope can access read tools", () => {
    expect(hasScope("read", "read")).toBe(true);
  });

  it("read scope cannot access write tools", () => {
    expect(hasScope("read", "write")).toBe(false);
  });

  it("write scope can access read tools", () => {
    expect(hasScope("write", "read")).toBe(true);
  });

  it("write scope can access write tools", () => {
    expect(hasScope("write", "write")).toBe(true);
  });
});

describe("TOOL_REQUIRED_SCOPE", () => {
  it("only includes whitelisted tools", () => {
    expect(Object.keys(TOOL_REQUIRED_SCOPE).sort()).toEqual([
      "add_garment_tags",
      "create_coordinate",
      "get_garment",
      "get_organization_digest",
      "get_storage_case",
      "list_coordinates",
      "list_dolls",
      "list_garments",
      "list_storage_cases",
    ]);
  });

  it("flags coordinate create and tag write as the write tools", () => {
    const writeOnly = Object.entries(TOOL_REQUIRED_SCOPE)
      .filter(([, scope]) => scope === "write")
      .map(([name]) => name)
      .sort();
    expect(writeOnly).toEqual(["add_garment_tags", "create_coordinate"]);
  });
});
