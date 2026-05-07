import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { addGarmentTagsTool } from "./add-garment-tags";
import { createCoordinateTool } from "./create-coordinate";
import type { DefinedTool, ToolContext } from "./define-tool";
import { getGarmentTool } from "./get-garment";
import { getOrganizationDigestTool } from "./get-organization-digest";
import { getStorageCaseTool } from "./get-storage-case";
import { listCoordinatesTool } from "./list-coordinates";
import { listDollsTool } from "./list-dolls";
import { listGarmentsTool } from "./list-garments";
import { listStorageCasesTool } from "./list-storage-cases";

export const ALL_TOOLS: readonly DefinedTool[] = [
  listGarmentsTool,
  getGarmentTool,
  listDollsTool,
  listStorageCasesTool,
  getStorageCaseTool,
  getOrganizationDigestTool,
  listCoordinatesTool,
  addGarmentTagsTool,
  createCoordinateTool,
];

export const registerAllTools = (server: McpServer, ctx: ToolContext): void => {
  ALL_TOOLS.forEach((tool) => {
    tool.register(server, ctx);
  });
};
