const pageType = window.__PAGE_TYPE__ || "vacancies";
const API_TYPE_MAP = { vacancies: "jobs", internships: "internships", courses: "courses" };
const TTL_MS = 2 * 24 * 60 * 60 * 1000;

const searchInput = document.querySelector(".search-input");
const searchBtn = document.querySelector(".search-btn");
const resultsContainer = document.getElementById("resultsContainer");
const loadingSpinner = document.getElementById("loadingSpinner");
const citySelect = document.getElementById("citySelect");
const selectedFiltersContainer = document.getElementById("selectedFilters");
const filterBtn = document.querySelector(".filter-btn");
const filterModal = document.getElementById("filterModal");
const applyBtn = document.querySelector(".apply-btn-container .apply-btn");
const exportBtn = document.getElementById("exportBtn");

let lastSearchId = null;

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

function closeAllDropdowns() {
  document.querySelectorAll(".filter-input-wrapper").forEach((wrapper) => {
    wrapper.classList.remove("open");
    wrapper.querySelector(".dropdown-menu")?.classList.remove("open");
  });
}

function setupDropdowns() {
  document.querySelectorAll(".filter-input-wrapper").forEach((wrapper) => {
    const input = wrapper.querySelector(".filter-input");
    const btn = wrapper.querySelector(".dropdown-btn");
    const menu = wrapper.querySelector(".dropdown-menu");
    if (!btn || !menu || !input) return;

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = wrapper.classList.contains("open");
      closeAllDropdowns();
      if (!isOpen) {
        wrapper.classList.add("open");
        menu.classList.add("open");
      }
    });

    menu.addEventListener("click", (e) => e.stopPropagation());
    menu.querySelectorAll('input[type="radio"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        const option = radio.closest(".dropdown-option");
        const label = option?.querySelector(".option-label")?.textContent?.trim() || "";
        input.value = label;
        closeAllDropdowns();
      });
    });
  });

  document.addEventListener("click", closeAllDropdowns);
}

function collectFilters() {
  const filters = {};
  document.querySelectorAll(".dropdown-menu input[type='radio']:checked").forEach((radio) => {
    filters[radio.name] = radio.value;
  });
  return filters;
}

function renderFilterTags(filters) {
  selectedFiltersContainer.innerHTML = "";
  Object.entries(filters).forEach(([key, value]) => {
    const tag = document.createElement("div");
    tag.className = "filter-tag";
    tag.textContent = key === "experience" ? `опыт ${value}` : key === "schedule" ? `график ${value}` : value;
    selectedFiltersContainer.appendChild(tag);
  });
}

function renderResults(results) {
  resultsContainer.innerHTML = "";
  results.forEach((item) => {
    const card = document.createElement("div");
    card.className = "result-card";
    card.innerHTML = `
      <p class="company-text"><span class="company-label">Источник: </span><span class="company-name">${item.source}</span></p>
      <p class="result-title">${item.title || "Без названия"}</p>
      <p class="result-subtitle">${item.company || ""}</p>
      <p class="result-extra">${item.city || ""} ${item.experience ? "• " + item.experience : ""} ${item.employment ? "• " + item.employment : ""} ${item.schedule ? "• " + item.schedule : ""} ${item.format ? "• " + item.format : ""} ${item.cost ? "• " + item.cost : ""}</p>
      ${item.url ? `<a class="apply-btn more-btn" href="${item.url}" target="_blank" rel="noopener noreferrer">подробнее</a>` : ""}
    `;
    resultsContainer.appendChild(card);
  });
}

function renderSourceLogs(sourceLogs = [], stats = null) {
  if (!Array.isArray(sourceLogs) || sourceLogs.length === 0) return;
  const panel = document.createElement("div");
  panel.className = "result-card";
  const rows = sourceLogs
    .map(
      (log) =>
        `<div class="result-extra"><strong>${log.source}</strong>: status=${log.status}, fetched=${log.fetchedCount || 0}, saved=${log.savedCount || 0}${log.error ? `, error=${log.error}` : ""}</div>`
    )
    .join("");
  panel.innerHTML = `
    <p class="result-title">Журнал источников</p>
    ${stats ? `<p class="result-extra">Всего fetched: ${stats.totalFetched || 0}, всего saved: ${stats.totalSaved || 0}</p>` : ""}
    ${rows}
  `;
  resultsContainer.prepend(panel);
}

async function loadCities() {
  const response = await fetch("/api/cities");
  const data = await response.json();
  citySelect.innerHTML = data.cities.map((city) => `<option value="${city}">${city}</option>`).join("");
  const savedCity = getWithTTL(`vacursio-city-${pageType}`);
  if (savedCity && data.cities.includes(savedCity)) citySelect.value = savedCity;
}

async function doSearch() {
  const query = searchInput.value.trim();
  if (!query) return;
  loadingSpinner.classList.add("active");
  resultsContainer.innerHTML = "";

  const filters = collectFilters();
  const payload = { query, city: citySelect.value, filters };
  setWithTTL(`vacursio-search-${pageType}`, payload);
  setWithTTL(`vacursio-city-${pageType}`, citySelect.value);

  const response = await fetch(`/api/search/${API_TYPE_MAP[pageType]}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  loadingSpinner.classList.remove("active");

  if (!response.ok || !Array.isArray(data.results)) {
    resultsContainer.innerHTML = '<p class="result-extra">к сожалению, по вашему запросу результатов нет.</p>';
    return;
  }

  lastSearchId = data.searchId || null;
  exportBtn.disabled = !lastSearchId;
  renderFilterTags(filters);

  if (!data.results.length) {
    resultsContainer.innerHTML = '<p class="result-extra">к сожалению, по вашему запросу результатов нет.</p>';
    renderSourceLogs(data.sourceLogs, data.stats);
    return;
  }

  renderResults(data.results);
  renderSourceLogs(data.sourceLogs, data.stats);
}

function setupCookieBanner() {
  const banner = document.getElementById("cookieBanner");
  const okBtn = document.getElementById("cookieOkBtn");
  if (!banner || !okBtn) return;
  const accepted = getWithTTL("vacursio-cookie-ok");
  if (!accepted) banner.style.display = "block";
  okBtn.addEventListener("click", () => {
    setWithTTL("vacursio-cookie-ok", true);
    banner.style.display = "none";
  });
}

filterBtn?.addEventListener("click", () => filterModal?.classList.add("active"));
filterModal?.addEventListener("click", (e) => {
  if (e.target === filterModal) filterModal.classList.remove("active");
});

applyBtn?.addEventListener("click", () => {
  renderFilterTags(collectFilters());
  filterModal?.classList.remove("active");
});

searchBtn?.addEventListener("click", doSearch);
searchInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doSearch();
});
exportBtn?.addEventListener("click", () => {
  if (lastSearchId) window.location.href = `/api/export/${lastSearchId}`;
});

setupDropdowns();
setupCookieBanner();
loadCities();
