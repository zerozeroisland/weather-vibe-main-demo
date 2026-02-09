import React from "react";

type ForecastPoint = { temp: number };

type TempTrendProps = {
  points: ForecastPoint[];
  currentTemp: number;
};

export default function TempTrend({ points, currentTemp }: TempTrendProps) {
  if (!points?.length) return null;

  const temps = points.map((p) => p.temp);
  const min = Math.min(...temps);
  const max = Math.max(...temps);

  const width = 240;
  const height = 64;
  const paddingX = 8;
  const paddingY = 10;

  const scaleX = (i: number) =>
    paddingX + (i / (temps.length - 1)) * (width - paddingX * 2);

  const scaleY = (t: number) =>
    height - paddingY - ((t - min) / (max - min || 1)) * (height - paddingY * 2);

  const linePath = temps
    .map((t, i) => `${i === 0 ? "M" : "L"} ${scaleX(i)} ${scaleY(t)}`)
    .join(" ");

  const areaPath = `
    ${linePath}
    L ${scaleX(temps.length - 1)} ${height - paddingY}
    L ${scaleX(0)} ${height - paddingY}
    Z
  `;

  const currentX = scaleX(0);
  const currentY = scaleY(temps[0]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur">
      <div className="text-xs uppercase tracking-wide text-white/60">
        Temp Trend (24h)
      </div>

      <div className="relative mt-3">
        {/* min / max labels */}
        <div className="absolute right-0 top-0 text-[10px] text-white/45">
          {Math.round(max)}°
        </div>
        <div className="absolute right-0 bottom-0 text-[10px] text-white/45">
          {Math.round(min)}°
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-14"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
              <stop offset="70%" stopColor="rgba(255,255,255,0.08)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>

            <filter id="glow">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* faint baseline */}
          <line
            x1="0"
            y1={height - paddingY}
            x2={width}
            y2={height - paddingY}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />

          {/* gradient area */}
          <path d={areaPath} fill="url(#tempFill)" />

          {/* trend line */}
          <path
            d={linePath}
            fill="none"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* current point */}
          <circle
            cx={currentX}
            cy={currentY}
            r="3.25"
            fill="#fff"
            filter="url(#glow)"
          />
          <circle
            cx={currentX}
            cy={currentY}
            r="7"
            fill="rgba(255,255,255,0.18)"
          />
        </svg>
      </div>

      <div className="mt-2 text-sm text-white/70">
        Now:{" "}
        <span className="font-semibold text-white">
          {Math.round(currentTemp)}°
        </span>
      </div>
    </div>
  );
}