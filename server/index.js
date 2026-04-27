require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const XLSX = require("xlsx");
const { connectDB } = require("../config/db");
const { CITIES } = require("../services/constants");
const { loadFromSources } = require("../services/parserService");
const SearchResult = require("../models/SearchResult");
const SearchRequest = require("../models/SearchRequest");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "pages", "index.html"));
});

app.get("/vacancies", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "pages", "vacancies.html"));
});
app.get("/Job Search Page.html", (_req, res) => {
  res.redirect("/vacancies");
});

app.get("/internships", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "pages", "internships.html"));
});

app.get("/courses", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "pages", "courses.html"));
});
app.get("/Vacursio Landing.html", (_req, res) => {
  res.redirect("/");
});

app.get("/api/cities", (_req, res) => {
  res.json({ cities: CITIES });
});

app.post("/api/search/:type", async (req, res) => {
  const { type } = req.params;
  const { query, city = "Москва", filters = {} } = req.body || {};

  if (!["jobs", "internships", "courses"].includes(type)) {
    return res.status(400).json({ message: "Неизвестный тип поиска" });
  }

  if (!query || typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ message: "Введите текстовый запрос" });
  }

  const safeQuery = query.trim();

  try {
    const { items: sourceResults, sourceLogs } = await loadFromSources({
      type,
      query: safeQuery,
      city,
      filters,
    });
    if (!sourceResults.length) {
      return res.json({
        message: "к сожалению, по вашему запросу результатов нет.",
        results: [],
        sourceLogs,
      });
    }

    const docs = sourceResults.map((item) => ({
      type,
      source: item.source,
      title: item.title,
      company: item.company || "",
      salaryOrPrice: item.salaryOrPrice || "",
      city: item.city || city,
      experience: filters.experience || item.experience || "",
      employment: filters.employment || item.employment || "",
      schedule: filters.schedule || item.schedule || "",
      format: filters.format || item.format || "",
      cost: filters.cost || item.cost || "",
      url: item.url || "",
      query: safeQuery,
      filters,
      raw: item.raw || {},
    }));

    const saved = await SearchResult.insertMany(docs, { ordered: false });

    const sourceSavedCount = {};
    saved.forEach((item) => {
      sourceSavedCount[item.source] = (sourceSavedCount[item.source] || 0) + 1;
    });

    const mergedLogs = (sourceLogs || []).map((log) => ({
      ...log,
      savedCount: sourceSavedCount[log.source] || 0,
    }));

    const requestDoc = await SearchRequest.create({
      type,
      query: safeQuery,
      city,
      filters,
      resultIds: saved.map((doc) => doc._id),
      sourceLogs: mergedLogs,
    });

    const persisted = await SearchResult.find({ _id: { $in: saved.map((item) => item._id) } })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      searchId: requestDoc._id,
      results: persisted,
      sourceLogs: mergedLogs,
      stats: {
        totalFetched: (sourceLogs || []).reduce((acc, item) => acc + (item.fetchedCount || 0), 0),
        totalSaved: persisted.length,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: `Ошибка выполнения поиска: ${error.message}` });
  }
});

app.get("/api/export/:searchId", async (req, res) => {
  const { searchId } = req.params;
  const search = await SearchRequest.findById(searchId).lean();
  if (!search) {
    return res.status(404).json({ message: "Запрос не найден" });
  }

  const results = await SearchResult.find({ _id: { $in: search.resultIds } }).lean();
  const rows = results.map((item) => ({
    source: item.source,
    title: item.title,
    company: item.company,
    salaryOrPrice: item.salaryOrPrice,
    city: item.city,
    experience: item.experience,
    employment: item.employment,
    schedule: item.schedule,
    format: item.format,
    cost: item.cost,
    url: item.url,
    query: item.query,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
  const xlsxBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="vacursio-${search.type}-results.xlsx"`
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  return res.send(xlsxBuffer);
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server started: http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("DB connection error:", error.message);
    process.exit(1);
  });
