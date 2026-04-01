/* ============================================================
   SKYWATCHER — main.js
   ============================================================ */

const API_KEY = "3045dd712ffe6e702e3245525ac7fa38";

// ── DOM REFS ────────────────────────────────────────────────
const cityInput   = document.getElementById("cityInput");
const searchBtn   = document.getElementById("searchBtn");
const errorMsg    = document.getElementById("errorMsg");
const weatherCard = document.getElementById("weatherCard");
const recentList  = document.getElementById("recentList");
const recentSection = document.getElementById("recentSection");
const forecastCity  = document.getElementById("forecastCity");
const forecastGrid  = document.getElementById("forecastGrid");
const mapFrame      = document.getElementById("mapFrame");
const hamburger     = document.getElementById("hamburger");
const mobileMenu    = document.getElementById("mobileMenu");

// Card fields
const cardCity     = document.getElementById("cardCity");
const cardCountry  = document.getElementById("cardCountry");
const cardIcon     = document.getElementById("cardIcon");
const cardTemp     = document.getElementById("cardTemp");
const cardFeels    = document.getElementById("cardFeels");
const cardDesc     = document.getElementById("cardDesc");
const cardHumidity = document.getElementById("cardHumidity");
const cardWind     = document.getElementById("cardWind");
const cardPressure = document.getElementById("cardPressure");
const cardVis      = document.getElementById("cardVis");
const cardSunrise  = document.getElementById("cardSunrise");
const cardSunset   = document.getElementById("cardSunset");

// ── STATE ───────────────────────────────────────────────────
let lastCity = "";
let recentCities = JSON.parse(localStorage.getItem("skywatcher_recent") || "[]");

// ── UTILS ───────────────────────────────────────────────────
const kelvinToC = k => (k - 273.15).toFixed(1);
const mpsToKmh  = m => (m * 3.6).toFixed(1);
const unixToTime = (u, tz) => {
  const d = new Date((u + tz) * 1000);
  return d.toUTCString().slice(17, 22);
};

const WEATHER_ICONS = {
  "clear sky": "☀️", "few clouds": "🌤", "scattered clouds": "🌥",
  "broken clouds": "☁️", "overcast clouds": "☁️",
  "light rain": "🌦", "moderate rain": "🌧", "heavy intensity rain": "⛈",
  "thunderstorm": "⛈", "snow": "❄️", "mist": "🌫", "fog": "🌫",
  "haze": "🌫", "drizzle": "🌦", "shower rain": "🌧",
};
const getIcon = desc => WEATHER_ICONS[desc.toLowerCase()] || "🌡️";

// ── NAVIGATION ──────────────────────────────────────────────
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + pageId).classList.add("active");

  document.querySelectorAll(".nav-link").forEach(l => {
    l.classList.toggle("active", l.dataset.page === pageId);
  });

  mobileMenu.classList.remove("open");

  // Lazy load map when first viewed
  if (pageId === "map" && !mapFrame.src.includes("openweathermap")) {
    setMapLayer("wind");
  }
  // Refresh forecast when navigating to it
  if (pageId === "forecast" && lastCity) {
    fetchForecast(lastCity);
  }
}

document.querySelectorAll("[data-page]").forEach(el => {
  el.addEventListener("click", e => {
    e.preventDefault();
    showPage(el.dataset.page);
  });
});

hamburger.addEventListener("click", () => mobileMenu.classList.toggle("open"));

// ── RECENT SEARCHES ─────────────────────────────────────────
function saveRecent(city) {
  recentCities = [city, ...recentCities.filter(c => c.toLowerCase() !== city.toLowerCase())].slice(0, 6);
  localStorage.setItem("skywatcher_recent", JSON.stringify(recentCities));
  renderRecent();
}

function renderRecent() {
  recentList.innerHTML = "";
  recentCities.forEach(city => {
    const tag = document.createElement("span");
    tag.className = "recent-tag";
    tag.textContent = city;
    tag.addEventListener("click", () => {
      cityInput.value = city;
      fetchWeather(city);
    });
    recentList.appendChild(tag);
  });
  recentSection.style.display = recentCities.length ? "block" : "none";
}

// ── FETCH CURRENT WEATHER ────────────────────────────────────
async function fetchWeather(city) {
  errorMsg.textContent = "";
  searchBtn.textContent = "…";
  searchBtn.disabled = true;

  try {
    const res  = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}`
    );
    if (!res.ok) throw new Error("City not found");
    const d = await res.json();

    lastCity = d.name;
    cityInput.value = d.name;

    const desc = d.weather[0].description;
    cardCity.textContent     = d.name;
    cardCountry.textContent  = d.sys.country;
    cardIcon.textContent     = getIcon(desc);
    cardTemp.textContent     = kelvinToC(d.main.temp) + "°C";
    cardFeels.textContent    = kelvinToC(d.main.feels_like) + "°C";
    cardDesc.textContent     = desc.charAt(0).toUpperCase() + desc.slice(1);
    cardHumidity.textContent = d.main.humidity + "%";
    cardWind.textContent     = mpsToKmh(d.wind.speed) + " km/h";
    cardPressure.textContent = d.main.pressure + " hPa";
    cardVis.textContent      = d.visibility ? (d.visibility / 1000).toFixed(1) + " km" : "—";
    cardSunrise.textContent  = "🌅 " + unixToTime(d.sys.sunrise, d.timezone);
    cardSunset.textContent   = "🌇 " + unixToTime(d.sys.sunset,  d.timezone);

    weatherCard.classList.remove("hidden");
    saveRecent(d.name);
  } catch (err) {
    errorMsg.textContent = "❌ " + (err.message || "City not found. Check your spelling.");
    weatherCard.classList.add("hidden");
  } finally {
    searchBtn.textContent = "Search";
    searchBtn.disabled = false;
  }
}

// ── FETCH 5-DAY FORECAST ─────────────────────────────────────
async function fetchForecast(city) {
  forecastGrid.innerHTML = "<p style='color:var(--muted)'>Loading…</p>";
  forecastCity.textContent = city + " — Next 5 Days";

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}`
    );
    if (!res.ok) throw new Error();
    const d = await res.json();

    // Group by day
    const days = {};
    d.list.forEach(item => {
      const date = item.dt_txt.split(" ")[0];
      if (!days[date]) days[date] = [];
      days[date].push(item);
    });

    forecastGrid.innerHTML = "";
    Object.entries(days).slice(0, 5).forEach(([date, items], i) => {
      const temps = items.map(x => x.main.temp);
      const high  = kelvinToC(Math.max(...temps));
      const low   = kelvinToC(Math.min(...temps));
      const desc  = items[Math.floor(items.length / 2)].weather[0].description;
      const dayName = new Date(date).toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });

      const card = document.createElement("div");
      card.className = "forecast-day";
      card.style.animationDelay = `${i * 0.07}s`;
      card.innerHTML = `
        <div class="f-date">${dayName}</div>
        <div class="f-icon">${getIcon(desc)}</div>
        <div class="f-desc">${desc}</div>
        <div class="f-temps"><span class="f-high">${high}°</span><span class="f-low">${low}°</span></div>
      `;
      forecastGrid.appendChild(card);
    });
  } catch {
    forecastGrid.innerHTML = "<p style='color:#f87171'>Failed to load forecast.</p>";
  }
}

// ── MAP LAYERS ───────────────────────────────────────────────
const MAP_LAYERS = {
  wind:     "wind_new",
  pressure: "pressure_new",
  clouds:   "clouds_new",
  temp:     "temp_new",
};

function setMapLayer(layer) {
  const tile = MAP_LAYERS[layer];
  mapFrame.srcdoc = `
    <!DOCTYPE html><html><head>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <style>body{margin:0}#map{height:100vh;}</style></head>
    <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
    <script>
      var map = L.map('map').setView([20,0],2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
      L.tileLayer('https://tile.openweathermap.org/map/${tile}/{z}/{x}/{y}.png?appid=${API_KEY}',{opacity:.6}).addTo(map);
    <\/script></body></html>
  `;
}

document.querySelectorAll(".map-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".map-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    setMapLayer(btn.dataset.layer);
  });
});

// ── SEARCH EVENTS ────────────────────────────────────────────
searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (city) fetchWeather(city);
});

cityInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const city = cityInput.value.trim();
    if (city) fetchWeather(city);
  }
});

// ── INIT ─────────────────────────────────────────────────────
renderRecent();
recentSection.style.display = recentCities.length ? "block" : "none";
