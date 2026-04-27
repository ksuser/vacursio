const { bingSiteSearch, fetchStepik, fetchHHApi, fetchTeachbaseApi } = require("./sourceAdapters");

function withInternshipQuery(query, type) {
  return type === "internships" ? `${query} стажировка` : query;
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.url}|${item.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function runSource(sourceName, runner) {
  const startedAt = new Date();
  try {
    const items = await runner();
    return {
      source: sourceName,
      status: "ok",
      fetchedCount: items.length,
      savedCount: 0,
      error: "",
      startedAt,
      finishedAt: new Date(),
      items,
    };
  } catch (error) {
    return {
      source: sourceName,
      status: "error",
      fetchedCount: 0,
      savedCount: 0,
      error: error.message || "unknown error",
      startedAt,
      finishedAt: new Date(),
      items: [],
    };
  }
}

async function loadFromSources({ type, query, city, filters = {} }) {
  if (type === "courses") {
    const tasks = await Promise.all([
      runSource("stepik.org", () => fetchStepik({ query, city, limit: 20 })),
      runSource("teachbase.org", async () => {
        const apiItems = await fetchTeachbaseApi({ query, city, limit: 20, filters });
        if (apiItems.length > 0) return apiItems;
        return bingSiteSearch({
          query,
          city,
          filters,
          site: "teachbase.ru",
          source: "teachbase.org",
          type,
          limit: 20,
        });
      }),
    ]);

    const items = dedupe(tasks.flatMap((task) => task.items)).slice(0, 40);
    return { items, sourceLogs: tasks };
  }

  const normalizedQuery = withInternshipQuery(query, type);
  const tasks = await Promise.all([
    runSource("hh.ru", async () => {
      const apiItems = await fetchHHApi({ query: normalizedQuery, city, limit: 20 });
      if (apiItems.length > 0) return apiItems;
      return bingSiteSearch({
        query: normalizedQuery,
        city,
        filters,
        site: "hh.ru",
        source: "hh.ru",
        type,
        limit: 20,
      });
    }),
    runSource("rabota.ru", () =>
      bingSiteSearch({
        query: normalizedQuery,
        city,
        filters,
        site: "rabota.ru",
        source: "rabota.ru",
        type,
        limit: 20,
      })
    ),
    runSource("avito.ru", () =>
      bingSiteSearch({
        query: normalizedQuery,
        city,
        filters,
        site: "avito.ru",
        source: "avito.ru",
        type,
        limit: 20,
      })
    ),
  ]);

  const items = dedupe(tasks.flatMap((task) => task.items)).slice(0, 60);
  return { items, sourceLogs: tasks };
}

module.exports = { loadFromSources };
