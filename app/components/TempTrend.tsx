// components/TempTrend.tsx
import React from "react";

type ForecastPoint = {
  temp: number;
};

type TempTrendProps = {
  points: ForecastPoint[];
  currentTemp: number;
};


export default function TempTrend({ points, currentTemp }: TempTrendProps) {
  if (!points || points.length === 0) return null;

  const temps = points.map(p => p.temp);
  const min = Math.min(...temps);
  const max = Math.max(...temps);

  const width = 160;
  const height = 40;
  const padding = 4;

  const scaleX = (i: number) =>
    padding + (i / (temps.length - 1)) * (width - padding * 2);

  const scaleY = (t: number) =>
    height - padding - ((t - min) / (max - min || 1)) * (height - padding * 2);

  const path = temps
    .map((t, i) => `${i === 0 ? "M" : "L"} ${scaleX(i)} ${scaleY(t)}`)
    .join(" ");

  const currentX = scaleX(0);
  const currentY = scaleY(temps[0]);

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-4">
      <div className="text-xs uppercase tracking-wider text-white/50 mb-2">
        Temp Trend (24h)
      </div>

      <svg width={width} height={height} className="mb-2">
        <path
          d={path}
          fill="none"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="1.5"
        />

        {/* current point glow */}
        <circle
          cx={currentX}
          cy={currentY}
          r="3"
          fill="#fff"
          filter="url(#glow)"
        />

        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <div className="text-sm text-white">
        Now: <span className="font-semibold">{Math.round(currentTemp)}°</span>
      </div>
    </div>
  );
}