import fetchMock, { enableFetchMocks } from "jest-fetch-mock";
import {
  Reforge,
  Context,
  LogLevel,
  shouldLogAtLevel,
  getLogLevelSeverity,
  type ReforgeBootstrap,
} from "../index";
import { Contexts } from "./types";
import { type EvaluationPayload } from "./config";
import { DEFAULT_TIMEOUT } from "./apiHelpers";
import { wait } from "../test/wait";
import { ReforgeLogLevel } from "./logger";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require("../package.json");

enableFetchMocks();

let reforge = new Reforge();

type InitParams = Parameters<typeof reforge.init>[0];

const defaultTestContext: Contexts = { user: { device: "desktop", key: "abcdefg" } };

const defaultTestInitParams: InitParams = {
  sdkKey: "1234",
  context: new Context(defaultTestContext),
  collectEvaluationSummaries: false,
};

beforeEach(() => {
  reforge = new Reforge();
});

afterEach(() => {
  reforge.stopPolling();
  reforge.stopTelemetry();
});

describe("init", () => {
  it("works when the request is successful", async () => {
    const data = { evaluations: { turbo: { value: { double: 2.5 } } } };
    fetchMock.mockResponse(JSON.stringify(data));

    expect(reforge.loaded).toBe(false);

    await reforge.init(defaultTestInitParams);

    expect(reforge.extract()).toEqual({
      turbo: 2.5,
    });
    expect(reforge.loaded).toBe(true);
  });

  it("returns falsy responses for flag checks if it cannot load config", async () => {
    fetchMock.mockReject(new Error("Network error"));

    expect(reforge.loaded).toBe(false);

    reforge.init(defaultTestInitParams).catch((reason: any) => {
      expect(reason.message).toEqual("Network error");
      expect(reforge.extract()).toEqual({});

      expect(reforge.isEnabled("foo")).toBe(false);
    });

    expect(reforge.loaded).toBe(false);
  });

  it("allows passing a timeout down to the loader", async () => {
    const data = { evaluations: { turbo: { value: { double: 2.5 } } } };
    fetchMock.mockResponse(JSON.stringify(data));

    const config: InitParams = { ...defaultTestInitParams };
    expect(reforge.loaded).toBe(false);

    await reforge.init(config);
    expect(reforge.loader?.timeout).toEqual(DEFAULT_TIMEOUT);

    const NEW_TIMEOUT = 123;
    config.timeout = NEW_TIMEOUT;

    await reforge.init(config);
    expect(reforge.loader?.timeout).toEqual(NEW_TIMEOUT);
  });

  it("sends the client version", async () => {
    let headersAsserted = false;

    fetchMock.mockResponse(async (req) => {
      expect(req.headers.get("X-Reforge-SDK-Version")).toStrictEqual(`sdk-javascript-${version}`);
      headersAsserted = true;

      return {
        status: 200,
        body: '{"evaluations": {}}',
      };
    });

    expect(reforge.loaded).toBe(false);

    await reforge.init(defaultTestInitParams);
    expect(headersAsserted).toBe(true);
  });

  it("allows opting out of eval summary telemetry", async () => {
    const params: InitParams = {
      sdkKey: "1234",
      context: new Context({ user: { device: "desktop" } }),
    };

    await reforge.init(params);
    expect(reforge.isCollectingEvaluationSummaries()).toBe(true);

    params.collectEvaluationSummaries = false;

    await reforge.init(params);
    expect(reforge.isCollectingEvaluationSummaries()).toBe(false);
  });

  it("can override the client name and version", async () => {
    const nameOverride = "sdk-react";
    const versionOverride = "0.11.9";
    let headersAsserted = false;

    fetchMock.mockResponse(async (req) => {
      expect(req.headers.get("X-Reforge-SDK-Version")).toStrictEqual(
        `${nameOverride}-${versionOverride}`
      );
      headersAsserted = true;

      return {
        status: 200,
        body: `{ "evaluations": {} }`,
      };
    });

    const params: InitParams = {
      ...defaultTestInitParams,
      clientNameString: nameOverride,
      clientVersionString: versionOverride,
    };
    expect(reforge.loaded).toBe(false);

    await reforge.init(params);
    expect(headersAsserted).toBe(true);
  });
});

describe("poll", () => {
  it("takes a frequencyInMs and updates on that interval", async () => {
    const data = { evaluations: {} };
    const frequencyInMs = 25;
    fetchMock.mockResponse(JSON.stringify(data));

    await reforge.init(defaultTestInitParams);

    if (!reforge.loader) {
      throw new Error("Expected loader to be set");
    }

    await reforge.poll({ frequencyInMs });
    expect(reforge.loader.context).toStrictEqual(reforge.context);

    if (reforge.pollStatus.status !== "running") {
      throw new Error("Expected pollStatus to be running");
    }
    expect(reforge.pollCount).toEqual(0);
    expect(reforge.loader.context).toStrictEqual(reforge.context);

    await wait(frequencyInMs);
    expect(reforge.pollCount).toEqual(1);
    expect(reforge.loader.context).toStrictEqual(reforge.context);

    // changing the context should set the context for the loader as well
    const newContext = new Context({ abc: { def: "ghi" } });
    reforge.updateContext(newContext, true);

    await wait(frequencyInMs);
    expect(reforge.pollCount).toEqual(2);
    expect(reforge.loader.context).toStrictEqual(newContext);

    reforge.stopPolling();

    // Polling does not continue after stopPolling is called
    await wait(frequencyInMs * 2);
    expect(reforge.pollCount).toEqual(2);
  });

  it("is reset when you call poll() again", async () => {
    jest.spyOn(globalThis, "clearTimeout");

    const data = { evaluations: {} };
    const frequencyInMs = 25;
    fetchMock.mockResponse(JSON.stringify(data));

    await reforge.init(defaultTestInitParams);

    if (!reforge.loader) {
      throw new Error("Expected loader to be set");
    }

    await reforge.poll({ frequencyInMs });
    expect(reforge.loader.context).toStrictEqual(reforge.context);

    if (reforge.pollStatus.status !== "running") {
      throw new Error("Expected pollStatus to be running");
    }
    expect(reforge.pollCount).toEqual(0);
    expect(reforge.loader.context).toStrictEqual(reforge.context);

    const timeoutId = reforge.pollTimeoutId;

    reforge.poll({ frequencyInMs });
    expect(clearTimeout).toHaveBeenCalledWith(timeoutId);
    expect(reforge.pollTimeoutId).toBeUndefined();
  });
});

describe("hydrate", () => {
  it("works when types are not provided", () => {
    expect(reforge.extract()).toEqual({});

    reforge.hydrate({
      turbo: 2.5,
      foo: true,
      jsonExample: { foo: "bar", baz: 123 },
      durationExample: { ms: 1884 * 1000, seconds: 1884 },
    });

    expect(reforge.extract()).toEqual({
      turbo: 2.5,
      foo: true,
      jsonExample: { foo: "bar", baz: 123 },
      durationExample: { ms: 1884000, seconds: 1884 },
    });

    expect(reforge.isEnabled("foo")).toBe(true);
    expect(reforge.get("turbo")).toEqual(2.5);
    expect(reforge.get("jsonExample")).toStrictEqual({ foo: "bar", baz: 123 });
    expect(reforge.getDuration("durationExample")).toStrictEqual({
      ms: 1884 * 1000,
      seconds: 1884,
    });
  });
});

describe("bootstrapping", () => {
  it("skips the http request if the context is unchanged", async () => {
    expect(reforge.loaded).toBe(false);

    /* eslint-disable no-underscore-dangle */
    (globalThis as any)._reforgeBootstrap = {
      // This is defaultTestContext but with re-ordered keys
      context: { user: { key: "abcdefg", device: "desktop" } },
      evaluations: {
        turbo: { value: { double: 99.5 } },
      } as unknown as EvaluationPayload,
    } as ReforgeBootstrap;

    await reforge.init(defaultTestInitParams);

    expect(reforge.extract()).toEqual({
      turbo: 99.5,
    });
    expect(reforge.get("turbo")).toEqual(99.5);
    expect(reforge.loaded).toBe(true);
  });

  it("does not skip the http request if the context is different", async () => {
    const data = { evaluations: { turbo: { value: { double: 2.5 } } } };
    fetchMock.mockResponse(JSON.stringify(data));

    expect(reforge.loaded).toBe(false);

    /* eslint-disable no-underscore-dangle */
    (globalThis as any)._reforgeBootstrap = {
      context: { user: { ...defaultTestContext.user, key: "1324" } },
      evaluations: {
        turbo: { value: { double: 99.5 } },
      } as unknown as EvaluationPayload,
    } as ReforgeBootstrap;

    await reforge.init(defaultTestInitParams);

    expect(reforge.extract()).toEqual({
      turbo: 2.5,
    });
    expect(reforge.loaded).toBe(true);
  });
});

test("get", () => {
  reforge.hydrate({
    evaluations: {
      turbo: { value: { double: 2.5 } },
      durationExample: { value: { duration: { millis: 1884000, definition: "PT1884S" } } },
      jsonExample: { value: { json: `{ "foo": "bar", "baz": 123 }` } },
    },
  });

  expect(reforge.get("turbo")).toEqual(2.5);

  expect(reforge.get("jsonExample")).toStrictEqual({ foo: "bar", baz: 123 });

  // You _can_ use `get` for durations but you probably want `getDuration` to save yourself some `as` casting
  expect(reforge.get("durationExample")).toStrictEqual({
    ms: 1884 * 1000,
    seconds: 1884,
  });
  // e.g.
  // expect((reforge.get("durationExample") as Duration).seconds).toEqual(1884);
  // expect((reforge.get("durationExample") as Duration).ms).toEqual(1884 * 1000);
});

test("getDuration", () => {
  reforge.hydrate({
    evaluations: {
      turbo: { value: { double: 2.5 } },
      durationExample: {
        value: { duration: { millis: 1884000, definition: "PT1884S" } },
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  expect(reforge.getDuration("durationExample")!.seconds).toEqual(1884);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  expect(reforge.getDuration("durationExample")!.ms).toEqual(1884 * 1000);

  expect(() => {
    reforge.getDuration("turbo");
  }).toThrowError('Value for key "turbo" is not a duration');
});

test("isEnabled", () => {
  // it is false when no config is loaded
  expect(reforge.isEnabled("foo")).toBe(false);

  reforge.hydrate({ foo: true });

  expect(reforge.isEnabled("foo")).toBe(true);
});

describe("extract", () => {
  it("correctly extracts configuration values", () => {
    reforge.hydrate({
      turbo: 2.5,
      foo: true,
      jsonExample: { foo: "bar", baz: 123 },
    });

    const extracted = reforge.extract();
    expect(extracted).toEqual({
      turbo: 2.5,
      foo: true,
      jsonExample: { foo: "bar", baz: 123 },
    });
  });

  it("returns an empty object when no configs are set", () => {
    const extracted = reforge.extract();
    expect(extracted).toEqual({});
  });
});

describe("shouldLog", () => {
  test("compares against the default level where there is no value", () => {
    expect(
      reforge.shouldLog({
        loggerName: "example",
        desiredLevel: ReforgeLogLevel.Info,
        defaultLevel: ReforgeLogLevel.Info,
      })
    ).toBe(true);

    expect(
      reforge.shouldLog({
        loggerName: "example",
        desiredLevel: ReforgeLogLevel.Debug,
        defaultLevel: ReforgeLogLevel.Info,
      })
    ).toBe(false);
  });

  test("compares against the value when present", () => {
    reforge.hydrate({
      "log-level.example": "INFO",
    });

    expect(
      reforge.shouldLog({
        loggerName: "example",
        desiredLevel: ReforgeLogLevel.Info,
        defaultLevel: ReforgeLogLevel.Error,
      })
    ).toBe(true);

    expect(
      reforge.shouldLog({
        loggerName: "example",
        desiredLevel: ReforgeLogLevel.Debug,
        defaultLevel: ReforgeLogLevel.Error,
      })
    ).toBe(false);
  });

  test("does not traverse hierarchy, only checks exact logger name", () => {
    reforge.hydrate({
      "log-level.some.test": "DEBUG",
      "log-level.irrelevant": "ERROR",
    });

    // Exact match should use the configured level
    expect(
      reforge.shouldLog({
        loggerName: "some.test",
        desiredLevel: ReforgeLogLevel.Debug,
        defaultLevel: ReforgeLogLevel.Error,
      })
    ).toEqual(true);

    expect(
      reforge.shouldLog({
        loggerName: "some.test",
        desiredLevel: ReforgeLogLevel.Trace,
        defaultLevel: ReforgeLogLevel.Error,
      })
    ).toEqual(false);

    // No match for longer name, should use default
    expect(
      reforge.shouldLog({
        loggerName: "some.test.name.with.more.levels",
        desiredLevel: ReforgeLogLevel.Error,
        defaultLevel: ReforgeLogLevel.Error,
      })
    ).toEqual(true);

    expect(
      reforge.shouldLog({
        loggerName: "some.test.name.with.more.levels",
        desiredLevel: ReforgeLogLevel.Debug,
        defaultLevel: ReforgeLogLevel.Error,
      })
    ).toEqual(false);
  });

  it("uses default level when no exact match is found", () => {
    reforge.hydrate({
      "log-level.other": "INFO",
    });

    // No config for "some.test", should use default ERROR
    expect(
      reforge.shouldLog({
        loggerName: "some.test",
        desiredLevel: ReforgeLogLevel.Error,
        defaultLevel: ReforgeLogLevel.Error,
      })
    ).toEqual(true);

    expect(
      reforge.shouldLog({
        loggerName: "some.test",
        desiredLevel: ReforgeLogLevel.Info,
        defaultLevel: ReforgeLogLevel.Error,
      })
    ).toEqual(false);
  });
});

describe("getLogLevel", () => {
  test("returns DEBUG by default when no config is found", () => {
    const level = reforge.getLogLevel("my.app.logger");
    expect(level).toBe(LogLevel.DEBUG);
  });

  test("returns the configured log level from the default logger key", () => {
    reforge.hydrate({
      "log-levels.default": "INFO",
    });

    const level = reforge.getLogLevel("my.app.logger");
    expect(level).toBe(LogLevel.INFO);
  });

  test("returns all possible LogLevel enum values", () => {
    const logLevels = ["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"];

    logLevels.forEach((levelString) => {
      reforge.hydrate({
        "log-levels.default": levelString,
      });

      const level = reforge.getLogLevel("test.logger");
      expect(level).toBe(LogLevel[levelString as keyof typeof LogLevel]);
    });
  });

  test("handles lowercase log level values", () => {
    reforge.hydrate({
      "log-levels.default": "info",
    });

    const level = reforge.getLogLevel("my.app.logger");
    expect(level).toBe(LogLevel.INFO);
  });

  test("handles mixed case log level values", () => {
    reforge.hydrate({
      "log-levels.default": "WaRn",
    });

    const level = reforge.getLogLevel("my.app.logger");
    expect(level).toBe(LogLevel.WARN);
  });

  test("returns DEBUG for invalid log level values", () => {
    reforge.hydrate({
      "log-levels.default": "INVALID",
    });

    const level = reforge.getLogLevel("my.app.logger");
    expect(level).toBe(LogLevel.DEBUG);
  });

  test("returns DEBUG when config value is not a string", () => {
    reforge.hydrate({
      "log-levels.default": 123,
    });

    const level = reforge.getLogLevel("my.app.logger");
    expect(level).toBe(LogLevel.DEBUG);
  });

  test("uses custom logger key when specified during init", async () => {
    const data = { evaluations: {} };
    fetchMock.mockResponse(JSON.stringify(data));

    await reforge.init({
      ...defaultTestInitParams,
      loggerKey: "custom.logger.config",
    });

    reforge.hydrate({
      "custom.logger.config": "ERROR",
      "log-levels.default": "DEBUG",
    });

    const level = reforge.getLogLevel("my.app.logger");
    expect(level).toBe(LogLevel.ERROR);
  });

  test("can be used for dynamic logging decisions", () => {
    reforge.hydrate({
      "log-levels.default": "INFO",
    });

    const loggerName = "my.app.components.modal";
    const level = reforge.getLogLevel(loggerName);

    // Should return INFO
    expect(level).toBe(LogLevel.INFO);

    // Example of checking specific log levels
    expect(level).not.toBe(LogLevel.DEBUG);
    expect(level).toBe(LogLevel.INFO);
    expect(level).not.toBe(LogLevel.ERROR);

    // To compare log level severity, you would need to use shouldLog or compare against the enum
    expect(level === LogLevel.TRACE || level === LogLevel.DEBUG).toBe(false);
    expect(level === LogLevel.INFO || level === LogLevel.WARN || level === LogLevel.ERROR).toBe(
      true
    );
  });

  test("all logger names return the same configured level", () => {
    reforge.hydrate({
      "log-levels.default": "DEBUG",
    });

    const level1 = reforge.getLogLevel("app.module1");
    const level2 = reforge.getLogLevel("app.module2");
    const level3 = reforge.getLogLevel("app.module3.submodule");

    // All logger names use the same configured key, so all return the same level
    expect(level1).toBe(LogLevel.DEBUG);
    expect(level2).toBe(LogLevel.DEBUG);
    expect(level3).toBe(LogLevel.DEBUG);
  });
});

describe("logger", () => {
  beforeEach(() => {
    jest.spyOn(console, "debug").mockImplementation();
    jest.spyOn(console, "info").mockImplementation();
    jest.spyOn(console, "warn").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("logs when level is enabled", () => {
    reforge.hydrate({
      "log-levels.default": "DEBUG",
    });

    reforge.logger.debug("Debug message");
    reforge.logger.info("Info message");
    reforge.logger.warn("Warn message");
    reforge.logger.error("Error message");

    expect(console.debug).toHaveBeenCalledWith("Debug message");
    expect(console.info).toHaveBeenCalledWith("Info message");
    expect(console.warn).toHaveBeenCalledWith("Warn message");
    expect(console.error).toHaveBeenCalledWith("Error message");
  });

  test("does not log when level is disabled", () => {
    reforge.hydrate({
      "log-levels.default": "ERROR",
    });

    reforge.logger.trace("Trace message");
    reforge.logger.debug("Debug message");
    reforge.logger.info("Info message");
    reforge.logger.warn("Warn message");
    reforge.logger.error("Error message");

    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith("Error message");
  });

  test("respects INFO level configuration", () => {
    reforge.hydrate({
      "log-levels.default": "INFO",
    });

    reforge.logger.trace("Trace message");
    reforge.logger.debug("Debug message");
    reforge.logger.info("Info message");
    reforge.logger.warn("Warn message");
    reforge.logger.error("Error message");
    reforge.logger.fatal("Fatal message");

    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledWith("Info message");
    expect(console.warn).toHaveBeenCalledWith("Warn message");
    expect(console.error).toHaveBeenCalledWith("Error message");
    expect(console.error).toHaveBeenCalledWith("Fatal message");
  });

  test("trace uses debug console method", () => {
    reforge.hydrate({
      "log-levels.default": "TRACE",
    });

    reforge.logger.trace("Trace message");

    expect(console.debug).toHaveBeenCalledWith("Trace message");
  });

  test("fatal uses error console method", () => {
    reforge.hydrate({
      "log-levels.default": "TRACE",
    });

    reforge.logger.fatal("Fatal message");

    expect(console.error).toHaveBeenCalledWith("Fatal message");
  });

  test("uses custom logger key", async () => {
    const data = { evaluations: {} };
    fetchMock.mockResponse(JSON.stringify(data));

    await reforge.init({
      ...defaultTestInitParams,
      loggerKey: "custom.log.level",
    });

    reforge.hydrate({
      "custom.log.level": "WARN",
      "log-levels.default": "DEBUG",
    });

    reforge.logger.info("Info message");
    reforge.logger.warn("Warn message");

    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith("Warn message");
  });
});

describe("getLogLevelSeverity", () => {
  test("returns correct numeric values for all log levels", () => {
    expect(getLogLevelSeverity(LogLevel.TRACE)).toBe(1);
    expect(getLogLevelSeverity(LogLevel.DEBUG)).toBe(2);
    expect(getLogLevelSeverity(LogLevel.INFO)).toBe(3);
    expect(getLogLevelSeverity(LogLevel.WARN)).toBe(5);
    expect(getLogLevelSeverity(LogLevel.ERROR)).toBe(6);
    expect(getLogLevelSeverity(LogLevel.FATAL)).toBe(9);
  });

  test("can be used to compare log level severity", () => {
    expect(getLogLevelSeverity(LogLevel.TRACE)).toBeLessThan(getLogLevelSeverity(LogLevel.DEBUG));
    expect(getLogLevelSeverity(LogLevel.DEBUG)).toBeLessThan(getLogLevelSeverity(LogLevel.INFO));
    expect(getLogLevelSeverity(LogLevel.INFO)).toBeLessThan(getLogLevelSeverity(LogLevel.WARN));
    expect(getLogLevelSeverity(LogLevel.WARN)).toBeLessThan(getLogLevelSeverity(LogLevel.ERROR));
    expect(getLogLevelSeverity(LogLevel.ERROR)).toBeLessThan(getLogLevelSeverity(LogLevel.FATAL));
  });
});

describe("shouldLogAtLevel", () => {
  test("returns true when desired level is at or above configured level", () => {
    // Configured level is INFO (3), should log INFO (3) and above
    expect(shouldLogAtLevel(LogLevel.INFO, LogLevel.TRACE)).toBe(false);
    expect(shouldLogAtLevel(LogLevel.INFO, LogLevel.DEBUG)).toBe(false);
    expect(shouldLogAtLevel(LogLevel.INFO, LogLevel.INFO)).toBe(true);
    expect(shouldLogAtLevel(LogLevel.INFO, LogLevel.WARN)).toBe(true);
    expect(shouldLogAtLevel(LogLevel.INFO, LogLevel.ERROR)).toBe(true);
    expect(shouldLogAtLevel(LogLevel.INFO, LogLevel.FATAL)).toBe(true);
  });

  test("returns false when desired level is below configured level", () => {
    // Configured level is ERROR (6), should not log INFO (3)
    expect(shouldLogAtLevel(LogLevel.ERROR, LogLevel.INFO)).toBe(false);
    expect(shouldLogAtLevel(LogLevel.ERROR, LogLevel.WARN)).toBe(false);
  });

  test("works correctly for TRACE (most verbose)", () => {
    // TRACE allows all log levels
    expect(shouldLogAtLevel(LogLevel.TRACE, LogLevel.TRACE)).toBe(true);
    expect(shouldLogAtLevel(LogLevel.TRACE, LogLevel.DEBUG)).toBe(true);
    expect(shouldLogAtLevel(LogLevel.TRACE, LogLevel.INFO)).toBe(true);
    expect(shouldLogAtLevel(LogLevel.TRACE, LogLevel.WARN)).toBe(true);
    expect(shouldLogAtLevel(LogLevel.TRACE, LogLevel.ERROR)).toBe(true);
    expect(shouldLogAtLevel(LogLevel.TRACE, LogLevel.FATAL)).toBe(true);
  });

  test("works correctly for FATAL (least verbose)", () => {
    // FATAL only allows FATAL logs
    expect(shouldLogAtLevel(LogLevel.FATAL, LogLevel.TRACE)).toBe(false);
    expect(shouldLogAtLevel(LogLevel.FATAL, LogLevel.DEBUG)).toBe(false);
    expect(shouldLogAtLevel(LogLevel.FATAL, LogLevel.INFO)).toBe(false);
    expect(shouldLogAtLevel(LogLevel.FATAL, LogLevel.WARN)).toBe(false);
    expect(shouldLogAtLevel(LogLevel.FATAL, LogLevel.ERROR)).toBe(false);
    expect(shouldLogAtLevel(LogLevel.FATAL, LogLevel.FATAL)).toBe(true);
  });

  test("can be used with getLogLevel for dynamic logging", () => {
    reforge.hydrate({
      "log-levels.default": "INFO",
    });

    const level = reforge.getLogLevel("my.app.logger");

    // Should allow INFO and above
    expect(shouldLogAtLevel(level, LogLevel.TRACE)).toBe(false);
    expect(shouldLogAtLevel(level, LogLevel.DEBUG)).toBe(false);
    expect(shouldLogAtLevel(level, LogLevel.INFO)).toBe(true);
    expect(shouldLogAtLevel(level, LogLevel.WARN)).toBe(true);
    expect(shouldLogAtLevel(level, LogLevel.ERROR)).toBe(true);
    expect(shouldLogAtLevel(level, LogLevel.FATAL)).toBe(true);
  });
});

describe("updateContext", () => {
  it("updates the context and reloads", async () => {
    let invokedUrl: string | undefined;

    fetchMock.mockResponse(async (req) => {
      invokedUrl = req.url;

      return {
        status: 200,
        body: `{"evaluations": {}}`,
      };
    });

    const initialContext = new Context(defaultTestContext);

    await reforge.init(defaultTestInitParams);

    if (!reforge.loader) {
      throw new Error("Expected loader to be set");
    }

    expect(reforge.loader.context).toStrictEqual(initialContext);
    expect(reforge.context).toStrictEqual(initialContext);

    if (invokedUrl === undefined) {
      throw new Error("Expected invokedUrl to be set");
    }

    expect(invokedUrl).toStrictEqual(
      `https://primary.reforge.com/api/v2/configs/eval-with-context/${initialContext.encode()}?collectContextMode=PERIODIC_EXAMPLE`
    );

    const newContext = new Context({ user: { device: "mobile" } });

    await reforge.updateContext(newContext);

    expect(reforge.loader.context).toStrictEqual(newContext);
    expect(reforge.context).toStrictEqual(newContext);

    expect(invokedUrl).toStrictEqual(
      `https://primary.reforge.com/api/v2/configs/eval-with-context/${newContext.encode()}?collectContextMode=PERIODIC_EXAMPLE`
    );
  });
});
