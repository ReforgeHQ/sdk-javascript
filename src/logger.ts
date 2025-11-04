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

// LogLevel enum for public API
export enum LogLevel {
  TRACE = "TRACE",
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  FATAL = "FATAL",
}

// Get the numeric severity value for a LogLevel (lower = more verbose)
export const getLogLevelSeverity = (level: LogLevel): number => WORD_LEVEL_LOOKUP[level];

// Check if a log at desiredLevel should be logged given the configured level
// Returns true if desiredLevel is at or above the configured level's severity
export const shouldLogAtLevel = (configuredLevel: LogLevel, desiredLevel: LogLevel): boolean =>
  WORD_LEVEL_LOOKUP[configuredLevel] <= WORD_LEVEL_LOOKUP[desiredLevel];

export const shouldLog = ({
  loggerName,
  desiredLevel,
  defaultLevel,
  get,
}: ShouldLogParams): boolean => {
  const loggerNameWithPrefix = `${PREFIX}.${loggerName}`;

  const resolvedLevel = get(loggerNameWithPrefix);

  if (resolvedLevel) {
    return (
      WORD_LEVEL_LOOKUP[resolvedLevel.toString().toUpperCase() as LogLevelWord] <= desiredLevel
    );
  }

  return defaultLevel <= desiredLevel;
};
