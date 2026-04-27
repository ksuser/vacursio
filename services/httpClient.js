const axios = require("axios");
const { parserConfig } = require("../config/parser");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toAxiosProxy(proxyUrl) {
  try {
    const parsed = new URL(proxyUrl);
    return {
      protocol: parsed.protocol.replace(":", ""),
      host: parsed.hostname,
      port: Number(parsed.port || (parsed.protocol === "https:" ? 443 : 80)),
      auth:
        parsed.username || parsed.password
          ? {
              username: decodeURIComponent(parsed.username || ""),
              password: decodeURIComponent(parsed.password || ""),
            }
          : undefined,
    };
  } catch (_error) {
    return undefined;
  }
}

async function requestWithRetry(requestConfig) {
  let lastError = null;
  const attempts = Math.max(1, parserConfig.retries + 1);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const proxyUrl =
      parserConfig.proxies.length > 0
        ? parserConfig.proxies[attempt % parserConfig.proxies.length]
        : null;

    try {
      const response = await axios({
        timeout: parserConfig.timeoutMs,
        ...requestConfig,
        headers: {
          "User-Agent": parserConfig.userAgent,
          ...(requestConfig.headers || {}),
        },
        proxy: proxyUrl ? toAxiosProxy(proxyUrl) : undefined,
      });
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await sleep(parserConfig.retryDelayMs * (attempt + 1));
      }
    }
  }

  throw lastError;
}

module.exports = { requestWithRetry };
