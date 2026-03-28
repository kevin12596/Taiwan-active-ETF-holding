import { NextRequest, NextResponse } from "next/server";
import {
  getHoldingsByDate, getPrevHoldingsByDate, getAvailableDates,
  type Holding, type HoldingWithChange,
} from "@/lib/db";

export const dynamic = "force-dynamic";
const ETF_CODES = ["00981A", "00980A", "00991A"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let date = searchParams.get("date");

    if (!date) {
      const dates = await getAvailableDates();
      if (dates.length === 0) return NextResponse.json({ error: "尚無資料" }, { status: 404 });
      date = dates[0];
    }

    const currentHoldings = await getHoldingsByDate(date);

    const prevHoldingsMap: Record<string, Holding[]> = {};
    await Promise.all(
      ETF_CODES.map(async (code) => {
        prevHoldingsMap[code] = await getPrevHoldingsByDate(date!, code);
      })
    );

    // 計算每支股票被幾支 ETF 持有
    const stockOverlapCount: Record<string, number> = {};
    for (const h of currentHoldings) {
      stockOverlapCount[h.stock_code] = (stockOverlapCount[h.stock_code] || 0) + 1;
    }

    const result: Record<string, HoldingWithChange[]> = {};

    for (const etfCode of ETF_CODES) {
      const current = currentHoldings.filter((h) => h.etf_code === etfCode);
      const prev = prevHoldingsMap[etfCode];

      const prevMap: Record<string, number> = {};
      const prevCodes = new Set<string>();
      for (const p of prev) { prevMap[p.stock_code] = p.weight; prevCodes.add(p.stock_code); }

      const currentCodes = new Set(current.map((h) => h.stock_code));

      // 退出前10的股票
      const outHoldings: HoldingWithChange[] = prev
        .filter((p) => !currentCodes.has(p.stock_code))
        .map((p) => ({
          ...p, snapshot_date: date!,
          prev_weight: p.weight, weight_delta: null,
          is_new: false, is_out: true,
          overlap_count: stockOverlapCount[p.stock_code] || 0,
        }));

      const withChange: HoldingWithChange[] = current.map((h) => {
        const prevWeight = prevMap[h.stock_code] ?? null;
        const isNew = prev.length > 0 && !prevCodes.has(h.stock_code);
        const delta = prevWeight !== null ? Math.round((h.weight - prevWeight) * 100) / 100 : null;
        return {
          ...h, prev_weight: prevWeight, weight_delta: delta,
          is_new: isNew, is_out: false,
          overlap_count: stockOverlapCount[h.stock_code] || 1,
        };
      });

      result[etfCode] = [...withChange, ...outHoldings];
    }

    return NextResponse.json({ date, holdings: result });
  } catch (error) {
    console.error("取得持股資料失敗:", error);
    return NextResponse.json({ error: "取得持股資料失敗" }, { status: 500 });
  }
}
