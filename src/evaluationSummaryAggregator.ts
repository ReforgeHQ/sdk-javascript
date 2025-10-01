// TODO: should we retry the data chunk if a flush fails?

// TODO: pause when offline?

// TODO: flush when we receive a config update (or as a result of a context update...but that should trigger a config update anyway)

import { PeriodicSync } from "./periodicSync";
import { Config } from "./config";
import { type reforge } from "./reforge";
import {
  ConfigEvaluationCounter,
  ConfigEvaluationSummaries,
  ConfigEvaluationSummary,
  TelemetryEvents,
  ConfigEvaluationMetadata,
} from "./types";

export const massageSelectedValue = (config: Config): any => {
  if (config.rawValue && (config.type === "duration" || config.type === "json")) {
    if (config.type === "json") {
      return { json: config.rawValue[config.type] };
    }

    return config.rawValue[config.type];
  }

  return config.type === "stringList" ? { values: config.value } : config.value;
};

export const massageConfigForTelemetry = (
  config: Config,
  metadata: Omit<ConfigEvaluationMetadata, "type">
) => ({
  ...metadata,
  selectedValue: {
    [config.type]: massageSelectedValue(config),
  },
  count: 0,
});

class EvaluationSummaryAggregator extends PeriodicSync<ConfigEvaluationCounter> {
  private maxKeys: number;

  constructor(client: typeof reforge, maxKeys: number, syncInterval?: number) {
    super(client, "EvaluationSummaryAggregator", syncInterval ?? 30000);

    this.maxKeys = maxKeys;
  }

  record(config: Config): void {
    if (this.data.size >= this.maxKeys) return;

    if (config?.configEvaluationMetadata) {
      const { type, ...metadata } = config.configEvaluationMetadata;
      const key = `${config.key},${type}`;

      // create counter entry if it doesn't exist
      if (!this.data.has(key)) {
        this.data.set(key, massageConfigForTelemetry(config, metadata));
      }

      // increment count
      const counter = this.data.get(key);
      if (counter) {
        counter.count += 1;
      }
    }
  }

  protected flush(toShip: Map<string, ConfigEvaluationCounter>, startAtWas: Date): void {
    const summaries = {
      start: startAtWas.getTime(),
      end: new Date().getTime(),
      summaries: EvaluationSummaryAggregator.summaries(toShip),
    };

    this.client.telemetryUploader?.post(this.events(summaries));
  }

  private static summaries(data: Map<string, ConfigEvaluationCounter>): ConfigEvaluationSummary[] {
    return Array.from(data).map((entry: [string, ConfigEvaluationCounter]) => {
      const [configKey, configType] = entry[0].split(",");
      const counter = entry[1];
      const counters = [counter]; // this client only ever has one set of counter info per key

      return {
        key: configKey,
        type: configType,
        counters,
      };
    });
  }

  private events(summaries: ConfigEvaluationSummaries): TelemetryEvents {
    const event = { summaries };

    return {
      instanceHash: this.client.instanceHash,
      events: [event],
    };
  }
}

export { EvaluationSummaryAggregator };
