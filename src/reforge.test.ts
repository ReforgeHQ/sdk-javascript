import fetchMock, { enableFetchMocks } from "jest-fetch-mock";
import { Reforge, Config, Context, type ReforgeBootstrap } from "../index";
import { Contexts } from "./context";
import { type EvaluationPayload } from "./config";
import { DEFAULT_TIMEOUT } from "./apiHelpers";
import { wait } from "../test/wait";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require("../package.json");

enableFetchMocks();

let reforge = new Reforge();

type InitParams = Parameters<typeof reforge.init>[0];

const defaultTestContext: Contexts = { user: { device: "desktop", key: "abcdefg" } };

const defaultTestInitParams: InitParams = {
  apiKey: "1234",
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

    expect(reforge.configs).toEqual({
      turbo: new Config("turbo", 2.5, "double", { double: 2.5 }),
    });
    expect(reforge.loaded).toBe(true);
  });

  it("returns falsy responses for flag checks if it cannot load config", async () => {
    fetchMock.mockReject(new Error("Network error"));

    expect(reforge.loaded).toBe(false);

    reforge.init(defaultTestInitParams).catch((reason: any) => {
      expect(reason.message).toEqual("Network error");
      expect(reforge.configs).toEqual({});

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
      expect(req.headers.get("X-Reforge-Client-Version")).toStrictEqual(
        `sdk-javascript-${version}`
      );
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
      apiKey: "1234",
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
      expect(req.headers.get("X-Reforge-Client-Version")).toStrictEqual(
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

describe("setConfig", () => {
  it("works when types are not provided", () => {
    expect(reforge.configs).toEqual({});

    reforge.setConfig({
      turbo: 2.5,
      foo: true,
      jsonExample: { foo: "bar", baz: 123 },
      durationExample: { ms: 1884 * 1000, seconds: 1884 },
    });

    expect(reforge.configs).toEqual({
      turbo: new Config("turbo", 2.5, "number"),
      foo: new Config("foo", true, "boolean"),
      jsonExample: new Config("jsonExample", { foo: "bar", baz: 123 }, "object"),
      durationExample: new Config("durationExample", { ms: 1884000, seconds: 1884 }, "object"),
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

    expect(reforge.configs).toEqual({
      turbo: new Config("turbo", 99.5, "double", { double: 99.5 }),
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

    expect(reforge.configs).toEqual({
      turbo: new Config("turbo", 2.5, "double", { double: 2.5 }),
    });
    expect(reforge.loaded).toBe(true);
  });
});

test("get", () => {
  reforge.setConfig({
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
  reforge.setConfig({
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

  reforge.setConfig({ foo: true });

  expect(reforge.isEnabled("foo")).toBe(true);
});

describe("shouldLog", () => {
  test("compares against the default level where there is no value", () => {
    expect(
      reforge.shouldLog({
        loggerName: "example",
        desiredLevel: "INFO",
        defaultLevel: "INFO",
      })
    ).toBe(true);

    expect(
      reforge.shouldLog({
        loggerName: "example",
        desiredLevel: "DEBUG",
        defaultLevel: "INFO",
      })
    ).toBe(false);
  });

  test("compares against the value when present", () => {
    reforge.setConfig({
      "log-level.example": "INFO",
    });

    expect(
      reforge.shouldLog({
        loggerName: "example",
        desiredLevel: "INFO",
        defaultLevel: "ERROR",
      })
    ).toBe(true);

    expect(
      reforge.shouldLog({
        loggerName: "example",
        desiredLevel: "DEBUG",
        defaultLevel: "ERROR",
      })
    ).toBe(false);
  });

  test("traverses the hierarchy to get the closest level for the loggerName", () => {
    const loggerName = "some.test.name.with.more.levels";

    reforge.setConfig({
      "log-level.some.test.name": "TRACE",
      "log-level.some.test": "DEBUG",
      "log-level.irrelevant": "ERROR",
    });

    expect(
      reforge.shouldLog({
        loggerName,
        desiredLevel: "TRACE",
        defaultLevel: "ERROR",
      })
    ).toEqual(true);

    expect(
      reforge.shouldLog({
        loggerName: "some.test",
        desiredLevel: "TRACE",
        defaultLevel: "ERROR",
      })
    ).toEqual(false);

    expect(
      reforge.shouldLog({
        loggerName: "some.test",
        desiredLevel: "DEBUG",
        defaultLevel: "ERROR",
      })
    ).toEqual(true);

    expect(
      reforge.shouldLog({
        loggerName: "some.test",
        desiredLevel: "INFO",
        defaultLevel: "ERROR",
      })
    ).toEqual(true);
  });

  it("can use the root log level setting if nothing is found in the hierarchy", () => {
    reforge.setConfig({
      "log-level": "INFO",
    });

    expect(
      reforge.shouldLog({
        loggerName: "some.test",
        desiredLevel: "INFO",
        defaultLevel: "ERROR",
      })
    ).toEqual(true);

    expect(
      reforge.shouldLog({
        loggerName: "some.test",
        desiredLevel: "DEBUG",
        defaultLevel: "ERROR",
      })
    ).toEqual(false);
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
      `https://belt.prefab.cloud/api/v2/configs/eval-with-context/${initialContext.encode()}?collectContextMode=PERIODIC_EXAMPLE`
    );

    const newContext = new Context({ user: { device: "mobile" } });

    await reforge.updateContext(newContext);

    expect(reforge.loader.context).toStrictEqual(newContext);
    expect(reforge.context).toStrictEqual(newContext);

    expect(invokedUrl).toStrictEqual(
      `https://belt.prefab.cloud/api/v2/configs/eval-with-context/${newContext.encode()}?collectContextMode=PERIODIC_EXAMPLE`
    );
  });
});
