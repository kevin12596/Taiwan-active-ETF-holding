import { NextRequest, NextResponse } from "next/server";
import { getStockTrend } from "@/lib/db";

export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stockCode = searchParams.get("stock_code");
  if (!stockCode) {
    return NextResponse.json({ error: "缺少 stock_code 參數" }, { status: 400 });
  }
  try {
    const trend = await getStockTrend(stockCode);
    return NextResponse.json({ trend });
  } catch (error) {
    console.error("取得趨勢資料失敗:", error);
    return NextResponse.json({ error: "取得趨勢資料失敗" }, { status: 500 });
  }
}
