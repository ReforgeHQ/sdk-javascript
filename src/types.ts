export type Duration = {
  seconds: number;
  ms: number;
};

export type ConfigEvaluationMetadata = {
  configRowIndex: number;
  conditionalValueIndex: number;
  type: string;
  configId: string;
};

export type ConfigEvaluationCounter = Omit<ConfigEvaluationMetadata, "type"> & {
  selectedValue: any;
  count: number;
};

export type ConfigEvaluationSummary = {
  key: string;
  type: string; // FEATURE_FLAG, CONFIG, etc
  counters: ConfigEvaluationCounter[];
};

export type ConfigEvaluationSummaries = {
  start: number;
  end: number;
  summaries: ConfigEvaluationSummary[];
};

export type LoggerCounter = {
  loggerName: string;
  traces: number;
  debugs: number;
  infos: number;
  warns: number;
  errors: number;
  fatals: number;
};

export type LoggersTelemetryEvent = {
  startAt: number;
  endAt: number;
  loggers: LoggerCounter[];
};

export type TelemetryEvent =
  | {
      loggers: LoggersTelemetryEvent;
    }
  | {
      summaries: ConfigEvaluationSummaries;
    };

export type TelemetryEvents = {
  instanceHash: string;
  events: TelemetryEvent[];
};

// @reforge-com/cli#generate will create interfaces into this namespace for React to consume
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FrontEndConfigurationRaw {}

export type TypedFrontEndConfigurationRaw = keyof FrontEndConfigurationRaw extends never
  ? Record<string, unknown>
  : {
      [TypedFlagKey in keyof FrontEndConfigurationRaw]: FrontEndConfigurationRaw[TypedFlagKey];
    };

export type ContextValue = number | string | boolean;

export type Contexts = { [key: string]: Record<string, ContextValue> };
