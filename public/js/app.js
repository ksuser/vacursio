const appRoot = document.getElementById("app");
const pageType = appRoot.dataset.type;

const API_TYPE_MAP = {
  vacancies: "jobs",
  internships: "internships",
  courses: "courses",
};

const citySelect = document.getElementById("citySelect");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const exportBtn = document.getElementById("exportBtn");
const resultsContainer = document.getElementById("resultsContainer");
const messageEl = document.getElementById("message");

let lastSearchId = null;

const TTL_MS = 2 * 24 * 60 * 60 * 1000;

function setWithTTL(key, value) {
  localStorage.setItem(key, JSON.stringify({ value, expiresAt: Date.now() + TTL_MS }));
}

function getWithTTL(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw);
    if (Date.now() > payload.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return payload.value;
  } catch {
    return null;
  }
}

function renderResults(results) {
  resultsContainer.innerHTML = "";
  results.forEach((item) => {
    const card = document.createElement("div");
    card.className = "result-card";
    card.innerHTML = `
      <div><strong>Источник:</strong> ${item.source}</div>
      <h3>${item.title || "Без названия"}</h3>
      <div>${item.company || ""}</div>
      <div class="result-meta">${item.salaryOrPrice || ""}</div>
      <div class="result-meta">
        ${item.city || ""} ${item.experience ? "• " + item.experience : ""}
        ${item.employment ? "• " + item.employment : ""}
        ${item.schedule ? "• " + item.schedule : ""}
        ${item.format ? "• " + item.format : ""}
        ${item.cost ? "• " + item.cost : ""}
      </div>
      ${item.url ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer">Подробнее</a>` : ""}
    `;
    resultsContainer.appendChild(card);
  });
}

function collectFilters() {
  const filters = {};
  document.querySelectorAll("[data-filter]").forEach((el) => {
    if (el.value) filters[el.dataset.filter] = el.value;
  });
  return filters;
}

async function loadCities() {
  const response = await fetch("/api/cities");
  const data = await response.json();
  citySelect.innerHTML = data.cities.map((city) => `<option value="${city}">${city}</option>`).join("");
  const savedCity = getWithTTL(`vacursio-city-${pageType}`);
  if (savedCity) citySelect.value = savedCity;
}

async function doSearch() {
  const query = searchInput.value.trim();
  if (!query) {
    messageEl.textContent = "Введите текстовый запрос.";
    return;
  }
  searchBtn.disabled = true;
  messageEl.textContent = "Загрузка...";
  resultsContainer.innerHTML = "";

  const payload = {
    query,
    city: citySelect.value,
    filters: collectFilters(),
  };

  setWithTTL(`vacursio-state-${pageType}`, payload);
  setWithTTL(`vacursio-city-${pageType}`, citySelect.value);

  const response = await fetch(`/api/search/${API_TYPE_MAP[pageType]}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    messageEl.textContent = data.message || "Ошибка поиска";
    searchBtn.disabled = false;
    return;
  }

  lastSearchId = data.searchId || null;
  exportBtn.disabled = !lastSearchId;

  if (!data.results || !data.results.length) {
    messageEl.textContent = "к сожалению, по вашему запросу результатов нет.";
  } else {
    messageEl.textContent = `Найдено результатов: ${data.results.length}`;
    renderResults(data.results);
  }
  searchBtn.disabled = false;
}

function restoreState() {
  const state = getWithTTL(`vacursio-state-${pageType}`);
  if (!state) return;
  searchInput.value = state.query || "";
  Object.entries(state.filters || {}).forEach(([key, val]) => {
    const input = document.querySelector(`[data-filter="${key}"]`);
    if (input) input.value = val;
  });
}

function setupCookieBanner() {
  const banner = document.getElementById("cookieBanner");
  const okBtn = document.getElementById("cookieOkBtn");
  const accepted = getWithTTL("vacursio-cookie-ok");
  if (!accepted) banner.classList.add("visible");
  okBtn.addEventListener("click", () => {
    setWithTTL("vacursio-cookie-ok", true);
    banner.classList.remove("visible");
  });
}

searchBtn.addEventListener("click", doSearch);
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doSearch();
});

exportBtn.addEventListener("click", () => {
  if (!lastSearchId) return;
  window.location.href = `/api/export/${lastSearchId}`;
});

loadCities().then(() => restoreState());
setupCookieBanner();
