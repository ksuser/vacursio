const { parserConfig } = require("../config/parser");
const { requestWithRetry } = require("./httpClient");

function parseRssItems(xml) {
  const items = [];
  const entries = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
  entries.forEach((entry) => {
    const title = (entry.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
      entry.match(/<title>(.*?)<\/title>/)?.[1] ||
      "").trim();
    const link = (entry.match(/<link>(.*?)<\/link>/)?.[1] || "").trim();
    const description = (
      entry.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ||
      entry.match(/<description>(.*?)<\/description>/)?.[1] ||
      ""
    )
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (title && link) items.push({ title, link, description });
  });
  return items;
}

async function bingSiteSearch({ query, site, source, limit, city, type, filters = {} }) {
  const keyword =
    type === "courses" ? "курс обучение" : type === "internships" ? "стажировка вакансия" : "вакансия";
  const q = `inurl:${site} ${query} ${city || ""} ${keyword}`.trim();
  const response = await requestWithRetry({
    method: "GET",
    url: "https://www.bing.com/search",
    params: { q, format: "rss" },
  });

  return parseRssItems(response.data)
    .filter((item) => item.link.includes(site))
    .slice(0, limit)
    .map((item) => ({
      source,
      title: item.title,
      company: source,
      salaryOrPrice: item.description || "не указано",
      city: city || "",
      format: type === "courses" ? filters.format || "" : "",
      cost: type === "courses" ? filters.cost || "" : "",
      experience: filters.experience || "",
      employment: filters.employment || "",
      schedule: filters.schedule || "",
      url: item.link,
      raw: { snippet: item.description, provider: "bing-rss" },
    }));
}

async function fetchStepik({ query, city, limit = 20 }) {
  const all = [];
  for (let page = 1; page <= 5 && all.length < limit; page += 1) {
    const response = await requestWithRetry({
      method: "GET",
      url: "https://stepik.org/api/courses",
      params: { search: query, page },
    });
    const mapped = (response.data.courses || []).map((course) => ({
      source: "stepik.org",
      title: course.title || "",
      company: "Stepik",
      salaryOrPrice: course.is_paid ? "платно" : "бесплатно",
      city: city || "онлайн",
      format: "онлайн",
      cost: course.is_paid ? "платно" : "бесплатно",
      url: `https://stepik.org/course/${course.id}`,
      raw: course,
    }));
    all.push(...mapped);
    if (!response.data.meta?.has_next) break;
  }
  return all.slice(0, limit);
}

async function fetchHHApi({ query, city, limit = 20 }) {
  const response = await requestWithRetry({
    method: "GET",
    url: `${parserConfig.hh.baseUrl}/vacancies`,
    headers: parserConfig.hh.token ? { Authorization: `Bearer ${parserConfig.hh.token}` } : {},
    params: {
      text: query,
      area: 1,
      per_page: Math.min(20, limit),
      page: 0,
    },
  });

  return (response.data.items || []).slice(0, limit).map((item) => ({
    source: "hh.ru",
    title: item.name || "",
    company: item.employer?.name || "",
    salaryOrPrice: item.salary
      ? `${item.salary.from || ""} - ${item.salary.to || ""} ${item.salary.currency || ""}`.trim()
      : "не указано",
    city: city || item.area?.name || "",
    experience: item.experience?.name || "",
    employment: item.employment?.name || "",
    schedule: item.schedule?.name || "",
    url: item.alternate_url || "",
    raw: item,
  }));
}

async function fetchTeachbaseApi({ query, city, limit = 20, filters = {} }) {
  if (!parserConfig.teachbase.apiUrl) return [];
  const response = await requestWithRetry({
    method: "GET",
    url: parserConfig.teachbase.apiUrl,
    headers: parserConfig.teachbase.apiKey ? { Authorization: `Bearer ${parserConfig.teachbase.apiKey}` } : {},
    params: { q: query, limit },
  });
  const rows = Array.isArray(response.data?.items) ? response.data.items : [];
  return rows.slice(0, limit).map((item) => ({
    source: "teachbase.org",
    title: item.title || item.name || "",
    company: "Teachbase",
    salaryOrPrice: item.price ? String(item.price) : filters.cost || "не указано",
    city: city || item.city || "онлайн",
    format: filters.format || item.format || "",
    cost: filters.cost || item.cost || "",
    url: item.url || "",
    raw: item,
  }));
}

module.exports = {
  bingSiteSearch,
  fetchStepik,
  fetchHHApi,
  fetchTeachbaseApi,
};
