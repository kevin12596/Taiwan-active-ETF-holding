"use client";
import { useEffect, useState, useRef } from "react";

interface TrendPoint {
  etf_code: string;
  snapshot_date: string;
  weight: number;
}

interface TrendChartProps {
  stockCode: string;
  stockName: string;
  onClose: () => void;
}

const ETF_COLORS: Record<string, string> = {
  "00981A": "#7c3aed", // violet
  "00988A": "#f97316", // orange
  "00991A": "#0d9488", // teal
};
const ETF_LABELS: Record<string, string> = {
  "00981A": "統一台股增長",
  "00988A": "統一全球創新",
  "00991A": "復華未來50",
};

const W = 480;
const H = 180;
const PAD = { top: 16, right: 16, bottom: 36, left: 40 };

export default function TrendChart({ stockCode, stockName, onClose }: TrendChartProps) {
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    fetch(`/api/trend?stock_code=${stockCode}`)
      .then((r) => r.json())
      .then((d) => { setData(d.trend ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [stockCode]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Group by ETF
  const byEtf: Record<string, TrendPoint[]> = {};
  for (const d of data) {
    if (!byEtf[d.etf_code]) byEtf[d.etf_code] = [];
    byEtf[d.etf_code].push(d);
  }

  // All dates (x-axis)
  const allDates = [...new Set(data.map((d) => d.snapshot_date))].sort();
  const allWeights = data.map((d) => d.weight);
  const minW = Math.max(0, Math.min(...allWeights) - 1);
  const maxW = Math.max(...allWeights) + 1;

  const cx = (date: string) => {
    const i = allDates.indexOf(date);
    if (allDates.length <= 1) return PAD.left + (W - PAD.left - PAD.right) / 2;
    return PAD.left + (i / (allDates.length - 1)) * (W - PAD.left - PAD.right);
  };
  const cy = (weight: number) =>
    PAD.top + (1 - (weight - minW) / (maxW - minW)) * (H - PAD.top - PAD.bottom);

  const toPath = (points: TrendPoint[]) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${cx(p.snapshot_date).toFixed(1)} ${cy(p.weight).toFixed(1)}`).join(" ");

  // X-axis labels: show at most 6 evenly spaced dates
  const xLabelIndices = allDates.length <= 6
    ? allDates.map((_, i) => i)
    : [0, ...Array.from({ length: 4 }, (_, i) => Math.round((i + 1) * (allDates.length - 1) / 5)), allDates.length - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-slate-400 font-mono">{stockCode}</p>
            <h3 className="text-base font-bold text-slate-900">{stockName} 持股比重趨勢</h3>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors text-xl leading-none">×</button>
        </div>

        {loading && (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">載入中…</div>
        )}

        {!loading && data.length === 0 && (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">尚無歷史資料</div>
        )}

        {!loading && data.length > 0 && (
          <>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
              {Object.keys(byEtf).map((code) => (
                <div key={code} className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: ETF_COLORS[code] ?? "#94a3b8" }} />
                  <span className="text-xs text-slate-500">{code} {ETF_LABELS[code]}</span>
                </div>
              ))}
            </div>

            {/* Chart */}
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className="w-full"
              style={{ height: H }}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Y gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                const val = minW + t * (maxW - minW);
                const y = PAD.top + (1 - t) * (H - PAD.top - PAD.bottom);
                return (
                  <g key={t}>
                    <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#f1f5f9" strokeWidth={1} />
                    <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#94a3b8">{val.toFixed(1)}%</text>
                  </g>
                );
              })}

              {/* X-axis labels */}
              {xLabelIndices.map((i) => (
                <text key={i} x={cx(allDates[i])} y={H - 4} textAnchor="middle" fontSize={9} fill="#94a3b8">
                  {allDates[i].slice(5)} {/* MM-DD */}
                </text>
              ))}

              {/* Lines per ETF */}
              {Object.entries(byEtf).map(([code, points]) => (
                <g key={code}>
                  <path d={toPath(points)} fill="none" stroke={ETF_COLORS[code] ?? "#94a3b8"} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  {points.map((p) => (
                    <circle
                      key={p.snapshot_date}
                      cx={cx(p.snapshot_date)}
                      cy={cy(p.weight)}
                      r={3}
                      fill={ETF_COLORS[code] ?? "#94a3b8"}
                      className="cursor-pointer"
                      onMouseEnter={(e) => {
                        const rect = svgRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        const svgX = cx(p.snapshot_date);
                        const svgY = cy(p.weight);
                        setTooltip({ x: svgX, y: svgY, text: `${code} ${p.snapshot_date}\n${p.weight.toFixed(2)}%` });
                      }}
                    />
                  ))}
                </g>
              ))}

              {/* Tooltip */}
              {tooltip && (
                <g>
                  <rect
                    x={tooltip.x + 6}
                    y={tooltip.y - 28}
                    width={130}
                    height={36}
                    rx={4}
                    fill="white"
                    stroke="#e2e8f0"
                    strokeWidth={1}
                    filter="drop-shadow(0 1px 3px rgba(0,0,0,0.12))"
                  />
                  {tooltip.text.split("\n").map((line, i) => (
                    <text key={i} x={tooltip.x + 12} y={tooltip.y - 14 + i * 14} fontSize={10} fill="#334155">{line}</text>
                  ))}
                </g>
              )}
            </svg>
          </>
        )}
      </div>
    </div>
  );
}
