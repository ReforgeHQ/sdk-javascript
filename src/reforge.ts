/* eslint-disable max-classes-per-file */
import { v4 as uuid } from "uuid";

import { Config, EvaluationPayload, RawConfigWithoutTypes } from "./config";
import type {
  Duration,
  TypedFrontEndConfigurationRaw,
  FrontEndConfigurationRaw,
  Contexts,
} from "./types";
import Context from "./context";
import { EvaluationSummaryAggregator } from "./evaluationSummaryAggregator";
import Loader, { CollectContextModeType } from "./loader";
import {
  PREFIX as loggerPrefix,
  shouldLog,
  ShouldLogParams,
  LogLevel,
  shouldLogAtLevel,
} from "./logger";
import TelemetryUploader from "./telemetryUploader";
import { LoggerAggregator } from "./loggerAggregator";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require("../package.json");

type EvaluationCallback = <K extends keyof TypedFrontEndConfigurationRaw>(
  key: K,
  value: TypedFrontEndConfigurationRaw[K],
  context: Context | undefined
) => void;

export interface ReforgeBootstrap {
  evaluations: EvaluationPayload;
  context: Contexts;
}

export type ReforgeInitParams = {
  sdkKey: string;
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
  loggerKey?: string;
};

type PollStatus =
  | { status: "not-started" }
  | { status: "pending" }
  | { status: "stopped" }
  | { status: "running"; frequencyInMs: number };

type PublicShouldLogParams = Omit<ShouldLogParams, "get">;

// Forward declaration for ReforgeLogger
// eslint-disable-next-line @typescript-eslint/no-use-before-define
class ReforgeLogger {
  // eslint-disable-next-line no-use-before-define
  private reforge: Reforge;

  // eslint-disable-next-line no-use-before-define
  constructor(reforge: Reforge) {
    this.reforge = reforge;
  }

  private log(message: string, level: LogLevel): void {
    const configuredLevel = this.reforge.getLogLevel("");

    if (shouldLogAtLevel(configuredLevel, level)) {
      switch (level) {
        case LogLevel.TRACE:
        case LogLevel.DEBUG:
          // eslint-disable-next-line no-console
          console.debug(message);
          break;
        case LogLevel.INFO:
          // eslint-disable-next-line no-console
          console.info(message);
          break;
        case LogLevel.WARN:
          // eslint-disable-next-line no-console
          console.warn(message);
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          // eslint-disable-next-line no-console
          console.error(message);
          break;
        default:
          // eslint-disable-next-line no-console
          console.error(message);
      }
    }
  }

  trace(message: string): void {
    this.log(message, LogLevel.TRACE);
  }

  debug(message: string): void {
    this.log(message, LogLevel.DEBUG);
  }

  info(message: string): void {
    this.log(message, LogLevel.INFO);
  }

  warn(message: string): void {
    this.log(message, LogLevel.WARN);
  }

  error(message: string): void {
    this.log(message, LogLevel.ERROR);
  }

  fatal(message: string): void {
    this.log(message, LogLevel.FATAL);
  }
}

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

  private _loggerKey = "log-levels.default";

  public logger: ReforgeLogger;

  constructor() {
    this.logger = new ReforgeLogger(this);
  }

  async init({
    sdkKey,
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
    loggerKey = "log-levels.default",
  }: ReforgeInitParams) {
    const context = providedContext ?? this.context;

    if (!context) {
      throw new Error("Context must be provided");
    }

    this._context = context;
    this._loggerKey = loggerKey;

    this.clientNameString = clientNameString;
    const clientNameAndVersionString = `${clientNameString}-${clientVersionString}`;

    this.loader = new Loader({
      sdkKey,
      context,
      endpoints,
      timeout,
      collectContextMode,
      clientVersion: clientNameAndVersionString,
    });

    this._telemetryUploader = new TelemetryUploader({
      sdkKey,
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

  public extract(): Record<string, Config["value"]> {
    return Object.entries(this._configs).reduce(
      (agg, [key, value]) => ({
        ...agg,
        [key]: value.value,
      }),
      {} as Record<string, Config["value"]>
    );
  }

  public hydrate(rawValues: RawConfigWithoutTypes | EvaluationPayload): void {
    this.setConfigPrivate(rawValues);
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
        this.setConfigPrivate({ evaluations: reforgeBootstrap.evaluations });
        return Promise.resolve();
      }
    }

    // make sure we have the freshest context
    this.loader.context = this.context;

    return this.loader
      .load()
      .then((rawValues: any) => {
        this.setConfigPrivate(rawValues as EvaluationPayload);
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

  private setConfigPrivate(rawValues: RawConfigWithoutTypes | EvaluationPayload) {
    this._configs = Config.digest(rawValues);
    this.loaded = true;
  }

  isEnabled<
    // We need to calcuate these live and not store in a type to ensure dynamic evaluation
    // in upstream libraries that override the FrontEndConfigurationRaw interface
    K extends keyof FrontEndConfigurationRaw extends never
      ? string
      : {
          [IK in keyof TypedFrontEndConfigurationRaw]: TypedFrontEndConfigurationRaw[IK] extends boolean
            ? IK
            : never;
        }[keyof TypedFrontEndConfigurationRaw],
  >(key: K): boolean {
    return this.get(key) === true;
  }

  get<K extends keyof TypedFrontEndConfigurationRaw>(key: K): TypedFrontEndConfigurationRaw[K] {
    if (!this.loaded) {
      if (!key.startsWith(loggerPrefix)) {
        // eslint-disable-next-line no-console
        console.warn(
          `Reforge warning: The client has not finished loading data yet. Unable to look up actual value for key "${key}".`
        );
      }

      return undefined;
    }

    const config = this._configs[key];

    const value = config?.value;

    if (!key.startsWith(loggerPrefix)) {
      if (this.collectEvaluationSummaries) {
        setTimeout(() => this.evalutionSummaryAggregator?.record(config));
      }

      setTimeout(() => this.afterEvaluationCallback(key, value, this.context));
    }

    return value;
  }

  getDuration<
    // We need to calcuate these live and not store in a type to ensure dynamic evaluation
    // in upstream libraries that override the FrontEndConfigurationRaw interface
    K extends keyof FrontEndConfigurationRaw extends never
      ? string
      : {
          [IK in keyof TypedFrontEndConfigurationRaw]: TypedFrontEndConfigurationRaw[IK] extends Duration
            ? IK
            : never;
        }[keyof TypedFrontEndConfigurationRaw],
  >(key: K): Duration | undefined {
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

  shouldLog(args: PublicShouldLogParams, async = true): boolean {
    if (this.collectLoggerNames) {
      const record = () => this.loggerAggregator?.record(args.loggerName, args.desiredLevel);
      if (async) {
        setTimeout(record);
      } else {
        record();
      }
    }

    return shouldLog({ ...args, get: this.get.bind(this) });
  }

  getLogLevel(_loggerName: string): LogLevel {
    const value = this.get(this._loggerKey);

    if (value && typeof value === "string") {
      const upperValue = value.toUpperCase();
      if (upperValue in LogLevel) {
        return LogLevel[upperValue as keyof typeof LogLevel];
      }
    }

    // Default to DEBUG if no config found or invalid value
    return LogLevel.DEBUG;
  }

  isCollectingEvaluationSummaries(): boolean {
    return this.collectEvaluationSummaries;
  }

  isCollectingLoggerNames(): boolean {
    return this.collectLoggerNames;
  }
}

export const reforge = new Reforge();
