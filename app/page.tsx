/* eslint-disable @next/next/no-img-element */
// app/page.tsx
import React from "react";
import { headers } from "next/headers";
import WeatherMap from "./components/WeatherMap";

type CurrentWeather = {
  name: string;
  country?: string;

  tempF: number;
  feelsLikeF: number;

  description: string;

  windMph: number;
  windGustMph?: number | null;
  windDeg?: number | null;

  humidity: number;
  pressureHpa: number;
  visibilityMi?: number | null;

  tempMinF?: number | null;
  tempMaxF?: number | null;

  sunriseLocal?: string | null;
  sunsetLocal?: string | null;

  cloudPct?: number | null;
  dewPointF?: number | null;

  rain1hMm?: number | null;
  rain3hMm?: number | null;
  snow1hMm?: number | null;
  snow3hMm?: number | null;

  conditionMain?: string | null;

  icon?: string | null;
};

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

type ForecastResponse = {
  city: {
    name: string;
    country: string;
    coord: { lat: number; lon: number };
    timezone: number; // seconds
  } | null;
  list: ForecastBlock[];
};

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

function Card({
  title,
  value,
  sub,
}: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur">
      <div className="text-xs uppercase tracking-wide text-white/60">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      {sub ? <div className="mt-2 text-sm text-white/60">{sub}</div> : null}
    </div>
  );
}

/** Decide which subtle animation (if any) should apply to the big icon */
function iconBehavior(condition?: string | null) {
  const c = (condition ?? "").toLowerCase();

  if (c === "snow") return "snow";
  if (c === "rain" || c === "drizzle") return "rain";
  if (c === "thunderstorm") return "storm";

  return "none";
}

/** Dim the icon after sunset / before sunrise (uses local sunrise/sunset strings like "07:04 AM") */
function isNight(sunrise?: string | null, sunset?: string | null) {
  if (!sunrise || !sunset) return false;

  const now = new Date();

  const parseLocalTime = (t: string) => {
    const [time, meridiem] = t.trim().split(" ");
    const [hhStr, mmStr] = time.split(":");
    let hh = Number(hhStr);
    const mm = Number(mmStr);

    const isPM = meridiem?.toUpperCase() === "PM";
    const isAM = meridiem?.toUpperCase() === "AM";

    if (isPM && hh < 12) hh += 12;
    if (isAM && hh === 12) hh = 0;

    const d = new Date(now);
    d.setHours(hh, mm, 0, 0);
    return d;
  };

  const sunriseTime = parseLocalTime(sunrise);
  const sunsetTime = parseLocalTime(sunset);

  return now < sunriseTime || now > sunsetTime;
}

function BigCard({
  place,
  temp,
  desc,
  hilo,
  iconUrl,
  iconAlt,
  iconKind = "none",
  dimIcon = false,
}: {
  place: string;
  temp: string;
  desc: string;
  hilo?: string;
  iconUrl?: string | null;
  iconAlt?: string;
  iconKind?: "snow" | "rain" | "storm" | "none";
  dimIcon?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur">
      <div className="text-sm text-white/70">{place}</div>

      <div className="mt-4 grid grid-cols-2 items-center gap-2">
        <div className="text-6xl font-semibold text-white leading-none">{temp}</div>

        {iconUrl ? (
          <div className="flex items-center justify-center">
            <img
              src={iconUrl}
              alt={iconAlt ?? "Weather icon"}
              className={[
                "h-28 w-28 select-none transition-opacity",
                iconKind === "snow" ? "animate-snow" : "",
                iconKind === "rain" ? "animate-rain" : "",
                iconKind === "storm" ? "animate-storm" : "",
                dimIcon ? "opacity-50" : "opacity-85",
              ]
                .filter(Boolean)
                .join(" ")}
              loading="eager"
              decoding="async"
            />
          </div>
        ) : null}
      </div>

      <div className="mt-4 text-lg text-white/70">{desc}</div>
      {hilo ? <div className="mt-2 text-sm text-white/60">{hilo}</div> : null}
    </div>
  );
}

function formatMm(mm: number) {
  return mm >= 1 ? `${mm.toFixed(1)} mm` : `${mm.toFixed(2)} mm`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function stormSignalFrom(data: {
  pressureHpa: number;
  windMph: number;
  windGustMph?: number | null;
  visibilityMi?: number | null;
  cloudPct?: number | null;
  rain1hMm?: number | null;
  rain3hMm?: number | null;
  snow1hMm?: number | null;
  snow3hMm?: number | null;
  conditionMain?: string | null;
}) {
  let score = 0;
  const reasons: string[] = [];

  const main = (data.conditionMain ?? "").toLowerCase();
  if (main === "thunderstorm") {
    score += 40;
    reasons.push("Thunderstorm conditions reported.");
  } else if (main === "snow") {
    score += 25;
    reasons.push("Snow conditions reported.");
  } else if (main === "rain" || main === "drizzle") {
    score += 18;
    reasons.push("Rain/drizzle conditions reported.");
  } else if (main === "tornado" || main === "squall") {
    score += 50;
    reasons.push("Severe conditions reported.");
  }

  if (data.pressureHpa <= 990) {
    score += 35;
    reasons.push("Very low pressure (strong storm potential).");
  } else if (data.pressureHpa <= 1000) {
    score += 25;
    reasons.push("Low pressure (stormy pattern likely).");
  } else if (data.pressureHpa <= 1008) {
    score += 15;
    reasons.push("Slightly low pressure.");
  } else if (data.pressureHpa >= 1030) {
    score -= 8;
    reasons.push("High pressure (usually steadier weather).");
  }

  if (data.windMph >= 25) {
    score += 25;
    reasons.push(`Strong wind (${Math.round(data.windMph)} mph).`);
  } else if (data.windMph >= 15) {
    score += 12;
    reasons.push(`Breezy (${Math.round(data.windMph)} mph).`);
  }

  if (data.windGustMph != null) {
    if (data.windGustMph >= 35) {
      score += 20;
      reasons.push(`Strong gusts (${Math.round(data.windGustMph)} mph).`);
    } else if (data.windGustMph >= 25) {
      score += 10;
      reasons.push(`Gusty (${Math.round(data.windGustMph)} mph).`);
    }
  }

  const precip1h = (data.rain1hMm ?? 0) + (data.snow1hMm ?? 0);
  const precip3h = (data.rain3hMm ?? 0) + (data.snow3hMm ?? 0);

  if (precip1h >= 8) {
    score += 35;
    reasons.push(`Heavy precip last hour (${precip1h.toFixed(1)} mm).`);
  } else if (precip1h >= 2) {
    score += 18;
    reasons.push(`Precip last hour (${precip1h.toFixed(1)} mm).`);
  } else if (precip3h >= 6) {
    score += 12;
    reasons.push(`Precip last 3h (${precip3h.toFixed(1)} mm).`);
  }

  if (data.visibilityMi != null) {
    if (data.visibilityMi <= 0.5) {
      score += 25;
      reasons.push("Very low visibility.");
    } else if (data.visibilityMi <= 2) {
      score += 12;
      reasons.push("Reduced visibility.");
    }
  }

  if (data.cloudPct != null) {
    if (data.cloudPct >= 95) {
      score += 10;
      reasons.push("Overcast.");
    } else if (data.cloudPct >= 75) {
      score += 6;
      reasons.push("Mostly cloudy.");
    }
  }

  score = clamp(score, 0, 100);

  let label: string;
  let vibe: string;

  if (score >= 75) {
    label = "Severe";
    vibe = "Storm conditions likely / hazardous.";
  } else if (score >= 55) {
    label = "Stormy";
    vibe = "Keep an eye on conditions.";
  } else if (score >= 35) {
    label = "Unsettled";
    vibe = "Some storm signals present.";
  } else if (score >= 20) {
    label = "Quiet-ish";
    vibe = "Mostly calm with minor factors.";
  } else {
    label = "Calm";
    vibe = "Low storm signal.";
  }

  const summary =
    reasons.length > 0 ? reasons.slice(0, 3).join(" ") : "No strong storm indicators detected.";

  return { score, label, vibe, summary };
}

function stormTint(label: string) {
  const l = label.toLowerCase();

  if (l === "severe") {
    return {
      border: "border-red-500/30",
      bg: "bg-red-500/10",
      title: "text-red-200/80",
      bar: "bg-red-400/70",
      dot: "bg-red-300",
    };
  }

  if (l === "stormy") {
    return {
      border: "border-amber-500/30",
      bg: "bg-amber-500/10",
      title: "text-amber-200/80",
      bar: "bg-amber-400/70",
      dot: "bg-amber-300",
    };
  }

  return {
    border: "border-white/15",
    bg: "bg-white/5",
    title: "text-white/70",
    bar: "bg-white/30",
    dot: "bg-white/60",
  };
}

function getBaseUrlFromEnvOrHeaders(h: Headers) {
  // Prefer proxy headers (Vercel / reverse proxies)
  const forwardedHost = h.get("x-forwarded-host");
  const host = forwardedHost ?? h.get("host") ?? process.env.VERCEL_URL ?? null;

  // Prefer forwarded proto; if we only have VERCEL_URL, assume https.
  const forwardedProto = h.get("x-forwarded-proto");
  const proto =
    forwardedProto ?? (process.env.VERCEL_URL ? "https" : "http");

  if (host) {
    // VERCEL_URL may come as just "myapp.vercel.app" (no scheme)
    const cleanHost = host.replace(/^https?:\/\//, "");
    return `${proto}://${cleanHost}`;
  }

  // Local fallback
  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}`;
}

export default async function Page() {
  // IMPORTANT: In your Next version, headers() is async.
  const h = await headers();
  const baseUrl = getBaseUrlFromEnvOrHeaders(h as unknown as Headers);

  const res = await fetch(`${baseUrl}/api/weather/current`, { cache: "no-store" });

  if (!res.ok) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <h1 className="text-2xl font-semibold">Weather Vibe</h1>
        <p className="mt-4 text-white/70">Could not load weather data.</p>
      </main>
    );
  }

  const data: CurrentWeather = await res.json();

  const forecastRes = await fetch(`${baseUrl}/api/weather/forecast`, { cache: "no-store" });
  const forecast: ForecastResponse | null = forecastRes.ok ? await forecastRes.json() : null;

  const tz = forecast?.city?.timezone ?? 0;
  const coord = forecast?.city?.coord ?? null;
  const blocks = forecast?.list ?? [];

  const place = `${data.name}${data.country ? `, ${data.country}` : ""}`;
  const hilo =
    data.tempMinF != null && data.tempMaxF != null
      ? `Low: ${Math.round(data.tempMinF)}°  High: ${Math.round(data.tempMaxF)}°`
      : undefined;

  const iconUrl = data.icon ? `https://openweathermap.org/img/wn/${data.icon}@2x.png` : null;
  const iconAlt =
    data.conditionMain
      ? `${data.conditionMain} icon`
      : data.description
      ? `${data.description} icon`
      : "Weather icon";

  const iconKind = iconBehavior(data.conditionMain);
  const dimIcon = isNight(data.sunriseLocal, data.sunsetLocal);

  const hasRain =
    (data.rain1hMm != null && data.rain1hMm > 0) ||
    (data.rain3hMm != null && data.rain3hMm > 0);

  const hasSnow =
    (data.snow1hMm != null && data.snow1hMm > 0) ||
    (data.snow3hMm != null && data.snow3hMm > 0);

  const hasPrecip = hasRain || hasSnow;

  const precipLines: string[] = [];
  if (hasSnow) {
    const parts: string[] = [];
    if (data.snow1hMm != null && data.snow1hMm > 0) parts.push(`1h ${formatMm(data.snow1hMm)}`);
    if (data.snow3hMm != null && data.snow3hMm > 0) parts.push(`3h ${formatMm(data.snow3hMm)}`);
    precipLines.push(`Snow: ${parts.join(" · ")}`);
  }
  if (hasRain) {
    const parts: string[] = [];
    if (data.rain1hMm != null && data.rain1hMm > 0) parts.push(`1h ${formatMm(data.rain1hMm)}`);
    if (data.rain3hMm != null && data.rain3hMm > 0) parts.push(`3h ${formatMm(data.rain3hMm)}`);
    precipLines.push(`Rain: ${parts.join(" · ")}`);
  }

  const precipValue = hasPrecip ? (
    <div className="space-y-1">
      {precipLines.map((line) => (
        <div key={line} className="text-white">
          {line}
        </div>
      ))}
    </div>
  ) : (
    "—"
  );

  const precipSub = hasPrecip ? "Accumulation over the last hour/3 hours (OpenWeather)." : undefined;

  const storm = stormSignalFrom({
    pressureHpa: data.pressureHpa,
    windMph: data.windMph,
    windGustMph: data.windGustMph ?? null,
    visibilityMi: data.visibilityMi ?? null,
    cloudPct: data.cloudPct ?? null,
    rain1hMm: data.rain1hMm ?? null,
    rain3hMm: data.rain3hMm ?? null,
    snow1hMm: data.snow1hMm ?? null,
    snow3hMm: data.snow3hMm ?? null,
    conditionMain: data.conditionMain ?? null,
  });

  const tint = stormTint(storm.label);

  const todayStrip = blocks.slice(0, 8);

  const daily = (() => {
    if (!forecast?.city) return [];

    const map = new Map<string, { key: string; min: number; max: number; icon: string | null }>();

    for (const b of blocks) {
      const key = dayKeyFromUnix(b.dt, tz);
      const existing = map.get(key);

      const bMin = Number.isFinite(b.tempMinF) ? b.tempMinF : b.tempF;
      const bMax = Number.isFinite(b.tempMaxF) ? b.tempMaxF : b.tempF;

      if (!existing) {
        map.set(key, { key, min: bMin, max: bMax, icon: b.icon ?? null });
      } else {
        existing.min = Math.min(existing.min, bMin);
        existing.max = Math.max(existing.max, bMax);
      }
    }

    const arr = Array.from(map.values()).sort((a, b) => (a.key < b.key ? -1 : 1));
    return arr.slice(0, 5);
  })();

  const globalMin = daily.length ? Math.min(...daily.map((d) => d.min)) : 0;
  const globalMax = daily.length ? Math.max(...daily.map((d) => d.max)) : 1;

  function pct(n: number) {
    if (globalMax === globalMin) return 0;
    return ((n - globalMin) / (globalMax - globalMin)) * 100;
  }

  function dayLabel(key: string) {
    const [y, m, d] = key.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.toLocaleDateString(undefined, { weekday: "short" });
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold text-white">The Weather? Not great...</h1>
          <p className="mt-1 text-white/80 text-2xl">But here it is anyway.</p>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="space-y-4">
              <BigCard
                place={place}
                temp={`${Math.round(data.tempF)}°`}
                desc={data.description}
                hilo={hilo}
                iconUrl={iconUrl}
                iconAlt={iconAlt}
                iconKind={iconKind}
                dimIcon={dimIcon}
              />

              <div
                className={[
                  "rounded-2xl p-6 shadow-sm backdrop-blur",
                  "border",
                  tint.border,
                  tint.bg,
                ].join(" ")}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "h-2 w-2 rounded-full",
                      tint.dot,
                      "shadow-[0_0_0_3px_rgba(0,0,0,0.18)]",
                    ].join(" ")}
                    aria-hidden="true"
                  />
                  <div className={["text-xs uppercase tracking-wide", tint.title].join(" ")}>
                    Storm Signal
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-2xl font-semibold text-white leading-tight">
                    {storm.label} <span className="text-white/60">({storm.score}/100)</span>
                  </div>

                  <div className="mt-4 h-2 w-full rounded-full bg-black/30 overflow-hidden">
                    <div
                      className={["h-full rounded-full", tint.bar].join(" ")}
                      style={{ width: `${storm.score}%` }}
                    />
                  </div>

                  <div className="mt-3 text-sm text-white/70">{storm.vibe}</div>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4 text-sm text-white/60">
                  {storm.summary}
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-7">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {coord ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur sm:col-span-2">
                  <div className="text-xs uppercase tracking-wide text-white/60">Map</div>
                  <div className="mt-3 h-48 md:h-56 w-full overflow-hidden rounded-xl">
                    <WeatherMap lat={coord.lat} lon={coord.lon} className="h-full w-full" />
                  </div>
                  <div className="mt-2 text-sm text-white/60">OpenStreetMap (no API key).</div>
                </div>
              ) : null}

              {todayStrip.length ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur sm:col-span-2">
                  <div className="text-xs uppercase tracking-wide text-white/60">Today Trend</div>

                  <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-8">
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

                  <div className="mt-2 text-sm text-white/60">3-hour blocks (next ~24h).</div>
                </div>
              ) : null}

              {daily.length ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur sm:col-span-2">
                  <div className="text-xs uppercase tracking-wide text-white/60">5-Day Forecast</div>

                  <div className="mt-3 space-y-3">
                    {daily.map((d) => {
                      const left = pct(d.min);
                      const width = Math.max(6, pct(d.max) - pct(d.min));
                      return (
                        <div key={d.key} className="grid grid-cols-[56px_1fr_64px] items-center gap-3">
                          <div className="text-sm text-white/70">{dayLabel(d.key)}</div>

                          <div className="relative h-2 w-full rounded-full bg-white/10">
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

                  <div className="mt-2 text-sm text-white/60">Derived from OpenWeather 3-hour forecast.</div>
                </div>
              ) : null}

              <Card title="Feels Like" value={`${Math.round(data.feelsLikeF)}°`} />
              <Card title="Humidity" value={`${data.humidity}%`} />

              <Card
                title="Pressure"
                value={`${data.pressureHpa} hPa`}
                sub="Higher pressure usually = steadier weather."
              />
              <Card
                title="Wind"
                value={`${Math.round(data.windMph)} mph`}
                sub={data.windDeg != null ? `Direction: ${data.windDeg}°` : undefined}
              />

              <Card
                title="Cloud Cover"
                value={data.cloudPct != null ? `${Math.round(data.cloudPct)}%` : "—"}
                sub={
                  data.cloudPct != null
                    ? data.cloudPct >= 75
                      ? "Overcast / thick cloud deck."
                      : data.cloudPct >= 40
                      ? "Partly to mostly cloudy."
                      : "Mostly clear skies."
                    : undefined
                }
              />

              <Card
                title="Dew Point"
                value={data.dewPointF != null ? `${Math.round(data.dewPointF)}°` : "—"}
                sub={
                  data.dewPointF != null
                    ? data.dewPointF >= 65
                      ? "Humid / sticky air."
                      : data.dewPointF >= 55
                      ? "A bit muggy."
                      : data.dewPointF >= 45
                      ? "Comfortable."
                      : "Dry air."
                    : undefined
                }
              />

              <Card
                title="Visibility"
                value={data.visibilityMi != null ? `${data.visibilityMi.toFixed(1)} mi` : "—"}
                sub={
                  data.visibilityMi != null
                    ? data.visibilityMi >= 6
                      ? "Good visibility."
                      : "Reduced visibility."
                    : undefined
                }
              />

              <Card
                title="Sun"
                value={
                  data.sunsetLocal && data.sunriseLocal ? `${data.sunriseLocal} → ${data.sunsetLocal}` : "—"
                }
                sub="Local sunrise and sunset."
              />

              {hasPrecip ? <Card title="Precip" value={precipValue} sub={precipSub} /> : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}