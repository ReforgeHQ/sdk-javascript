import { v4 as uuid } from "uuid";

import { Config, EvaluationPayload, RawConfigWithoutTypes } from "./config";
import ConfigValue, { type Duration } from "./configValue";
import Context, { Contexts } from "./context";
import { EvaluationSummaryAggregator } from "./evaluationSummaryAggregator";
import Loader, { CollectContextModeType } from "./loader";
import { PREFIX as loggerPrefix, isValidLogLevel, Severity, shouldLog } from "./logger";
import TelemetryUploader from "./telemetryUploader";
import { LoggerAggregator } from "./loggerAggregator";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require("../package.json");

type EvaluationCallback = (key: string, value: ConfigValue, context: Context | undefined) => void;

export interface ReforgeBootstrap {
  evaluations: EvaluationPayload;
  context: Contexts;
}

type InitParams = {
  apiKey: string;
  context: Context;
  endpoints?: string[] | undefined;
  apiEndpoint?: string;
  timeout?: number;
  afterEvaluationCallback?: EvaluationCallback;
  collectEvaluationSummaries?: boolean;
  collectLoggerNames?: boolean;
  collectContextMode?: CollectContextModeType;
  clientNameString?: string;
  clientVersionString?: string;
};

type PollStatus =
  | { status: "not-started" }
  | { status: "pending" }
  | { status: "stopped" }
  | { status: "running"; frequencyInMs: number };

export class Reforge {
  private _configs: { [key: string]: Config } = {};

  private _telemetryUploader: TelemetryUploader | undefined;

  private _pollCount = 0;

  private _pollStatus: PollStatus = { status: "not-started" };

  private _pollTimeoutId = undefined as ReturnType<typeof setTimeout> | undefined;

  private _instanceHash: string = uuid();

  private collectEvaluationSummaries = true;

  private collectLoggerNames = false;

  private evalutionSummaryAggregator: EvaluationSummaryAggregator | undefined;

  private loggerAggregator: LoggerAggregator | undefined;

  public clientNameString = "sdk-javascript";

  public loaded = false;

  public loader: Loader | undefined;

  public afterEvaluationCallback = (() => {}) as EvaluationCallback;

  private _context: Context = new Context({});

  async init({
    apiKey,
    context: providedContext,
    endpoints = undefined,
    apiEndpoint,
    timeout = undefined,
    afterEvaluationCallback = () => {},
    collectEvaluationSummaries = true,
    collectLoggerNames = false,
    collectContextMode = "PERIODIC_EXAMPLE",
    clientNameString = "sdk-javascript",
    clientVersionString = version,
  }: InitParams) {
    const context = providedContext ?? this.context;

    if (!context) {
      throw new Error("Context must be provided");
    }

    this._context = context;

    this.clientNameString = clientNameString;
    const clientNameAndVersionString = `${clientNameString}-${clientVersionString}`;

    this.loader = new Loader({
      apiKey,
      context,
      endpoints,
      timeout,
      collectContextMode,
      clientVersion: clientNameAndVersionString,
    });

    this._telemetryUploader = new TelemetryUploader({
      apiKey,
      apiEndpoint,
      timeout,
      clientVersion: clientNameAndVersionString,
    });

    this.collectEvaluationSummaries = collectEvaluationSummaries;
    if (collectEvaluationSummaries) {
      this.evalutionSummaryAggregator = new EvaluationSummaryAggregator(this, 100000);
    }

    this.collectLoggerNames = collectLoggerNames;
    if (collectLoggerNames) {
      this.loggerAggregator = new LoggerAggregator(this, 100000);
    }

    if (
      (collectEvaluationSummaries || collectLoggerNames) &&
      typeof window !== "undefined" &&
      typeof window.addEventListener === "function"
    ) {
      window.addEventListener("beforeunload", () => {
        this.evalutionSummaryAggregator?.sync();
        this.loggerAggregator?.sync();
      });
    }

    this.afterEvaluationCallback = afterEvaluationCallback;

    return this.load();
  }

  get configs(): { [key: string]: Config } {
    return this._configs;
  }

  get context(): Context {
    return this._context;
  }

  get instanceHash(): string {
    return this._instanceHash;
  }

  get pollTimeoutId() {
    return this._pollTimeoutId;
  }

  get pollCount() {
    return this._pollCount;
  }

  get pollStatus() {
    return this._pollStatus;
  }

  get telemetryUploader(): TelemetryUploader | undefined {
    return this._telemetryUploader;
  }

  private async load() {
    if (!this.loader || !this.context) {
      throw new Error("Reforge not initialized. Call init() first.");
    }

    /* eslint-disable no-underscore-dangle */
    if (globalThis && (globalThis as any)._reforgeBootstrap) {
      /* eslint-disable no-underscore-dangle */
      const reforgeBootstrap = (globalThis as any)._reforgeBootstrap as ReforgeBootstrap;
      const bootstrapContext = new Context(reforgeBootstrap.context);

      if (this.context.equals(bootstrapContext)) {
        this.setConfig({ evaluations: reforgeBootstrap.evaluations });
        return Promise.resolve();
      }
    }

    // make sure we have the freshest context
    this.loader.context = this.context;

    return this.loader
      .load()
      .then((rawValues: any) => {
        this.setConfig(rawValues as EvaluationPayload);
      })
      .finally(() => {
        if (this.pollStatus.status === "running") {
          this._pollCount += 1;
        }
      });
  }

  async updateContext(context: Context, skipLoad = false) {
    if (!this.loader) {
      throw new Error("Reforge not initialized. Call init() first.");
    }

    this._context = context;

    if (skipLoad) {
      return Promise.resolve();
    }

    return this.load();
  }

  async poll({ frequencyInMs }: { frequencyInMs: number }) {
    if (!this.loader) {
      throw new Error("Reforge not initialized. Call init() first.");
    }

    this.stopPolling();

    this._pollStatus = { status: "pending" };

    return this.loader.load().finally(() => {
      this.doPolling({ frequencyInMs });
    });
  }

  private doPolling({ frequencyInMs }: { frequencyInMs: number }) {
    this._pollTimeoutId = setTimeout(() => {
      this.load().finally(() => {
        if (this.pollStatus.status === "running") {
          this.doPolling({ frequencyInMs });
        }
      });
    }, frequencyInMs);

    this._pollStatus = {
      status: "running",
      frequencyInMs,
    };
  }

  stopPolling() {
    if (this.pollTimeoutId) {
      clearTimeout(this.pollTimeoutId);
      this._pollTimeoutId = undefined;
    }

    this._pollStatus = { status: "stopped" };
  }

  stopTelemetry() {
    if (this.telemetryUploader) {
      this.evalutionSummaryAggregator?.stop();
      this.loggerAggregator?.stop();
    }
  }

  setConfig(rawValues: RawConfigWithoutTypes | EvaluationPayload) {
    this._configs = Config.digest(rawValues);
    this.loaded = true;
  }

  isEnabled(key: string): boolean {
    return this.get(key) === true;
  }

  get(key: string): ConfigValue {
    if (!this.loaded) {
      if (!key.startsWith(loggerPrefix)) {
        // eslint-disable-next-line no-console
        console.warn(
          `Reforge warning: The client has not finished loading data yet. Unable to look up actual value for key "${key}".`
        );
      }

      return undefined;
    }

    const config = this.configs[key];

    const value = config?.value;

    if (!key.startsWith(loggerPrefix)) {
      if (this.collectEvaluationSummaries) {
        setTimeout(() => this.evalutionSummaryAggregator?.record(config));
      }

      setTimeout(() => this.afterEvaluationCallback(key, value, this.context));
    }

    return value;
  }

  getDuration(key: string): Duration | undefined {
    const value = this.get(key);

    if (!value) {
      return undefined;
    }

    if (
      !Object.prototype.hasOwnProperty.call(value, "seconds") ||
      !Object.prototype.hasOwnProperty.call(value, "ms")
    ) {
      throw new Error(`Value for key "${key}" is not a duration`);
    }

    return value as Duration;
  }

  shouldLog(args: Omit<Parameters<typeof shouldLog>[0], "get">, async = true): boolean {
    if (this.collectLoggerNames && isValidLogLevel(args.desiredLevel)) {
      const record = () =>
        this.loggerAggregator?.record(args.loggerName, args.desiredLevel.toUpperCase() as Severity);
      if (async) {
        setTimeout(record);
      } else {
        record();
      }
    }

    return shouldLog({ ...args, get: this.get.bind(this) });
  }

  isCollectingEvaluationSummaries(): boolean {
    return this.collectEvaluationSummaries;
  }

  isCollectingLoggerNames(): boolean {
    return this.collectLoggerNames;
  }
}

export const reforge = new Reforge();
