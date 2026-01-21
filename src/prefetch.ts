import Context from "./context";
import Loader, { CollectContextModeType } from "./loader";

// Re-export Context so consumers can create contexts for prefetch
export { Context };

/* eslint-disable no-underscore-dangle */
declare const __SDK_VERSION__: string;
const version = __SDK_VERSION__;
/* eslint-enable no-underscore-dangle */

export type PrefetchParams = {
  sdkKey: string;
  context: Context;
  endpoints?: string[] | undefined;
  timeout?: number;
  collectContextMode?: CollectContextModeType;
  clientNameString?: string;
  clientVersionString?: string;
};

export function prefetchReforgeConfig({
  sdkKey,
  context,
  endpoints = undefined,
  timeout = undefined,
  collectContextMode = "PERIODIC_EXAMPLE",
  clientNameString = "sdk-javascript",
  clientVersionString = version,
}: PrefetchParams) {
  const clientNameAndVersionString = `${clientNameString}-${clientVersionString}`;

  const loader = new Loader({
    sdkKey,
    context,
    endpoints,
    timeout,
    collectContextMode,
    clientVersion: clientNameAndVersionString,
  });

  (window as any).REFORGE_SDK_PREFETCH_PROMISE = loader.load();
}

export default prefetchReforgeConfig;
