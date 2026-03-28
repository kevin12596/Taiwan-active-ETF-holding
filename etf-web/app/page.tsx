"use client";
import { useState, useEffect, useCallback } from "react";
import ETFCard from "@/components/ETFCard";
import DateSelector from "@/components/DateSelector";
import type { HoldingWithChange } from "@/lib/db";

const ETF_CODES = ["00981A", "00980A", "00991A"];

function MobileTab({ active, label, onClick, color }: { active: boolean; label: string; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-2.5 text-sm font-medium transition-all border-b-2 ${active ? `border-current ${color}` : "border-transparent text-slate-400 hover:text-slate-600"}`}>
      {label}
    </button>
  );
}

export default function Home() {
  const [dates, setDates] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState<string>("");
  const [holdings, setHoldings] = useState<Record<string, HoldingWithChange[]>>({});
  const [aum, setAum] = useState<Record<string, number | null>>({});
  const [sectors, setSectors] = useState<Record<string, { sector_name: string; weight: number }[]>>({});
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetch("/api/dates")
      .then((r) => r.json())
      .then((data) => {
        if (data.dates?.length > 0) { setDates(data.dates); setCurrentDate(data.dates[0]); }
        else { setError("目前尚無資料，請等待爬蟲首次執行。"); setLoading(false); }
      })
      .catch(() => { setError("無法連線至資料庫，請確認環境設定。"); setLoading(false); });
  }, []);

  const fetchHoldings = useCallback((date: string) => {
    if (!date) return;
    setLoading(true); setError(null);
    fetch(`/api/holdings?date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.holdings) {
          setHoldings(data.holdings);
          if (data.aum) setAum(data.aum);
          if (data.sectors) setSectors(data.sectors);
          if (data.date) setLastUpdated(data.date);
        } else {
          setError(data.error ?? "取得資料失敗");
        }
        setLoading(false);
      })
      .catch(() => { setError("無法載入持股資料"); setLoading(false); });
  }, []);

  useEffect(() => { if (currentDate) fetchHoldings(currentDate); }, [currentDate, fetchHoldings]);

  const overlapStats = (() => {
    const allActive = Object.values(holdings).flat().filter((h) => !h.is_out);
    const triple = [...new Set(allActive.filter((h) => h.overlap_count === 3).map((h) => h.stock_code))];
    const double = [...new Set(allActive.filter((h) => h.overlap_count === 2).map((h) => h.stock_code))];
    return { triple, double };
  })();

  const tabColors = ["text-violet-600", "text-sky-600", "text-teal-600"];
  const tabLabels = ["00981A 統一", "00980A 野村", "00991A 復華"];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 頂部導覽列 */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">台灣主動型 ETF 持股追蹤</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                00981A・00980A・00991A 前10大持股比較
                {lastUpdated && <span className="ml-2 text-slate-300">・資料日期 {lastUpdated}</span>}
              </p>
            </div>
            {dates.length > 0 && <DateSelector dates={dates} currentDate={currentDate} onDateChange={setCurrentDate} />}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* 圖例與交集統計 */}
        {!loading && !error && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 mb-6">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-amber-400 ring-2 ring-amber-100" />
                  <span className="text-xs text-slate-600 font-medium">三支共同持有</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-blue-400 ring-2 ring-blue-100" />
                  <span className="text-xs text-slate-600 font-medium">兩支共同持有</span>
                </div>
              </div>
              <div className="hidden sm:block w-px h-5 bg-slate-200" />
              <div className="flex flex-wrap gap-2">
                {overlapStats.triple.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-slate-400">三支共有：</span>
                    {overlapStats.triple.map((code) => {
                      const h = Object.values(holdings).flat().find((x) => x.stock_code === code);
                      return <span key={code} className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full">{h?.stock_name ?? code}</span>;
                    })}
                  </div>
                )}
                {overlapStats.double.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-slate-400">兩支共有：</span>
                    {overlapStats.double.map((code) => {
                      const h = Object.values(holdings).flat().find((x) => x.stock_code === code);
                      return <span key={code} className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">{h?.stock_name ?? code}</span>;
                    })}
                  </div>
                )}
                {overlapStats.triple.length === 0 && overlapStats.double.length === 0 && (
                  <span className="text-xs text-slate-400">無共同持股</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 錯誤狀態 */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl px-5 py-6 text-center">
            <p className="text-rose-600 font-medium">{error}</p>
          </div>
        )}

        {/* 骨架載入 */}
        {loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-pulse">
                <div className="h-24 bg-slate-100" />
                <div className="p-4 space-y-3">{[...Array(10)].map((_, j) => <div key={j} className="h-8 bg-slate-50 rounded" />)}</div>
              </div>
            ))}
          </div>
        )}

        {/* 桌面三欄 */}
        {!loading && !error && (
          <>
            <div className="hidden md:grid md:grid-cols-3 gap-4">
              {ETF_CODES.map((code) => <ETFCard key={code} etfCode={code} holdings={holdings[code] ?? []} aum={aum[code] ?? null} sectors={sectors[code] ?? []} />)}
            </div>
            {/* 行動 Tab */}
            <div className="md:hidden">
              <div className="flex bg-white rounded-xl border border-slate-100 shadow-sm mb-4 overflow-hidden">
                {tabLabels.map((label, i) => (
                  <MobileTab key={i} active={activeTab === i} label={label} onClick={() => setActiveTab(i)} color={tabColors[i]} />
                ))}
              </div>
              <ETFCard etfCode={ETF_CODES[activeTab]} holdings={holdings[ETF_CODES[activeTab]] ?? []} aum={aum[ETF_CODES[activeTab]] ?? null} sectors={sectors[ETF_CODES[activeTab]] ?? []} />
            </div>
          </>
        )}
      </main>

      <footer className="mt-16 pb-8 text-center">
        <p className="text-xs text-slate-300">資料來源：MoneyDJ 理財網・每日台灣時間 17:00 自動更新</p>
      </footer>
    </div>
  );
}
