// This is in its own file for jest concurrency isolation purposes

import { Reforge, Context } from "../index";

const exampleContext = new Context({
  user: { firstName: "Fred", lastName: "Jones", id: 10001 },
  team: { name: "Sales", isCostCenter: false },
});

const setContext = async (reforge: Reforge, contexts: Context) => {
  // eslint-disable-next-line no-param-reassign
  reforge.loader = {} as unknown as Reforge["loader"];
  await reforge.updateContext(contexts, true);
};

const waitForAsyncCall = async () => {
  // eslint-disable-next-line no-promise-executor-return
  await new Promise((r) => setTimeout(r, 1));
};

describe("afterEvaluationCallback", () => {
  test("get with no Context", async () => {
    const callback = jest.fn();

    const reforge = new Reforge();
    reforge.afterEvaluationCallback = callback;

    reforge.setConfig({ turbo: 2.5 });

    expect(callback).not.toHaveBeenCalled();

    reforge.get("turbo");

    expect(callback).not.toHaveBeenCalled();

    await waitForAsyncCall();

    expect(callback).toHaveBeenCalledWith("turbo", 2.5, { contexts: {} });
  });

  test("get with context", async () => {
    const callback = jest.fn();

    const reforge = new Reforge();
    setContext(reforge, exampleContext);

    reforge.afterEvaluationCallback = callback;

    reforge.setConfig({ turbo: 2.5 });

    expect(callback).not.toHaveBeenCalled();

    reforge.get("turbo");

    expect(callback).not.toHaveBeenCalled();

    await waitForAsyncCall();

    expect(callback).toHaveBeenCalledWith("turbo", 2.5, exampleContext);
  });

  test("isEnabled with no Context", async () => {
    const callback = jest.fn();

    const reforge = new Reforge();
    reforge.afterEvaluationCallback = callback;

    // it is false when no config is loaded
    expect(reforge.isEnabled("foo")).toBe(false);

    // callback should not be called when no config is loaded
    await waitForAsyncCall();
    expect(callback).toHaveBeenCalledTimes(0);

    reforge.setConfig({ foo: true });

    expect(reforge.isEnabled("foo")).toBe(true);

    await waitForAsyncCall();
    expect(callback).toHaveBeenCalledWith("foo", true, { contexts: {} });
  });

  test("isEnabled with Context", async () => {
    const callback = jest.fn();
    const reforge = new Reforge();

    await setContext(reforge, exampleContext);
    reforge.afterEvaluationCallback = callback;

    // it is false when no config is loaded
    expect(reforge.isEnabled("foo")).toBe(false);

    // callback should not be called when no config is loaded
    await waitForAsyncCall();
    expect(callback).toHaveBeenCalledTimes(0);

    reforge.setConfig({ foo: true });

    expect(reforge.isEnabled("foo")).toBe(true);

    await waitForAsyncCall();
    expect(callback).toHaveBeenCalledWith("foo", true, exampleContext);
  });
});
