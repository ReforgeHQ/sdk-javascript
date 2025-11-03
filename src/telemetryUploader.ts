import { DEFAULT_TIMEOUT, headers } from "./apiHelpers";
import { TelemetryEvents } from "./types";

export type TelemetryUploaderParams = {
  sdkKey: string;
  apiEndpoint?: string;
  timeout?: number;
  clientVersion: string;
};

export default class TelemetryUploader {
  sdkKey: Required<TelemetryUploaderParams>["sdkKey"];

  apiEndpoint: Required<TelemetryUploaderParams>["apiEndpoint"];

  timeout: Required<TelemetryUploaderParams>["timeout"];

  clientVersion: Required<TelemetryUploaderParams>["clientVersion"];

  abortTimeoutId: ReturnType<typeof setTimeout> | undefined;

  constructor({
    sdkKey,
    apiEndpoint = undefined,
    timeout,
    clientVersion,
  }: TelemetryUploaderParams) {
    this.sdkKey = sdkKey;
    this.apiEndpoint = apiEndpoint || "https://telemetry.reforge.com/api/v1";
    this.timeout = timeout || DEFAULT_TIMEOUT;
    this.clientVersion = clientVersion;
  }

  clearAbortTimeout() {
    clearTimeout(this.abortTimeoutId);
  }

  static postUrl(root: string) {
    return `${root}/telemetry`;
  }

  postToEndpoint(
    options: RequestInit,
    resolve: (value: unknown) => void,
    reject: (value: unknown) => void
  ) {
    const controller = new AbortController() as AbortController;
    const signal = controller?.signal;
    let isAborted = false;

    const url = TelemetryUploader.postUrl(this.apiEndpoint);

    fetch(url, { signal, ...options })
      .then((response) => {
        this.clearAbortTimeout();

        if (response.ok) {
          return response.json();
        }

        // eslint-disable-next-line no-console
        console.warn(
          `Reforge warning: Error uploading telemetry ${response.status} ${response.statusText}`
        );

        return response.status;
      })
      .then((response) => {
        resolve(response);
      })
      .catch((error) => {
        this.clearAbortTimeout();

        // Silently handle AbortErrors (from timeouts or page navigations)
        if (error.name === "AbortError") {
          try {
            // eslint-disable-next-line no-console
            console.debug("Reforge telemetry request aborted");
          } catch (e) {
            // no-op
          }
          resolve({ status: "aborted" });
          return;
        }

        reject(error);
      });

    this.abortTimeoutId = setTimeout(() => {
      if (!isAborted) {
        isAborted = true;
        controller.abort();
      }
    }, this.timeout);
  }

  post(data: TelemetryEvents) {
    const options = {
      method: "POST",
      headers: {
        ...headers(this.sdkKey, this.clientVersion),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
      keepalive: true, // needed for flushing when the window is closed
    };

    const promise = new Promise((resolve, reject) => {
      this.postToEndpoint(options, resolve, reject);
    });

    return promise;
  }
}
