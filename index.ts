import { reforge, Reforge, ReforgeInitParams, ReforgeBootstrap } from "./src/reforge";
import { Config } from "./src/config";
import Context from "./src/context";
import { LogLevel, getLogLevelSeverity, shouldLogAtLevel } from "./src/logger";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require("./package.json");

export {
  reforge,
  Reforge,
  ReforgeInitParams,
  Config,
  Context,
  LogLevel,
  getLogLevelSeverity,
  shouldLogAtLevel,
  version,
};

export { ReforgeBootstrap };

export type { ConfigValue } from "./src/config";
export type {
  Duration,
  ContextValue,
  Contexts,
  TypedFrontEndConfigurationRaw,
  FrontEndConfigurationRaw,
} from "./src/types";
export type { CollectContextModeType } from "./src/loader";
