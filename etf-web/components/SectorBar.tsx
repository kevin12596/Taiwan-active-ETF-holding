"use client";
import { useState } from "react";

interface SectorBarProps {
  sectors: { sector_name: string; weight: number }[];
}

// 固定顏色 palette（依序分配，最多 12 種）
const SECTOR_COLORS = [
  "#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
  "#0ea5e9", "#a78bfa",
];

export default function SectorBar({ sectors }: SectorBarProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (sectors.length === 0) return null;

  const top = sectors.slice(0, 8); // 最多顯示 8 個產業
  const rest = sectors.slice(8).reduce((s, x) => s + x.weight, 0);
  const displayed = rest > 0 ? [...top, { sector_name: "其他", weight: parseFloat(rest.toFixed(2)) }] : top;
  const total = displayed.reduce((s, x) => s + x.weight, 0);

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <p className="text-xs font-semibold text-slate-400 mb-2">產業分布</p>

      {/* 堆疊長條 */}
      <div className="flex h-3 rounded-full overflow-hidden w-full mb-2">
        {displayed.map((s, i) => (
          <div
            key={s.sector_name}
            style={{ width: `${(s.weight / total) * 100}%`, backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length] }}
            className="transition-opacity"
            onMouseEnter={() => setHovered(s.sector_name)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </div>

      {/* 圖例 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {displayed.map((s, i) => (
          <div
            key={s.sector_name}
            className={`flex items-center gap-1 transition-opacity ${hovered && hovered !== s.sector_name ? "opacity-40" : "opacity-100"}`}
            onMouseEnter={() => setHovered(s.sector_name)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="inline-block w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
            <span className="text-xs text-slate-500">{s.sector_name}</span>
            <span className="text-xs text-slate-400 tabular-nums">{s.weight.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
