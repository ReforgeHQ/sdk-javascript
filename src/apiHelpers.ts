import base64Encode from "./base64Encode";

export const headers = (sdkKey: string, clientVersion: string) => ({
  Authorization: `Basic ${base64Encode(`u:${sdkKey}`)}`,
  "X-Reforge-SDK-Version": clientVersion,
});

export const DEFAULT_TIMEOUT = 10000;
