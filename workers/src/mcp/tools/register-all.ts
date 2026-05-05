import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Logger } from "../../lib/logger";
import type { McpCaller } from "../adapter";
import type { McpScope } from "../scopes";
import { registerListGarments } from "./list-garments";
import { registerGetGarment } from "./get-garment";
import { registerListDolls } from "./list-dolls";
import { registerListStorageCases } from "./list-storage-cases";
import { registerGetStorageCase } from "./get-storage-case";
import { registerGetOrganizationDigest } from "./get-organization-digest";
import { registerAddGarmentTags } from "./add-garment-tags";

export const registerAllTools = (
  server: McpServer,
  ctx: {
    readonly caller: McpCaller;
    readonly scope: McpScope;
    readonly logger: Logger;
  },
): void => {
  registerListGarments(server, ctx);
  registerGetGarment(server, ctx);
  registerListDolls(server, ctx);
  registerListStorageCases(server, ctx);
  registerGetStorageCase(server, ctx);
  registerGetOrganizationDigest(server, ctx);
  registerAddGarmentTags(server, ctx);
};
