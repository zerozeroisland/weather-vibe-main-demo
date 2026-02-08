"use client";

/* eslint-disable @next/next/no-img-element */
import React from "react";
import WeatherMap from "./WeatherMap";


const next24h = forecast.list.slice(0, 8).map(item => ({
  temp: item.main.temp,
}));

type ForecastBlock = {
  dt: number;
  dt_txt: string;
  tempF: number;
  tempMinF: number;
  tempMaxF: number;
  icon: string | null;
  main: string | null;
  description: string | null;
  windMph: number | null;
  windDeg: number | null;
  cloudPct: number | null;
  pop: number | null;
  rain3hMm: number | null;
  snow3hMm: number | null;
};

type DailyBar = { key: string; min: number; max: number; icon: string | null };

function dayKeyFromUnix(dt: number, tzSeconds: number) {
  const ms = (dt + tzSeconds) * 1000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function labelForBlock(dt: number, tzSeconds: number) {
  const ms = (dt + tzSeconds) * 1000;
  const d = new Date(ms);
  const h = d.getUTCHours();
  return `${String(h).padStart(2, "0")}:00`;
}

function dayLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString(undefined, { weekday: "short" });
}

function buildDailyBars(blocks: ForecastBlock[], tz: number): DailyBar[] {
  const map = new Map<string, DailyBar>();

  for (const b of blocks) {
    const key = dayKeyFromUnix(b.dt, tz);
    const bMin = Number.isFinite(b.tempMinF) ? b.tempMinF : b.tempF;
    const bMax = Number.isFinite(b.tempMaxF) ? b.tempMaxF : b.tempF;

    const existing = map.get(key);
    if (!existing) map.set(key, { key, min: bMin, max: bMax, icon: b.icon ?? null });
    else {
      existing.min = Math.min(existing.min, bMin);
      existing.max = Math.max(existing.max, bMax);
    }
  }

  return Array.from(map.values()).sort((a, b) => (a.key < b.key ? -1 : 1)).slice(0, 5);
}

function Card({
  title,
  value,
  sub,
  span2,
}: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  span2?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur",
        span2 ? "sm:col-span-2" : "",
      ].join(" ")}
    >
      <div className="text-xs uppercase tracking-wide text-white/60">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      {sub ? <div className="mt-2 text-sm text-white/60">{sub}</div> : null}
    </div>
  );
}

export default function DashboardClient({
  coord,
  tz,
  blocks,
}: {
  coord: { lat: number; lon: number } | null;
  tz: number;
  blocks: ForecastBlock[];
}) {
  const todayStrip = blocks.slice(0, 8);
  const daily = buildDailyBars(blocks, tz);

  const globalMin = daily.length ? Math.min(...daily.map((d) => d.min)) : 0;
  const globalMax = daily.length ? Math.max(...daily.map((d) => d.max)) : 1;

  const pct = (n: number) => {
    if (globalMax === globalMin) return 0;
    return ((n - globalMin) / (globalMax - globalMin)) * 100;
  };

  return (
    <>
      {coord ? (
        <Card
          title="Map"
          span2
          value={<div className="mt-1"><WeatherMap lat={coord.lat} lon={coord.lon} /></div>}
          sub="OpenStreetMap (no API key)."
        />
      ) : null}

      {todayStrip.length ? (
        <Card
          title="Today Trend"
          span2
          value={
            <div className="mt-1 grid grid-cols-4 gap-3 sm:grid-cols-8">
              {todayStrip.map((b) => {
                const u = b.icon ? `https://openweathermap.org/img/wn/${b.icon}@2x.png` : null;
                return (
                  <div key={b.dt} className="flex flex-col items-center justify-center">
                    <div className="text-xs text-white/60">{labelForBlock(b.dt, tz)}</div>
                    {u ? (
                      <img
                        src={u}
                        alt={b.description ?? "forecast icon"}
                        className="h-10 w-10 opacity-90"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="h-10 w-10" />
                    )}
                    <div className="text-sm font-semibold text-white">{Math.round(b.tempF)}°</div>
                  </div>
                );
              })}
            </div>
          }
          sub="3-hour blocks (next ~24h)."
        />
      ) : null}

      {daily.length ? (
        <Card
          title="5-Day Forecast"
          span2
          value={
            <div className="mt-1 space-y-3">
              {daily.map((d) => {
                const left = pct(d.min);
                const width = Math.max(6, pct(d.max) - pct(d.min));
                return (
                  <div key={d.key} className="grid grid-cols-[56px_1fr_64px] items-center gap-3">
                    <div className="text-sm text-white/70">{dayLabel(d.key)}</div>

                    <div className="relative h-2 w-full rounded-full bg-black/30">
                      <div
                        className="absolute top-0 h-2 rounded-full bg-white/40"
                        style={{ left: `${left}%`, width: `${width}%` }}
                      />
                    </div>

                    <div className="text-right text-sm text-white">
                      <span className="text-white/70">{Math.round(d.min)}°</span>{" "}
                      <span className="text-white/40">/</span>{" "}
                      <span className="font-semibold">{Math.round(d.max)}°</span>
                    </div>
                  </div>
                );
              })}
            </div>
          }
          sub="Derived from OpenWeather 3-hour forecast."
        />
      ) : null}
    </>
  );
}