import {
  reforge,
  Reforge,
  ReforgeInitParams,
  ReforgeBootstrap,
  prefetchReforgeConfig,
} from "./src/reforge";
import { Config } from "./src/config";
import Context from "./src/context";
import { LogLevel, getLogLevelSeverity, shouldLogAtLevel } from "./src/logger";

/* eslint-disable no-underscore-dangle */
declare const __SDK_VERSION__: string;
const version = __SDK_VERSION__;
/* eslint-enable no-underscore-dangle */

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
  prefetchReforgeConfig,
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
