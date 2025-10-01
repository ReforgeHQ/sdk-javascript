import { massageSelectedValue, massageConfigForTelemetry } from "./evaluationSummaryAggregator";
import { Config, parseEvaluationPayload, EvaluationPayload, ConfigValue } from "./config";
import { ConfigEvaluationCounter } from "./types";

describe("massageSelectedValue", () => {
  [
    [{ double: 999 }, 999],
    [
      { duration: { definition: "PT32.28S", millis: 32280 } },
      { definition: "PT32.28S", millis: 32280 },
    ],
    [
      { json: '{\n"hello": "world",\n"letters": ["a","b"]\n\n\n}' },
      '{\n"hello": "world",\n"letters": ["a","b"]\n\n\n}',
    ],
    [{ string: "silly face" }, "silly face"],
    [{ int: 22 }, 22],
    [{ stringList: ["a", "b", "c"] }, { values: ["a", "b", "c"] }],
  ].forEach(([value, expected]) => {
    it(`should massage ${JSON.stringify(value)} to ${JSON.stringify(expected)}`, () => {
      const config = new Config(
        "key",
        Object.values(value)[0],
        Object.keys(value)[0] as keyof ConfigValue
      );
      const massagedValue = massageSelectedValue(config);

      expect(massagedValue).toEqual(expected);
    });
  });
});

describe("massageConfigForTelemetry", () => {
  const payload: EvaluationPayload = {
    evaluations: {
      abc: {
        value: { string: "silly face" },
        configEvaluationMetadata: {
          type: "CONFIG",
          id: "17218276331139319",
          valueType: "STRING",
          configRowIndex: 0,
          conditionalValueIndex: 0,
          weightedValueIndex: 0,
        },
      },
      "double-boy": {
        value: { double: 999 },
        configEvaluationMetadata: {
          type: "CONFIG",
          id: "17218273153262013",
          valueType: "DOUBLE",
          configRowIndex: 0,
          conditionalValueIndex: 0,
          weightedValueIndex: 0,
        },
      },
      "duration.test": {
        value: { duration: { definition: "PT32.28S", millis: 32280 } },
        configEvaluationMetadata: {
          type: "CONFIG",
          id: "17224334404225049",
          valueType: "DURATION",
          configRowIndex: 0,
          conditionalValueIndex: 0,
          weightedValueIndex: 0,
        },
      },
      "james.json": {
        value: {
          json: '{\n"hello": "world",\n"letters": ["a","b"]\n\n\n}',
        },
        configEvaluationMetadata: {
          type: "CONFIG",
          id: "17153504506135634",
          valueType: "JSON",
          configRowIndex: 0,
          conditionalValueIndex: 0,
          weightedValueIndex: 0,
        },
      },
      "numeric-boy": {
        value: { int: 22 },
        configEvaluationMetadata: {
          type: "CONFIG",
          id: "17218273444747315",
          valueType: "INT",
          configRowIndex: 0,
          conditionalValueIndex: 0,
          weightedValueIndex: 0,
        },
      },
      "string-list-boy": {
        value: { stringList: ["hi", "there", "friends"] },
        configEvaluationMetadata: {
          type: "CONFIG",
          id: "17218292173853456",
          valueType: "STRING_LIST",
          configRowIndex: 0,
          conditionalValueIndex: 0,
          weightedValueIndex: 0,
        },
      },
    },
    apikeyMetadata: { id: 199 },
  };

  const expectations: Record<string, ConfigEvaluationCounter> = {
    abc: {
      configRowIndex: 0,
      conditionalValueIndex: 0,
      configId: "17218276331139319",
      selectedValue: { string: "silly face" },
      count: 0,
    },
    "double-boy": {
      configRowIndex: 0,
      conditionalValueIndex: 0,
      configId: "17218273153262013",
      selectedValue: { double: 999 },
      count: 0,
    },
    "duration.test": {
      configRowIndex: 0,
      conditionalValueIndex: 0,
      configId: "17224334404225049",
      selectedValue: {
        duration: { definition: "PT32.28S", millis: 32280 },
      },
      count: 0,
    },
    "james.json": {
      configRowIndex: 0,
      conditionalValueIndex: 0,
      configId: "17153504506135634",
      selectedValue: {
        json: { json: '{\n"hello": "world",\n"letters": ["a","b"]\n\n\n}' },
      },
      count: 0,
    },
    "numeric-boy": {
      configRowIndex: 0,
      conditionalValueIndex: 0,
      configId: "17218273444747315",
      selectedValue: { int: 22 },
      count: 0,
    },
    "string-list-boy": {
      configRowIndex: 0,
      conditionalValueIndex: 0,
      configId: "17218292173853456",
      selectedValue: { stringList: { values: ["hi", "there", "friends"] } },
      count: 0,
    },
  };

  const configs = parseEvaluationPayload(payload);

  Object.keys(payload.evaluations).forEach((key) => {
    const evaluation = configs[key];
    const expected = expectations[key];

    it(`should massage ${key} to ${JSON.stringify(expected)}`, () => {
      const massaged = massageConfigForTelemetry(evaluation, expected);
      expect(massaged).toEqual(expected);
    });
  });
});
