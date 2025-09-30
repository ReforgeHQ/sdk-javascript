import { ReforgeLogLevel } from "./logger";
import { TypedFrontEndConfigurationRaw, ConfigEvaluationMetadata } from "./types";

export type RawConfigWithoutTypes = Record<string, any>;

type APIKeyMetadata = {
  id: string | number;
};

// TODO: Why is this definition different from the one in ./types.ts?
type Duration = {
  definition: string;
  millis: number;
};

export interface IntRange {
  /** if empty treat as Number.MIN_VALUE. Inclusive */
  start?: bigint | undefined;
  /** if empty treat as Number.MAX_VALUE. Exclusive */
  end?: bigint | undefined;
}

export enum ProvidedSource {
  EnvVar = "ENV_VAR",
}
export interface Provided {
  source?: ProvidedSource | undefined;
  /** eg MY_ENV_VAR */
  lookup?: string | undefined;
}

export enum SchemaType {
  UNKNOWN = 0,
  ZOD = 1,
  JSON_SCHEMA = 2,
}

export interface Schema {
  schema: string;
  schemaType: SchemaType;
}

export interface WeightedValue {
  /** out of 1000 */
  weight: number;
  // eslint-disable-next-line no-use-before-define
  value: ConfigValue | undefined;
}

export enum LimitResponse_LimitPolicyNames {
  SecondlyRolling = 1,
  MinutelyRolling = 3,
  HourlyRolling = 5,
  DailyRolling = 7,
  MonthlyRolling = 8,
  Infinite = 9,
  YearlyRolling = 10,
}

export enum LimitDefinition_SafetyLevel {
  L4_BEST_EFFORT = 4,
  L5_BOMBPROOF = 5,
}

export interface LimitDefinition {
  policyName: LimitResponse_LimitPolicyNames;
  limit: number;
  burst: number;
  accountId: number;
  lastModified: number;
  returnable: boolean;
  /** [default = L4_BEST_EFFORT]; // Overridable by request */
  safetyLevel: LimitDefinition_SafetyLevel;
}
export interface WeightedValues {
  weightedValues: WeightedValue[];
  hashByPropertyName?: string | undefined;
}

export type ConfigValue =
  | {
      int: number | undefined;
    }
  | {
      string: string | undefined;
    }
  | {
      bytes: Buffer | undefined;
    }
  | {
      double: number | undefined;
    }
  | {
      bool: boolean | undefined;
    }
  | {
      weightedValues?: WeightedValues | undefined;
    }
  | {
      limitDefinition?: LimitDefinition | undefined;
    }
  | {
      logLevel: ReforgeLogLevel | undefined;
    }
  | {
      stringList: string[] | undefined;
    }
  | {
      intRange: IntRange | undefined;
    }
  | {
      provided: Provided | undefined;
    }
  | {
      duration: Duration | undefined;
    }
  | {
      json: string | undefined;
    }
  | {
      schema: Schema | undefined;
    }
  | {
      /** don't log or telemetry this value */
      confidential: boolean | undefined;
    }
  | {
      /** key name to decrypt with */
      decryptWith: string | undefined;
    };

type Evaluation = {
  value: ConfigValue;
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

const valueFor = <K extends keyof TypedFrontEndConfigurationRaw>(
  value: ConfigValue,
  type: keyof ConfigValue,
  key: K
): TypedFrontEndConfigurationRaw[K] => {
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

    const type = Object.keys(evaluation.value)[0] as keyof ConfigValue;

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
    const type = typeof payload[key] as keyof ConfigValue;
    // eslint-disable-next-line no-use-before-define
    configs[key] = new Config(key, valueFor({ [type]: payload[key] }, type, key), type);
  });

  return configs;
};

export class Config<
  K extends keyof TypedFrontEndConfigurationRaw = keyof TypedFrontEndConfigurationRaw,
> {
  key: K;

  value: TypedFrontEndConfigurationRaw[K];

  rawValue: ConfigValue | undefined;

  type: keyof ConfigValue;

  configEvaluationMetadata: ConfigEvaluationMetadata | undefined;

  constructor(
    key: K,
    value: TypedFrontEndConfigurationRaw[K],
    type: keyof ConfigValue,
    rawValue?: ConfigValue,
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
