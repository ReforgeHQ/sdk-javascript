import base64Encode from "./base64Encode";

export const headers = (apiKey: string, clientVersion: string) => ({
  Authorization: `Basic ${base64Encode(`u:${apiKey}`)}`,
  "X-Reforge-Client-Version": clientVersion,
});

export const DEFAULT_TIMEOUT = 10000;
