"use client";
import { useState } from "react";
import type { HoldingWithChange } from "@/lib/db";
import HoldingsTable from "./HoldingsTable";
import SectorBar from "./SectorBar";
import AumTrendChart from "./AumTrendChart";

const ETF_INFO: Record<string, { name: string; manager: string; color: string; hexColor: string }> = {
  "00981A": { name: "統一台股增長", manager: "統一投信", color: "from-violet-500 to-violet-600", hexColor: "#7c3aed" },
  "00980A": { name: "野村智慧優選", manager: "野村投信", color: "from-sky-500 to-sky-600",     hexColor: "#0284c7" },
  "00991A": { name: "復華未來50",   manager: "復華投信", color: "from-teal-500 to-teal-600",   hexColor: "#0d9488" },
};

interface ETFCardProps {
  etfCode: string;
  holdings: HoldingWithChange[];
  aum: number | null;
  sectors: { sector_name: string; weight: number }[];
}

function formatAum(aum: number | null): string {
  if (aum === null) return "—";
  if (aum >= 100) return `${(aum / 100).toFixed(1)} 百億`;
  return `${aum.toFixed(0)} 億`;
}

export default function ETFCard({ etfCode, holdings, aum, sectors }: ETFCardProps) {
  const info = ETF_INFO[etfCode] ?? { name: etfCode, manager: "", color: "from-slate-500 to-slate-600", hexColor: "#94a3b8" };
  const activeHoldings = holdings.filter((h) => !h.is_out);
  const totalWeight = activeHoldings.reduce((s, h) => s + h.weight, 0);
  const [showAumTrend, setShowAumTrend] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
      {showAumTrend && (
        <AumTrendChart
          etfCode={etfCode}
          etfName={info.name}
          color={info.hexColor}
          onClose={() => setShowAumTrend(false)}
        />
      )}
      <div className={`bg-gradient-to-r ${info.color} px-5 py-4`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/70 text-xs font-medium tracking-wide uppercase">{etfCode}</p>
            <h2 className="text-white text-lg font-semibold mt-0.5">{info.name}</h2>
            <p className="text-white/60 text-xs mt-0.5">{info.manager}</p>
          </div>
          <div className="text-right space-y-1">
            <div>
              <p className="text-white/70 text-xs">前10大合計</p>
              <p className="text-white font-bold text-xl tabular-nums">{totalWeight.toFixed(1)}%</p>
            </div>
            <button
              onClick={() => setShowAumTrend(true)}
              className="text-right hover:opacity-80 transition-opacity"
              title="點擊查看規模趨勢"
            >
              <p className="text-white/70 text-xs">規模（估）</p>
              <p className="text-white/90 font-semibold text-sm tabular-nums underline decoration-dotted">{formatAum(aum)}</p>
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 px-4 py-3">
        {holdings.length === 0
          ? <div className="flex items-center justify-center h-32 text-slate-400 text-sm">此日期無資料</div>
          : <>
              <HoldingsTable holdings={holdings} etfCode={etfCode} />
              <SectorBar sectors={sectors} />
            </>}
      </div>
    </div>
  );
}
