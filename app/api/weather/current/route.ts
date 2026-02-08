import { NextResponse } from "next/server";

const LAT = 41.8240;   // Providence
const LON = -71.4128;

function dewPointF(tempF: number, humidityPct: number) {
  // Magnus formula (dew point in °C), then convert to °F
  const tempC = (tempF - 32) * (5 / 9);
  const rh = Math.min(Math.max(humidityPct, 1), 100) / 100;

  const a = 17.625;
  const b = 243.04;

  const gamma = (a * tempC) / (b + tempC) + Math.log(rh);
  const dewC = (b * gamma) / (a - gamma);

  return dewC * (9 / 5) + 32;
}

export async function GET() {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENWEATHER_API_KEY" },
      { status: 500 }
    );
  }

  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  url.searchParams.set("lat", String(LAT));
  url.searchParams.set("lon", String(LON));
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "imperial");

  const res = await fetch(url.toString(), { cache: "no-store" });
  const raw = await res.json();

  if (!res.ok) {
    return NextResponse.json(raw, { status: res.status });
  }

  const tempF = raw.main?.temp;
  const humidity = raw.main?.humidity;

  const dpF =
    typeof tempF === "number" && typeof humidity === "number"
      ? dewPointF(tempF, humidity)
      : null;

  // 🔹 Normalize the response so the UI stays clean
  const data = {
    // OPTIONAL (but helpful): echo back the coordinates you’re using
    lat: LAT,
    lon: LON,

    name: raw.name,
    country: raw.sys?.country,

    tempF: raw.main.temp,
    feelsLikeF: raw.main.feels_like,
    tempMinF: raw.main.temp_min,
    tempMaxF: raw.main.temp_max,

    // ✅ Add this (Storm Signal likes it)
    conditionMain: raw.weather?.[0]?.main ?? null, // e.g. "Snow" | "Rain" | "Thunderstorm"

    description: raw.weather?.[0]?.description ?? "—",
    icon: raw.weather?.[0]?.icon ?? null,

    windMph: raw.wind.speed,
    windGustMph: raw.wind.gust ?? null,
    windDeg: raw.wind.deg ?? null,

    humidity: raw.main.humidity,
    pressureHpa: raw.main.pressure,

    visibilityMi: raw.visibility ? raw.visibility / 1609.34 : null,

    sunriseLocal: raw.sys?.sunrise
      ? new Date(raw.sys.sunrise * 1000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null,

    sunsetLocal: raw.sys?.sunset
      ? new Date(raw.sys.sunset * 1000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null,

    // ✅ precip (already working in your UI)
    rain1hMm: raw.rain?.["1h"] ?? null,
    rain3hMm: raw.rain?.["3h"] ?? null,
    snow1hMm: raw.snow?.["1h"] ?? null,
    snow3hMm: raw.snow?.["3h"] ?? null,

    // ✅ free storm-relevant extras
    cloudPct: raw.clouds?.all ?? null,     // 0–100
    dewPointF: dpF,                        // computed from temp + humidity
  };

  return NextResponse.json(data);
}