import { DEFAULT_TIMEOUT, headers } from "./apiHelpers";
import { EvaluationPayload } from "./config";
import Context from "./context";

export type CollectContextModeType = "NONE" | "SHAPE_ONLY" | "PERIODIC_EXAMPLE";

export type LoaderParams = {
  sdkKey: string;
  context: Context;
  endpoints?: string[] | undefined;
  timeout?: number;
  collectContextMode?: CollectContextModeType;
  clientVersion?: string;
};

export type Headers = {
  [key: string]: string;
};

export type FetchOptions = {
  headers: Headers;
};

const defaultEndpoints = [
  "https://primary.reforge.com/api/v2",
  "https://secondary.reforge.com/api/v2",
];

const EARLY_TIMEOUT = 2000;

export default class Loader {
  sdkKey: string;

  context: Context;

  endpoints: string[];

  timeout: number;

  abortTimeoutId: ReturnType<typeof setTimeout> | undefined;

  collectContextMode: CollectContextModeType = "PERIODIC_EXAMPLE";

  clientVersion: string;

  abortController: AbortController | undefined;

  isAborted = false;

  constructor({
    sdkKey,
    context,
    endpoints = undefined,
    timeout,
    collectContextMode = "PERIODIC_EXAMPLE",
    clientVersion = "",
  }: LoaderParams) {
    this.sdkKey = sdkKey;
    this.context = context;
    this.endpoints = endpoints || defaultEndpoints;
    this.timeout = timeout || DEFAULT_TIMEOUT;
    this.collectContextMode = collectContextMode;
    this.clientVersion = clientVersion;
  }

  url(root: string) {
    return `${root}/configs/eval-with-context/${this.context.encode()}?collectContextMode=${
      this.collectContextMode
    }`;
  }

  loadFromEndpoint(
    index: number,
    options: FetchOptions,
    resolve: (value: any) => void,
    reject: (value: any) => void
  ) {
    this.abortController = new AbortController() as AbortController;
    const { signal } = this.abortController;
    this.isAborted = false;

    const endpoint = this.endpoints[index];
    const url = this.url(endpoint);

    fetch(url, { signal, ...options })
      .then((response) => {
        this.clearAbortTimeout();

        if (response.ok) {
          return response.json();
        }
        throw new Error(`${response.status} ${response.statusText}`);
      })
      .then((data) => {
        if (!("evaluations" in data)) {
          throw new Error(`Invalid payload:${JSON.stringify(data)}`);
        }

        resolve(data as EvaluationPayload);
      })
      .catch((error) => {
        this.clearAbortTimeout();

        if (index < this.endpoints.length - 1) {
          this.loadFromEndpoint(index + 1, options, resolve, reject);
        } else {
          reject(error);
        }
      });

    // Use an early timeout if we're not on the last endpoint. But if the user-provided timeout is less than EARLY_TIMEOUT, use that
    const timeout =
      index < this.endpoints.length - 1 ? Math.min(this.timeout, EARLY_TIMEOUT) : this.timeout;

    this.abortTimeoutId = setTimeout(() => {
      if (!this.isAborted) {
        this.isAborted = true;
        this.abortController?.abort();
      }
    }, timeout);
  }

  load() {
    if (!this.isAborted) {
      this.isAborted = true;
      this.abortController?.abort();
    }

    const options = {
      headers: headers(this.sdkKey, this.clientVersion),
    };

    const promise = new Promise((resolve, reject) => {
      this.loadFromEndpoint(0, options, resolve, reject);
    });

    return promise;
  }

  clearAbortTimeout() {
    clearTimeout(this.abortTimeoutId);
  }
}
