"use client";

interface DateSelectorProps { dates: string[]; currentDate: string; onDateChange: (date: string) => void; }

function formatDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${y}年${m}月${day}日`;
}

export default function DateSelector({ dates, currentDate, onDateChange }: DateSelectorProps) {
  const idx = dates.indexOf(currentDate);
  const hasPrev = idx < dates.length - 1;
  const hasNext = idx > 0;
  const btnBase = "p-2 rounded-lg border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all";

  return (
    <div className="flex items-center gap-3">
      <button onClick={() => hasPrev && onDateChange(dates[idx + 1])} disabled={!hasPrev} className={btnBase} title="前一個交易日">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>
      <div className="relative">
        <select value={currentDate} onChange={(e) => onDateChange(e.target.value)}
          className="appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent cursor-pointer transition-all">
          {dates.map((d) => <option key={d} value={d}>{formatDate(d)}</option>)}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>
      <button onClick={() => hasNext && onDateChange(dates[idx - 1])} disabled={!hasNext} className={btnBase} title="下一個交易日">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
      {idx !== 0 && (
        <button onClick={() => onDateChange(dates[0])} className="px-3 py-2 text-xs font-medium text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 transition-all">
          最新
        </button>
      )}
    </div>
  );
}
