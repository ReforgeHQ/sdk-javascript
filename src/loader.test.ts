import fetchMock, { enableFetchMocks } from "jest-fetch-mock";
import Context from "./context";
import Loader from "./loader";
import { wait } from "../test/wait";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require("../package.json");

enableFetchMocks();

const context = new Context({
  user: { id: "123", email: "test@example.com" },
  device: { mobile: true },
});
const apiKey = "apiKey";
let loader: Loader;

describe("overriding endpoints", () => {
  it("has one default endpoint", () => {
    loader = new Loader({ context, apiKey });

    expect(loader.endpoints).toStrictEqual([
      "https://belt.prefab.cloud/api/v2",
      "https://suspenders.prefab.cloud/api/v2",
      "https://waistband.prefab.cloud/api/v2",
    ]);
  });

  it("supports overriding the endpoints", () => {
    const endpoints = [
      "https://example.global.ssl.fastly.net/api/v2",
      "https://example.com/api/v2",
    ];

    loader = new Loader({ context, apiKey, endpoints });

    expect(loader.endpoints).toStrictEqual([
      "https://example.global.ssl.fastly.net/api/v2",
      "https://example.com/api/v2",
    ]);
  });
});

describe("load", () => {
  describe("when the timeout is reached", () => {
    const TIMEOUT = 25;

    it("can successfully return from a second endpoint if the first times out", async () => {
      fetchMock.mockResponse(async (req) => {
        const url = new URL(req.url);

        if (url.pathname.startsWith("/too-long/")) {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                status: 200,
                body: JSON.stringify({ evaluations: { failover: { value: { bool: false } } } }),
              });
            }, TIMEOUT * 2);
          });
        }

        if (url.pathname.startsWith("/failover/")) {
          return {
            status: 200,
            body: JSON.stringify({ evaluations: { failover: { value: { bool: true } } } }),
          };
        }

        throw new Error(`Unexpected URL: ${url.toString()}`);
      });

      const endpoints = [`http://localhost/too-long`, `http://localhost/failover`];

      loader = new Loader({
        context,
        apiKey,
        timeout: TIMEOUT,
        endpoints,
      });

      const promise = loader.load();

      await wait(TIMEOUT);

      const results = (await promise) as any;
      expect(results.evaluations.failover.value.bool).toStrictEqual(true);
    });
  });

  describe("when the timeout is not reached", () => {
    const data = {
      evaluations: {
        turbo: { value: { double: 2.5 } },
        foo: { value: { bool: true } },
      },
    };

    it("can succesfully return results from the first endpoint", async () => {
      let fetchCount = 0;
      let requestUrl: URL | undefined;
      const requestHeaders = new Map();

      fetchMock.mockResponse(async (req) => {
        fetchCount += 1;

        requestUrl = new URL(req.url);

        requestHeaders.set("Authorization", req.headers.get("Authorization"));
        requestHeaders.set("X-Reforge-Client-Version", req.headers.get("X-Reforge-Client-Version"));

        return {
          status: 200,
          body: JSON.stringify(data),
        };
      });

      loader = new Loader({ context, apiKey, clientVersion: `sdk-javascript-${version}` });

      const results = await loader.load();
      expect(results).toStrictEqual(data);
      expect(fetchCount).toStrictEqual(1);

      if (!requestUrl || !requestHeaders) {
        throw new Error("Fetch hasn't happened");
      }

      expect(requestUrl.host).toEqual("belt.prefab.cloud");

      expect(requestUrl.pathname).toStrictEqual(
        "/api/v2/configs/eval-with-context/eyJjb250ZXh0cyI6W3sidHlwZSI6InVzZXIiLCJ2YWx1ZXMiOnsiaWQiOnsic3RyaW5nIjoiMTIzIn0sImVtYWlsIjp7InN0cmluZyI6InRlc3RAZXhhbXBsZS5jb20ifX19LHsidHlwZSI6ImRldmljZSIsInZhbHVlcyI6eyJtb2JpbGUiOnsiYm9vbCI6dHJ1ZX19fV19"
      );

      expect(requestHeaders.get("Authorization")).toStrictEqual("Basic dTphcGlLZXk=");
      expect(requestHeaders.get("X-Reforge-Client-Version")).toStrictEqual(
        `sdk-javascript-${version}`
      );
    });

    it("can successfully return from a second endpoint if the first fails", async () => {
      let fetchCount = 0;
      let requestUrl: URL | undefined;

      fetchMock.mockResponse(async (req) => {
        fetchCount += 1;

        if (fetchCount < 2) {
          return Promise.reject(new Error("Network error"));
        }

        requestUrl = new URL(req.url);

        return {
          status: 200,
          body: JSON.stringify(data),
        };
      });

      loader = new Loader({ context, apiKey });

      const results = await loader.load();

      expect(fetchCount).toStrictEqual(2);
      expect(results).toStrictEqual(data);

      if (!requestUrl) {
        throw new Error("Last fetch hasn't happened");
      }
      expect(requestUrl.host).toStrictEqual("suspenders.prefab.cloud");
    });

    it("fails when no endpoints are reachable", async () => {
      let fetchCount = 0;
      let requestUrl: URL | undefined;

      fetchMock.mockResponse(async (req) => {
        fetchCount += 1;
        requestUrl = new URL(req.url);
        return Promise.reject(new Error("Network error"));
      });

      loader = new Loader({ context, apiKey });

      loader.load().catch((reason: any) => {
        expect(reason.message).toEqual("Network error");
        expect(fetchCount).toStrictEqual(3);

        if (!requestUrl) {
          throw new Error("Last fetch hasn't happened");
        }

        expect(requestUrl.host).toStrictEqual("waistband.prefab.cloud");
      });
    });
  });
});
