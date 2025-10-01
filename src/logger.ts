import { TypedFrontEndConfigurationRaw } from "./types";

export const PREFIX = "log-level";
export enum ReforgeLogLevel {
  Trace = 1,
  Debug = 2,
  Info = 3,
  Warn = 4,
  Error = 5,
  Fatal = 6,
}

export type LogLevelWord = Uppercase<keyof typeof ReforgeLogLevel>;

const WORD_LEVEL_LOOKUP: Readonly<Record<LogLevelWord, ReforgeLogLevel>> = {
  TRACE: ReforgeLogLevel.Trace,
  DEBUG: ReforgeLogLevel.Debug,
  INFO: ReforgeLogLevel.Info,
  WARN: ReforgeLogLevel.Warn,
  ERROR: ReforgeLogLevel.Error,
  FATAL: ReforgeLogLevel.Fatal,
};

export const isValidLogLevel = (possibleLogLevel: string) =>
  Object.keys(WORD_LEVEL_LOOKUP).includes(possibleLogLevel.toUpperCase());

export interface ShouldLogParams {
  loggerName: string;
  desiredLevel: ReforgeLogLevel;
  defaultLevel: ReforgeLogLevel;
  get: <K extends keyof TypedFrontEndConfigurationRaw>(key: K) => TypedFrontEndConfigurationRaw[K];
}

export const shouldLog = ({
  loggerName,
  desiredLevel,
  defaultLevel,
  get,
}: ShouldLogParams): boolean => {
  let loggerNameWithPrefix = `${PREFIX}.${loggerName}`;

  while (loggerNameWithPrefix.length > 0) {
    const resolvedLevel = get(loggerNameWithPrefix);

    if (resolvedLevel) {
      return (
        WORD_LEVEL_LOOKUP[resolvedLevel.toString().toUpperCase() as LogLevelWord] <= desiredLevel
      );
    }

    if (loggerNameWithPrefix.indexOf(".") === -1) {
      break;
    }

    loggerNameWithPrefix = loggerNameWithPrefix.slice(0, loggerNameWithPrefix.lastIndexOf("."));
  }

  return defaultLevel <= desiredLevel;
};
