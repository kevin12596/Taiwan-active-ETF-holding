import { neon } from "@neondatabase/serverless";

export function getDb() {
  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error("環境變數 POSTGRES_URL 未設定");
  return neon(url);
}

export interface Holding {
  etf_code: string;
  stock_code: string;
  stock_name: string;
  weight: number;
  rank: number;
  snapshot_date: string;
}

export interface HoldingWithChange extends Holding {
  prev_weight: number | null;
  weight_delta: number | null;
  is_new: boolean;
  is_out?: boolean;
  overlap_count: number;
}

export async function getAvailableDates(): Promise<string[]> {
  const db = getDb();
  const rows = await db`
    SELECT DISTINCT snapshot_date::text AS snapshot_date
    FROM etf_holdings
    ORDER BY snapshot_date DESC
    LIMIT 90
  `;
  return rows.map((r) => r.snapshot_date);
}

export async function getHoldingsByDate(date: string): Promise<Holding[]> {
  const db = getDb();
  const rows = await db`
    SELECT etf_code, stock_code, stock_name,
           CAST(weight AS FLOAT) AS weight, rank,
           snapshot_date::text AS snapshot_date
    FROM etf_holdings
    WHERE snapshot_date = ${date}
    ORDER BY etf_code, rank ASC
  `;
  return rows as Holding[];
}

export async function getPrevHoldingsByDate(
  currentDate: string,
  etfCode: string
): Promise<Holding[]> {
  const db = getDb();
  const rows = await db`
    SELECT etf_code, stock_code, stock_name,
           CAST(weight AS FLOAT) AS weight, rank,
           snapshot_date::text AS snapshot_date
    FROM etf_holdings
    WHERE etf_code = ${etfCode}
      AND snapshot_date = (
        SELECT MAX(snapshot_date) FROM etf_holdings
        WHERE etf_code = ${etfCode} AND snapshot_date < ${currentDate}
      )
    ORDER BY rank ASC
  `;
  return rows as Holding[];
}
