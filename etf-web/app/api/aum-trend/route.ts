import { NextRequest, NextResponse } from "next/server";
import { getAumTrend } from "@/lib/db";

export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const etfCode = searchParams.get("etf_code");
  if (!etfCode) {
    return NextResponse.json({ error: "缺少 etf_code 參數" }, { status: 400 });
  }
  try {
    const trend = await getAumTrend(etfCode);
    return NextResponse.json({ trend });
  } catch (error) {
    console.error("取得 AUM 趨勢失敗:", error);
    return NextResponse.json({ error: "取得 AUM 趨勢失敗" }, { status: 500 });
  }
}
