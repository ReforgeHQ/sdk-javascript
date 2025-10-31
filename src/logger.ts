import ConfigValue from "./configValue";

export const PREFIX = "log-level";

const WORD_LEVEL_LOOKUP: Readonly<Record<string, number>> = {
  TRACE: 1,
  DEBUG: 2,
  INFO: 3,
  WARN: 5,
  ERROR: 6,
  FATAL: 9,
};

export type Severity = keyof typeof WORD_LEVEL_LOOKUP;

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
export const getLogLevelSeverity = (level: LogLevel): number => {
  return WORD_LEVEL_LOOKUP[level];
};

// Check if a log at desiredLevel should be logged given the configured level
// Returns true if desiredLevel is at or above the configured level's severity
export const shouldLogAtLevel = (configuredLevel: LogLevel, desiredLevel: LogLevel): boolean => {
  return WORD_LEVEL_LOOKUP[configuredLevel] <= WORD_LEVEL_LOOKUP[desiredLevel];
};

export const isValidLogLevel = (logLevel: string) =>
  Object.keys(WORD_LEVEL_LOOKUP).includes(logLevel.toUpperCase());

export const shouldLog = ({
  loggerName,
  desiredLevel,
  defaultLevel,
  get,
}: {
  loggerName: string;
  desiredLevel: string;
  defaultLevel: string;
  get: (key: string) => ConfigValue;
}): boolean => {
  const loggerNameWithPrefix = `${PREFIX}.${loggerName}`;
  const desiredLevelNumber = WORD_LEVEL_LOOKUP[desiredLevel.toUpperCase()];

  const resolvedLevel = get(loggerNameWithPrefix);

  if (resolvedLevel !== undefined) {
    return WORD_LEVEL_LOOKUP[resolvedLevel.toString()] <= desiredLevelNumber;
  }

  return WORD_LEVEL_LOOKUP[defaultLevel.toUpperCase()] <= desiredLevelNumber;
};
