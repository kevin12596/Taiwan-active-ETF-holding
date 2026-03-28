"use client";
import { useEffect, useState, useRef } from "react";

interface AumPoint {
  snapshot_date: string;
  aum_100m_twd: number;
}

interface AumTrendChartProps {
  etfCode: string;
  etfName: string;
  color: string;
  onClose: () => void;
}

const W = 480;
const H = 180;
const PAD = { top: 16, right: 16, bottom: 36, left: 52 };

function formatAum(v: number) {
  if (v >= 100) return `${(v / 100).toFixed(1)}百億`;
  return `${v.toFixed(0)}億`;
}

export default function AumTrendChart({ etfCode, etfName, color, onClose }: AumTrendChartProps) {
  const [data, setData] = useState<AumPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    fetch(`/api/aum-trend?etf_code=${etfCode}`)
      .then((r) => r.json())
      .then((d) => { setData(d.trend ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [etfCode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const allValues = data.map((d) => d.aum_100m_twd);
  const minV = Math.max(0, Math.min(...allValues) * 0.9);
  const maxV = Math.max(...allValues) * 1.05;

  const cx = (i: number) => {
    if (data.length <= 1) return PAD.left + (W - PAD.left - PAD.right) / 2;
    return PAD.left + (i / (data.length - 1)) * (W - PAD.left - PAD.right);
  };
  const cy = (v: number) =>
    PAD.top + (1 - (v - minV) / (maxV - minV)) * (H - PAD.top - PAD.bottom);

  const pathD = data.map((p, i) => `${i === 0 ? "M" : "L"} ${cx(i).toFixed(1)} ${cy(p.aum_100m_twd).toFixed(1)}`).join(" ");

  const xLabelIndices = data.length <= 6
    ? data.map((_, i) => i)
    : [0, ...Array.from({ length: 4 }, (_, i) => Math.round((i + 1) * (data.length - 1) / 5)), data.length - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-slate-400 font-mono">{etfCode}</p>
            <h3 className="text-base font-bold text-slate-900">{etfName} 規模趨勢</h3>
            <p className="text-xs text-slate-400 mt-0.5">從持股比重估算，僅供參考</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors text-xl leading-none">×</button>
        </div>

        {loading && <div className="flex items-center justify-center h-40 text-slate-400 text-sm">載入中…</div>}
        {!loading && data.length === 0 && <div className="flex items-center justify-center h-40 text-slate-400 text-sm">尚無歷史資料</div>}

        {!loading && data.length > 0 && (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            style={{ height: H }}
            onMouseLeave={() => setTooltip(null)}
          >
            {/* Y gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const val = minV + t * (maxV - minV);
              const y = PAD.top + (1 - t) * (H - PAD.top - PAD.bottom);
              return (
                <g key={t}>
                  <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#f1f5f9" strokeWidth={1} />
                  <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#94a3b8">{formatAum(val)}</text>
                </g>
              );
            })}

            {/* X labels */}
            {xLabelIndices.map((i) => (
              <text key={i} x={cx(i)} y={H - 4} textAnchor="middle" fontSize={9} fill="#94a3b8">
                {data[i].snapshot_date.slice(5)}
              </text>
            ))}

            {/* Area fill */}
            <path
              d={`${pathD} L ${cx(data.length - 1).toFixed(1)} ${(H - PAD.bottom).toFixed(1)} L ${cx(0).toFixed(1)} ${(H - PAD.bottom).toFixed(1)} Z`}
              fill={color}
              fillOpacity={0.08}
            />

            {/* Line */}
            <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

            {/* Dots */}
            {data.map((p, i) => (
              <circle
                key={p.snapshot_date}
                cx={cx(i)}
                cy={cy(p.aum_100m_twd)}
                r={3}
                fill={color}
                className="cursor-pointer"
                onMouseEnter={() => setTooltip({ x: cx(i), y: cy(p.aum_100m_twd), text: `${p.snapshot_date}\n${formatAum(p.aum_100m_twd)}` })}
              />
            ))}

            {/* Tooltip */}
            {tooltip && (
              <g>
                <rect x={tooltip.x + 6} y={tooltip.y - 28} width={110} height={36} rx={4} fill="white" stroke="#e2e8f0" strokeWidth={1} filter="drop-shadow(0 1px 3px rgba(0,0,0,0.12))" />
                {tooltip.text.split("\n").map((line, i) => (
                  <text key={i} x={tooltip.x + 12} y={tooltip.y - 14 + i * 14} fontSize={10} fill="#334155">{line}</text>
                ))}
              </g>
            )}
          </svg>
        )}
      </div>
    </div>
  );
}
