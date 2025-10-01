// TODO: should we retry the data chunk if a flush fails?

// TODO: pause when offline?

import { ReforgeLogLevel } from "./logger";
import { PeriodicSync } from "./periodicSync";
import { type reforge } from "./reforge";
import { LoggerCounter, LoggersTelemetryEvent, TelemetryEvents } from "./types";

const SEVERITY_KEY: { [key in ReforgeLogLevel]: Omit<keyof LoggerCounter, "loggerName"> } = {
  [ReforgeLogLevel.Trace]: "traces",
  [ReforgeLogLevel.Debug]: "debugs",
  [ReforgeLogLevel.Info]: "infos",
  [ReforgeLogLevel.Warn]: "warns",
  [ReforgeLogLevel.Error]: "errors",
  [ReforgeLogLevel.Fatal]: "fatals",
};

class LoggerAggregator extends PeriodicSync<LoggerCounter> {
  private maxLoggers: number;

  constructor(client: typeof reforge, maxLoggers: number, syncInterval?: number) {
    super(client, "LoggerAggregator", syncInterval ?? 30000);

    this.maxLoggers = maxLoggers;
  }

  record(logger: string, level: ReforgeLogLevel): void {
    if (this.data.size >= this.maxLoggers) return;

    // create counter entry if it doesn't exist
    if (!this.data.has(logger)) {
      this.data.set(logger, {
        loggerName: logger,
        traces: 0,
        debugs: 0,
        infos: 0,
        warns: 0,
        errors: 0,
        fatals: 0,
      });
    }

    // increment count
    const counter = this.data.get(logger);
    if (counter) {
      const severityKey = SEVERITY_KEY[level] as keyof LoggerCounter;
      (counter[severityKey] as number) += 1;
    }
  }

  protected flush(toShip: Map<string, LoggerCounter>, startAtWas: Date): void {
    const loggers = {
      startAt: startAtWas.getTime(),
      endAt: new Date().getTime(),
      loggers: Array.from(toShip.values()),
    };

    this.client.telemetryUploader?.post(this.events(loggers));
  }

  private events(loggers: LoggersTelemetryEvent): TelemetryEvents {
    const event = { loggers };

    return {
      instanceHash: this.client.instanceHash,
      events: [event],
    };
  }
}

export { LoggerAggregator };
