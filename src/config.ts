import ConfigKey from "./configKey";
import ConfigValue from "./configValue";

export type RawConfigWithoutTypes = { [key: string]: any };

export type ConfigEvaluationMetadata = {
  configRowIndex: number;
  conditionalValueIndex: number;
  type: string;
  configId: string;
};

type APIKeyMetadata = {
  id: string | number;
};

type Duration = {
  definition: string;
  millis: number;
};

type Value = {
  [key: string]: number | string | string[] | boolean | Duration;
};

type Evaluation = {
  value: Value;
  configEvaluationMetadata: {
    configRowIndex: string | number;
    conditionalValueIndex: string | number;
    weightedValueIndex?: string | number;
    type: string;
    valueType: string;
    id: string;
  };
};

export type EvaluationPayload = {
  evaluations: { [key: string]: Evaluation };
  apikeyMetadata: APIKeyMetadata;
};

const parseRawMetadata = (metadata: any) => ({
  configRowIndex: parseInt(metadata.configRowIndex, 10),
  conditionalValueIndex: parseInt(metadata.conditionalValueIndex, 10),
  type: metadata.type,
  configId: metadata.id,
});

const valueFor = (value: Value, type: string, key: string): ConfigValue => {
  const rawValue = value[type];

  switch (type) {
    case "json":
      try {
        return JSON.parse(rawValue as string);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`Error parsing JSON from Reforge config ${key}`, e, rawValue);
        return value[type];
      }
    case "duration": {
      const duration = rawValue as Duration;
      return {
        ms: duration.millis,
        seconds: duration.millis / 1000,
      };
    }
    default:
      return rawValue;
  }
};

export const parseEvaluationPayload = (payload: EvaluationPayload) => {
  // eslint-disable-next-line no-use-before-define
  const configs = {} as { [key: string]: Config };
  Object.keys(payload.evaluations).forEach((key) => {
    const evaluation = payload.evaluations[key];

    const type = Object.keys(evaluation.value)[0];

    // eslint-disable-next-line no-use-before-define
    configs[key] = new Config(
      key,
      valueFor(evaluation.value, type, key),
      type,
      evaluation.value,
      evaluation.configEvaluationMetadata
        ? parseRawMetadata(evaluation.configEvaluationMetadata)
        : undefined
    );
  });

  return configs;
};

const parseRawConfigWithoutTypes = (payload: RawConfigWithoutTypes) => {
  // eslint-disable-next-line no-use-before-define
  const configs = {} as { [key: string]: Config };
  Object.keys(payload).forEach((key) => {
    const type = typeof payload[key];
    // eslint-disable-next-line no-use-before-define
    configs[key] = new Config(key, valueFor({ [type]: payload[key] }, type, key), type);
  });

  return configs;
};

export class Config {
  key: ConfigKey;

  value: ConfigValue;

  rawValue: Value | undefined;

  type: string;

  configEvaluationMetadata: ConfigEvaluationMetadata | undefined;

  constructor(
    key: ConfigKey,
    value: ConfigValue,
    type: string,
    rawValue?: Value,
    metadata?: ConfigEvaluationMetadata
  ) {
    this.key = key;
    this.value = value;
    this.type = type;
    this.rawValue = rawValue;
    this.configEvaluationMetadata = metadata;
  }

  static digest(payload: EvaluationPayload | RawConfigWithoutTypes) {
    if (payload === undefined) {
      // eslint-disable-next-line no-console
      console.trace("Config.digest called with undefined payload");
    }

    if ("evaluations" in payload) {
      return parseEvaluationPayload(payload as EvaluationPayload);
    }

    return parseRawConfigWithoutTypes(payload as RawConfigWithoutTypes);
  }
}
