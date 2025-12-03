import { useEffect, useState } from "react";
import "./App.css";
import earthImg from "./assets/earth.png"; // add this image
import indraImg from "./assets/indra.png"; // add this image

const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
const DEFAULT_CITY = "London"; // change if you want

function App() {
  const [city, setCity] = useState(() => localStorage.getItem("wm_city") || DEFAULT_CITY);
  const [inputCity, setInputCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [units, setUnits] = useState(() => localStorage.getItem("wm_units") || "metric");
  const [theme, setTheme] = useState(() => localStorage.getItem("wm_theme") || "dark");
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("wm_history")) || [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("wm_theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!city) return;
    fetchWeatherByCity(city);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units]);

  useEffect(() => {
    if (city) fetchWeatherByCity(city);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addToHistory = (newCity) => {
    const updated = [newCity, ...history.filter((c) => c !== newCity)].slice(0, 6);
    setHistory(updated);
    localStorage.setItem("wm_history", JSON.stringify(updated));
  };

  const fetchWeatherByCity = async (cityName) => {
    if (!API_KEY) {
      setError("Missing API key. Configure VITE_WEATHER_API_KEY.");
      return;
    }
    if (!cityName) return;

    setLoading(true);
    setError("");

    try {
      const weatherRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
          cityName
        )}&appid=${API_KEY}&units=${units}`
      );

      const weatherData = await weatherRes.json();
      if (!weatherRes.ok) {
        throw new Error(weatherData.message || "City not found");
      }

      const forecastRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
          cityName
        )}&appid=${API_KEY}&units=${units}`
      );

      const forecastData = await forecastRes.json();
      if (!forecastRes.ok) {
        throw new Error(forecastData.message || "Failed to fetch forecast");
      }

      setWeather(weatherData);
      setForecast(forecastData.list.slice(0, 10));
      setCity(cityName);
      localStorage.setItem("wm_city", cityName);
      addToHistory(cityName);
    } catch (err) {
      setError(err.message || "Something went wrong");
      setWeather(null);
      setForecast([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherByLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    setLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        try {
          const weatherRes = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${units}`
          );

          const weatherData = await weatherRes.json();
          if (!weatherRes.ok) {
            throw new Error(weatherData.message || "Failed to fetch location weather");
          }

          const forecastRes = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${units}`
          );

          const forecastData = await forecastRes.json();
          if (!forecastRes.ok) {
            throw new Error(forecastData.message || "Failed to fetch forecast");
          }

          setWeather(weatherData);
          setForecast(forecastData.list.slice(0, 10));
          setCity(weatherData.name);
          localStorage.setItem("wm_city", weatherData.name);
          addToHistory(weatherData.name);
        } catch (err) {
          setError(err.message || "Something went wrong");
          setWeather(null);
          setForecast([]);
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        setError("Location permission denied.");
      }
    );
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!inputCity.trim()) return;
    fetchWeatherByCity(inputCity.trim());
    setInputCity("");
  };

  const toggleUnits = () => {
    const next = units === "metric" ? "imperial" : "metric";
    setUnits(next);
    localStorage.setItem("wm_units", next);
  };

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const unitSymbol = units === "metric" ? "°C" : "°F";
  const condition = weather?.weather?.[0]?.main || "Clear";

  return (
    <div className={`app-shell ${theme}`}>
      <div className="app-glow" />
      <header className="top-bar">
        <div className="brand">
          <span className="brand-mark">☁</span>
          <div>
            <h1>SkyCast 3D</h1>
            <p className="brand-sub">
              Immersive Weather Monitor • <TypedDeveloper />
            </p>
          </div>
        </div>
        <div className="top-actions">
          <button className="chip" onClick={toggleTheme}>
            {theme === "dark" ? "☀ Light" : "🌙 Dark"}
          </button>
          <button className="chip" onClick={toggleUnits}>
            Units: {unitSymbol}
          </button>
        </div>
      </header>

      <main className="layout">
        {/* LEFT: 3D earth + Indra */}
        <section className="hero-card">
          <div className="hero-left">
            <EarthGlobe condition={condition} />
            <IndraCard condition={condition} />
          </div>

          <div className="hero-right">
            <form className="search-row" onSubmit={handleSearch}>
              <div className="search-input-wrap">
                <input
                  type="text"
                  placeholder="Search city (Delhi, London, Tokyo...) "
                  value={inputCity}
                  onChange={(e) => setInputCity(e.target.value)}
                />
                <span className="search-icon">🔍</span>
              </div>
              <button type="submit" className="primary-btn">
                Search
              </button>
            </form>

            <button type="button" className="location-btn" onClick={fetchWeatherByLocation}>
              <span>📍</span> Use My Location
            </button>

            {history.length > 0 && (
              <div className="history-row">
                <span className="history-label">Recent:</span>
                <div className="history-chips">
                  {history.map((cityName) => (
                    <button
                      key={cityName}
                      type="button"
                      className="history-chip"
                      onClick={() => fetchWeatherByCity(cityName)}
                    >
                      {cityName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <div className="banner error">{error}</div>}
            {loading && <div className="banner info">Fetching live weather…</div>}

            {weather && !loading && (
              <CurrentWeatherPanel weather={weather} unitSymbol={unitSymbol} />
            )}
          </div>
        </section>

        {/* RIGHT: Forecast timeline */}
        <section className="forecast-card">
          <header className="forecast-header">
            <div>
              <h2>Next Hours Timeline</h2>
              <p className="forecast-sub">
                3-hour forecast • {weather?.name || city || "City"}
              </p>
            </div>
          </header>

          {forecast.length === 0 && !loading && (
            <p className="no-forecast">No forecast data yet. Search a city to begin.</p>
          )}

          <div className="forecast-strip">
            {forecast.map((item) => (
              <ForecastBubble key={item.dt} item={item} unitSymbol={unitSymbol} />
            ))}
          </div>
        </section>
      </main>

      <footer className="foot">
        <span>© {new Date().getFullYear()} Sumeet Kumar Monti</span>
        <span>•</span>
        <span>Built with React + Vite</span>
        <span>•</span>
        <span>OpenWeatherMap API</span>
        <span>•</span>
        <span>3D Earth • Indra Dev • LocalStorage • Geolocation</span>
      </footer>
    </div>
  );
}

/* ===== TYPING DEV TEXT ===== */
function TypedDeveloper() {
  const text = "Developed by Sumeet Kumar Monti";
  const [display, setDisplay] = useState("");
  const [index, setIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const isDone = index === text.length;
    const isEmpty = index === 0;

    const delay = deleting ? 80 : 130; // slow smooth typing

    const timeout = setTimeout(() => {
      if (!deleting) {
        if (!isDone) {
          setDisplay((prev) => prev + text[index]);
          setIndex((i) => i + 1);
        } else {
          // pause before deleting
          setDeleting(true);
        }
      } else {
        if (!isEmpty) {
          setDisplay((prev) => prev.slice(0, -1));
          setIndex((i) => i - 1);
        } else {
          setDeleting(false);
        }
      }
    }, isDone && !deleting ? 1200 : delay); // little pause at full text

    return () => clearTimeout(timeout);
  }, [index, deleting, text]);

  return (
    <span className="typed-dev">
      {display}
      <span className="typed-caret">|</span>
    </span>
  );
}

/* ===== EARTH GLOBE ===== */
function EarthGlobe({ condition }) {
  const mood =
    condition === "Rain"
      ? "globe-rainy"
      : condition === "Clouds"
      ? "globe-cloudy"
      : condition === "Thunderstorm"
      ? "globe-storm"
      : condition === "Snow"
      ? "globe-snow"
      : "globe-clear";

  return (
    <div className={`globe-wrap ${mood}`}>
      <div className="globe-inner">
        <img src={earthImg} alt="Earth" className="globe-img" />
      </div>
      <p className="globe-caption">Planet Earth • Live weather mood</p>
    </div>
  );
}

/* ===== INDRA DEV CARD ===== */
function IndraCard({ condition }) {
  const highlight = condition === "Rain" || condition === "Thunderstorm";

  return (
    <div className={`indra-card ${highlight ? "indra-active" : ""}`}>
      <div className="indra-avatar-wrap">
        <img src={indraImg} alt="Indra Dev" className="indra-avatar" />
      </div>
      <div className="indra-text">
        <div className="indra-title">Indra Dev</div>
        <div className="indra-sub">
          {highlight ? "Bringing the rains ☔" : "Guardian of storms and rains"}
        </div>
      </div>
    </div>
  );
}

/* ===== CURRENT WEATHER PANEL ===== */
function CurrentWeatherPanel({ weather, unitSymbol }) {
  const temp = Math.round(weather.main.temp);
  const feels = Math.round(weather.main.feels_like);
  const humidity = weather.main.humidity;
  const wind = weather.wind.speed;
  const pressure = weather.main.pressure;
  const visibility = weather.visibility;
  const icon = weather.weather?.[0]?.icon;
  const desc = weather.weather?.[0]?.description;
  const city = weather.name;
  const country = weather.sys?.country;

  return (
    <div className="current-card">
      <div className="current-main">
        <div>
          <h2 className="current-city">
            {city}, {country}
          </h2>
          <p className="current-desc">{desc}</p>
          <p className="current-feels">
            Feels like {feels}
            {unitSymbol}
          </p>
        </div>
        {icon && (
          <img
            className="current-icon"
            src={`https://openweathermap.org/img/wn/${icon}@2x.png`}
            alt={desc}
          />
        )}
      </div>

      <div className="current-metrics">
        <Metric value={`${temp}${unitSymbol}`} label="Temperature" />
        <Metric value={`${humidity}%`} label="Humidity" />
        <Metric value={`${wind} m/s`} label="Wind" />
        <Metric value={`${pressure} hPa`} label="Pressure" />
        <Metric value={`${Math.round(visibility / 1000)} km`} label="Visibility" />
      </div>
    </div>
  );
}

function Metric({ value, label }) {
  return (
    <div className="metric">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}

/* ===== FORECAST BUBBLE ===== */
function ForecastBubble({ item, unitSymbol }) {
  const dt = new Date(item.dt * 1000);
  const time = dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const day = dt.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
  const temp = Math.round(item.main.temp);
  const icon = item.weather?.[0]?.icon;
  const main = item.weather?.[0]?.main;

  return (
    <div className="bubble">
      <div className="bubble-top">
        <span className="bubble-day">{day}</span>
        <span className="bubble-time">{time}</span>
      </div>
      {icon && (
        <img
          className="bubble-icon"
          src={`https://openweathermap.org/img/wn/${icon}.png`}
          alt={main}
        />
      )}
      <div className="bubble-temp">
        {temp}
        {unitSymbol}
      </div>
      <div className="bubble-main">{main}</div>
    </div>
  );
}

export default App;
