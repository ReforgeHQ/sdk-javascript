/**
 * @jest-environment jsdom
 */
import { prefetchReforgeConfig, Reforge } from "./reforge";
import Context from "./context";

describe("prefetchReforgeConfig", () => {
  const sdkKey = "test-sdk-key";
  const context = new Context({ user: { id: "123" } });

  beforeEach(() => {
    // Reset window object
    (window as any).REFORGE_SDK_PREFETCH_PROMISE = undefined;
    jest.clearAllMocks();
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
});
