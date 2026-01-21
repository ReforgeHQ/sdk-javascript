/**
 * @jest-environment jsdom
 */
import { prefetchReforgeConfig, Context } from "./prefetch";
import { Reforge } from "./reforge";

describe("prefetchReforgeConfig", () => {
  const sdkKey = "test-sdk-key";
  const context = new Context({ user: { id: "123" } });
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset window object
    (window as any).REFORGE_SDK_PREFETCH_PROMISE = undefined;
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it("should set REFORGE_SDK_PREFETCH_PROMISE on window", () => {
    // Mock fetch to return a promise
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ evaluations: {} }),
      } as Response)
    );

    prefetchReforgeConfig({ sdkKey, context });

    expect((window as any).REFORGE_SDK_PREFETCH_PROMISE).toBeDefined();
    expect((window as any).REFORGE_SDK_PREFETCH_PROMISE).toBeInstanceOf(Promise);
  });

  it("should pass correct parameters to loader", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ evaluations: {} }),
      } as Response)
    );

    prefetchReforgeConfig({ sdkKey, context });

    await (window as any).REFORGE_SDK_PREFETCH_PROMISE;

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(context.encode()),
      expect.anything()
    );
  });

  it("should not make a second API call when initializing Reforge with prefetch", async () => {
    // 1. Mock fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ evaluations: {} }),
      } as Response)
    );

    // 2. Start prefetch
    prefetchReforgeConfig({ sdkKey, context });

    // Verify prefetch started
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // 3. Initialize Reforge
    const reforgeInstance = new Reforge();

    await reforgeInstance.init({ sdkKey, context });

    // 4. Verify fetch was NOT called again
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Verify window global was cleared (as per loader logic)
    expect((window as any).REFORGE_SDK_PREFETCH_PROMISE).toBeUndefined();
  });

  it("should not warn when calling get after data is loaded", async () => {
    // Mock fetch with actual config data
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            evaluations: {
              "test-flag": {
                value: { bool: true },
                configEvaluationMetadata: {
                  configRowIndex: "0",
                  conditionalValueIndex: "0",
                  type: "bool",
                  id: "123",
                },
              },
            },
          }),
      } as Response)
    );

    // Start prefetch
    prefetchReforgeConfig({ sdkKey, context });

    // Initialize Reforge and wait for it to load
    const reforgeInstance = new Reforge();
    await reforgeInstance.init({ sdkKey, context });

    // Call get after data is loaded - should NOT warn
    const value = reforgeInstance.get("test-flag");

    expect(value).toBe(true);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("should warn when calling get before data is loaded", () => {
    const reforgeInstance = new Reforge();

    // Call get before init - should warn
    const value = reforgeInstance.get("some-flag");

    expect(value).toBeUndefined();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("The client has not finished loading data yet")
    );
  });
});
