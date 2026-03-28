import { NextResponse } from "next/server";
import { getAvailableDates } from "@/lib/db";
export const revalidate = 3600; // 每小時重新驗證（資料每日 17:00 更新一次）
export async function GET() {
  try {
    const dates = await getAvailableDates();
    return NextResponse.json({ dates });
  } catch (error) {
    console.error("取得日期列表失敗:", error);
    return NextResponse.json({ error: "取得日期失敗" }, { status: 500 });
  }
}
