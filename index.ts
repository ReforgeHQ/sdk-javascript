import { reforge, Reforge, ReforgeBootstrap } from "./src/reforge";
import { Config } from "./src/config";
import Context from "./src/context";
import { LogLevel, getLogLevelSeverity, shouldLogAtLevel } from "./src/logger";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require("./package.json");

export { reforge, Reforge, Config, Context, LogLevel, getLogLevelSeverity, shouldLogAtLevel, version };

export { ReforgeBootstrap };

export type { Duration } from "./src/configValue";
export type { default as ConfigValue } from "./src/configValue";
export type { default as ContextValue } from "./src/contextValue";
export type { CollectContextModeType } from "./src/loader";
