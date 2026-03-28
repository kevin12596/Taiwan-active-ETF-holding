"use client";
import { useState } from "react";
import clsx from "clsx";
import type { HoldingWithChange } from "@/lib/db";
import TrendChart from "./TrendChart";

interface HoldingsTableProps { holdings: HoldingWithChange[]; etfCode: string; }

function getRowStyle(h: HoldingWithChange) {
  if (h.is_out) return "opacity-40 italic";
  if (h.overlap_count === 3) return "bg-amber-50 border-l-2 border-amber-400";
  if (h.overlap_count === 2) return "bg-blue-50 border-l-2 border-blue-400";
  return "";
}

function WeightDelta({ delta, isNew }: { delta: number | null; isNew: boolean }) {
  if (isNew) return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">NEW</span>;
  if (delta === null || delta === 0) return <span className="text-slate-300">—</span>;
  if (delta > 0) return <span className="text-emerald-600 font-medium text-xs">▲ {delta.toFixed(2)}%</span>;
  return <span className="text-rose-500 font-medium text-xs">▼ {Math.abs(delta).toFixed(2)}%</span>;
}

function OverlapBadge({ count }: { count: number }) {
  if (count === 3) return <span title="三支 ETF 同時持有" className="inline-block w-2 h-2 rounded-full bg-amber-400 ring-1 ring-amber-200" />;
  if (count === 2) return <span title="兩支 ETF 同時持有" className="inline-block w-2 h-2 rounded-full bg-blue-400 ring-1 ring-blue-200" />;
  return null;
}

export default function HoldingsTable({ holdings, etfCode }: HoldingsTableProps) {
  const active = holdings.filter((h) => !h.is_out);
  const exited = holdings.filter((h) => h.is_out);
  const [trend, setTrend] = useState<{ stockCode: string; stockName: string } | null>(null);
  return (
    <div className="overflow-hidden">
      {trend && (
        <TrendChart
          stockCode={trend.stockCode}
          stockName={trend.stockName}
          onClose={() => setTrend(null)}
        />
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="py-2 px-2 text-left text-xs font-semibold text-slate-400 w-7">#</th>
            <th className="py-2 px-2 text-left text-xs font-semibold text-slate-400">代號</th>
            <th className="py-2 px-2 text-left text-xs font-semibold text-slate-400">名稱</th>
            <th className="py-2 px-2 text-right text-xs font-semibold text-slate-400">比重</th>
            <th className="py-2 px-2 text-right text-xs font-semibold text-slate-400 hidden sm:table-cell">變化</th>
          </tr>
        </thead>
        <tbody>
          {active.map((h) => (
            <tr
              key={`${etfCode}-${h.stock_code}`}
              className={clsx("border-b border-slate-50 transition-colors hover:bg-slate-50/80", getRowStyle(h))}
            >
              <td className="py-2.5 px-2 text-slate-400 text-xs tabular-nums">
                <div className="flex items-center gap-1">{h.rank}<OverlapBadge count={h.overlap_count} /></div>
              </td>
              {/* 代號 & 名稱：點擊開啟 Yahoo 財經個股頁 */}
              <td
                className="py-2.5 px-2 font-mono text-xs text-slate-500 cursor-pointer hover:text-sky-600 hover:underline"
                title={`開啟 ${h.stock_code} Yahoo 財經`}
                onClick={() => window.open(`https://tw.stock.yahoo.com/quote/${h.stock_code}/technical-analysis`, "_blank")}
              >
                {h.stock_code}
              </td>
              <td
                className="py-2.5 px-2 font-medium text-slate-800 cursor-pointer hover:text-sky-600 hover:underline"
                title={`開啟 ${h.stock_name} Yahoo 財經`}
                onClick={() => window.open(`https://tw.stock.yahoo.com/quote/${h.stock_code}/technical-analysis`, "_blank")}
              >
                {h.stock_name}
              </td>
              {/* 比重：點擊彈出趨勢圖 */}
              <td
                className="py-2.5 px-2 text-right tabular-nums text-slate-700 font-medium cursor-pointer hover:text-violet-600"
                title="點擊查看比重趨勢"
                onClick={() => setTrend({ stockCode: h.stock_code, stockName: h.stock_name })}
              >
                {h.weight.toFixed(2)}%
              </td>
              <td className="py-2.5 px-2 text-right hidden sm:table-cell">
                <WeightDelta delta={h.weight_delta} isNew={h.is_new} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {exited.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold text-slate-400 px-2 mb-1">本期退出前10</p>
          {exited.map((h) => (
            <div key={`out-${etfCode}-${h.stock_code}`} className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-400">
              <span
                className="font-mono cursor-pointer hover:text-sky-500 hover:underline"
                onClick={() => window.open(`https://tw.stock.yahoo.com/quote/${h.stock_code}/technical-analysis`, "_blank")}
              >
                {h.stock_code}
              </span>
              <span
                className="cursor-pointer hover:text-sky-500 hover:underline"
                onClick={() => window.open(`https://tw.stock.yahoo.com/quote/${h.stock_code}/technical-analysis`, "_blank")}
              >
                {h.stock_name}
              </span>
              <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold">OUT</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
