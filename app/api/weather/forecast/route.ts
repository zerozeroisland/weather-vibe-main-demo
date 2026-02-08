import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ForecastItem = {
  dt: number;
  dt_txt: string;
  main: { temp: number; temp_min: number; temp_max: number };
  weather: Array<{ description: string; icon: string; main: string }>;
  wind: { speed: number; deg: number };
  clouds: { all: number };
  pop?: number;
  rain?: { "3h"?: number };
  snow?: { "3h"?: number };
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // Same pattern as your current route: allow ?q=Providence,US (optional)
  const q = searchParams.get("q") || "Providence,US";

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing OPENWEATHER_API_KEY" }, { status: 500 });
  }

  // 5-day / 3-hour blocks (free)
  const url =
    `https://api.openweathermap.org/data/2.5/forecast` +
    `?q=${encodeURIComponent(q)}` +
    `&appid=${apiKey}` +
    `&units=imperial`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ error: "Forecast fetch failed" }, { status: res.status });
  }

  const raw = await res.json();

  // Return a slim, predictable shape for UI
  const city = raw.city
    ? {
        name: raw.city.name,
        country: raw.city.country,
        coord: raw.city.coord, // { lat, lon }
        timezone: raw.city.timezone, // seconds offset
      }
    : null;

  const list: ForecastItem[] = Array.isArray(raw.list) ? raw.list : [];

  return NextResponse.json({
    city,
    list: list.map((it) => ({
      dt: it.dt,
      dt_txt: it.dt_txt,
      tempF: it.main?.temp,
      tempMinF: it.main?.temp_min,
      tempMaxF: it.main?.temp_max,
      icon: it.weather?.[0]?.icon ?? null,
      main: it.weather?.[0]?.main ?? null,
      description: it.weather?.[0]?.description ?? null,
      windMph: it.wind?.speed ?? null,
      windDeg: it.wind?.deg ?? null,
      cloudPct: it.clouds?.all ?? null,
      pop: it.pop ?? null,
      rain3hMm: it.rain?.["3h"] ?? null,
      snow3hMm: it.snow?.["3h"] ?? null,
    })),
  });
}