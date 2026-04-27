function parseProxyList(input) {
  if (!input) return [];
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const parserConfig = {
  timeoutMs: Number(process.env.PARSER_TIMEOUT_MS || 12000),
  retries: Number(process.env.PARSER_RETRIES || 2),
  retryDelayMs: Number(process.env.PARSER_RETRY_DELAY_MS || 800),
  proxies: parseProxyList(process.env.PARSER_PROXY_LIST || ""),
  userAgent: process.env.PARSER_USER_AGENT || "VacursioParser/1.0",
  hh: {
    token: process.env.HH_API_TOKEN || "",
    baseUrl: process.env.HH_API_BASE_URL || "https://api.hh.ru",
  },
  avito: {
    clientId: process.env.AVITO_CLIENT_ID || "",
    clientSecret: process.env.AVITO_CLIENT_SECRET || "",
    baseUrl: process.env.AVITO_API_BASE_URL || "https://api.avito.ru",
  },
  rabota: {
    apiUrl: process.env.RABOTA_API_URL || "",
    apiKey: process.env.RABOTA_API_KEY || "",
  },
  teachbase: {
    apiUrl: process.env.TEACHBASE_API_URL || "",
    apiKey: process.env.TEACHBASE_API_KEY || "",
  },
};

module.exports = { parserConfig };
